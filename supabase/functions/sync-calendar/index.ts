import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  attendees?: { email: string; displayName?: string }[];
  recurrence?: string[];
  etag: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const { action, provider = 'google' } = await req.json();

    // Get calendar connection
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No calendar connection found. Please connect your calendar first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token needs refresh
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      // Refresh the token (implementation depends on provider)
      // For now, return error asking user to reconnect
      return new Response(
        JSON.stringify({ error: 'Calendar token expired. Please reconnect your calendar.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'sync': {
        // Fetch events from Google Calendar
        const now = new Date();
        const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${connection.calendar_id || 'primary'}/events?` +
          new URLSearchParams({
            timeMin: now.toISOString(),
            timeMax: threeMonthsLater.toISOString(),
            maxResults: '250',
            singleEvents: 'true',
            orderBy: 'startTime',
          }),
          {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
            },
          }
        );

        if (!calendarResponse.ok) {
          const error = await calendarResponse.text();
          console.error('Calendar API error:', error);
          throw new Error('Failed to fetch calendar events');
        }

        const calendarData = await calendarResponse.json();
        const events: GoogleCalendarEvent[] = calendarData.items || [];

        // Upsert events
        let synced = 0;
        for (const event of events) {
          const isAllDay = !event.start.dateTime;
          const startTime = event.start.dateTime || event.start.date;
          const endTime = event.end.dateTime || event.end.date;

          const { error: upsertError } = await supabase
            .from('calendar_events')
            .upsert({
              user_id: user.id,
              provider,
              external_id: event.id,
              title: event.summary || 'Untitled',
              description: event.description,
              start_time: startTime,
              end_time: endTime,
              location: event.location,
              attendees: event.attendees || [],
              is_all_day: isAllDay,
              recurrence_rule: event.recurrence?.[0],
              etag: event.etag,
              last_synced_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,provider,external_id',
            });

          if (!upsertError) synced++;
        }

        // Update last sync time
        await supabase
          .from('calendar_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connection.id);

        return new Response(
          JSON.stringify({
            success: true,
            synced,
            total: events.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        // List upcoming events from our database
        const { data: events, error: listError } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(50);

        if (listError) throw listError;

        return new Response(
          JSON.stringify({
            success: true,
            events,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'link': {
        // Link an event to a person, project, or task
        const { event_id, link_type, link_id } = await req.json();

        const updateData: Record<string, string | null> = {
          related_person_id: null,
          related_project_id: null,
          related_task_id: null,
        };

        if (link_type === 'person') updateData.related_person_id = link_id;
        else if (link_type === 'project') updateData.related_project_id = link_id;
        else if (link_type === 'task') updateData.related_task_id = link_id;

        const { error: linkError } = await supabase
          .from('calendar_events')
          .update(updateData)
          .eq('id', event_id)
          .eq('user_id', user.id);

        if (linkError) throw linkError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
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
