-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the sync function
CREATE OR REPLACE FUNCTION public.sync_federal_lottery()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://hjmjhjwvfsefanmnbsdd.supabase.co/functions/v1/federal-lottery',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule it (check if already scheduled first)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-federal-lottery-task') THEN
        PERFORM cron.schedule(
            'sync-federal-lottery-task',
            '0 * * * *', -- Every hour
            'SELECT public.sync_federal_lottery()'
        );
    END IF;
END $$;
