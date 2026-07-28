-- Add roulette_rules column to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS roulette_rules JSONB DEFAULT '[]'::jsonb;

-- Update reserve_tickets to only assign numbers for manual raffles or when numbers are provided
CREATE OR REPLACE FUNCTION public.reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[] DEFAULT NULL::text[])
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
BEGIN
    -- Get campaign details
    SELECT ticket_price, total_tickets, LENGTH(total_tickets::text), ticket_generation_type
    INTO v_ticket_price, v_total_tickets, v_pad_len, v_ticket_type
    FROM public.campaigns WHERE id = p_campaign_id;
    
    -- Calculate total
    v_total_amount := v_ticket_price * p_quantity;
    
    -- Create Order
    INSERT INTO public.orders (user_id, campaign_id, quantity, total_amount, payment_status, expires_at)
    VALUES (p_user_id, p_campaign_id, p_quantity, v_total_amount, 'pending', now() + interval '15 minutes')
    RETURNING id INTO v_order_id;
    
    -- Reserve Numbers only if Manual or if numbers provided
    IF (p_numbers IS NOT NULL AND array_length(p_numbers, 1) > 0) OR v_ticket_type = 'manual' THEN
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
            -- Random but assigned during reservation (not requested by user but keeping for compatibility if needed)
            -- Actually the user wants Random to be assigned AFTER payment.
            -- So if v_ticket_type is 'auto', we do nothing here.
            NULL;
        END IF;
    END IF;

    RETURN v_order_id;
END;
$function$;

-- Update handle_order_payment to assign numbers for random raffles
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
BEGIN
    -- Get order and campaign details
    SELECT o.campaign_id, o.user_id, o.quantity, c.ticket_generation_type, c.total_tickets, LENGTH(c.total_tickets::text), c.roulette_rules
    INTO v_campaign_id, v_user_id, v_quantity, v_ticket_type, v_total_tickets, v_pad_len, v_roulette_rules
    FROM public.orders o
    JOIN public.campaigns c ON o.campaign_id = c.id
    WHERE o.id = p_order_id;

    -- Update Order status
    UPDATE public.orders 
    SET payment_status = 'paid', 
        paid_at = now() 
    WHERE id = p_order_id;
    
    -- Check if tickets already exist (Manual)
    IF EXISTS (SELECT 1 FROM public.tickets WHERE order_id = p_order_id) THEN
        UPDATE public.tickets 
        SET status = 'paid' 
        WHERE order_id = p_order_id;
    ELSE
        -- Random Assignment (after payment)
        FOR i IN 1..v_quantity LOOP
            LOOP
                v_num := LPAD(floor(random() * v_total_tickets)::text, v_pad_len, '0');
                
                IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = v_campaign_id AND number = v_num) 
                   AND NOT EXISTS (
                       SELECT 1 FROM campaigns 
                       WHERE id = v_campaign_id 
                       AND (lucky_numbers_prizes @> ('[{"number":"' || v_num || '", "protected":true}]')::jsonb)
                   )
                THEN
                    INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status, paid_at)
                    VALUES (p_order_id, v_campaign_id, v_user_id, v_num, 'paid', now());
                    EXIT;
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    -- Update campaign sold_tickets count
    UPDATE public.campaigns 
    SET sold_tickets = sold_tickets + v_quantity
    WHERE id = v_campaign_id;

    -- Award Roulette Spins based on rules
    IF v_roulette_rules IS NOT NULL AND jsonb_array_length(v_roulette_rules) > 0 THEN
        FOR v_rule IN SELECT jsonb_array_elements(v_roulette_rules) LOOP
            IF v_quantity >= (v_rule->>'min_tickets')::integer THEN
                IF (v_rule->>'spins')::integer > v_max_spins THEN
                    v_max_spins := (v_rule->>'spins')::integer;
                END IF;
            END IF;
        END LOOP;
        
        v_spins_to_award := v_max_spins;
        
        IF v_spins_to_award > 0 THEN
            FOR i IN 1..v_spins_to_award LOOP
                INSERT INTO public.roulette_spins (user_id, campaign_id, is_free)
                VALUES (v_user_id, v_campaign_id, true);
            END LOOP;
        END IF;
    END IF;
END;
$function$;
