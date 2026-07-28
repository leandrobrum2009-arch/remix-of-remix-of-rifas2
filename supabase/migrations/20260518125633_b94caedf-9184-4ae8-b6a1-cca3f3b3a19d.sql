-- Create a bucket for campaigns
INSERT INTO storage.buckets (id, name, public) 
VALUES ('campaigns', 'campaigns', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view files
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'campaigns');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'campaigns' AND auth.role() = 'authenticated');

-- Allow authenticated users to update/delete their files
CREATE POLICY "Authenticated Update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'campaigns' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'campaigns' AND auth.role() = 'authenticated');