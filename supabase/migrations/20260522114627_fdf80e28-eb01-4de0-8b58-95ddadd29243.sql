INSERT INTO site_settings (key, value, description) VALUES
('mercadopago_access_token', '', 'Access Token do Mercado Pago para processamento de pagamentos.'),
('mercadopago_public_key', '', 'Public Key do Mercado Pago para o frontend.'),
('manual_payment_enabled', 'false', 'Habilita ou desabilita o recebimento via PIX manual (comprovante).'),
('manual_payment_pix_key', '', 'Chave PIX para recebimento manual.'),
('manual_payment_pix_name', '', 'Nome do titular da conta PIX para conferência.'),
('paggue_client_key', '', 'Client Key da Paggue (opcional).'),
('paggue_client_secret', '', 'Client Secret da Paggue (opcional).');
