
-- 1. mystery_box_wins: owner-only SELECT
DROP POLICY IF EXISTS "Anyone can view mystery box wins" ON public.mystery_box_wins;
CREATE POLICY "Users can view their own mystery box wins"
ON public.mystery_box_wins FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all mystery box wins"
ON public.mystery_box_wins FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 2. roulette_spins: owner-only SELECT
DROP POLICY IF EXISTS "Anyone can view roulette spins" ON public.roulette_spins;
CREATE POLICY "Users can view their own roulette spins"
ON public.roulette_spins FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roulette spins"
ON public.roulette_spins FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 3. custom_presets: admin-only writes (keep public read)
DROP POLICY IF EXISTS "Authenticated users can insert custom presets" ON public.custom_presets;
DROP POLICY IF EXISTS "Authenticated users can delete custom presets" ON public.custom_presets;
CREATE POLICY "Admins can manage custom presets"
ON public.custom_presets FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. site_settings: allowlist of public keys
DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.site_settings;
CREATE POLICY "Public can view whitelisted settings"
ON public.site_settings FOR SELECT
USING (key IN (
  'site_name','site_logo_url','primary_color',
  'company_name','company_address','company_cnpj','company_email','company_phone',
  'support_whatsapp',
  'home_hero_style','home_marquee_enabled','home_marquee_text',
  'hero_transition_speed','hero_transition_type',
  'animation_easing','border_shimmer_opacity',
  'button_glow_intensity','button_glow_speed','button_hover_effect',
  'title_shimmer_primary','title_shimmer_secondary','title_shimmer_secondary_light','title_shimmer_speed',
  'active_payment_provider','manual_payment_enabled','manual_payment_pix_key','manual_payment_pix_name',
  'mercadopago_public_key',
  'affiliate_commission_percent','cashback_percent','min_withdrawal_amount'
));

-- 5. Storage: admin-only writes on campaigns + site-assets buckets
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Site Assets Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Site Assets Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Site Assets Authenticated Delete" ON storage.objects;

CREATE POLICY "Admins can upload campaign images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'campaigns' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update campaign images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'campaigns' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete campaign images"
ON storage.objects FOR DELETE
USING (bucket_id = 'campaigns' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload site assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete site assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));
