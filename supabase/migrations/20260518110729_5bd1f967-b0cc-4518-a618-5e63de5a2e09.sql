CREATE OR REPLACE FUNCTION public.on_order_paid_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Pagamento Confirmado!',
            'Seu pagamento para a campanha foi confirmado. Boa sorte!',
            'win'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_on_order_paid_notification
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.on_order_paid_notification();