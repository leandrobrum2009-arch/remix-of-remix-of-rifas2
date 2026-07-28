CREATE OR REPLACE FUNCTION public.handle_order_payment(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_campaign_id UUID;
    v_user_id UUID;
    v_quantity INTEGER;
    v_ticket_type TEXT;
    v_total_tickets INTEGER;
    v_pad_len INTEGER;
    v_num TEXT;
    v_roulette_rules JSONB;
    v_rule JSONB;
    v_spins_to_award INTEGER := 0;
    v_max_spins INTEGER := 0;
    v_current_status TEXT;
BEGIN
    -- Get order and campaign details with a lock on the order row
    SELECT o.campaign_id, o.user_id, o.quantity, o.payment_status, c.ticket_generation_type, c.total_tickets, LENGTH(c.total_tickets::text), c.roulette_rules
    INTO v_campaign_id, v_user_id, v_quantity, v_current_status, v_ticket_type, v_total_tickets, v_pad_len, v_roulette_rules
    FROM public.orders o
    JOIN public.campaigns c ON o.campaign_id = c.id
    WHERE o.id = p_order_id
    FOR UPDATE;

    -- Prevent duplicate processing
    IF v_current_status = 'paid' THEN
        RETURN;
    END IF;

    -- Update Order status
    UPDATE public.orders 
    SET payment_status = 'paid', 
        paid_at = now() 
    WHERE id = p_order_id;
    
    -- Finalize tickets
    IF EXISTS (SELECT 1 FROM public.tickets WHERE order_id = p_order_id) THEN
        UPDATE public.tickets SET status = 'confirmed' WHERE order_id = p_order_id;
    ELSE
        -- Random Selection
        FOR i IN 1..v_quantity LOOP
            LOOP
                v_num := LPAD(floor(random() * v_total_tickets)::text, v_pad_len, '0');
                IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = v_campaign_id AND number = v_num) 
                   AND NOT EXISTS (SELECT 1 FROM campaigns WHERE id = v_campaign_id AND (lucky_numbers_prizes @> ('[{"number":"' || v_num || '", "protected":true}]')::jsonb))
                THEN
                    INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status)
                    VALUES (p_order_id, v_campaign_id, v_user_id, v_num, 'confirmed');
                    EXIT;
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    -- Update stats
    UPDATE public.campaigns SET sold_tickets = sold_tickets + v_quantity WHERE id = v_campaign_id;

    -- Award Roulette Spins
    IF v_roulette_rules IS NOT NULL AND jsonb_array_length(v_roulette_rules) > 0 THEN
        FOR v_rule IN SELECT jsonb_array_elements(v_roulette_rules) LOOP
            IF v_quantity >= (v_rule->>'min_tickets')::integer THEN
                IF (v_rule->>'spins')::integer > v_max_spins THEN
                    v_max_spins := (v_rule->>'spins')::integer;
                END IF;
            END IF;
        END LOOP;
        
        IF v_max_spins > 0 THEN
            FOR i IN 1..v_max_spins LOOP
                INSERT INTO public.roulette_spins (user_id, campaign_id, is_free)
                VALUES (v_user_id, v_campaign_id, true);
            END LOOP;
        END IF;
    END IF;
END;
$function$;
