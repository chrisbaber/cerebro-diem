import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

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
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    // Handle Slack Events API verification
    if (body.type === 'url_verification') {
      return new Response(
        JSON.stringify({ challenge: body.challenge }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Slack events
    if (body.type === 'event_callback') {
      const event = body.event;

      // Handle message events (DMs or mentions)
      if (event.type === 'message' || event.type === 'app_mention') {
        // Avoid bot messages and message edits
        if (event.bot_id || event.subtype) {
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Find user by Slack team + user mapping
        const { data: connection } = await supabase
          .from('integration_connections')
          .select('user_id, access_token')
          .eq('provider', 'slack')
          .eq('external_user_id', event.user)
          .eq('workspace_id', body.team_id)
          .single();

        if (!connection) {
          console.log('No connected user found for Slack user:', event.user);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageText = event.text
          .replace(/<@[A-Z0-9]+>/g, '') // Remove user mentions
          .replace(/<#[A-Z0-9]+\|[^>]+>/g, '') // Remove channel mentions
          .trim();

        if (!messageText) {
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create capture from Slack message
        const { data: capture, error: captureError } = await supabase
          .from('captures')
          .insert({
            user_id: connection.user_id,
            raw_text: messageText,
            source: 'slack',
            metadata: {
              slack_channel: event.channel,
              slack_user: event.user,
              slack_team: body.team_id,
              slack_ts: event.ts,
            },
          })
          .select()
          .single();

        if (captureError) {
          console.error('Error creating capture:', captureError);
          throw captureError;
        }

        // Trigger classification
        await fetch(`${supabaseUrl}/functions/v1/classify-capture`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ capture_id: capture.id }),
        });

        // Send acknowledgment back to Slack
        if (connection.access_token) {
          await fetch('https://slack.com/api/reactions.add', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel: event.channel,
              timestamp: event.ts,
              name: 'brain', // 🧠 emoji
            }),
          });
        }

        return new Response(JSON.stringify({ ok: true, capture_id: capture.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle OAuth flow
    if (action === 'oauth') {
      const { code, user_id } = body;

      const slackClientId = Deno.env.get('SLACK_CLIENT_ID')!;
      const slackClientSecret = Deno.env.get('SLACK_CLIENT_SECRET')!;

      // Exchange code for token
      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: slackClientId,
          client_secret: slackClientSecret,
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.ok) {
        throw new Error(`Slack OAuth failed: ${tokenData.error}`);
      }

      // Store connection
      const { error: connectionError } = await supabase
        .from('integration_connections')
        .upsert({
          user_id,
          provider: 'slack',
          access_token: tokenData.access_token,
          external_user_id: tokenData.authed_user.id,
          workspace_id: tokenData.team.id,
          workspace_name: tokenData.team.name,
          scopes: tokenData.scope,
          is_active: true,
        }, {
          onConflict: 'user_id,provider',
        });

      if (connectionError) {
        throw connectionError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          team_name: tokenData.team.name,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle disconnect
    if (action === 'disconnect') {
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

      await supabase
        .from('integration_connections')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('provider', 'slack');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connection status
    if (action === 'status') {
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

      const { data: connection } = await supabase
        .from('integration_connections')
        .select('workspace_name, is_active, created_at')
        .eq('user_id', user.id)
        .eq('provider', 'slack')
        .single();

      return new Response(
        JSON.stringify({
          connected: !!connection?.is_active,
          workspace_name: connection?.workspace_name,
          connected_at: connection?.created_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send message to Slack (for notifications)
    if (action === 'send_message') {
      const { user_id, message, channel } = body;

      const { data: connection } = await supabase
        .from('integration_connections')
        .select('access_token')
        .eq('user_id', user_id)
        .eq('provider', 'slack')
        .eq('is_active', true)
        .single();

      if (!connection) {
        return new Response(
          JSON.stringify({ error: 'No active Slack connection' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel || 'me', // DM to self
          text: message,
          mrkdwn: true,
        }),
      });

      const slackData = await slackResponse.json();

      return new Response(
        JSON.stringify({ success: slackData.ok, error: slackData.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
