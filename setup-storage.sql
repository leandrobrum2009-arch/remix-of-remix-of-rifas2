-- ============================================================
-- SETUP: Storage buckets + policies (idempotente)
-- Evita o erro "Bucket not found" em novos ambientes.
-- Rode no SQL Editor do Supabase (externo) — pode reexecutar.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Buckets
--    campaigns / site-assets / avatars -> publicos (leitura)
--    payment-proofs                    -> privado (signed URLs)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('campaigns',      'campaigns',      true),
  ('site-assets',    'site-assets',    true),
  ('avatars',        'avatars',        true),
  ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ------------------------------------------------------------
-- 2) Leitura publica apenas dos buckets publicos
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "public_read_public_buckets" ON storage.objects;
CREATE POLICY "public_read_public_buckets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('campaigns', 'site-assets', 'avatars'));

-- ------------------------------------------------------------
-- 3) campaigns / site-assets: escrita somente para admins
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_write_site_buckets" ON storage.objects;
CREATE POLICY "admin_write_site_buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('campaigns', 'site-assets')
  AND public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "admin_update_site_buckets" ON storage.objects;
CREATE POLICY "admin_update_site_buckets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('campaigns', 'site-assets') AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id IN ('campaigns', 'site-assets') AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_site_buckets" ON storage.objects;
CREATE POLICY "admin_delete_site_buckets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('campaigns', 'site-assets') AND public.is_admin(auth.uid()));

-- ------------------------------------------------------------
-- 4) avatars: cada usuario so escreve na propria pasta (<uid>/...)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------
-- 5) payment-proofs: privado
--    - usuario envia comprovante do proprio pedido (<order_id>/...)
--    - leitura apenas para admins (o app usa signed URLs)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "proofs_insert_own_order" ON storage.objects;
CREATE POLICY "proofs_insert_own_order"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(name))[1]
      AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "proofs_read_own_or_admin" ON storage.objects;
CREATE POLICY "proofs_read_own_or_admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "proofs_admin_delete" ON storage.objects;
CREATE POLICY "proofs_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

-- ------------------------------------------------------------
-- 6) Conferencia
-- ------------------------------------------------------------
SELECT id, public FROM storage.buckets ORDER BY id;
