import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PATTERN_DETECTION_PROMPT = `Analyze the user's recent activity and identify patterns. Look for:

1. **Recurring Topics**: Topics or themes mentioned multiple times
2. **Recurring Tasks**: Similar tasks that appear regularly (potential candidates for recurring tasks)
3. **Stalled Projects**: Projects with no recent activity
4. **Overdue Follow-ups**: People with follow-ups that haven't been addressed
5. **Capture Patterns**: Times of day or contexts when captures are most frequent

## Data
Recent Captures (last 30 days): {captures}
Active Projects: {projects}
People with Follow-ups: {people}
Recent Tasks: {tasks}

## Output Format
Return a JSON array of detected patterns:
[
  {
    "type": "recurring_topic" | "recurring_task" | "project_stall" | "follow_up_due" | "time_pattern",
    "title": "Brief title",
    "description": "Detailed description of the pattern",
    "significance": 0.0-1.0 (how significant/actionable is this),
    "related_items": [{"type": "capture|project|person|task", "id": "uuid", "name": "display name"}],
    "suggestion": "What the user might want to do about this"
  }
]

Only include patterns with significance > 0.5. Return empty array if no significant patterns found.
Return ONLY valid JSON, no markdown or explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the JWT from the request to identify the user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    // Fetch user data for analysis
    const [capturesRes, projectsRes, peopleRes, tasksRes] = await Promise.all([
      supabase
        .from('captures')
        .select('id, raw_text, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('projects')
        .select('id, name, status, next_action, updated_at')
        .eq('user_id', user.id)
        .in('status', ['active', 'waiting', 'blocked']),
      supabase
        .from('people')
        .select('id, name, follow_ups, last_touched')
        .eq('user_id', user.id)
        .not('follow_ups', 'eq', '{}'),
      supabase
        .from('tasks')
        .select('id, name, status, due_date, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString()),
    ]);

    const captures = capturesRes.data || [];
    const projects = projectsRes.data || [];
    const people = peopleRes.data || [];
    const tasks = tasksRes.data || [];

    // Format data for the prompt
    const capturesText = captures.slice(0, 50).map(c =>
      `[${new Date(c.created_at).toLocaleDateString()}] ${c.raw_text.slice(0, 200)}`
    ).join('\n');

    const projectsText = projects.map(p =>
      `- ${p.name} (${p.status}): ${p.next_action || 'No next action'} | Last updated: ${new Date(p.updated_at).toLocaleDateString()}`
    ).join('\n');

    const peopleText = people.map(p =>
      `- ${p.name}: ${p.follow_ups.length} follow-ups | Last touched: ${new Date(p.last_touched).toLocaleDateString()}`
    ).join('\n');

    const tasksText = tasks.slice(0, 30).map(t =>
      `- ${t.name} (${t.status})${t.due_date ? ` due ${t.due_date}` : ''}`
    ).join('\n');

    const prompt = PATTERN_DETECTION_PROMPT
      .replace('{captures}', capturesText || 'No recent captures')
      .replace('{projects}', projectsText || 'No active projects')
      .replace('{people}', peopleText || 'No follow-ups pending')
      .replace('{tasks}', tasksText || 'No recent tasks');

    // Call AI for pattern detection
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cerebrodiem.com',
        'X-Title': 'Cerebro Diem',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a pattern detection assistant. Analyze user data and identify actionable patterns. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI error:', error);
      throw new Error('Failed to detect patterns');
    }

    const aiData = await aiResponse.json();
    const rawResponse = aiData.choices[0].message.content;

    // Parse the response
    let patterns = [];
    try {
      patterns = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('Failed to parse patterns:', rawResponse);
      patterns = [];
    }

    // Store detected patterns
    const storedPatterns = [];
    for (const pattern of patterns) {
      if (pattern.significance < 0.5) continue;

      const { data: stored, error: storeError } = await supabase
        .from('patterns')
        .insert({
          user_id: user.id,
          pattern_type: pattern.type,
          title: pattern.title,
          description: pattern.description,
          data: {
            suggestion: pattern.suggestion,
          },
          related_items: pattern.related_items || [],
          significance: pattern.significance,
        })
        .select()
        .single();

      if (!storeError && stored) {
        storedPatterns.push(stored);
      }
    }

    // Check for recurring task patterns and suggest automation
    const recurringTaskPatterns = storedPatterns.filter(
      p => p.pattern_type === 'recurring_task'
    );

    for (const pattern of recurringTaskPatterns) {
      // Create a suggested recurring task
      await supabase
        .from('recurring_tasks')
        .insert({
          user_id: user.id,
          name: pattern.title,
          description: pattern.description,
          frequency: 'weekly', // Default, user can adjust
          auto_detected: true,
          source_pattern_id: pattern.id,
          is_active: false, // User needs to confirm
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        patterns: storedPatterns,
        recurring_tasks_suggested: recurringTaskPatterns.length,
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
