-- 1. Ensure functions are SECURITY DEFINER (bypass RLS for internal checks)
CREATE OR REPLACE FUNCTION public.check_is_master(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = user_id 
    AND user_roles.role = 'master'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = _user_id 
    AND user_roles.role IN ('admin', 'master', 'client_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  -- Master has all roles
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'master') THEN
    RETURN TRUE;
  END IF;

  -- Admin has moderator and user roles
  IF _role = 'admin' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
  ELSIF _role = 'moderator' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator'));
  ELSIF _role = 'user' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator', 'user', 'client_admin'));
  ELSIF _role = 'client_admin' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'client_admin');
  ELSE
    -- For any other role (like master itself), check exact match
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Grant permissions to roles (CRITICAL for PostgREST access)
-- site_settings
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

-- orders
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- user_roles
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- tickets
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT SELECT ON public.tickets TO anon;
GRANT ALL ON public.tickets TO service_role;

-- profiles
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- campaigns
GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT ALL ON public.campaigns TO service_role;

-- winners
GRANT SELECT ON public.winners TO anon, authenticated;
GRANT ALL ON public.winners TO service_role;

-- 3. Redefine RLS policies to use the SECURITY DEFINER functions correctly
-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master has full access to user_roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Master has full access to user_roles" ON public.user_roles FOR ALL TO authenticated USING (check_is_master(auth.uid())) WITH CHECK (check_is_master(auth.uid()));

-- site_settings
DROP POLICY IF EXISTS "Public can view whitelisted settings" ON public.site_settings;
DROP POLICY IF EXISTS "Master can see everything" ON public.site_settings;
DROP POLICY IF EXISTS "Master can manage everything" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can view non-sensitive settings" ON public.site_settings;

CREATE POLICY "Public can view whitelisted settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (key = ANY (ARRAY['site_name', 'site_title', 'site_description', 'site_keywords', 'site_logo_url', 'site_logo_height', 'site_logo_height_mobile', 'site_favicon_url', 'primary_color', 'company_name', 'company_address', 'company_cnpj', 'company_email', 'company_phone', 'support_whatsapp', 'home_hero_style', 'home_marquee_enabled', 'home_marquee_text', 'hero_transition_speed', 'hero_transition_type', 'animation_easing', 'border_shimmer_opacity', 'button_glow_intensity', 'button_glow_speed', 'button_hover_effect', 'title_shimmer_primary', 'title_shimmer_secondary', 'title_shimmer_secondary_light', 'title_shimmer_speed', 'active_payment_provider', 'manual_payment_enabled', 'manual_payment_pix_key', 'manual_payment_pix_name', 'mercadopago_public_key', 'affiliate_commission_percent', 'cashback_percent', 'min_withdrawal_amount', 'facebook_pixel_id', 'google_analytics_id', 'google_tag_manager_id', 'enable_download_app', 'app_download_link']));
CREATE POLICY "Master can see everything" ON public.site_settings FOR SELECT TO authenticated USING (check_is_master(auth.uid()));
CREATE POLICY "Master can manage everything" ON public.site_settings FOR ALL TO authenticated USING (check_is_master(auth.uid())) WITH CHECK (check_is_master(auth.uid()));
CREATE POLICY "Admins can view non-sensitive settings" ON public.site_settings FOR SELECT TO authenticated USING (is_admin(auth.uid()) AND key <> ALL (ARRAY['supabase_service_role_key', 'supabase_url', 'mercadopago_access_token', 'paggue_client_secret']));

-- orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins have full access to orders" ON public.orders FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
