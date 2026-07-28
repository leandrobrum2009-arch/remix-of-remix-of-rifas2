
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  plan TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tenants TO anon, authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants are readable by everyone" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Only master can modify tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'master'::app_role));

CREATE TABLE public.tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenant_domains_tenant_id ON public.tenant_domains(tenant_id);
CREATE INDEX idx_tenant_domains_domain_lower ON public.tenant_domains(lower(domain));
GRANT SELECT ON public.tenant_domains TO anon, authenticated;
GRANT ALL ON public.tenant_domains TO service_role;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Domains are readable by everyone" ON public.tenant_domains FOR SELECT USING (true);
CREATE POLICY "Only master can modify domains" ON public.tenant_domains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'master'::app_role));

CREATE TABLE public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);
CREATE INDEX idx_tenant_settings_tenant_id ON public.tenant_settings(tenant_id);
GRANT SELECT ON public.tenant_settings TO anon, authenticated;
GRANT ALL ON public.tenant_settings TO service_role;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are readable by everyone" ON public.tenant_settings FOR SELECT USING (true);
CREATE POLICY "Admin/master can modify settings" ON public.tenant_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'master'::app_role));

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tenant_domains_updated_at BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tenant_settings_updated_at BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

WITH new_tenant AS (
  INSERT INTO public.tenants (slug, name, plan)
  VALUES ('default', 'Default Tenant', 'default')
  RETURNING id
)
INSERT INTO public.tenant_domains (tenant_id, domain, is_primary)
SELECT id, d.domain, d.is_primary
FROM new_tenant, (VALUES
  ('sistemarifas.lovable.app', true),
  ('sistemaparaleiloes.site', false),
  ('sortedomilhao.app', false)
) AS d(domain, is_primary);
