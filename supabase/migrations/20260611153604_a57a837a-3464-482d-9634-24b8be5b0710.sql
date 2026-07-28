
-- 1) auth_audit_logs
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.auth_audit_logs;
CREATE POLICY "Authenticated users insert own audit logs"
ON public.auth_audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
REVOKE INSERT ON public.auth_audit_logs FROM anon;

-- 2) coupons
DROP POLICY IF EXISTS "Admins have full access to coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons"
ON public.coupons FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.coupons FROM anon;

-- 3) orders: drop direct public SELECT, switch view to SECURITY DEFINER
DROP POLICY IF EXISTS "Public can read paid orders (limited columns via view)" ON public.orders;
DROP VIEW IF EXISTS public.orders_public_ranking;
CREATE VIEW public.orders_public_ranking AS
  SELECT id, user_id, campaign_id, quantity, created_at, paid_at
  FROM public.orders
  WHERE payment_status = 'paid';
GRANT SELECT ON public.orders_public_ranking TO anon, authenticated;

-- 4) tickets: drop direct public SELECT, switch view to SECURITY DEFINER
DROP POLICY IF EXISTS "Public can read confirmed/paid tickets (via view)" ON public.tickets;
DROP VIEW IF EXISTS public.tickets_public;
CREATE VIEW public.tickets_public AS
  SELECT id, number, status, campaign_id, created_at, is_lucky
  FROM public.tickets
  WHERE status IN ('confirmed', 'paid');
GRANT SELECT ON public.tickets_public TO anon, authenticated;

-- 5) affiliate_clicks: replace always-true insert policy
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.affiliate_clicks;
CREATE POLICY "Public can record affiliate clicks with valid affiliate"
ON public.affiliate_clicks FOR INSERT
TO anon, authenticated
WITH CHECK (
  affiliate_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.id = affiliate_clicks.affiliate_id
      AND a.is_active = true
  )
);
