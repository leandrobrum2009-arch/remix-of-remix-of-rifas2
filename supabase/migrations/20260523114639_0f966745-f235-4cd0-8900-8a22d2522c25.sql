-- Grant SELECT on user_roles to public so RLS policies on other tables can check roles without erroring
GRANT SELECT ON public.user_roles TO public;

-- Ensure anon and authenticated roles can select from site_settings
GRANT SELECT ON public.site_settings TO anon, authenticated;

-- Update site_settings policies
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 1. Ensure the public policy exists and is correct
DROP POLICY IF EXISTS "Public can view whitelisted settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public select for whitelisted keys" ON public.site_settings;

CREATE POLICY "Public can view whitelisted settings"
ON public.site_settings
FOR SELECT
TO public
USING (
  key = ANY (ARRAY[
    'site_name', 'site_logo_url', 'site_logo_height', 'site_logo_height_mobile',
    'primary_color', 'company_name', 'company_address', 'company_cnpj', 
    'company_email', 'company_phone', 'support_whatsapp', 'home_hero_style', 
    'home_marquee_enabled', 'home_marquee_text', 'hero_transition_speed', 
    'hero_transition_type', 'animation_easing', 'border_shimmer_opacity', 
    'button_glow_intensity', 'button_glow_speed', 'button_hover_effect', 
    'title_shimmer_primary', 'title_shimmer_secondary', 'title_shimmer_secondary_light', 
    'title_shimmer_speed', 'active_payment_provider', 'manual_payment_enabled', 
    'manual_payment_pix_key', 'manual_payment_pix_name', 'mercadopago_public_key', 
    'affiliate_commission_percent', 'cashback_percent', 'min_withdrawal_amount'
  ])
);

-- 2. Update Admin policy to be more robust
DROP POLICY IF EXISTS "Admins have full access to site_settings" ON public.site_settings;
CREATE POLICY "Admins have full access to site_settings"
ON public.site_settings
FOR ALL
TO authenticated
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
