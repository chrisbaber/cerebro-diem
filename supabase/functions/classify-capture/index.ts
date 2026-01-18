import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const CLASSIFICATION_PROMPT = `You are a personal knowledge classifier for Cerebro Diem. Given a raw thought, classify it into exactly one category and extract structured fields.

## Categories

1. **person**: Information about a specific person
   - Use when: The thought is primarily about a specific named individual
   - Extract: name, context (relationship/how you know them), follow_ups (things to remember)

2. **project**: A multi-step endeavor with a goal
   - Use when: Involves multiple steps, has an outcome, is ongoing work
   - Extract: name, status (active|waiting|blocked|someday), next_action (specific executable action), notes

3. **idea**: A concept, insight, or possibility
   - Use when: It's a "what if", creative thought, insight, or something to explore
   - Extract: title, one_liner (core insight in one sentence), notes

4. **task**: A single actionable item
   - Use when: One discrete action, no larger project context, an errand
   - Extract: name, due_date (if mentioned, else null), notes

## Rules

1. Choose the MOST specific category that fits
2. If a person is mentioned but the thought is really about a project, choose project
3. Extract the most SPECIFIC, ACTIONABLE next_action possible
4. Convert vague intentions to concrete actions:
   - "work on website" → "Draft homepage copy for website"
   - "talk to Mike" → "Schedule call with Mike to discuss plans"
5. If no clear due date, set due_date to null
6. Confidence should reflect how certain you are (0.0-1.0)

## Output Format

Return ONLY valid JSON, no markdown, no explanation:

{
  "category": "person" | "project" | "idea" | "task",
  "confidence": 0.0-1.0,
  "extracted": {
    // category-specific fields
  }
}

Now classify this thought:
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
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY')!

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

    const { capture_id } = await req.json();

    if (!capture_id) {
      return new Response(
        JSON.stringify({ error: 'capture_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the capture
    const { data: capture, error: captureError } = await supabase
      .from('captures')
      .select('*')
      .eq('id', capture_id)
      .eq('user_id', user.id)
      .single();

    if (captureError || !capture) {
      return new Response(
        JSON.stringify({ error: 'Capture not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's confidence threshold
    const { data: profile } = await supabase
      .from('profiles')
      .select('confidence_threshold')
      .eq('id', user.id)
      .single();

    const confidenceThreshold = profile?.confidence_threshold || 0.6;

    // Call OpenRouter for classification
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            content: CLASSIFICATION_PROMPT,
          },
          {
            role: 'user',
            content: capture.raw_text,
          },
        ],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      console.error('OpenRouter error:', errorText);
      throw new Error(`OpenRouter API error: ${openrouterResponse.status}`);
    }

    const openrouterData = await openrouterResponse.json();
    const rawResponse = openrouterData.choices[0].message.content;

    // Parse the JSON response
    let classification;
    try {
      classification = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', rawResponse);
      // Create a classification record with needs_review status
      const { data: classificationRecord, error: classError } = await supabase
        .from('classifications')
        .insert({
          capture_id: capture.id,
          user_id: user.id,
          category: 'task', // Default
          confidence: 0,
          extracted_fields: {},
          raw_llm_response: rawResponse,
          status: 'needs_review',
        })
        .select()
        .single();

      if (classError) throw classError;

      // Mark capture as processed
      await supabase
        .from('captures')
        .update({ processed: true, processing_error: 'Failed to parse classification' })
        .eq('id', capture.id);

      return new Response(
        JSON.stringify({
          success: true,
          classification: classificationRecord,
          destination: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { category, confidence, extracted } = classification;

    // Determine if we should auto-file or need review
    const shouldAutoFile = confidence >= confidenceThreshold;
    const status = shouldAutoFile ? 'auto_filed' : 'needs_review';

    let destinationId = null;
    let destination = null;

    // If confidence is high enough, create the destination record
    if (shouldAutoFile) {
      let insertData: Record<string, unknown>;
      let table: string;

      switch (category) {
        case 'person':
          table = 'people';
          insertData = {
            user_id: user.id,
            name: extracted.name,
            context: extracted.context || null,
            follow_ups: extracted.follow_ups || [],
          };
          break;
        case 'project':
          table = 'projects';
          insertData = {
            user_id: user.id,
            name: extracted.name,
            status: extracted.status || 'active',
            next_action: extracted.next_action || null,
            notes: extracted.notes || null,
          };
          break;
        case 'idea':
          table = 'ideas';
          insertData = {
            user_id: user.id,
            title: extracted.title,
            one_liner: extracted.one_liner || null,
            notes: extracted.notes || null,
          };
          break;
        case 'task':
          table = 'tasks';
          insertData = {
            user_id: user.id,
            name: extracted.name,
            due_date: extracted.due_date || null,
            notes: extracted.notes || null,
          };
          break;
        default:
          throw new Error(`Unknown category: ${category}`);
      }

      const { data: destRecord, error: destError } = await supabase
        .from(table)
        .insert(insertData)
        .select()
        .single();

      if (destError) throw destError;

      destinationId = destRecord.id;
      destination = destRecord;
    }

    // Create classification record
    const { data: classificationRecord, error: classError } = await supabase
      .from('classifications')
      .insert({
        capture_id: capture.id,
        user_id: user.id,
        category,
        confidence,
        extracted_fields: extracted,
        raw_llm_response: rawResponse,
        destination_id: destinationId,
        status,
      })
      .select()
      .single();

    if (classError) throw classError;

    // Mark capture as processed
    await supabase
      .from('captures')
      .update({ processed: true })
      .eq('id', capture.id);

    return new Response(
      JSON.stringify({
        success: true,
        classification: classificationRecord,
        destination,
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
