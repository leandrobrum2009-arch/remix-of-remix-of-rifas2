-- Keep the Lovable Supabase tenant routing aligned with the production domains.
UPDATE public.tenants
SET name = 'Luckskins',
    plan = 'pro',
    is_active = true
WHERE slug = 'default';

INSERT INTO public.tenant_domains (tenant_id, domain, is_primary)
SELECT id, 'luckskins.com.br', true
FROM public.tenants
WHERE slug = 'default'
ON CONFLICT (domain) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    is_primary = EXCLUDED.is_primary;

WITH new_tenant AS (
  INSERT INTO public.tenants (slug, name, is_active, plan)
  VALUES ('itskin', 'It Skin', true, 'pro')
  ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      plan = EXCLUDED.plan
  RETURNING id
)
INSERT INTO public.tenant_domains (tenant_id, domain, is_primary)
SELECT (SELECT id FROM new_tenant), d.domain, d.is_primary
FROM (VALUES
  ('itskin.com.br', true),
  ('www.itskin.com.br', false)
) AS d(domain, is_primary)
ON CONFLICT (domain) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id,
    is_primary = EXCLUDED.is_primary;

INSERT INTO public.site_settings (key, value)
VALUES
  ('menu_campanhas_enabled', 'true'),
  ('menu_ganhadores_enabled', 'true'),
  ('menu_federal_enabled', 'true'),
  ('menu_comunicados_enabled', 'true'),
  ('menu_suporte_enabled', 'true'),
  ('menu_minha_conta_enabled', 'true'),
  ('header_register_button_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

WITH all_tenants AS (
  SELECT id FROM public.tenants WHERE slug IN ('default', 'itskin')
)
INSERT INTO public.tenant_settings (tenant_id, key, value)
SELECT id, k, v
FROM all_tenants
CROSS JOIN (VALUES
  ('menu_campanhas_enabled', 'true'),
  ('menu_ganhadores_enabled', 'true'),
  ('menu_federal_enabled', 'true'),
  ('menu_comunicados_enabled', 'true'),
  ('menu_suporte_enabled', 'true'),
  ('menu_minha_conta_enabled', 'true'),
  ('header_register_button_enabled', 'true')
) AS s(k, v)
ON CONFLICT (tenant_id, key) DO UPDATE
SET value = EXCLUDED.value;

WITH t AS (SELECT id FROM public.tenants WHERE slug = 'default')
INSERT INTO public.tenant_settings (tenant_id, key, value)
SELECT (SELECT id FROM t), k, v FROM (VALUES
  ('site_name', 'Luckskins'),
  ('site_title', 'Luckskins'),
  ('site_description', 'A melhor e mais segura plataforma de rifas online. Participe e ganhe premios incriveis!'),
  ('primary_color', '#E0B000'),
  ('site_theme', 'dark')
) AS s(k, v)
ON CONFLICT (tenant_id, key) DO UPDATE
SET value = EXCLUDED.value;

WITH t AS (SELECT id FROM public.tenants WHERE slug = 'itskin')
INSERT INTO public.tenant_settings (tenant_id, key, value)
SELECT (SELECT id FROM t), k, v FROM (VALUES
  ('site_name', 'It Skin'),
  ('site_title', 'It Skin'),
  ('site_description', 'Participe das campanhas It Skin com pagamento via PIX e sorteios online.'),
  ('primary_color', '#E0B000'),
  ('site_theme', 'dark')
) AS s(k, v)
ON CONFLICT (tenant_id, key) DO UPDATE
SET value = EXCLUDED.value;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'edu.matosr6@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'master')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
