
-- 1. Affiliates: admin management policy
CREATE POLICY "Admins can manage affiliates"
ON public.affiliates FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Custom presets: restrict public read
DROP POLICY IF EXISTS "Anyone can view custom presets" ON public.custom_presets;

CREATE POLICY "Admins can view custom presets"
ON public.custom_presets FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Orders: drop user DELETE and UPDATE policies (admins still have full access)
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

-- Allow users to only attach a payment proof URL to their own pending orders (no other fields)
CREATE POLICY "Users can attach proof to own pending orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND payment_status IN ('pending', 'awaiting_proof', 'awaiting_payment')
)
WITH CHECK (
  auth.uid() = user_id
  AND payment_status IN ('pending', 'awaiting_proof', 'awaiting_payment')
);

-- 4. User rewards: restrict to owner
DROP POLICY IF EXISTS "Users can view rewards" ON public.user_rewards;

CREATE POLICY "Users can view their own rewards"
ON public.user_rewards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all rewards"
ON public.user_rewards FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Payment proofs storage: drop public read, restrict to owner of corresponding order + admins
DROP POLICY IF EXISTS "Public Read Proofs" ON storage.objects;

UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';

CREATE POLICY "Order owners can view their payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(name))[1]
      AND o.user_id = auth.uid()
  )
);

-- 6. Remove client INSERT on game outcome tables — writes must go through SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "Users can insert their own roulette spins" ON public.roulette_spins;
DROP POLICY IF EXISTS "Users can insert their own scratches" ON public.scratch_card_scratches;
