-- Create the site-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for site-assets with unique names
CREATE POLICY "Site Assets Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

CREATE POLICY "Site Assets Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Site Assets Authenticated Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Site Assets Authenticated Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets' AND auth.role() = 'authenticated');
