-- Function to process all overdue lucky hours
CREATE OR REPLACE FUNCTION public.process_overdue_lucky_hours()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_draw RECORD;
BEGIN
    -- Find all scheduled draws where the draw_time has passed
    FOR v_draw IN 
        SELECT id 
        FROM lucky_hours 
        WHERE status = 'scheduled' 
          AND draw_time <= now()
    LOOP
        -- Run the draw for each
        PERFORM run_lucky_hour_draw(v_draw.id);
    END LOOP;
END;
$$;

-- Schedule the job to run every minute
-- Note: We use cron.schedule in the 'cron' schema if available, or just the function if we can
SELECT cron.schedule(
    'process-lucky-hours-every-minute',
    '* * * * *',
    'SELECT public.process_overdue_lucky_hours()'
);

GRANT EXECUTE ON FUNCTION public.process_overdue_lucky_hours() TO service_role;
