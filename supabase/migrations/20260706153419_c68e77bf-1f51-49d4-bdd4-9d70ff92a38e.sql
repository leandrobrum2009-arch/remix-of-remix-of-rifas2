-- Create dedicated tenant for sortedomilhao.app
WITH new_tenant AS (
  INSERT INTO public.tenants (slug, name, is_active, plan)
  VALUES ('sortedomilhao', 'Sorte do Milhão', true, 'pro')
  RETURNING id
)
, move_domains AS (
  UPDATE public.tenant_domains td
  SET tenant_id = (SELECT id FROM new_tenant), is_primary = true
  WHERE td.domain IN ('sortedomilhao.app', 'www.sortedomilhao.app')
  RETURNING 1
)
, ensure_www AS (
  INSERT INTO public.tenant_domains (tenant_id, domain, is_primary)
  SELECT (SELECT id FROM new_tenant), 'www.sortedomilhao.app', false
  WHERE NOT EXISTS (SELECT 1 FROM public.tenant_domains WHERE domain = 'www.sortedomilhao.app')
  RETURNING 1
)
INSERT INTO public.tenant_settings (tenant_id, key, value)
SELECT (SELECT id FROM new_tenant), k, v FROM (VALUES
  ('site_name', 'Sorte do Milhão'),
  ('site_title', 'Sorte do Milhão — Rifas Online com Prêmios Milionários'),
  ('site_description', 'Participe das rifas da Sorte do Milhão. Pagamento via PIX, sorteios pela Loteria Federal e prêmios garantidos.'),
  ('primary_color', '#22c55e')
) AS s(k, v)
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;