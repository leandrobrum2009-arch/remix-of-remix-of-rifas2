-- ============================================================
-- SEED: site_settings (Mercado Pago, Tema/Logo, PIX, Menu, Home)
-- Rode este arquivo no SQL Editor do seu Supabase externo.
-- Idempotente: pode rodar várias vezes sem duplicar.
-- ============================================================

-- Garante o tenant padrão (necessário para current_tenant_id / RLS)
INSERT INTO public.tenants (slug, name, is_active, plan)
VALUES ('default', 'Plataforma Principal', true, 'pro')
ON CONFLICT (slug) DO NOTHING;

WITH t AS (
  SELECT id FROM public.tenants WHERE slug = 'default' LIMIT 1
),
seed(key, value, description) AS (
  VALUES
    -- ===== Identidade / Visual =====
    ('site_name',                    'Minha Plataforma',            'Nome da plataforma'),
    ('site_title',                   'Minha Plataforma',            'Título do navegador (SEO)'),
    ('site_logo_url',                '',                            'Logotipo principal'),
    ('site_logo_height',             '48',                          'Altura do logo (desktop)'),
    ('site_logo_height_mobile',      '36',                          'Altura do logo (mobile)'),
    ('site_favicon_url',             '',                            'Favicon'),
    ('site_theme',                   'dark',                        'Tema do site'),
    ('primary_color',                '#22c55e',                     'Cor primária'),
    ('title_shimmer_primary',        '#facc15',                     'Cor de destaque do título'),
    ('title_shimmer_secondary',      '#0f1729',                     'Cor secundária (dark)'),
    ('title_shimmer_secondary_light','#ffffff',                     'Cor secundária (light)'),
    ('border_shimmer_opacity',       '0.4',                         'Opacidade da borda'),
    ('button_glow_speed',            '3000',                        'Velocidade do brilho do botão'),
    ('button_glow_intensity',        '0.5',                         'Intensidade do brilho'),
    ('button_hover_effect',          'scale',                       'Efeito hover nos botões'),
    ('title_shimmer_speed',          '3000',                        'Velocidade do brilho do título'),
    ('hero_transition_speed',        '5000',                        'Velocidade do slide'),
    ('hero_transition_type',         'fade',                        'Tipo de transição'),
    ('home_hero_style',              'model1',                      'Estilo do carrossel principal'),
    ('animation_easing',             'cubic-bezier(0.4, 0, 0.2, 1)','Curva de animação'),
    ('layout_mode',                  'default',                     'Modelo de layout das campanhas'),
    ('inline_testimonials_count',    '6',                           'Qtd. depoimentos (em linha)'),
    ('inline_show_finished_raffles', 'true',                        'Listar ações finalizadas (em linha)'),

    -- ===== Pagamentos / Mercado Pago =====
    -- ATENÇÃO: tokens privados devem ficar nos Secrets das Edge Functions.
    -- Aqui ficam apenas chave pública e o provedor ativo.
    ('active_payment_provider',      'mercadopago',                 'Provedor de pagamento ativo'),
    ('mercadopago_public_key',       '',                            'Mercado Pago: public key (pública)'),
    ('paggue_client_key',            '',                            'Paggue: client key'),
    ('pay2m_client_key',             '',                            'Pay2m: client key'),
    ('pay2m_enabled',                'false',                       'Habilitar Pay2m'),

    -- ===== PIX manual =====
    ('manual_payment_enabled',       'false',                       'Pagamento manual via PIX'),
    ('manual_payment_pix_key',       '',                            'Chave PIX manual'),
    ('manual_payment_pix_name',      '',                            'Nome do titular PIX'),

    -- ===== Financeiro =====
    ('cashback_percent',             '0',                           '% de cashback por compra'),
    ('affiliate_commission_percent', '10',                          '% de comissão de afiliados'),
    ('min_withdrawal_amount',        '20',                          'Valor mínimo de saque'),
    ('deposit_bonus_tiers',          '[]',                          'Bônus por depósito (JSON)'),

    -- ===== Contato / Empresa =====
    ('support_whatsapp',             '',                            'WhatsApp de atendimento'),
    ('company_name',                 '',                            'Nome fantasia / razão social'),
    ('company_cnpj',                 '',                            'CNPJ'),
    ('company_address',              '',                            'Endereço completo'),
    ('company_phone',                '',                            'Telefone de contato'),
    ('company_email',                '',                            'E-mail de contato'),
    ('whatsapp_group_link',          '',                            'Link do grupo do WhatsApp'),
    ('whatsapp_group_enabled',       'false',                       'Exibir botão do grupo'),

    -- ===== SEO / Scripts =====
    ('site_description',             '',                            'Descrição meta (SEO)'),
    ('site_keywords',                '',                            'Palavras-chave (SEO)'),
    ('facebook_pixel_id',            '',                            'Pixel do Facebook'),
    ('google_analytics_id',          '',                            'Google Analytics (GA4)'),
    ('google_tag_manager_id',        '',                            'Google Tag Manager'),
    ('custom_header_scripts',        '',                            'Scripts no header'),
    ('custom_body_scripts',          '',                            'Scripts no body'),

    -- ===== App / PWA =====
    ('enable_download_app',          'false',                       'Botão baixar app'),
    ('app_download_link',            '',                            'Link do app / APK'),

    -- ===== Home =====
    ('home_marquee_enabled',         'false',                       'Faixa de texto corrida'),
    ('home_marquee_text',            '',                            'Texto da faixa corrida'),
    ('home_show_testimonials',       'true',                        'Exibir depoimentos'),
    ('home_show_hall_fame',          'true',                        'Exibir hall da fama'),
    ('home_show_live_activity',      'true',                        'Atividade em tempo real'),
    ('home_testimonials_json',       '',                            'Depoimentos personalizados'),
    ('home_hall_fame_json',          '',                            'Hall da fama personalizado'),
    ('home_show_games_combo',        'true',                        'Combo de jogos'),
    ('home_show_game_roleta',        'true',                        'Bloco roleta'),
    ('home_show_game_raspadinha',    'true',                        'Bloco raspadinha'),
    ('home_show_game_caixa',         'true',                        'Bloco caixa misteriosa'),
    ('home_show_game_ranking',       'true',                        'Bloco ranking'),
    ('home_show_game_afiliados',     'true',                        'Bloco afiliados'),
    ('home_show_how_it_works',       'true',                        'Bloco como participar'),
    ('home_show_faq',                'true',                        'Bloco FAQ'),
    ('home_show_trust_badges',       'true',                        'Selos de confiança'),
    ('home_show_cta',                'true',                        'Chamada final (CTA)'),

    -- ===== Menu =====
    ('menu_campanhas_enabled',       'true',                        'Menu campanhas'),
    ('menu_ganhadores_enabled',      'true',                        'Menu ganhadores'),
    ('menu_federal_enabled',         'true',                        'Menu federal'),
    ('menu_comunicados_enabled',     'true',                        'Menu comunicados'),
    ('menu_suporte_enabled',         'true',                        'Menu suporte'),
    ('menu_minha_conta_enabled',     'true',                        'Menu minha conta'),
    ('header_register_button_enabled','true',                       'Botão cadastre-se no header'),

    -- ===== Página de vendas =====
    ('show_sales_page',              'false',                       'Habilitar página de vendas'),
    ('sales_page_keywords',          '',                            'Palavras-chave da venda'),
    ('sales_page_type',              'rifas',                       'Tipo da plataforma'),
    ('sales_page_whatsapp',          '',                            'WhatsApp de vendas')
)
INSERT INTO public.site_settings (key, value, description, tenant_id)
SELECT s.key, s.value, s.description, t.id
FROM seed s CROSS JOIN t
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_settings ss WHERE ss.key = s.key
);

-- Remove chaves sensíveis que nunca devem ficar no banco/painel.
DELETE FROM public.site_settings
WHERE key IN (
  'supabase_service_role_key',
  'mercadopago_access_token',
  'paggue_client_secret',
  'pay2m_client_secret'
);

-- Conferência
SELECT count(*) AS total_configuracoes FROM public.site_settings;
