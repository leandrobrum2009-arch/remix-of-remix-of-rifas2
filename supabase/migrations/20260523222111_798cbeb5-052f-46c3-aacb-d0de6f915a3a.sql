-- Create bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access to proofs (optional, but often needed to show back to user)
CREATE POLICY "Public Read Proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

-- Users can upload their own proofs
CREATE POLICY "Users can upload proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

-- Admins can manage all proofs
CREATE POLICY "Admins manage proofs"
ON storage.objects FOR ALL
USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'::app_role));
