INSERT INTO public.site_settings (key, value)
VALUES 
  ('site_logo_height', '44'),
  ('site_logo_height_mobile', '36')
ON CONFLICT (key) DO NOTHING;