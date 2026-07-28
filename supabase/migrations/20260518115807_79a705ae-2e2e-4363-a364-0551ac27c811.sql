CREATE OR REPLACE FUNCTION public.reserve_tickets(
    p_campaign_id UUID,
    p_user_id UUID,
    p_quantity INTEGER,
    p_numbers TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_total_amount NUMERIC;
    v_ticket_price NUMERIC;
    v_reserved_count INTEGER;
    v_num TEXT;
    v_total_tickets INTEGER;
    v_pad_len INTEGER;
BEGIN
    -- Get campaign details
    SELECT ticket_price, total_tickets, LENGTH(total_tickets::text) 
    INTO v_ticket_price, v_total_tickets, v_pad_len 
    FROM public.campaigns WHERE id = p_campaign_id;
    
    -- Calculate total
    v_total_amount := v_ticket_price * p_quantity;
    
    -- Create Order
    INSERT INTO public.orders (user_id, campaign_id, quantity, total_amount, payment_status, expires_at)
    VALUES (p_user_id, p_campaign_id, p_quantity, v_total_amount, 'pending', now() + interval '15 minutes')
    RETURNING id INTO v_order_id;
    
    -- Reserve Numbers
    IF p_numbers IS NOT NULL AND array_length(p_numbers, 1) > 0 THEN
        -- Manual Selection
        FOR v_num IN SELECT unnest(p_numbers) LOOP
            -- Check if already exists/sold
            IF EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_num) THEN
                RAISE EXCEPTION 'Ticket % already reserved or sold', v_num;
            END IF;
            
            -- Check if protected
            IF EXISTS (
                SELECT 1 FROM campaigns 
                WHERE id = p_campaign_id 
                AND (lucky_numbers_prizes @> ('[{"number":"' || v_num || '", "protected":true}]')::jsonb)
            ) THEN
                RAISE EXCEPTION 'Ticket % already reserved or sold', v_num;
            END IF;
            
            INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status, reservation_expires_at)
            VALUES (v_order_id, p_campaign_id, p_user_id, v_num, 'reserved', now() + interval '15 minutes');
        END LOOP;
    ELSE
        -- Automatic Selection
        FOR i IN 1..p_quantity LOOP
            LOOP
                v_num := LPAD(floor(random() * v_total_tickets)::text, v_pad_len, '0');
                
                IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_num) 
                   AND NOT EXISTS (
                       SELECT 1 FROM campaigns 
                       WHERE id = p_campaign_id 
                       AND (lucky_numbers_prizes @> ('[{"number":"' || v_num || '", "protected":true}]')::jsonb)
                   )
                THEN
                    INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status, reservation_expires_at)
                    VALUES (v_order_id, p_campaign_id, p_user_id, v_num, 'reserved', now() + interval '15 minutes');
                    EXIT;
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;