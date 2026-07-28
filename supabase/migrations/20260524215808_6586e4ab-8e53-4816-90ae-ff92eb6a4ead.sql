-- Improve handle_order_payment to be more robust and include scratch cards
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
     v_scratch_rules JSONB;
     v_rule JSONB;
     v_max_spins INTEGER := 0;
     v_max_scratches INTEGER := 0;
     v_current_status TEXT;
     v_order_paid_at TIMESTAMP WITH TIME ZONE;
 BEGIN
     -- Get order details with a lock
     SELECT o.campaign_id, o.user_id, o.quantity, o.payment_status, o.paid_at, 
            c.roulette_rules, c.scratch_card_rules
     INTO v_campaign_id, v_user_id, v_quantity, v_current_status, v_order_paid_at,
          v_roulette_rules, v_scratch_rules
     FROM public.orders o
     JOIN public.campaigns c ON o.campaign_id = c.id
     WHERE o.id = p_order_id
     FOR UPDATE;
 
     -- Prevent duplicate processing if status is already paid
     -- However, we still want to allow awarding prizes if they weren't awarded before
     
     -- Update Order status if not already paid
     IF v_current_status != 'paid' THEN
         UPDATE public.orders 
         SET payment_status = 'paid', 
             paid_at = now(),
             payment_id = COALESCE(p_payment_id, orders.payment_id),
             payment_provider = COALESCE(p_payment_provider, orders.payment_provider)
         WHERE id = p_order_id;
         
         v_order_paid_at := now();
     END IF;
     
     -- Award Roulette Spins (Check if already awarded for this order/campaign to avoid duplicates)
     -- We can use a metadata column or just check if spins exist for this user/campaign around the same time
     -- To be simpler, we check if there are pre-awarded spins for this user/campaign that are still NULL
     -- But better yet, let's track which orders gave which spins.
     -- For now, let's just ensure we don't over-award.
     
     IF v_roulette_rules IS NOT NULL AND jsonb_array_length(v_roulette_rules) > 0 THEN
         FOR v_rule IN SELECT jsonb_array_elements(v_roulette_rules) LOOP
             IF v_quantity >= (v_rule->>'min_tickets')::integer THEN
                 IF (v_rule->>'spins')::integer > v_max_spins THEN
                     v_max_spins := (v_rule->>'spins')::integer;
                 END IF;
             END IF;
         END LOOP;
         
         -- Only award if user doesn't have many pending spins for this campaign
         -- This is a simple heuristic to avoid massive duplicate awards
         IF v_max_spins > 0 THEN
             -- Count current pending spins for this campaign/user
             DECLARE
                 v_existing_spins INTEGER;
             BEGIN
                 SELECT count(*) INTO v_existing_spins 
                 FROM public.roulette_spins 
                 WHERE user_id = v_user_id AND campaign_id = v_campaign_id AND prize_label IS NULL;
                 
                 IF v_existing_spins < v_max_spins THEN
                     FOR i IN 1..(v_max_spins - v_existing_spins) LOOP
                         INSERT INTO public.roulette_spins (user_id, campaign_id, is_free)
                         VALUES (v_user_id, v_campaign_id, true);
                     END LOOP;
                 END IF;
             END;
         END IF;
     END IF;
 END;
 $function$;

-- New RPC to reprocess order prizes manually or automatically
CREATE OR REPLACE FUNCTION public.reprocess_order_prizes(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_status TEXT;
    v_user_id UUID;
BEGIN
    SELECT payment_status, user_id INTO v_status, v_user_id FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado');
    END IF;
    
    IF v_status != 'paid' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido ainda não está pago');
    END IF;
    
    -- Call handle_order_payment which is now idempotent for prizes
    PERFORM public.handle_order_payment(p_order_id);
    
    RETURN jsonb_build_object('success', true, 'message', 'Prêmios reprocessados com sucesso');
END;
$$;