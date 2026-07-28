-- Ensure RLS is enabled
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Drop the existing public policy if it exists to recreate it correctly
DROP POLICY IF EXISTS "Public can view whitelisted settings" ON public.site_settings;

-- Create a more robust public policy
CREATE POLICY "Public can view whitelisted settings" ON public.site_settings
FOR SELECT USING (
  key = ANY (ARRAY[
    'site_name', 
    'site_logo_url', 
    'site_logo_height', 
    'site_logo_height_mobile',
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
    'min_withdrawal_amount'
  ])
);

-- Ensure anon and authenticated roles have SELECT access
GRANT SELECT ON public.site_settings TO anon, authenticated;
