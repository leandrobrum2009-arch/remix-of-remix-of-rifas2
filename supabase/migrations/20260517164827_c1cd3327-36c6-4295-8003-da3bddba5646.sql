CREATE OR REPLACE FUNCTION public.sync_federal_lottery()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://hjmjhjwvfsefanmnbsdd.supabase.co/functions/v1/federal-lottery',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
END;
$$;
