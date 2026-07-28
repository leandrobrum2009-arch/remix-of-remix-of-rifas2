-- 1. Remove user INSERT on mystery_box_wins (must go through SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "Users can insert their own wins" ON public.mystery_box_wins;

-- 2. Orders: drop the overly broad public policy, expose only ranking-safe columns via a view
DROP POLICY IF EXISTS "Public can view paid orders for ranking" ON public.orders;

CREATE OR REPLACE VIEW public.orders_public_ranking
WITH (security_invoker=on) AS
  SELECT id, user_id, campaign_id, quantity, created_at, paid_at
  FROM public.orders
  WHERE payment_status = 'paid';

GRANT SELECT ON public.orders_public_ranking TO anon, authenticated;

-- Allow the view (security_invoker) to read paid orders via a narrow RLS policy
CREATE POLICY "Public can read paid orders (limited columns via view)"
ON public.orders FOR SELECT
TO anon, authenticated
USING (payment_status = 'paid');

-- Revoke direct column access on sensitive payment columns from anon
REVOKE SELECT ON public.orders FROM anon;

-- 3. Tickets: replace public policy with a public view that omits user_id
DROP POLICY IF EXISTS "Public can view confirmed/paid tickets for stats" ON public.tickets;

CREATE OR REPLACE VIEW public.tickets_public
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

-- 4. Hide game odds from anon: restrict roulette_prizes & scratch_card_prizes to authenticated
DROP POLICY IF EXISTS "Roulette prizes are publicly readable" ON public.roulette_prizes;
CREATE POLICY "Roulette prizes readable by authenticated users"
ON public.roulette_prizes FOR SELECT
TO authenticated
USING (true);
REVOKE SELECT ON public.roulette_prizes FROM anon;

DROP POLICY IF EXISTS "Prizes are viewable by everyone" ON public.scratch_card_prizes;
CREATE POLICY "Scratch card prizes readable by authenticated users"
ON public.scratch_card_prizes FOR SELECT
TO authenticated
USING (is_active = true);
REVOKE SELECT ON public.scratch_card_prizes FROM anon;

-- 5. Payment proofs storage: enforce order ownership on upload
DROP POLICY IF EXISTS "Users can upload proofs" ON storage.objects;

CREATE POLICY "Users can upload proofs to own orders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id::text = (storage.foldername(name))[1]
      AND orders.user_id = auth.uid()
  )
);
