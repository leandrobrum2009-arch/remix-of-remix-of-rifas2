CREATE OR REPLACE FUNCTION public.reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[] DEFAULT NULL::text[], p_affiliate_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order_id UUID;
    v_total_amount NUMERIC;
    v_ticket_price NUMERIC;
    v_num TEXT;
    v_total_tickets INTEGER;
    v_pad_len INTEGER;
    v_ticket_type TEXT;
    v_campaign_status TEXT;
    v_draw_date TIMESTAMPTZ;
    v_expiration_interval INTERVAL := '15 minutes';
    v_available_count INTEGER;
    v_generated_count INTEGER := 0;
    v_random_num TEXT;
BEGIN
    -- Get campaign details and check validity
    SELECT ticket_price, total_tickets, LENGTH(total_tickets::text), ticket_generation_type, status, draw_date
    INTO v_ticket_price, v_total_tickets, v_pad_len, v_ticket_type, v_campaign_status, v_draw_date
    FROM public.campaigns WHERE id = p_campaign_id;

    -- Ensure campaign is active
    IF v_campaign_status != 'active' THEN
        RAISE EXCEPTION 'Esta campanha não está aceitando novos pedidos (Status: %).', v_campaign_status;
    END IF;

    -- Ensure draw date hasn't passed
    IF v_draw_date IS NOT NULL AND v_draw_date < now() THEN
        RAISE EXCEPTION 'O período de vendas para esta campanha já encerrou.';
    END IF;

    -- Calculate total
    v_total_amount := v_ticket_price * p_quantity;

    -- Create Order
    INSERT INTO public.orders (user_id, campaign_id, quantity, total_amount, payment_status, expires_at, affiliate_id)
    VALUES (p_user_id, p_campaign_id, p_quantity, v_total_amount, 'pending', now() + v_expiration_interval, p_affiliate_id)
    RETURNING id INTO v_order_id;

    -- Reserve Numbers
    IF (p_numbers IS NOT NULL AND array_length(p_numbers, 1) > 0) THEN
        -- Manual selection
        FOREACH v_num IN ARRAY p_numbers LOOP
            -- Check if number is already taken
            IF EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_num AND (status IN ('confirmed', 'paid') OR (status = 'reserved' AND reservation_expires_at > now()))) THEN
                RAISE EXCEPTION 'O número % já está reservado ou pago.', v_num;
            END IF;

            INSERT INTO public.tickets (campaign_id, user_id, order_id, number, status, reservation_expires_at)
            VALUES (p_campaign_id, p_user_id, v_order_id, v_num, 'reserved', now() + v_expiration_interval);
        END LOOP;
    ELSE
        -- Automatic generation
        -- Get count of available numbers
        SELECT v_total_tickets - COUNT(*) INTO v_available_count
        FROM public.tickets 
        WHERE campaign_id = p_campaign_id 
        AND (status IN ('confirmed', 'paid') OR (status = 'reserved' AND reservation_expires_at > now()));

        IF v_available_count < p_quantity THEN
            RAISE EXCEPTION 'Não há cotas suficientes disponíveis. Disponível: %, Solicitado: %', v_available_count, p_quantity;
        END IF;

        -- Generate random numbers that are not taken
        WHILE v_generated_count < p_quantity LOOP
            v_random_num := LPAD(FLOOR(RANDOM() * v_total_tickets)::text, v_pad_len, '0');
            
            -- Check if number is taken
            IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_random_num AND (status IN ('confirmed', 'paid') OR (status = 'reserved' AND reservation_expires_at > now()))) THEN
                INSERT INTO public.tickets (campaign_id, user_id, order_id, number, status, reservation_expires_at)
                VALUES (p_campaign_id, p_user_id, v_order_id, v_random_num, 'reserved', now() + v_expiration_interval);
                v_generated_count := v_generated_count + 1;
            END IF;
        END LOOP;
    END IF;

    RETURN v_order_id;
END;
$function$
