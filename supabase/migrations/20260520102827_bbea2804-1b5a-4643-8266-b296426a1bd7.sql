INSERT INTO site_settings (key, value, description) VALUES
('company_name', '', 'Razão Social ou Nome Fantasia da empresa.'),
('company_cnpj', '', 'CNPJ da empresa (ex: 00.000.000/0000-00).'),
('company_address', '', 'Endereço completo da sede da empresa.'),
('company_phone', '', 'Telefone de contato corporativo.'),
('company_email', '', 'E-mail oficial de contato da empresa.')
ON CONFLICT (key) DO NOTHING;