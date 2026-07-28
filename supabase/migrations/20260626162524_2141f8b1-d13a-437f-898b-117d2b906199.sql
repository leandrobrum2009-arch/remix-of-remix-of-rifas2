
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'authenticated'
     AND NOT (
       has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'master'::app_role)
       OR has_role(auth.uid(), 'client_admin'::app_role)
     ) THEN
    IF current_user = 'authenticated' THEN
      NEW.balance = OLD.balance;
      NEW.points = OLD.points;
      NEW.xp = OLD.xp;
      NEW.vip_level = OLD.vip_level;
      NEW.cashback_balance = OLD.cashback_balance;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
