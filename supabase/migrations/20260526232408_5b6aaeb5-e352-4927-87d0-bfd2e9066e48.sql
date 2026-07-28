-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Public can view whitelisted settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins have full access to site_settings" ON public.site_settings;

-- Recreate public whitelist policy with necessary keys for site function
CREATE POLICY "Public can view whitelisted settings" ON public.site_settings
FOR SELECT TO public
USING (
  key = ANY (ARRAY[
    'site_name', 
    'site_title',
    'site_description',
    'site_keywords',
    'site_logo_url', 
    'site_logo_height', 
    'site_logo_height_mobile', 
    'site_favicon_url',
    'primary_color', 
    'company_name', 
    'company_address', 
    'company_cnpj', 
    'company_email', 
    'company_phone', 
    'support_whatsapp', 
    'home_hero_style', 
    'home_marquee_enabled', 
    'home_marquee_text', 
    'hero_transition_speed', 
    'hero_transition_type', 
    'animation_easing', 
    'border_shimmer_opacity', 
    'button_glow_intensity', 
    'button_glow_speed', 
    'button_hover_effect', 
    'title_shimmer_primary', 
    'title_shimmer_secondary', 
    'title_shimmer_secondary_light', 
    'title_shimmer_speed', 
    'active_payment_provider', 
    'manual_payment_enabled', 
    'manual_payment_pix_key', 
    'manual_payment_pix_name', 
    'mercadopago_public_key', 
    'affiliate_commission_percent', 
    'cashback_percent', 
    'min_withdrawal_amount',
    'facebook_pixel_id',
    'google_analytics_id',
    'google_tag_manager_id',
    'enable_download_app',
    'app_download_link'
  ])
);

-- Recreate admin policy to include master and client_admin
CREATE POLICY "Admins have full access to site_settings" ON public.site_settings
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'master', 'client_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'master', 'client_admin')
  )
);

-- Ensure sensitive keys are NOT exposed to anyone but Master if they are in site_settings
-- Note: It's better to store service role keys in Vault or separate table, but if they are here, we protect them.
-- We can add a more restrictive policy for sensitive keys if needed, but the current ALL policy covers admins.
-- To truly hide from client_admin, we would need to split the policy.

CREATE OR REPLACE FUNCTION public.check_is_master(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 
    AND user_roles.role = 'master'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Specific policy to hide sensitive keys from non-master admins
CREATE POLICY "Only master can see sensitive site_settings" ON public.site_settings
FOR SELECT TO authenticated
USING (
  (key NOT IN ('supabase_service_role_key', 'supabase_url', 'mercadopago_access_token', 'paggue_client_secret'))
  OR (public.check_is_master(auth.uid()))
);

-- We need to drop the "Admins have full access" SELECT part to let the more specific one handle it
DROP POLICY IF EXISTS "Admins have full access to site_settings" ON public.site_settings;

CREATE POLICY "Admins can manage non-sensitive site_settings" ON public.site_settings
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'master', 'client_admin')
  )
  AND (
    key NOT IN ('supabase_service_role_key', 'supabase_url', 'mercadopago_access_token', 'paggue_client_secret')
    OR public.check_is_master(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'master', 'client_admin')
  )
  AND (
    key NOT IN ('supabase_service_role_key', 'supabase_url', 'mercadopago_access_token', 'paggue_client_secret')
    OR public.check_is_master(auth.uid())
  )
);
