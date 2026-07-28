INSERT INTO public.site_settings (key, value, description)
VALUES ('active_payment_provider', 'mercadopago', 'Provedor de pagamento ativo (mercadopago, paggue, ou manual)')
ON CONFLICT (key) DO NOTHING;