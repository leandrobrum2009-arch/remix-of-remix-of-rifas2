WITH t AS (
  SELECT id FROM public.tenants WHERE slug = 'sortedomilhao'
)
INSERT INTO public.tenant_settings (tenant_id, key, value)
SELECT (SELECT id FROM t), k, v FROM (VALUES
  ('site_name', 'Sorteio do Milhão'),
  ('site_title', 'Sorteio do Milhão'),
  ('site_description', 'A melhor e mais segura plataforma de rifas online do Brasil. Participe e ganhe prêmios incríveis!'),
  ('primary_color', '#E0B000'),
  ('site_logo_url', 'https://hjmjhjwvfsefanmnbsdd.supabase.co/storage/v1/object/public/site-assets/settings/site_logo_url-sosmj5.png'),
  ('site_favicon_url', 'https://hjmjhjwvfsefanmnbsdd.supabase.co/storage/v1/object/public/site-assets/settings/site_logo_url-sosmj5.png'),
  ('whatsapp_support_number', '5521996509905'),
  ('site_theme', 'dark')
) AS s(k, v)
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

UPDATE public.tenants SET name = 'Sorteio do Milhão' WHERE slug = 'sortedomilhao';