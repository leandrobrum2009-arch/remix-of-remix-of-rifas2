-- Revoke public select from site_settings
DROP POLICY IF EXISTS "Site settings are publicly readable" ON public.site_settings;

-- Create a policy that only allows selecting non-sensitive keys for public
CREATE POLICY "Public can view non-sensitive settings" 
ON public.site_settings 
FOR SELECT 
USING (
  key NOT LIKE '%access_token%' AND 
  key NOT LIKE '%secret%' AND 
  key NOT LIKE '%password%' AND
  key NOT LIKE '%key%' -- Note: public_key might be okay, but let's be safe
);

-- Admins still have full access from existing policy
-- But let's make sure it's robust
DROP POLICY IF EXISTS "Admins have full access to site_settings" ON public.site_settings;
CREATE POLICY "Admins have full access to site_settings" 
ON public.site_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);