-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the webhook queue processing every minute
-- Note: This requires the edge function URL and service role key
-- Usually configured in Supabase dashboard, but we can set up the SQL part
-- We'll use a placeholder for the URL if needed, but often we can use net/http
SELECT cron.schedule('process-webhook-queue', '* * * * *', $$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'supabase_url') || '/functions/v1/process-webhook-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM public.site_settings WHERE key = 'supabase_service_role_key')
    ),
    body := '{}'
  );
$$);

-- Note: site_settings needs to have these keys for this specific cron implementation to work.
-- If not, the user can configure it via Supabase dashboard crons.
