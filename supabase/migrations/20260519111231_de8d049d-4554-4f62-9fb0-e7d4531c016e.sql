CREATE OR REPLACE FUNCTION public.create_roulette_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only notify if prize_label is set (spin completed)
    -- And either it's a new row or prize_label was previously NULL
    IF NEW.prize_label IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.prize_label IS NULL) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Prêmio na Roleta!',
            'Incrível! Você girou a roleta e ganhou: ' || NEW.prize_label,
            'win'
        );
    END IF;
    RETURN NEW;
END;
$function$;

-- Drop and recreate trigger to include UPDATE
DROP TRIGGER IF EXISTS roulette_notification_trigger ON public.roulette_spins;
CREATE TRIGGER roulette_notification_trigger
AFTER INSERT OR UPDATE ON public.roulette_spins
FOR EACH ROW EXECUTE FUNCTION create_roulette_notification();
