CREATE UNIQUE INDEX IF NOT EXISTS scratch_card_unique_winning_prize
ON public.scratch_card_scratches (prize_id)
WHERE is_winner = true AND prize_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mystery_box_unique_winning_prize
ON public.mystery_box_wins (prize_id)
WHERE prize_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_scratch_card_play(p_campaign_id uuid, p_cost numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid;
    v_prize record;
    v_is_winner boolean := false;
    v_prize_id uuid := NULL;
    v_prize_label text := 'Tente novamente';
    v_prize_value numeric := 0;
    v_prize_type text := 'none';
    v_new_balance numeric;
    v_total_chance numeric := 0;
    v_random_val numeric;
    v_current_chance numeric := 0;
    v_credit_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    SELECT id INTO v_credit_id
    FROM public.scratch_card_scratches
    WHERE user_id = v_user_id
      AND (campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND campaign_id IS NULL))
      AND prize_label IS NULL
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_credit_id IS NULL AND p_cost > 0 THEN
        SELECT balance INTO v_new_balance
        FROM public.profiles
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF v_new_balance IS NULL OR v_new_balance < p_cost THEN
            RAISE EXCEPTION 'Saldo insuficiente';
        END IF;

        UPDATE public.profiles
        SET balance = balance - p_cost
        WHERE user_id = v_user_id;
    ELSIF v_credit_id IS NULL AND p_cost = 0 THEN
        RAISE EXCEPTION 'Você não possui raspadinhas disponíveis!';
    END IF;

    SELECT COALESCE(SUM(sp.chance_percent), 0) INTO v_total_chance
    FROM public.scratch_card_prizes sp
    WHERE sp.is_active = true
      AND COALESCE(sp.chance_percent, 0) > 0
      AND (sp.campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND sp.campaign_id IS NULL))
      AND NOT EXISTS (
          SELECT 1
          FROM public.scratch_card_scratches s
          WHERE s.prize_id = sp.id
            AND s.is_winner = true
      );

    IF v_total_chance > 0 THEN
        v_random_val := random() * 100;

        IF v_random_val <= v_total_chance THEN
            FOR v_prize IN
                SELECT sp.*
                FROM public.scratch_card_prizes sp
                WHERE sp.is_active = true
                  AND COALESCE(sp.chance_percent, 0) > 0
                  AND (sp.campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND sp.campaign_id IS NULL))
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.scratch_card_scratches s
                      WHERE s.prize_id = sp.id
                        AND s.is_winner = true
                  )
                ORDER BY sp.created_at ASC, sp.id ASC
                FOR UPDATE SKIP LOCKED
            LOOP
                v_current_chance := v_current_chance + COALESCE(v_prize.chance_percent, 0);
                IF v_random_val <= v_current_chance THEN
                    v_is_winner := true;
                    v_prize_id := v_prize.id;
                    v_prize_label := v_prize.label;
                    v_prize_value := COALESCE(v_prize.value, 0);
                    v_prize_type := COALESCE(v_prize.prize_type, 'none');
                    EXIT;
                END IF;
            END LOOP;
        END IF;
    END IF;

    IF v_is_winner THEN
        IF v_prize_type IN ('balance', 'cash', 'fixed_value') THEN
            UPDATE public.profiles
            SET balance = balance + v_prize_value
            WHERE user_id = v_user_id;
        ELSIF v_prize_type = 'points' THEN
            UPDATE public.profiles
            SET points = COALESCE(points, 0) + v_prize_value::integer
            WHERE user_id = v_user_id;
        END IF;
    END IF;

    IF v_credit_id IS NOT NULL THEN
        UPDATE public.scratch_card_scratches
        SET prize_id = v_prize_id,
            prize_label = v_prize_label,
            prize_value = v_prize_value,
            prize_type = v_prize_type,
            is_winner = v_is_winner,
            created_at = now()
        WHERE id = v_credit_id;
    ELSE
        INSERT INTO public.scratch_card_scratches (
            user_id, prize_id, prize_label, prize_value, prize_type, cost, is_winner, campaign_id
        ) VALUES (
            v_user_id, v_prize_id, v_prize_label, v_prize_value, v_prize_type, p_cost, v_is_winner, p_campaign_id
        );
    END IF;

    SELECT balance INTO v_new_balance
    FROM public.profiles
    WHERE user_id = v_user_id;

    RETURN json_build_object(
        'is_winner', v_is_winner,
        'prize', json_build_object(
            'id', v_prize_id,
            'label', v_prize_label,
            'value', v_prize_value,
            'prize_type', v_prize_type
        ),
        'new_balance', v_new_balance
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_mystery_box_open(p_config_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid;
    v_box record;
    v_prize record;
    v_user_balance numeric;
    v_total_chance numeric := 0;
    v_random_val numeric;
    v_current_chance numeric := 0;
    v_win_id uuid;
    v_new_balance numeric;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Entre para abrir caixas!';
    END IF;

    SELECT mbc.*, c.mystery_box_enabled
    INTO v_box
    FROM public.mystery_box_configs mbc
    JOIN public.campaigns c ON c.id = mbc.campaign_id
    WHERE mbc.id = p_config_id
      AND mbc.is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Caixa indisponível no momento';
    END IF;

    IF NOT COALESCE(v_box.mystery_box_enabled, false) THEN
        RAISE EXCEPTION 'Caixa desativada nesta campanha';
    END IF;

    SELECT COALESCE(SUM(mbp.chance_percent), 0) INTO v_total_chance
    FROM public.mystery_box_prizes mbp
    WHERE mbp.config_id = p_config_id
      AND COALESCE(mbp.chance_percent, 0) > 0
      AND NOT EXISTS (
          SELECT 1
          FROM public.mystery_box_wins mbw
          WHERE mbw.prize_id = mbp.id
      );

    IF v_total_chance <= 0 THEN
        RAISE EXCEPTION 'Todos os prêmios desta caixa já foram contemplados';
    END IF;

    SELECT balance INTO v_user_balance
    FROM public.profiles
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_user_balance IS NULL OR v_user_balance < COALESCE(v_box.cost, 0) THEN
        RAISE EXCEPTION 'Saldo insuficiente!';
    END IF;

    v_random_val := random() * v_total_chance;

    FOR v_prize IN
        SELECT mbp.*
        FROM public.mystery_box_prizes mbp
        WHERE mbp.config_id = p_config_id
          AND COALESCE(mbp.chance_percent, 0) > 0
          AND NOT EXISTS (
              SELECT 1
              FROM public.mystery_box_wins mbw
              WHERE mbw.prize_id = mbp.id
          )
        ORDER BY mbp.created_at ASC, mbp.id ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        v_current_chance := v_current_chance + COALESCE(v_prize.chance_percent, 0);
        IF v_random_val <= v_current_chance THEN
            EXIT;
        END IF;
    END LOOP;

    IF v_prize.id IS NULL THEN
        RAISE EXCEPTION 'Nenhum prêmio disponível nesta caixa';
    END IF;

    IF COALESCE(v_box.cost, 0) > 0 THEN
        UPDATE public.profiles
        SET balance = balance - v_box.cost
        WHERE user_id = v_user_id;
    END IF;

    INSERT INTO public.mystery_box_wins (
        user_id, box_id, config_id, prize_id, prize_title, prize_value
    ) VALUES (
        v_user_id, p_config_id, p_config_id, v_prize.id, v_prize.title, v_prize.prize_value
    )
    RETURNING id INTO v_win_id;

    IF v_prize.prize_type IN ('balance', 'cash', 'fixed_value') THEN
        UPDATE public.profiles
        SET balance = balance + COALESCE(v_prize.prize_value, 0)
        WHERE user_id = v_user_id;
    ELSIF v_prize.prize_type = 'points' THEN
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + COALESCE(v_prize.prize_value, 0)::integer
        WHERE user_id = v_user_id;
    END IF;

    SELECT balance INTO v_new_balance
    FROM public.profiles
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'win_id', v_win_id,
        'new_balance', v_new_balance,
        'prize', jsonb_build_object(
            'id', v_prize.id,
            'title', v_prize.title,
            'description', v_prize.description,
            'prize_type', v_prize.prize_type,
            'prize_value', v_prize.prize_value,
            'image_url', v_prize.image_url,
            'rarity', v_prize.rarity
        )
    );
END;
$$;