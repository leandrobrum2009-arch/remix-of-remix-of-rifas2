
-- 1. ORDERS: remove broad public SELECT policy. Public ranking continues via orders_public_ranking view.
DROP POLICY IF EXISTS "Public can read paid orders (limited columns via view)" ON public.orders;

-- Ensure public view is accessible
GRANT SELECT ON public.orders_public_ranking TO anon, authenticated;

-- 2. TICKETS: remove broad public SELECT policy. Public access continues via tickets_public view.
DROP POLICY IF EXISTS "Public can read confirmed/paid tickets (via view)" ON public.tickets;
GRANT SELECT ON public.tickets_public TO anon, authenticated;

-- 3. LUCKY_HOURS: hide draft winner fields from public.
DROP POLICY IF EXISTS "Anyone can view lucky hours" ON public.lucky_hours;

CREATE OR REPLACE VIEW public.lucky_hours_public
WITH (security_invoker = true)
AS
SELECT
  id,
  campaign_id,
  title,
  prize_description,
  draw_time,
  draw_type,
  rule_id,
  status,
  is_approved,
  CASE WHEN COALESCE(is_approved, false) THEN winner_name END AS winner_name,
  CASE WHEN COALESCE(is_approved, false) THEN winning_number END AS winning_number,
  created_at,
  updated_at
FROM public.lucky_hours;

GRANT SELECT ON public.lucky_hours_public TO anon, authenticated;

-- Allow authenticated users (incl. admins via existing admin policy) to keep reading the underlying table for management
CREATE POLICY "Authenticated can read lucky hours (sanitized via view)"
ON public.lucky_hours
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'master'::app_role));
