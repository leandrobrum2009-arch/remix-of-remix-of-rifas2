-- Adicionar colunas para múltiplos prêmios na tabela de ganhadores
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS prize_index INTEGER DEFAULT 1;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS prize_name TEXT;

-- Atualizar a função perform_draw para suportar múltiplos prêmios e opção de números não vendidos
DROP FUNCTION IF EXISTS public.perform_draw(uuid, uuid);
CREATE OR REPLACE FUNCTION public.perform_draw(
    p_campaign_id uuid, 
    p_executed_by uuid DEFAULT NULL,
    p_prize_index integer DEFAULT 1,
    p_allow_unassigned boolean DEFAULT false
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_winning_ticket RECORD;
    v_winner_id UUID;
    v_campaign RECORD;
    v_winner_name TEXT;
    v_user_id UUID;
    v_winning_number TEXT;
    v_prize_desc TEXT;
BEGIN
    -- Obter informações da campanha
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campanha não encontrada.';
    END IF;

    -- Determinar a descrição do prêmio baseado no índice
    v_prize_desc := v_campaign.title || ' - ' || p_prize_index || 'º Prêmio';
    
    IF p_allow_unassigned THEN
        -- Sorteia qualquer número dentro do range total
        v_winning_number := LPAD(FLOOR(RANDOM() * v_campaign.total_tickets)::TEXT, LENGTH((v_campaign.total_tickets - 1)::TEXT), '0');
        
        -- Verifica se existe um bilhete vendido para esse número
        SELECT t.user_id, p.name INTO v_user_id, v_winner_name
        FROM public.tickets t
        JOIN public.profiles p ON p.user_id = t.user_id
        WHERE t.campaign_id = p_campaign_id AND t.number = v_winning_number AND t.status IN ('confirmed', 'paid')
        LIMIT 1;
        
        IF v_winner_name IS NULL THEN
            v_winner_name := 'Número não vendido';
            v_user_id := NULL;
        END IF;
    ELSE
        -- Sorteia apenas entre bilhetes confirmados ou pagos
        SELECT t.number, t.user_id, p.name INTO v_winning_number, v_user_id, v_winner_name
        FROM public.tickets t
        JOIN public.profiles p ON p.user_id = t.user_id
        WHERE t.campaign_id = p_campaign_id AND t.status IN ('confirmed', 'paid')
        ORDER BY random()
        LIMIT 1;

        IF v_winning_number IS NULL THEN
            RAISE EXCEPTION 'Nenhum bilhete confirmado ou pago encontrado para esta campanha.';
        END IF;
    END IF;

    -- Registrar o ganhador
    INSERT INTO public.winners (
        campaign_id, 
        user_id,
        winner_name, 
        ticket_number, 
        prize_description, 
        draw_date, 
        winner_type,
        prize_index
    )
    VALUES (
        p_campaign_id,
        v_user_id,
        v_winner_name,
        v_winning_number,
        v_prize_desc,
        CURRENT_DATE,
        'raffle',
        p_prize_index
    )
    RETURNING id INTO v_winner_id;

    -- Registrar log
    INSERT INTO public.draw_logs (campaign_id, winner_id, executed_by, draw_method, details)
    VALUES (p_campaign_id, v_winner_id, p_executed_by, 'automatic', jsonb_build_object(
        'ticket_number', v_winning_number,
        'user_id', v_user_id,
        'prize_index', p_prize_index,
        'allow_unassigned', p_allow_unassigned,
        'execution_time', now()
    ));

    -- Se for o primeiro prêmio, atualiza o status principal da campanha
    IF p_prize_index = 1 THEN
        UPDATE public.campaigns 
        SET 
            status = 'completed',
            draw_number = v_winning_number,
            draw_date = now()
        WHERE id = p_campaign_id;
    END IF;

    RETURN v_winner_id;
END;
$function$;

-- Atualizar manual_perform_draw
DROP FUNCTION IF EXISTS public.manual_perform_draw(uuid, text);
CREATE OR REPLACE FUNCTION public.manual_perform_draw(
    p_campaign_id uuid, 
    p_ticket_number text,
    p_prize_index integer DEFAULT 1
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_winning_ticket RECORD;
    v_winner_id UUID;
    v_campaign RECORD;
    v_winner_name TEXT;
    v_user_id UUID;
    v_prize_desc TEXT;
BEGIN
    -- Obter informações da campanha
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campanha não encontrada.';
    END IF;

    v_prize_desc := v_campaign.title || ' - ' || p_prize_index || 'º Prêmio (Manual)';

    -- Verifica se existe um bilhete vendido para esse número
    SELECT t.user_id, p.name INTO v_user_id, v_winner_name
    FROM public.tickets t
    JOIN public.profiles p ON p.user_id = t.user_id
    WHERE t.campaign_id = p_campaign_id AND t.number = p_ticket_number AND t.status IN ('confirmed', 'paid')
    LIMIT 1;

    IF v_winner_name IS NULL THEN
        v_winner_name := 'Sorteado (Não vendido)';
        v_user_id := NULL;
    END IF;

    -- Registrar o ganhador
    INSERT INTO public.winners (
        campaign_id, 
        user_id,
        winner_name, 
        ticket_number, 
        prize_description, 
        draw_date, 
        winner_type,
        prize_index
    )
    VALUES (
        p_campaign_id,
        v_user_id,
        v_winner_name,
        p_ticket_number,
        v_prize_desc,
        CURRENT_DATE,
        'raffle',
        p_prize_index
    )
    RETURNING id INTO v_winner_id;

    -- Se for o primeiro prêmio, atualiza o status principal da campanha
    IF p_prize_index = 1 THEN
        UPDATE public.campaigns 
        SET 
            status = 'completed',
            draw_number = p_ticket_number,
            draw_date = now()
        WHERE id = p_campaign_id;
    END IF;

    RETURN v_winner_id;
END;
$function$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.perform_draw(uuid, uuid, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_draw(uuid, uuid, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.manual_perform_draw(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_perform_draw(uuid, text, integer) TO service_role;