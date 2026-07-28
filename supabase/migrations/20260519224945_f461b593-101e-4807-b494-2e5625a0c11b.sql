-- Inserir novas configurações na tabela site_settings
INSERT INTO public.site_settings (key, value, description)
VALUES 
  ('hero_transition_speed', '5000', 'Velocidade de transição dos slides em milissegundos.'),
  ('button_glow_speed', '4', 'Velocidade da animação de brilho dos botões (segundos).'),
  ('title_shimmer_speed', '10', 'Velocidade do efeito de brilho nos títulos (segundos).'),
  ('button_hover_effect', 'true', 'Ativa/Desativa o efeito de escala e brilho ao passar o mouse.'),
  ('border_shimmer_opacity', '0.8', 'Opacidade do brilho na borda dos botões e cards (0 a 1).')
ON CONFLICT (key) DO NOTHING;
