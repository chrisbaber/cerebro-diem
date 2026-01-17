import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const DAILY_DIGEST_PROMPT = `Generate a concise daily digest for a productivity app user. Keep it under 150 words.

## Available Data
- Active projects: {projects}
- People with follow-ups: {people}
- Pending tasks: {tasks}
- Recent captures (last 24h): {recent}

## Output Format (use markdown)

**🎯 Top 3 for Today**
1. [Most important/urgent action]
2. [Second priority]
3. [Third priority]

**⚠️ Might Be Stuck**
- [Any project with no activity in 5+ days, or write "All projects moving!" if none]

**💡 Quick Win**
- [One small encouraging note or easy task to build momentum]

## Rules
- Be specific. Use actual names and actions from the data.
- No generic advice like "stay focused" or "you've got this"
- If there's nothing in a section, still include it with a positive note
- Prioritize by: overdue tasks > tasks due today > active projects with stale next actions > people follow-ups
`;

const WEEKLY_DIGEST_PROMPT = `Generate a weekly review digest for a productivity app user. Keep it under 250 words.

## Available Data
- All captures this week: {captures}
- Projects (all statuses): {projects}
- Completed tasks this week: {completed_tasks}
- People touched this week: {people}

## Output Format (use markdown)

**📊 Week in Review**
- X thoughts captured
- X projects advanced
- X tasks completed

**🔄 Open Loops**
- [List 2-3 projects that need attention, with specific blockers]

**💡 Suggested Focus for Next Week**
1. [Most important priority]
2. [Second priority]
3. [Third priority]

**🔍 Pattern Noticed**
- [One observation about themes, recurring topics, or suggestions based on the data]

## Rules
- Be specific with names and numbers
- Identify patterns in what was captured (repeated themes, topics)
- Suggest consolidating related items if applicable
- Keep tone supportive but practical
`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, type = 'daily' } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch relevant data based on digest type
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    let promptData: Record<string, string>;
    let prompt: string;

    if (type === 'daily') {
      // Fetch data for daily digest
      const [projectsRes, peopleRes, tasksRes, capturesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('name, status, next_action, updated_at')
          .eq('user_id', user_id)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(10),
        supabase
          .from('people')
          .select('name, follow_ups')
          .eq('user_id', user_id)
          .not('follow_ups', 'eq', '{}')
          .limit(10),
        supabase
          .from('tasks')
          .select('name, due_date, status')
          .eq('user_id', user_id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(10),
        supabase
          .from('captures')
          .select('raw_text, created_at')
          .eq('user_id', user_id)
          .gte('created_at', oneDayAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      // Format data for prompt
      const projects = projectsRes.data || [];
      const staleProjects = projects.filter(
        p => new Date(p.updated_at) < fiveDaysAgo
      );

      promptData = {
        projects: projects.length > 0
          ? projects.map(p => `- ${p.name}: ${p.next_action || 'No next action'}`).join('\n')
          : 'No active projects',
        people: (peopleRes.data || []).length > 0
          ? (peopleRes.data || []).map(p => `- ${p.name}: ${(p.follow_ups || []).join(', ')}`).join('\n')
          : 'No pending follow-ups',
        tasks: (tasksRes.data || []).length > 0
          ? (tasksRes.data || []).map(t => `- ${t.name}${t.due_date ? ` (due: ${t.due_date})` : ''}`).join('\n')
          : 'No pending tasks',
        recent: (capturesRes.data || []).length > 0
          ? (capturesRes.data || []).map(c => `- ${c.raw_text.slice(0, 100)}`).join('\n')
          : 'No recent captures',
      };

      prompt = DAILY_DIGEST_PROMPT
        .replace('{projects}', promptData.projects)
        .replace('{people}', promptData.people)
        .replace('{tasks}', promptData.tasks)
        .replace('{recent}', promptData.recent);

    } else {
      // Fetch data for weekly digest
      const [capturesRes, projectsRes, completedTasksRes, peopleRes] = await Promise.all([
        supabase
          .from('captures')
          .select('raw_text')
          .eq('user_id', user_id)
          .gte('created_at', oneWeekAgo.toISOString()),
        supabase
          .from('projects')
          .select('name, status, next_action')
          .eq('user_id', user_id),
        supabase
          .from('tasks')
          .select('name')
          .eq('user_id', user_id)
          .eq('status', 'done')
          .gte('completed_at', oneWeekAgo.toISOString()),
        supabase
          .from('people')
          .select('name')
          .eq('user_id', user_id)
          .gte('last_touched', oneWeekAgo.toISOString()),
      ]);

      promptData = {
        captures: `${(capturesRes.data || []).length} captures this week:\n${
          (capturesRes.data || []).slice(0, 20).map(c => `- ${c.raw_text.slice(0, 80)}`).join('\n')
        }`,
        projects: (projectsRes.data || []).length > 0
          ? (projectsRes.data || []).map(p => `- ${p.name} (${p.status}): ${p.next_action || 'No next action'}`).join('\n')
          : 'No projects',
        completed_tasks: `${(completedTasksRes.data || []).length} tasks completed`,
        people: `${(peopleRes.data || []).length} people contacted`,
      };

      prompt = WEEKLY_DIGEST_PROMPT
        .replace('{captures}', promptData.captures)
        .replace('{projects}', promptData.projects)
        .replace('{completed_tasks}', promptData.completed_tasks)
        .replace('{people}', promptData.people);
    }

    // Call OpenAI for digest generation
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful productivity assistant. Generate concise, actionable digests.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const digestContent = openaiData.choices[0].message.content;

    // Store the digest
    const { data: digest, error: digestError } = await supabase
      .from('digests')
      .insert({
        user_id,
        type,
        content: digestContent,
      })
      .select()
      .single();

    if (digestError) throw digestError;

    return new Response(
      JSON.stringify({
        success: true,
        digest,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
