-- Fix process_scratch_card_play to use user_id and handle empty prizes
CREATE OR REPLACE FUNCTION public.process_scratch_card_play(p_campaign_id uuid DEFAULT NULL::uuid, p_cost numeric DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_prize RECORD;
    v_is_winner BOOLEAN := false;
    v_prize_id UUID := NULL;
    v_prize_label TEXT := 'Tente novamente';
    v_prize_value NUMERIC := 0;
    v_prize_type TEXT := 'none';
    v_new_balance NUMERIC;
    v_total_chance NUMERIC;
    v_random_val NUMERIC;
    v_current_chance NUMERIC := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    -- Check balance if cost > 0
    IF p_cost > 0 THEN
        SELECT balance INTO v_new_balance FROM public.profiles WHERE user_id = v_user_id;
        IF v_new_balance IS NULL OR v_new_balance < p_cost THEN
            RAISE EXCEPTION 'Saldo insuficiente';
        END IF;
        
        -- Deduct cost
        UPDATE public.profiles SET balance = balance - p_cost WHERE user_id = v_user_id;
    END IF;

    -- Get prizes
    SELECT SUM(chance_percent) INTO v_total_chance 
    FROM public.scratch_card_prizes 
    WHERE is_active = true 
    AND (campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND campaign_id IS NULL));

    IF v_total_chance IS NOT NULL AND v_total_chance > 0 THEN
        v_random_val := random() * 100;
        
        IF v_random_val <= v_total_chance THEN
            FOR v_prize IN 
                SELECT * FROM public.scratch_card_prizes 
                WHERE is_active = true 
                AND (campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND campaign_id IS NULL))
                ORDER BY id
            LOOP
                v_current_chance := v_current_chance + v_prize.chance_percent;
                IF v_random_val <= v_current_chance THEN
                    v_is_winner := true;
                    v_prize_id := v_prize.id;
                    v_prize_label := v_prize.label;
                    v_prize_value := v_prize.value;
                    v_prize_type := v_prize.prize_type;
                    EXIT;
                END IF;
            END LOOP;
        END IF;
    END IF;

    -- Handle winner rewards
    IF v_is_winner THEN
        IF v_prize_type = 'balance' THEN
            UPDATE public.profiles SET balance = balance + v_prize_value WHERE user_id = v_user_id;
        ELSIF v_prize_type = 'points' THEN
            UPDATE public.profiles SET points = COALESCE(points, 0) + v_prize_value::integer WHERE user_id = v_user_id;
        END IF;
    END IF;

    -- Record scratch
    INSERT INTO public.scratch_card_scratches (
        user_id, prize_id, prize_label, prize_value, prize_type, cost, is_winner, campaign_id
    ) VALUES (
        v_user_id, v_prize_id, v_prize_label, v_prize_value, v_prize_type, p_cost, v_is_winner, p_campaign_id
    );

    -- Get updated balance
    SELECT balance INTO v_new_balance FROM public.profiles WHERE user_id = v_user_id;

    RETURN json_build_object(
        'is_winner', v_is_winner,
        'prize', CASE WHEN v_is_winner THEN json_build_object(
            'id', v_prize_id,
            'label', v_prize_label,
            'value', v_prize_value,
            'prize_type', v_prize_type
        ) ELSE NULL END,
        'new_balance', v_new_balance
    );
END;
$function$;

-- Update process_roulette_spin to handle empty prizes
CREATE OR REPLACE FUNCTION public.process_roulette_spin(p_campaign_id uuid, p_multiplier integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_campaign_record RECORD;
  v_spin_cost NUMERIC;
  v_total_cost NUMERIC;
  v_user_balance NUMERIC;
  v_selected_prize RECORD;
  v_random_val NUMERIC;
  v_final_value NUMERIC;
  v_is_free BOOLEAN := FALSE;
  v_pre_awarded_spin_id UUID;
  v_prizes_exist BOOLEAN;
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

  -- 1. Check for pre-awarded spins
  SELECT id INTO v_pre_awarded_spin_id
  FROM public.roulette_spins
  WHERE user_id = v_user_id AND campaign_id = p_campaign_id AND prize_label IS NULL AND is_free = TRUE
  LIMIT 1;

  IF v_pre_awarded_spin_id IS NOT NULL THEN
    v_is_free := TRUE;
    v_total_cost := 0;
  ELSE
    -- 2. Fallback to buy logic
    v_spin_cost := COALESCE(v_campaign_record.roulette_spin_cost, 0);
    IF v_spin_cost <= 0 THEN RAISE EXCEPTION 'Sem giros disponíveis'; END IF;
    v_total_cost := v_spin_cost * p_multiplier;

    -- Check balance
    SELECT balance INTO v_user_balance FROM public.profiles WHERE user_id = v_user_id;
    IF v_user_balance < v_total_cost THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

    -- Deduct balance
    UPDATE public.profiles SET balance = balance - v_total_cost WHERE user_id = v_user_id;
  END IF;

  -- Check if prizes exist
  SELECT EXISTS(SELECT 1 FROM public.roulette_prizes WHERE campaign_id = p_campaign_id) INTO v_prizes_exist;

  IF v_prizes_exist THEN
      -- Select prize (weighted random)
      v_random_val := random() * 100;
      SELECT * INTO v_selected_prize
      FROM (SELECT *, SUM(chance_percent) OVER (ORDER BY id) as cumulative_weight FROM public.roulette_prizes WHERE campaign_id = p_campaign_id) p
      WHERE cumulative_weight >= v_random_val ORDER BY cumulative_weight ASC LIMIT 1;

      IF NOT FOUND THEN SELECT * INTO v_selected_prize FROM public.roulette_prizes WHERE campaign_id = p_campaign_id LIMIT 1; END IF;
  ELSE
      -- No prizes configured, award 'Try again'
      v_selected_prize := (NULL, p_campaign_id, 'Tente novamente', 0, 'none', 0, '#666666', true, now(), now());
  END IF;

  v_final_value := COALESCE(v_selected_prize.value, 0) * p_multiplier;

  -- Save result
  IF v_pre_awarded_spin_id IS NOT NULL THEN
    UPDATE public.roulette_spins SET
      prize_label = COALESCE(v_selected_prize.label, 'Tente novamente'),
      prize_type = COALESCE(v_selected_prize.prize_type, 'none'),
      prize_value = v_final_value,
      created_at = now()
    WHERE id = v_pre_awarded_spin_id;
  ELSE
    INSERT INTO public.roulette_spins (user_id, campaign_id, prize_label, prize_type, prize_value, is_free)
    VALUES (v_user_id, p_campaign_id, COALESCE(v_selected_prize.label, 'Tente novamente'), COALESCE(v_selected_prize.prize_type, 'none'), v_final_value, FALSE);
  END IF;

  -- Award prize
  IF v_selected_prize.prize_type = 'balance' THEN
    UPDATE public.profiles SET balance = balance + v_final_value WHERE user_id = v_user_id;
  ELSIF v_selected_prize.prize_type = 'points' THEN
    UPDATE public.profiles SET points = COALESCE(points, 0) + v_final_value::integer WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'prize', CASE WHEN v_prizes_exist THEN row_to_json(v_selected_prize) ELSE json_build_object('label', 'Tente novamente', 'prize_type', 'none', 'color', '#666666') END,
    'final_value', v_final_value,
    'is_free', v_is_free,
    'new_balance', (SELECT balance FROM public.profiles WHERE user_id = v_user_id)
  );
END;
$function$;
