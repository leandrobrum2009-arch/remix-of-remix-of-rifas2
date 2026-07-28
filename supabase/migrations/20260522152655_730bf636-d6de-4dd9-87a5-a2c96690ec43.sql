-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.site_settings;

-- Create a more balanced policy
CREATE POLICY "Public can view non-sensitive settings"
ON public.site_settings
FOR SELECT
USING (
  key NOT ILIKE '%access_token%' AND
  key NOT ILIKE '%secret%' AND
  key NOT ILIKE '%password%' AND
  (
    key NOT ILIKE '%key%' OR 
    key ILIKE '%public_key%' OR 
    key ILIKE '%client_key%'
  )
);
