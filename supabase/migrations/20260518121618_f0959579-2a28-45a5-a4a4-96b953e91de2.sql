CREATE OR REPLACE FUNCTION public.process_roulette_spin(
  p_campaign_id UUID,
  p_multiplier INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_campaign_record RECORD;
  v_total_paid_tickets INTEGER;
  v_free_spins_used INTEGER;
  v_available_free_spins INTEGER;
  v_spin_cost NUMERIC;
  v_total_cost NUMERIC;
  v_user_balance NUMERIC;
  v_selected_prize RECORD;
  v_random_val NUMERIC;
  v_cumulative_prob NUMERIC := 0;
  v_final_value NUMERIC;
  v_is_free BOOLEAN := FALSE;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Get campaign config
  SELECT * INTO v_campaign_record FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

  IF NOT v_campaign_record.roulette_enabled THEN
    RAISE EXCEPTION 'Roleta desativada para esta campanha';
  END IF;

  -- Validate multiplier
  IF p_multiplier < 1 OR p_multiplier > COALESCE(v_campaign_record.roulette_multiplier_max, 10) THEN
    RAISE EXCEPTION 'Multiplicador inválido';
  END IF;

  -- Calculate free spins
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_paid_tickets
  FROM public.orders
  WHERE user_id = v_user_id AND campaign_id = p_campaign_id AND payment_status = 'paid';

  IF COALESCE(v_campaign_record.roulette_free_tickets, 0) > 0 THEN
    v_available_free_spins := v_total_paid_tickets / v_campaign_record.roulette_free_tickets;
  ELSE
    v_available_free_spins := 0;
  END IF;

  SELECT COUNT(*) INTO v_free_spins_used
  FROM public.roulette_spins
  WHERE user_id = v_user_id AND campaign_id = p_campaign_id AND is_free = TRUE;

  -- Determine if this spin is free
  IF v_available_free_spins > v_free_spins_used THEN
    v_is_free := TRUE;
    v_total_cost := 0;
  ELSE
    v_spin_cost := COALESCE(v_campaign_record.roulette_spin_cost, 0);
    v_total_cost := v_spin_cost * p_multiplier;
  END IF;

  -- Check balance if not free
  SELECT balance INTO v_user_balance FROM public.profiles WHERE user_id = v_user_id;
  IF v_total_cost > 0 AND v_user_balance < v_total_cost THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- Deduct balance
  IF v_total_cost > 0 THEN
    UPDATE public.profiles SET balance = balance - v_total_cost WHERE user_id = v_user_id;
  END IF;

  -- Select prize (weighted random)
  v_random_val := random() * 100;
  
  SELECT * INTO v_selected_prize
  FROM (
    SELECT *, SUM(chance_percent) OVER (ORDER BY id) as cumulative_weight
    FROM public.roulette_prizes
    WHERE campaign_id = p_campaign_id
  ) p
  WHERE cumulative_weight >= v_random_val
  ORDER BY cumulative_weight ASC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback to first prize if something goes wrong
    SELECT * INTO v_selected_prize FROM public.roulette_prizes WHERE campaign_id = p_campaign_id LIMIT 1;
  END IF;

  v_final_value := COALESCE(v_selected_prize.value, 0) * p_multiplier;

  -- Insert spin record
  INSERT INTO public.roulette_spins (
    user_id,
    campaign_id,
    prize_label,
    prize_type,
    prize_value,
    is_free
  ) VALUES (
    v_user_id,
    p_campaign_id,
    v_selected_prize.label,
    v_selected_prize.prize_type,
    v_final_value,
    v_is_free
  );

  -- Award prize
  IF v_selected_prize.prize_type = 'balance' THEN
    UPDATE public.profiles SET balance = balance + v_final_value WHERE user_id = v_user_id;
  ELSIF v_selected_prize.prize_type = 'points' THEN
    UPDATE public.profiles SET points = COALESCE(points, 0) + v_final_value::integer WHERE user_id = v_user_id;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'prize', row_to_json(v_selected_prize),
    'final_value', v_final_value,
    'is_free', v_is_free,
    'new_balance', (SELECT balance FROM public.profiles WHERE user_id = v_user_id)
  );
END;
$$;
