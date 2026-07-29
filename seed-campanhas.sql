-- ============================================================
-- SEED: 2 campanhas completas (Veículo + Lancha)
-- Rode no SQL Editor do seu Supabase externo.
-- Idempotente: reexecutar apenas atualiza as campanhas.
-- ============================================================

-- Garante tenant padrão
INSERT INTO public.tenants (slug, name, is_active, plan)
VALUES ('default', 'Plataforma Principal', true, 'pro')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CAMPANHA 1 — HILUX SRX 2025 0KM
-- ============================================================
INSERT INTO public.campaigns (
  tenant_id, title, slug, subtitle, description,
  image_url, hero_image_url, gallery_urls,
  ticket_price, total_tickets, sold_tickets, min_tickets, max_tickets,
  status, featured, urgency_tag, draw_date, timer_end_date, show_timer,
  price_bundles, main_prizes, lucky_numbers_prizes,
  ranking_enabled, mystery_box_enabled, roulette_enabled, scratch_cards_enabled,
  show_instant_prizes, auto_numbers, manual_numbers, ticket_generation_type,
  payment_methods, sales_goal, progress_text, regulations
) VALUES (
  (SELECT id FROM public.tenants WHERE slug='default'),
  'Hilux SRX 2025 0KM + R$ 20.000 no PIX',
  'hilux-srx-2025',
  'A picape dos sonhos na sua garagem por menos de R$ 5',
  E'🔥 **A CAMPANHA MAIS DESEJADA DO ANO CHEGOU!**\n\nConcorra a uma **Toyota Hilux SRX 2025 0KM, zero quilômetro, emplacada e com documentação 100% no seu nome** — e ainda leve **R$ 20.000 em dinheiro via PIX** para comemorar.\n\n**Por que participar?**\n- Cota a partir de **R$ 4,90** — o preço de um café\n- **10 cotas premiadas** pagando na hora, sem esperar o sorteio\n- Sorteio pela **Loteria Federal**, 100% auditável e transparente\n- Pagamento via **PIX aprovado em segundos**, cotas liberadas na hora\n- Quanto mais cotas, **maior o desconto** (até 45% OFF nos combos)\n\n**Prêmio principal:** Toyota Hilux SRX 4x4 Diesel 2025, na cor à escolha do ganhador, + R$ 20.000 no PIX.\n**2º prêmio:** R$ 10.000 no PIX.\n**3º prêmio:** R$ 5.000 no PIX.\n\n⚡ *As cotas estão saindo muito rápido. Garanta a sua antes que acabe!*',
  '/__l5e/assets-v1/5f831dea-e63a-45b1-8fa4-fbdcedf860d3/campanha-hilux.jpg',
  '/__l5e/assets-v1/5f831dea-e63a-45b1-8fa4-fbdcedf860d3/campanha-hilux.jpg',
  '["/__l5e/assets-v1/5f831dea-e63a-45b1-8fa4-fbdcedf860d3/campanha-hilux.jpg"]'::jsonb,
  4.90, 1000, 0, 1, 1000,
  'active', true, '🔥 ÚLTIMAS COTAS',
  (date_trunc('month', now()) + interval '1 month' + interval '19 days 20 hours'),
  (date_trunc('month', now()) + interval '1 month' + interval '19 days 20 hours'),
  true,
  '[
    {"quantity": 5,   "price": 24.50,   "label": "Iniciante"},
    {"quantity": 10,  "price": 44.00,   "label": "10% OFF"},
    {"quantity": 25,  "price": 98.00,   "label": "20% OFF"},
    {"quantity": 50,  "price": 171.50,  "label": "30% OFF", "is_popular": true},
    {"quantity": 100, "price": 294.00,  "label": "40% OFF"},
    {"quantity": 250, "price": 673.75,  "label": "45% OFF - MELHOR"}
  ]'::jsonb,
  '[
    {"position": 1, "prize": "Toyota Hilux SRX 2025 0KM + R$ 20.000 no PIX"},
    {"position": 2, "prize": "R$ 10.000 no PIX"},
    {"position": 3, "prize": "R$ 5.000 no PIX"}
  ]'::jsonb,
  '[
    {"number": "0007", "prize": "R$ 1.000 no PIX"},
    {"number": "0100", "prize": "R$ 500 no PIX"},
    {"number": "0250", "prize": "R$ 500 no PIX"},
    {"number": "0333", "prize": "R$ 300 no PIX"},
    {"number": "0404", "prize": "iPhone 16"},
    {"number": "0500", "prize": "R$ 300 no PIX"},
    {"number": "0666", "prize": "R$ 200 no PIX"},
    {"number": "0777", "prize": "R$ 1.500 no PIX"},
    {"number": "0888", "prize": "Smart TV 55\" 4K"},
    {"number": "0999", "prize": "R$ 2.000 no PIX"}
  ]'::jsonb,
  true, false, false, false,
  true, true, true, 'auto',
  '["pix"]'::jsonb, 4900, 'Cotas vendidas',
  E'1. Sorteio pela Loteria Federal na data informada.\n2. Cotas geradas automaticamente após confirmação do pagamento.\n3. Cotas premiadas são pagas em até 24h via PIX.\n4. O ganhador recebe o veículo com documentação em seu nome.\n5. Participação permitida somente para maiores de 18 anos.'
)
ON CONFLICT (slug) DO UPDATE SET
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  hero_image_url = EXCLUDED.hero_image_url,
  gallery_urls = EXCLUDED.gallery_urls,
  price_bundles = EXCLUDED.price_bundles,
  main_prizes = EXCLUDED.main_prizes,
  lucky_numbers_prizes = EXCLUDED.lucky_numbers_prizes,
  draw_date = EXCLUDED.draw_date,
  timer_end_date = EXCLUDED.timer_end_date,
  updated_at = now();

-- ============================================================
-- CAMPANHA 2 — LANCHA 26 PÉS
-- ============================================================
INSERT INTO public.campaigns (
  tenant_id, title, slug, subtitle, description,
  image_url, hero_image_url, gallery_urls,
  ticket_price, total_tickets, sold_tickets, min_tickets, max_tickets,
  status, featured, urgency_tag, draw_date, timer_end_date, show_timer,
  price_bundles, main_prizes, lucky_numbers_prizes,
  ranking_enabled, mystery_box_enabled, roulette_enabled, scratch_cards_enabled,
  show_instant_prizes, auto_numbers, manual_numbers, ticket_generation_type,
  payment_methods, sales_goal, progress_text, regulations
) VALUES (
  (SELECT id FROM public.tenants WHERE slug='default'),
  'Lancha 26 Pés + Motor 200HP + Carreta Rodoviária',
  'lancha-26-pes',
  'Realize o sonho da liberdade no mar por apenas R$ 5,90',
  E'⛵ **VOCÊ NAVEGANDO NO SEU PRÓPRIO BARCO EM MENOS DE 60 DIAS!**\n\nConcorra a uma **lancha 26 pés zero, com motor de popa 200HP, carreta rodoviária inclusa e documentação completa**. Tudo pronto para você sair navegando no dia seguinte ao sorteio.\n\n**O que está incluso no prêmio principal:**\n- Lancha 26 pés 0KM, cabinada, com bancos em couro náutico\n- Motor de popa 200HP com garantia de fábrica\n- Carreta rodoviária + kit náutico de segurança completo\n- **R$ 15.000 no PIX** para combustível e primeiras viagens\n\n**Por que essa campanha é diferente?**\n- Apenas **1.000 cotas** — chance real de ganhar\n- **10 cotas premiadas** com pagamento imediato via PIX\n- Combos com até **45% de desconto**\n- Sorteio pela **Loteria Federal**, transparente e auditável\n- Ranking de compradores com premiação extra para o Top 3\n\n🌊 *Poucas cotas, sonho grande. Garanta a sua agora!*',
  '/__l5e/assets-v1/dc7a4451-0101-4460-b397-78000e489046/campanha-lancha.jpg',
  '/__l5e/assets-v1/dc7a4451-0101-4460-b397-78000e489046/campanha-lancha.jpg',
  '["/__l5e/assets-v1/dc7a4451-0101-4460-b397-78000e489046/campanha-lancha.jpg"]'::jsonb,
  5.90, 1000, 0, 1, 1000,
  'active', true, '⚡ SORTEIO PRÓXIMO',
  (date_trunc('month', now()) + interval '1 month' + interval '26 days 20 hours'),
  (date_trunc('month', now()) + interval '1 month' + interval '26 days 20 hours'),
  true,
  '[
    {"quantity": 5,   "price": 29.50,  "label": "Iniciante"},
    {"quantity": 10,  "price": 53.00,  "label": "10% OFF"},
    {"quantity": 25,  "price": 118.00, "label": "20% OFF"},
    {"quantity": 50,  "price": 206.50, "label": "30% OFF", "is_popular": true},
    {"quantity": 100, "price": 354.00, "label": "40% OFF"},
    {"quantity": 250, "price": 811.25, "label": "45% OFF - MELHOR"}
  ]'::jsonb,
  '[
    {"position": 1, "prize": "Lancha 26 pés + Motor 200HP + Carreta + R$ 15.000 no PIX"},
    {"position": 2, "prize": "Jet Ski 130HP 0KM"},
    {"position": 3, "prize": "R$ 8.000 no PIX"}
  ]'::jsonb,
  '[
    {"number": "0011", "prize": "R$ 1.000 no PIX"},
    {"number": "0123", "prize": "R$ 500 no PIX"},
    {"number": "0222", "prize": "Caixa de Som JBL Boombox"},
    {"number": "0300", "prize": "R$ 300 no PIX"},
    {"number": "0450", "prize": "R$ 400 no PIX"},
    {"number": "0555", "prize": "R$ 1.500 no PIX"},
    {"number": "0620", "prize": "Kit Pesca Profissional"},
    {"number": "0700", "prize": "R$ 300 no PIX"},
    {"number": "0850", "prize": "Apple Watch"},
    {"number": "1000", "prize": "R$ 2.500 no PIX"}
  ]'::jsonb,
  true, false, false, false,
  true, true, true, 'auto',
  '["pix"]'::jsonb, 5900, 'Cotas vendidas',
  E'1. Sorteio pela Loteria Federal na data informada.\n2. Cotas geradas automaticamente após confirmação do pagamento.\n3. Cotas premiadas são pagas em até 24h via PIX.\n4. Transferência da embarcação e carreta com documentação em nome do ganhador.\n5. Participação permitida somente para maiores de 18 anos.'
)
ON CONFLICT (slug) DO UPDATE SET
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  hero_image_url = EXCLUDED.hero_image_url,
  gallery_urls = EXCLUDED.gallery_urls,
  price_bundles = EXCLUDED.price_bundles,
  main_prizes = EXCLUDED.main_prizes,
  lucky_numbers_prizes = EXCLUDED.lucky_numbers_prizes,
  draw_date = EXCLUDED.draw_date,
  timer_end_date = EXCLUDED.timer_end_date,
  updated_at = now();

-- ============================================================
-- BANNERS DE MARKETING NA HOME
-- ============================================================
INSERT INTO public.banners (tenant_id, title, subtitle, image_url, link_url, is_active, order_index)
SELECT (SELECT id FROM public.tenants WHERE slug='default'),
       'Hilux SRX 2025 0KM + R$ 20.000',
       'Cotas a partir de R$ 4,90 — 10 cotas premiadas na hora',
       '/__l5e/assets-v1/5f831dea-e63a-45b1-8fa4-fbdcedf860d3/campanha-hilux.jpg',
       '/campanha/hilux-srx-2025', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.banners WHERE link_url = '/campanha/hilux-srx-2025');

INSERT INTO public.banners (tenant_id, title, subtitle, image_url, link_url, is_active, order_index)
SELECT (SELECT id FROM public.tenants WHERE slug='default'),
       'Lancha 26 Pés + Motor 200HP',
       'Apenas 1.000 cotas — a partir de R$ 5,90',
       '/__l5e/assets-v1/dc7a4451-0101-4460-b397-78000e489046/campanha-lancha.jpg',
       '/campanha/lancha-26-pes', true, 2
WHERE NOT EXISTS (SELECT 1 FROM public.banners WHERE link_url = '/campanha/lancha-26-pes');

-- ============================================================
-- COMUNICADO + FAIXA DE MARKETING
-- ============================================================
INSERT INTO public.announcements (tenant_id, title, content, published_at)
SELECT (SELECT id FROM public.tenants WHERE slug='default'),
       'Duas novas campanhas no ar: Hilux 0KM e Lancha 26 pés!',
       E'Chegaram as duas maiores campanhas do ano!\n\n🚙 Hilux SRX 2025 0KM + R$ 20.000 no PIX — cotas a partir de R$ 4,90\n⛵ Lancha 26 pés + Motor 200HP + Carreta — cotas a partir de R$ 5,90\n\nAmbas com apenas 1.000 cotas, 10 cotas premiadas pagas na hora e combos com até 45% de desconto. Sorteios pela Loteria Federal no mês que vem. Boa sorte!',
       now()
WHERE NOT EXISTS (SELECT 1 FROM public.announcements WHERE title LIKE 'Duas novas campanhas%');

UPDATE public.site_settings SET value = 'true'  WHERE key = 'home_marquee_enabled';
UPDATE public.site_settings SET value = '🔥 HILUX SRX 0KM + R$ 20.000 NO PIX — COTAS A PARTIR DE R$ 4,90  •  ⛵ LANCHA 26 PÉS + MOTOR 200HP — SÓ 1.000 COTAS  •  💸 10 COTAS PREMIADAS PAGAS NA HORA  •  ATÉ 45% OFF NOS COMBOS'
WHERE key = 'home_marquee_text';

-- Conferência
SELECT title, slug, ticket_price, total_tickets, jsonb_array_length(price_bundles) AS combos,
       jsonb_array_length(lucky_numbers_prizes) AS cotas_premiadas, draw_date
FROM public.campaigns WHERE slug IN ('hilux-srx-2025','lancha-26-pes');
