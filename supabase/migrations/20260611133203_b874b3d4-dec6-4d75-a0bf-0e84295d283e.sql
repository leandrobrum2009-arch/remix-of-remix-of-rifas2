INSERT INTO public.site_settings (key, value)
VALUES 
  ('pay2m_client_key', ''),
  ('pay2m_client_secret', ''),
  ('pay2m_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
