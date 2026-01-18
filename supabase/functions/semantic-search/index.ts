import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Semantic search using embeddings
 * Supports both generating embeddings and searching
 */
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

    const { action, query, item_type, item_id, content, limit = 10, types } = await req.json();

    // Helper to generate embedding
    const generateEmbedding = async (text: string): Promise<number[]> => {
      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://cerebrodiem.com',
          'X-Title': 'Cerebro Diem',
        },
        body: JSON.stringify({
          model: 'openai/text-embedding-ada-002',
          input: text.slice(0, 8000), // Limit input length
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Embedding error:', error);
        throw new Error('Failed to generate embedding');
      }

      const data = await response.json();
      return data.data[0].embedding;
    };

    switch (action) {
      case 'search': {
        if (!query) {
          return new Response(
            JSON.stringify({ error: 'query is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate embedding for query
        const queryEmbedding = await generateEmbedding(query);

        // Search for similar items
        const itemTypes = types || ['capture', 'person', 'project', 'idea', 'task'];

        const { data: results, error: searchError } = await supabase.rpc('search_similar', {
          p_user_id: user.id,
          p_query_embedding: queryEmbedding,
          p_limit: limit,
          p_item_types: itemTypes,
        });

        if (searchError) throw searchError;

        // Fetch actual items for the results
        const enrichedResults = await Promise.all(
          (results || []).map(async (result: any) => {
            let item = null;
            switch (result.item_type) {
              case 'capture':
                const { data: capture } = await supabase
                  .from('captures')
                  .select('id, raw_text, created_at')
                  .eq('id', result.item_id)
                  .single();
                item = capture;
                break;
              case 'person':
                const { data: person } = await supabase
                  .from('people')
                  .select('id, name, context')
                  .eq('id', result.item_id)
                  .single();
                item = person;
                break;
              case 'project':
                const { data: project } = await supabase
                  .from('projects')
                  .select('id, name, next_action')
                  .eq('id', result.item_id)
                  .single();
                item = project;
                break;
              case 'idea':
                const { data: idea } = await supabase
                  .from('ideas')
                  .select('id, title, one_liner')
                  .eq('id', result.item_id)
                  .single();
                item = idea;
                break;
              case 'task':
                const { data: task } = await supabase
                  .from('tasks')
                  .select('id, name, status')
                  .eq('id', result.item_id)
                  .single();
                item = task;
                break;
            }

            return {
              type: result.item_type,
              id: result.item_id,
              similarity: result.similarity,
              item,
            };
          })
        );

        return new Response(
          JSON.stringify({
            success: true,
            results: enrichedResults.filter(r => r.item !== null),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'index': {
        // Generate or update embedding for an item
        if (!item_type || !item_id || !content) {
          return new Response(
            JSON.stringify({ error: 'item_type, item_id, and content are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const embedding = await generateEmbedding(content);

        // Calculate content hash for change detection
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Upsert embedding
        const { error: upsertError } = await supabase
          .from('embeddings')
          .upsert({
            user_id: user.id,
            item_type,
            item_id,
            content_hash: contentHash,
            embedding,
          }, {
            onConflict: 'item_type,item_id',
          });

        if (upsertError) throw upsertError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'batch-index': {
        // Index multiple items at once
        const { items } = await req.json();
        if (!items || !Array.isArray(items)) {
          return new Response(
            JSON.stringify({ error: 'items array is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let indexed = 0;
        for (const item of items) {
          try {
            const embedding = await generateEmbedding(item.content);

            const encoder = new TextEncoder();
            const data = encoder.encode(item.content);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            await supabase
              .from('embeddings')
              .upsert({
                user_id: user.id,
                item_type: item.type,
                item_id: item.id,
                content_hash: contentHash,
                embedding,
              }, {
                onConflict: 'item_type,item_id',
              });

            indexed++;
          } catch (err) {
            console.error(`Failed to index ${item.type}/${item.id}:`, err);
          }
        }

        return new Response(
          JSON.stringify({ success: true, indexed, total: items.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: search, index, or batch-index' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
