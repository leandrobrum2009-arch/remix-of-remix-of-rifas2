-- Allow NULLs in roulette_spins for prize info
ALTER TABLE public.roulette_spins ALTER COLUMN prize_label DROP NOT NULL;
ALTER TABLE public.roulette_spins ALTER COLUMN prize_type DROP NOT NULL;

-- Update handle_order_payment to insert pre-awarded spins with correct schema
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
    
    -- Finalize tickets
    IF EXISTS (SELECT 1 FROM public.tickets WHERE order_id = p_order_id) THEN
        UPDATE public.tickets SET status = 'confirmed' WHERE order_id = p_order_id;
    ELSE
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

-- Update process_roulette_spin to use pre-awarded spins
CREATE OR REPLACE FUNCTION public.process_roulette_spin(p_campaign_id uuid, p_multiplier integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_campaign_record RECORD;
  v_available_free_spins_count INTEGER;
  v_spin_cost NUMERIC;
  v_total_cost NUMERIC;
  v_user_balance NUMERIC;
  v_selected_prize RECORD;
  v_random_val NUMERIC;
  v_final_value NUMERIC;
  v_is_free BOOLEAN := FALSE;
  v_pre_awarded_spin_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  -- Get campaign config
  SELECT * INTO v_campaign_record FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF NOT v_campaign_record.roulette_enabled THEN RAISE EXCEPTION 'Roleta desativada'; END IF;

  -- Validate multiplier
  IF p_multiplier < 1 OR p_multiplier > COALESCE(v_campaign_record.roulette_multiplier_max, 10) THEN RAISE EXCEPTION 'Multiplicador inválido'; END IF;

  -- 1. Check for pre-awarded spins (NULL prize_label)
  SELECT id INTO v_pre_awarded_spin_id
  FROM public.roulette_spins
  WHERE user_id = v_user_id AND campaign_id = p_campaign_id AND prize_label IS NULL AND is_free = TRUE
  LIMIT 1;

  IF v_pre_awarded_spin_id IS NOT NULL THEN
    v_is_free := TRUE;
    v_total_cost := 0;
  ELSE
    -- 2. Fallback to buy logic if no free spins
    v_spin_cost := COALESCE(v_campaign_record.roulette_spin_cost, 0);
    IF v_spin_cost <= 0 THEN RAISE EXCEPTION 'Sem giros disponíveis'; END IF;
    v_total_cost := v_spin_cost * p_multiplier;

    -- Check balance
    SELECT balance INTO v_user_balance FROM public.profiles WHERE user_id = v_user_id;
    IF v_user_balance < v_total_cost THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

    -- Deduct balance
    UPDATE public.profiles SET balance = balance - v_total_cost WHERE user_id = v_user_id;
  END IF;

  -- Select prize (weighted random)
  v_random_val := random() * 100;
  SELECT * INTO v_selected_prize
  FROM (SELECT *, SUM(chance_percent) OVER (ORDER BY id) as cumulative_weight FROM public.roulette_prizes WHERE campaign_id = p_campaign_id) p
  WHERE cumulative_weight >= v_random_val ORDER BY cumulative_weight ASC LIMIT 1;

  IF NOT FOUND THEN SELECT * INTO v_selected_prize FROM public.roulette_prizes WHERE campaign_id = p_campaign_id LIMIT 1; END IF;

  v_final_value := COALESCE(v_selected_prize.value, 0) * p_multiplier;

  -- Save result
  IF v_pre_awarded_spin_id IS NOT NULL THEN
    -- Update existing record
    UPDATE public.roulette_spins SET
      prize_label = v_selected_prize.label,
      prize_type = v_selected_prize.prize_type,
      prize_value = v_final_value,
      created_at = now()
    WHERE id = v_pre_awarded_spin_id;
  ELSE
    -- Insert new paid spin record
    INSERT INTO public.roulette_spins (user_id, campaign_id, prize_label, prize_type, prize_value, is_free)
    VALUES (v_user_id, p_campaign_id, v_selected_prize.label, v_selected_prize.prize_type, v_final_value, FALSE);
  END IF;

  -- Award prize
  IF v_selected_prize.prize_type = 'balance' THEN
    UPDATE public.profiles SET balance = balance + v_final_value WHERE user_id = v_user_id;
  ELSIF v_selected_prize.prize_type = 'points' THEN
    UPDATE public.profiles SET points = COALESCE(points, 0) + v_final_value::integer WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'prize', row_to_json(v_selected_prize),
    'final_value', v_final_value,
    'is_free', v_is_free,
    'new_balance', (SELECT balance FROM public.profiles WHERE user_id = v_user_id)
  );
END;
$function$;
