-- Digest Cron Job Setup
-- This creates the infrastructure for scheduled digest generation

-- Enable pg_net for HTTP requests (should already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to call the generate-digest Edge Function for users due for their digest
CREATE OR REPLACE FUNCTION public.trigger_scheduled_digests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  edge_function_url TEXT;
BEGIN
  -- Get the Supabase URL
  edge_function_url := 'https://epbnucvawcggjmttwwtg.supabase.co/functions/v1/generate-digest';

  -- Find users whose digest time is now (within the current hour)
  FOR user_record IN
    SELECT p.id, p.timezone, p.digest_time
    FROM profiles p
    WHERE
      -- Check if current time in user's timezone matches their digest hour
      EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(p.timezone, 'America/Chicago'))) =
      EXTRACT(HOUR FROM p.digest_time::time)
      -- Only trigger once per day - check if digest already generated today
      AND NOT EXISTS (
        SELECT 1 FROM digests d
        WHERE d.user_id = p.id
        AND d.type = 'daily'
        AND d.generated_at::date = (NOW() AT TIME ZONE COALESCE(p.timezone, 'America/Chicago'))::date
      )
  LOOP
    -- Queue HTTP request to Edge Function using pg_net
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', user_record.id,
        'type', 'daily'
      )
    );

    RAISE NOTICE 'Triggered digest for user: %', user_record.id;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_scheduled_digests() TO service_role;

COMMENT ON FUNCTION public.trigger_scheduled_digests IS
'Finds users due for their daily digest and triggers the generate-digest Edge Function.
To schedule this, enable pg_cron extension in Supabase Dashboard > Database > Extensions,
then run: SELECT cron.schedule(''trigger-daily-digests'', ''0 * * * *'', ''SELECT public.trigger_scheduled_digests()'');';
