INSERT INTO public.site_settings (key, value, description)
VALUES ('animation_easing', 'cubic-bezier(0.4, 0, 0.2, 1)', 'Tipo de curva de suavização (easing) para todas as animações do site (ex: ease, linear, cubic-bezier).')
ON CONFLICT (key) DO NOTHING;
