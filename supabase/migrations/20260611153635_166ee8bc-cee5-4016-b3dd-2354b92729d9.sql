
-- Recreate orders_public_ranking as security_invoker view
DROP VIEW IF EXISTS public.orders_public_ranking;
CREATE VIEW public.orders_public_ranking
WITH (security_invoker=on) AS
  SELECT id, user_id, campaign_id, quantity, created_at, paid_at
  FROM public.orders
  WHERE payment_status = 'paid';
GRANT SELECT ON public.orders_public_ranking TO anon, authenticated;

-- Re-add narrow RLS policy so caller can read paid orders
CREATE POLICY "Public can read paid orders (limited columns via view)"
ON public.orders FOR SELECT
TO anon, authenticated
USING (payment_status = 'paid');

-- Column-level grants: anon may only see non-sensitive columns
REVOKE SELECT ON public.orders FROM anon;
GRANT SELECT (id, user_id, campaign_id, quantity, created_at, paid_at)
  ON public.orders TO anon;

-- Recreate tickets_public as security_invoker view
DROP VIEW IF EXISTS public.tickets_public;
CREATE VIEW public.tickets_public
WITH (security_invoker=on) AS
  SELECT id, number, status, campaign_id, created_at, is_lucky
  FROM public.tickets
  WHERE status IN ('confirmed', 'paid');
GRANT SELECT ON public.tickets_public TO anon, authenticated;

CREATE POLICY "Public can read confirmed/paid tickets (via view)"
ON public.tickets FOR SELECT
TO anon, authenticated
USING (status = ANY (ARRAY['confirmed'::text, 'paid'::text]));

REVOKE SELECT ON public.tickets FROM anon;
GRANT SELECT (id, number, status, campaign_id, created_at, is_lucky)
  ON public.tickets TO anon;
