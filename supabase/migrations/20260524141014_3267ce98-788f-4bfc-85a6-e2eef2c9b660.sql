INSERT INTO public.site_settings (key, value, description) VALUES 
('show_sales_page', 'false', 'Habilitar página de vendas como página inicial'),
('sales_page_keywords', 'sistema para rifas online, script para rifas online, tenha a sua rifa, site para fazer rifas', 'Palavras-chave separadas por vírgula para a página de vendas'),
('sales_page_type', 'rifas', 'Tipo da plataforma (rifas, leilões, etc)'),
('sales_page_whatsapp', '', 'WhatsApp específico para vendas da plataforma (deixe vazio para usar o padrão)')
ON CONFLICT (key) DO NOTHING;