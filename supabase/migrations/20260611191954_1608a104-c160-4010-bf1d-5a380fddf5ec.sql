-- Function to automatically identify a winner for a lucky hour event
CREATE OR REPLACE FUNCTION public.run_lucky_hour_draw(p_lucky_hour_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lucky_hour RECORD;
    v_campaign RECORD;
    v_winner_ticket RECORD;
    v_winner_name TEXT;
    v_winner_number TEXT;
    v_result JSONB;
BEGIN
    -- 1. Get the lucky hour record
    SELECT * INTO v_lucky_hour FROM lucky_hours WHERE id = p_lucky_hour_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sorteio não encontrado.');
    END IF;

    IF v_lucky_hour.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este sorteio já foi realizado.');
    END IF;

    -- 2. Get campaign info
    SELECT * INTO v_campaign FROM campaigns WHERE id = v_lucky_hour.campaign_id;

    -- 3. Find the winner based on draw type
    IF v_lucky_hour.draw_type = 'hourly' THEN
        -- Random winner from paid/confirmed tickets
        SELECT t.number, p.name INTO v_winner_number, v_winner_name
        FROM tickets t
        JOIN profiles p ON t.user_id = p.id
        WHERE t.campaign_id = v_lucky_hour.campaign_id
          AND t.status IN ('confirmed', 'paid')
        ORDER BY random()
        LIMIT 1;
    ELSIF v_lucky_hour.draw_type = 'greater_smaller' THEN
        -- Check if it's "Maior" or "Menor" by title or prize description
        -- Default to Greater if not specified
        IF v_lucky_hour.title ILIKE '%menor%' OR v_lucky_hour.prize_description ILIKE '%menor%' THEN
            -- Lowest ticket number
            SELECT t.number, p.name INTO v_winner_number, v_winner_name
            FROM tickets t
            JOIN profiles p ON t.user_id = p.id
            WHERE t.campaign_id = v_lucky_hour.campaign_id
              AND t.status IN ('confirmed', 'paid')
            ORDER BY t.number ASC
            LIMIT 1;
        ELSE
            -- Highest ticket number
            SELECT t.number, p.name INTO v_winner_number, v_winner_name
            FROM tickets t
            JOIN profiles p ON t.user_id = p.id
            WHERE t.campaign_id = v_lucky_hour.campaign_id
              AND t.status IN ('confirmed', 'paid')
            ORDER BY t.number DESC
            LIMIT 1;
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Tipo de sorteio desconhecido.');
    END IF;

    IF v_winner_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nenhum bilhete vendido encontrado para esta campanha.');
    END IF;

    -- 4. Update the record
    UPDATE lucky_hours
    SET 
        winner_name = v_winner_name,
        winning_number = v_winner_number,
        status = 'completed',
        is_approved = true, -- Auto-approve since it's system-calculated
        approved_at = now(),
        updated_at = now(),
        audit_log = COALESCE(audit_log, '[]'::jsonb) || jsonb_build_object(
            'timestamp', now(),
            'action', 'auto_draw',
            'details', jsonb_build_object(
                'winner_name', v_winner_name,
                'winning_number', v_winner_number
            )
        )
    WHERE id = p_lucky_hour_id;

    -- 5. Create a record in winners table
    INSERT INTO winners (
        campaign_id,
        winner_name,
        ticket_number,
        prize_description,
        draw_date,
        winner_type
    ) VALUES (
        v_lucky_hour.campaign_id,
        v_winner_name,
        v_winner_number,
        v_lucky_hour.prize_description,
        now(),
        'lucky_number'
    );

    RETURN jsonb_build_object(
        'success', true, 
        'winner_name', v_winner_name, 
        'winning_number', v_winner_number
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_lucky_hour_draw(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_lucky_hour_draw(UUID) TO service_role;
