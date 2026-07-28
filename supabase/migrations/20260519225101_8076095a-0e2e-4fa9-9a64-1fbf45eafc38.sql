INSERT INTO public.site_settings (key, value, description)
VALUES ('primary_color', '#16a34a', 'Cor primária do site em formato Hex (ex: #16a34a). Altera a cor principal de botões, destaques e elementos interativos.')
ON CONFLICT (key) DO NOTHING;
