INSERT INTO public.site_settings (key, value, description)
VALUES ('hero_transition_type', 'slide', 'Tipo de transição entre os slides (ex: slide, fade).')
ON CONFLICT (key) DO NOTHING;
