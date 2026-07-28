CREATE OR REPLACE FUNCTION public.handle_order_payment(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update Order status
    UPDATE public.orders 
    SET payment_status = 'paid', 
        paid_at = now() 
    WHERE id = p_order_id;
    
    -- Update Tickets status
    UPDATE public.tickets 
    SET status = 'paid' 
    WHERE order_id = p_order_id;

    -- Update campaign sold_tickets count
    UPDATE public.campaigns c
    SET sold_tickets = sold_tickets + (SELECT quantity FROM public.orders WHERE id = p_order_id)
    WHERE id = (SELECT campaign_id FROM public.orders WHERE id = p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;