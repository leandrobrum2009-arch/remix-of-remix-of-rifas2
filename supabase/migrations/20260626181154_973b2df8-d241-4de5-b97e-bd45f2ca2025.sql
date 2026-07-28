
INSERT INTO public.site_settings (key, value) VALUES
  ('menu_campanhas_enabled', 'true'),
  ('menu_ganhadores_enabled', 'true'),
  ('menu_federal_enabled', 'true'),
  ('menu_comunicados_enabled', 'true'),
  ('menu_suporte_enabled', 'true'),
  ('menu_minha_conta_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
