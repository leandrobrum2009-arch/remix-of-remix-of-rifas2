DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'site_settings_key_unique'
      AND conrelid = 'public.site_settings'::regclass
  ) THEN
    ALTER TABLE public.site_settings
      ADD CONSTRAINT site_settings_key_unique UNIQUE (key);
  END IF;
END $$;

INSERT INTO public.site_settings (key, value, description)
VALUES
  ('home_show_games_combo', 'true', 'Exibir combo de jogos na home'),
  ('home_show_game_roleta', 'true', 'Exibir bloco de roleta na home'),
  ('home_show_game_raspadinha', 'true', 'Exibir bloco de raspadinha na home'),
  ('home_show_game_caixa', 'true', 'Exibir bloco de caixa misteriosa na home'),
  ('home_show_game_ranking', 'true', 'Exibir bloco de ranking na home'),
  ('home_show_game_afiliados', 'true', 'Exibir bloco de afiliados na home'),
  ('home_show_how_it_works', 'true', 'Exibir bloco como participar na home'),
  ('home_show_faq', 'true', 'Exibir bloco de perguntas frequentes na home'),
  ('home_show_trust_badges', 'true', 'Exibir selos de confiança na home'),
  ('home_show_cta', 'true', 'Exibir chamada final na home'),
  ('home_show_testimonials', 'true', 'Exibir depoimentos na home'),
  ('home_show_hall_fame', 'true', 'Exibir hall da fama na home'),
  ('home_show_live_activity', 'true', 'Exibir atividade em tempo real na home'),
  ('inline_show_finished_raffles', 'true', 'Listar rifas finalizadas no layout em linha')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Public can view whitelisted settings" ON public.site_settings;

CREATE POLICY "Public can view whitelisted settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (
  key = ANY (ARRAY[
    'site_name'::text,
    'site_title'::text,
    'site_description'::text,
    'site_keywords'::text,
    'site_logo_url'::text,
    'site_logo_height'::text,
    'site_logo_height_mobile'::text,
    'site_favicon_url'::text,
    'primary_color'::text,
    'company_name'::text,
    'company_address'::text,
    'company_cnpj'::text,
    'company_email'::text,
    'company_phone'::text,
    'support_whatsapp'::text,
    'home_hero_style'::text,
    'home_marquee_enabled'::text,
    'home_marquee_text'::text,
    'home_show_games_combo'::text,
    'home_show_game_roleta'::text,
    'home_show_game_raspadinha'::text,
    'home_show_game_caixa'::text,
    'home_show_game_ranking'::text,
    'home_show_game_afiliados'::text,
    'home_show_how_it_works'::text,
    'home_show_faq'::text,
    'home_show_trust_badges'::text,
    'home_show_cta'::text,
    'home_show_testimonials'::text,
    'home_show_hall_fame'::text,
    'home_show_live_activity'::text,
    'inline_show_finished_raffles'::text,
    'inline_testimonials_count'::text,
    'layout_mode'::text,
    'hero_transition_speed'::text,
    'hero_transition_type'::text,
    'animation_easing'::text,
    'border_shimmer_opacity'::text,
    'button_glow_intensity'::text,
    'button_glow_speed'::text,
    'button_hover_effect'::text,
    'title_shimmer_primary'::text,
    'title_shimmer_secondary'::text,
    'title_shimmer_secondary_light'::text,
    'title_shimmer_speed'::text,
    'active_payment_provider'::text,
    'manual_payment_enabled'::text,
    'manual_payment_pix_key'::text,
    'manual_payment_pix_name'::text,
    'mercadopago_public_key'::text,
    'affiliate_commission_percent'::text,
    'cashback_percent'::text,
    'min_withdrawal_amount'::text,
    'facebook_pixel_id'::text,
    'google_analytics_id'::text,
    'google_tag_manager_id'::text,
    'enable_download_app'::text,
    'app_download_link'::text
  ])
);