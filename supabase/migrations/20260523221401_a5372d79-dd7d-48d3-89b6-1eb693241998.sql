-- Fix release_expired_tickets to actually free up the numbers
CREATE OR REPLACE FUNCTION public.release_expired_tickets()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Delete expired reserved tickets to free up the numbers
    DELETE FROM public.tickets
    WHERE status = 'reserved' AND reservation_expires_at < now();

    -- Mark orders as expired
    UPDATE public.orders
    SET payment_status = 'expired'
    WHERE payment_status = 'pending' AND expires_at < now();
END;
$function$;

-- Ensure handle_order_payment also cleans up if we want to cancel
-- (Adding p_action for future flexibility)
CREATE OR REPLACE FUNCTION public.handle_order_payment(
    p_order_id uuid,
    p_payment_id text DEFAULT NULL,
    p_payment_provider text DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_campaign_id UUID;
    v_user_id UUID;
    v_quantity INTEGER;
    v_roulette_rules JSONB;
    v_rule JSONB;
    v_max_spins INTEGER := 0;
    v_current_status TEXT;
BEGIN
    -- Get order details with a lock
    SELECT o.campaign_id, o.user_id, o.quantity, o.payment_status, c.roulette_rules
    INTO v_campaign_id, v_user_id, v_quantity, v_current_status, v_roulette_rules
    FROM public.orders o
    JOIN public.campaigns c ON o.campaign_id = c.id
    WHERE o.id = p_order_id
    FOR UPDATE;

    -- Prevent duplicate processing
    IF v_current_status = 'paid' THEN
        RETURN;
    END IF;

    -- Update Order status (triggers process_paid_order)
    UPDATE public.orders 
    SET payment_status = 'paid', 
        paid_at = now(),
        payment_id = COALESCE(p_payment_id, orders.payment_id),
        payment_provider = COALESCE(p_payment_provider, orders.payment_provider)
    WHERE id = p_order_id;
    
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
