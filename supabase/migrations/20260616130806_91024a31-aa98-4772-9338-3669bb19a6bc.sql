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
  v_final_value NUMERIC := 0;
  v_is_free BOOLEAN := FALSE;
  v_pre_awarded_spin_id UUID;
  v_prize_label TEXT := 'Tente novamente';
  v_prize_type TEXT := 'none';
  v_prize_color TEXT := '#ef4444';
  v_is_win BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_campaign_record
  FROM public.campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

  IF NOT v_campaign_record.roulette_enabled THEN
    RAISE EXCEPTION 'Roleta desativada';
  END IF;

  IF p_multiplier < 1 OR p_multiplier > COALESCE(v_campaign_record.roulette_multiplier_max, 10) THEN
    RAISE EXCEPTION 'Multiplicador inválido';
  END IF;

  SELECT id INTO v_pre_awarded_spin_id
  FROM public.roulette_spins
  WHERE user_id = v_user_id
    AND campaign_id = p_campaign_id
    AND prize_label IS NULL
    AND is_free = TRUE
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_pre_awarded_spin_id IS NOT NULL THEN
    v_is_free := TRUE;
    v_total_cost := 0;
  ELSE
    v_spin_cost := COALESCE(v_campaign_record.roulette_spin_cost, 0);
    v_total_cost := v_spin_cost * p_multiplier;

    IF v_total_cost > 0 THEN
      SELECT balance INTO v_user_balance
      FROM public.profiles
      WHERE user_id = v_user_id;

      IF v_user_balance IS NULL OR v_user_balance < v_total_cost THEN
        RAISE EXCEPTION 'Saldo insuficiente';
      END IF;

      UPDATE public.profiles
      SET balance = balance - v_total_cost
      WHERE user_id = v_user_id;
    ELSIF v_spin_cost = 0 AND COALESCE(v_campaign_record.roulette_free_tickets, 0) > 0 THEN
      RAISE EXCEPTION 'Sem giros disponíveis';
    END IF;
  END IF;

  v_random_val := random() * 100;

  WITH configured_slots AS (
    SELECT
      rp.*,
      row_number() OVER (PARTITION BY rp.label ORDER BY rp.id) AS slot_number
    FROM public.roulette_prizes rp
    WHERE rp.campaign_id = p_campaign_id
      AND COALESCE(rp.chance_percent, 0) > 0
      AND rp.label IS NOT NULL
      AND rp.label <> 'Tente novamente'
      AND COALESCE(rp.prize_type, '') <> 'none'
  ), taken_by_label AS (
    SELECT
      rs.prize_label,
      count(*)::integer AS taken_count
    FROM public.roulette_spins rs
    WHERE rs.campaign_id = p_campaign_id
      AND rs.prize_label IS NOT NULL
      AND rs.prize_label <> 'Tente novamente'
      AND COALESCE(rs.prize_type, '') <> 'none'
    GROUP BY rs.prize_label
  ), available_slots AS (
    SELECT cs.*
    FROM configured_slots cs
    LEFT JOIN taken_by_label tb ON tb.prize_label = cs.label
    WHERE cs.slot_number > COALESCE(tb.taken_count, 0)
  ), weighted AS (
    SELECT
      available_slots.*,
      SUM(COALESCE(chance_percent, 0)) OVER (ORDER BY id) AS cumulative_weight
    FROM available_slots
  )
  SELECT * INTO v_selected_prize
  FROM weighted
  WHERE cumulative_weight >= v_random_val
  ORDER BY cumulative_weight ASC
  LIMIT 1;

  IF v_selected_prize IS NOT NULL THEN
    v_is_win := TRUE;
    v_prize_label := v_selected_prize.label;
    v_prize_type := v_selected_prize.prize_type;
    v_prize_color := COALESCE(v_selected_prize.color, '#FACC15');
    v_final_value := COALESCE(v_selected_prize.value, 0) * p_multiplier;
  END IF;

  IF v_pre_awarded_spin_id IS NOT NULL THEN
    UPDATE public.roulette_spins
    SET prize_label = v_prize_label,
        prize_type = v_prize_type,
        prize_value = v_final_value,
        created_at = now()
    WHERE id = v_pre_awarded_spin_id;
  ELSE
    INSERT INTO public.roulette_spins (user_id, campaign_id, prize_label, prize_type, prize_value, is_free)
    VALUES (v_user_id, p_campaign_id, v_prize_label, v_prize_type, v_final_value, FALSE);
  END IF;

  IF v_is_win THEN
    IF v_prize_type IN ('balance', 'fixed_value') THEN
      UPDATE public.profiles
      SET balance = balance + v_final_value
      WHERE user_id = v_user_id;
    ELSIF v_prize_type = 'points' THEN
      UPDATE public.profiles
      SET points = COALESCE(points, 0) + v_final_value::integer
      WHERE user_id = v_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'prize', CASE
      WHEN v_is_win THEN row_to_json(v_selected_prize)
      ELSE json_build_object('label', v_prize_label, 'prize_type', v_prize_type, 'color', v_prize_color)
    END,
    'final_value', v_final_value,
    'is_free', v_is_free,
    'new_balance', (SELECT balance FROM public.profiles WHERE user_id = v_user_id)
  );
END;
$function$;