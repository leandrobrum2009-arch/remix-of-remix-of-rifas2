CREATE OR REPLACE FUNCTION public.process_scratch_card_play(
    p_campaign_id UUID DEFAULT NULL,
    p_cost NUMERIC DEFAULT 0
)
RETURNS JSON AS $$
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
        SELECT balance INTO v_new_balance FROM public.profiles WHERE id = v_user_id;
        IF v_new_balance < p_cost THEN
            RAISE EXCEPTION 'Saldo insuficiente';
        END IF;
        
        -- Deduct cost
        UPDATE public.profiles SET balance = balance - p_cost WHERE id = v_user_id;
    END IF;

    -- Get prizes
    SELECT SUM(chance_percent) INTO v_total_chance 
    FROM public.scratch_card_prizes 
    WHERE is_active = true 
    AND (campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND campaign_id IS NULL));

    IF v_total_chance IS NOT NULL AND v_total_chance > 0 THEN
        v_random_val := random() * 100; -- Assuming chance_percent is 0-100 and total might be < 100
        
        -- If random_val is greater than total_chance, they lose (house edge)
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
            UPDATE public.profiles SET balance = balance + v_prize_value WHERE id = v_user_id;
        END IF;
        -- Add other prize types here if needed (tickets, etc)
    END IF;

    -- Record scratch
    INSERT INTO public.scratch_card_scratches (
        user_id, prize_id, prize_label, prize_value, prize_type, cost, is_winner, campaign_id
    ) VALUES (
        v_user_id, v_prize_id, v_prize_label, v_prize_value, v_prize_type, p_cost, v_is_winner, p_campaign_id
    );

    -- Get updated balance
    SELECT balance INTO v_new_balance FROM public.profiles WHERE id = v_user_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
