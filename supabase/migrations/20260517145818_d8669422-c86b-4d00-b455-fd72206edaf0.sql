-- Add sales_goal to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sales_goal NUMERIC;

-- Atomic reservation function
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
BEGIN
    -- Get campaign details
    SELECT ticket_price INTO v_ticket_price FROM public.campaigns WHERE id = p_campaign_id;
    
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
            
            INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status, reservation_expires_at)
            VALUES (v_order_id, p_campaign_id, p_user_id, v_num, 'reserved', now() + interval '15 minutes');
        END LOOP;
    ELSE
        -- Automatic Selection (simplified: just find gaps)
        -- In a real high-traffic app, we might want a pool of available numbers.
        -- Here we'll just insert new records and the number will be assigned.
        -- For simplicity, let's assume we just generate random numbers that don't exist yet.
        FOR i IN 1..p_quantity LOOP
            LOOP
                v_num := LPAD(floor(random() * (SELECT total_tickets FROM campaigns WHERE id = p_campaign_id))::text, 6, '0');
                IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_num) THEN
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

-- Function to perform a draw
CREATE OR REPLACE FUNCTION public.perform_draw(p_campaign_id UUID)
RETURNS UUID AS $$
DECLARE
    v_winning_ticket RECORD;
    v_winner_id UUID;
BEGIN
    -- Select a random paid ticket
    SELECT * INTO v_winning_ticket 
    FROM public.tickets 
    WHERE campaign_id = p_campaign_id AND status = 'paid'
    ORDER BY random()
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No paid tickets found for this campaign';
    END IF;
    
    -- Get user name from profiles
    -- Note: This is simplified. In a real app we'd want to store more data.
    
    INSERT INTO public.winners (campaign_id, winner_name, ticket_number, prize_description, draw_date)
    SELECT 
        p_campaign_id, 
        p.name, 
        v_winning_ticket.number, 
        c.title || ' - Sorteio Realizado', 
        now()
    FROM public.profiles p, public.campaigns c
    WHERE p.user_id = v_winning_ticket.user_id AND c.id = p_campaign_id
    RETURNING id INTO v_winner_id;
    
    -- Update campaign status
    UPDATE public.campaigns SET status = 'completed' WHERE id = p_campaign_id;
    
    RETURN v_winner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
