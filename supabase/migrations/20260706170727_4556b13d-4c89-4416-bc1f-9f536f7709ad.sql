
-- 1) Remove x-tenant-id header fallback from current_tenant_id()
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_claim text;
  v_default uuid;
BEGIN
  BEGIN
    v_claim := current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,tenant_id}';
  EXCEPTION WHEN OTHERS THEN
    v_claim := NULL;
  END;
  IF v_claim IS NOT NULL AND v_claim <> '' THEN
    RETURN v_claim::uuid;
  END IF;

  SELECT id INTO v_default FROM public.tenants WHERE slug = 'default' LIMIT 1;
  RETURN v_default;
END;
$function$;

-- 2-4) Drop public base-table SELECT policies exposing user_id
DROP POLICY IF EXISTS "Public can view mystery box winners" ON public.mystery_box_wins;
DROP POLICY IF EXISTS "Public can view mystery box wins" ON public.mystery_box_wins;
DROP POLICY IF EXISTS "Public can view claimed roulette prizes" ON public.roulette_spins;
DROP POLICY IF EXISTS "Public can view claimed scratch prizes" ON public.scratch_card_scratches;

-- 5) Fix SECURITY DEFINER-like view (tickets_public) by switching to
-- security_invoker=on and granting column-level access + a public policy
-- restricted to the same active-tickets filter the view already applies.
ALTER VIEW public.tickets_public SET (security_invoker = on);

GRANT SELECT (id, number, status, campaign_id, created_at, is_lucky)
  ON public.tickets TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view active tickets" ON public.tickets;
CREATE POLICY "Public can view active tickets"
  ON public.tickets
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN ('confirmed', 'paid')
    OR (status = 'reserved' AND reservation_expires_at > now())
  );
