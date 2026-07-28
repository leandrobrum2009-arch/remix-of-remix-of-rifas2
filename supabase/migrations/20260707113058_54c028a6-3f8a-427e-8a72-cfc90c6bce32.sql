
CREATE POLICY "Public read gift-prizes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gift-prizes');

CREATE POLICY "Admins upload gift-prizes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gift-prizes' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'master'::app_role)));

CREATE POLICY "Admins update gift-prizes"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'gift-prizes' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'master'::app_role)));

CREATE POLICY "Admins delete gift-prizes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gift-prizes' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'master'::app_role)));
