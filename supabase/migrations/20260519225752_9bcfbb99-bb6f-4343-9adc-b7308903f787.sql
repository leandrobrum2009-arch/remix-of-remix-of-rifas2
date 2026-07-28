INSERT INTO public.site_settings (key, value, description)
VALUES 
  ('title_shimmer_primary', '#22c55e', 'Cor de destaque do brilho nos títulos (parte central).'),
  ('title_shimmer_secondary', '#ffffff', 'Cor base do brilho nos títulos (bordas) para o tema escuro.'),
  ('title_shimmer_secondary_light', '#000000', 'Cor base do brilho nos títulos (bordas) para o tema claro.')
ON CONFLICT (key) DO NOTHING;
