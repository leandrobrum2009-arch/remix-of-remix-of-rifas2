INSERT INTO public.site_settings (key, value, description)
VALUES ('button_glow_intensity', '0.2', 'Intensidade do efeito de brilho (glow) ao redor dos botões (0 a 1).')
ON CONFLICT (key) DO NOTHING;
