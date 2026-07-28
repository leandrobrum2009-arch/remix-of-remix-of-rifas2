DROP POLICY IF EXISTS "Public can view whitelisted settings" ON public.site_settings;
CREATE POLICY "Public can view whitelisted settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY[
  'site_name','site_title','site_description','site_keywords','site_logo_url','site_logo_height','site_logo_height_mobile','site_favicon_url','primary_color',
  'company_name','company_address','company_cnpj','company_email','company_phone','support_whatsapp',
  'home_hero_style','home_marquee_enabled','home_marquee_text','home_show_games_combo','home_show_game_roleta','home_show_game_raspadinha','home_show_game_caixa','home_show_game_ranking','home_show_game_afiliados','home_show_how_it_works','home_show_faq','home_show_trust_badges','home_show_cta','home_show_testimonials','home_show_hall_fame','home_show_live_activity',
  'inline_show_finished_raffles','inline_testimonials_count','layout_mode',
  'hero_transition_speed','hero_transition_type','animation_easing','border_shimmer_opacity','button_glow_intensity','button_glow_speed','button_hover_effect','title_shimmer_primary','title_shimmer_secondary','title_shimmer_secondary_light','title_shimmer_speed',
  'active_payment_provider','manual_payment_enabled','manual_payment_pix_key','manual_payment_pix_name','mercadopago_public_key',
  'affiliate_commission_percent','cashback_percent','min_withdrawal_amount','deposit_bonus_tiers',
  'facebook_pixel_id','google_analytics_id','google_tag_manager_id','enable_download_app','app_download_link'
]));