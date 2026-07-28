INSERT INTO site_settings (key, value, description) VALUES
('home_marquee_enabled', 'true', 'Habilita ou desabilita a faixa de texto corrido no banner da página inicial.'),
('home_marquee_text', 'ÚLTIMAS COTAS DISPONÍVEIS • PRÊMIOS INSTANTÂNEOS NO PIX • SORTEIO 100% GARANTIDO', 'Texto que será exibido na faixa do banner (use • para separar frases).')
ON CONFLICT (key) DO NOTHING;