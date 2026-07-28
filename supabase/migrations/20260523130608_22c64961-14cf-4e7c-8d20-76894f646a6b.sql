CREATE OR REPLACE FUNCTION public.repair_order(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_campaign RECORD;
    v_tickets_count INTEGER;
    v_pad_len INTEGER;
    v_count INTEGER := 0;
    v_max_attempts INTEGER := 0;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    
    IF v_order IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado');
    END IF;

    IF v_order.payment_status != 'paid' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Apenas pedidos pagos podem ser auditados');
    END IF;

    -- Corrigir timestamp de pagamento se ausente
    IF v_order.paid_at IS NULL THEN
        UPDATE public.orders SET paid_at = v_order.created_at WHERE id = p_order_id;
    END IF;

    SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_order.campaign_id;
    v_pad_len := LENGTH(v_campaign.total_tickets::text);

    -- 1. Confirmar tickets existentes (Manual ou Reservados)
    UPDATE public.tickets 
    SET status = 'confirmed', 
        reservation_expires_at = NULL 
    WHERE order_id = p_order_id AND status != 'confirmed';

    -- 2. Gerar tickets faltantes se for 'auto'
    IF v_campaign.ticket_generation_type = 'auto' THEN
        SELECT count(*) INTO v_count FROM public.tickets WHERE order_id = p_order_id;
        
        WHILE v_count < v_order.quantity AND v_max_attempts < (v_order.quantity * 5) LOOP
            v_max_attempts := v_max_attempts + 1;
            
            INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status)
            SELECT p_order_id, v_order.campaign_id, v_order.user_id, LPAD(floor(random() * v_campaign.total_tickets)::text, v_pad_len, '0'), 'confirmed'
            WHERE NOT EXISTS (
               SELECT 1 FROM public.tickets WHERE campaign_id = v_order.campaign_id AND number = LPAD(floor(random() * v_campaign.total_tickets)::text, v_pad_len, '0')
            )
            ON CONFLICT DO NOTHING;
            
            SELECT count(*) INTO v_count FROM public.tickets WHERE order_id = p_order_id;
        END LOOP;
    ELSE
        SELECT count(*) INTO v_count FROM public.tickets WHERE order_id = p_order_id;
    END IF;

    -- 3. Atualizar contagem da campanha
    UPDATE public.campaigns
    SET sold_tickets = (SELECT count(*) FROM public.tickets WHERE campaign_id = v_order.campaign_id AND status = 'confirmed')
    WHERE id = v_order.campaign_id;

    RETURN jsonb_build_object('success', true, 'message', 'Pedido auditado e corrigido. Total de tickets: ' || v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
