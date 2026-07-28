-- First, drop both possible overloads to start fresh
DROP FUNCTION IF EXISTS public.perform_draw(p_campaign_id uuid);
DROP FUNCTION IF EXISTS public.perform_draw(p_campaign_id uuid, p_executed_by uuid);

-- Create a single robust function
CREATE OR REPLACE FUNCTION public.perform_draw(p_campaign_id uuid, p_executed_by uuid DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_winning_ticket RECORD;
    v_winner_id UUID;
    v_log_id UUID;
    v_campaign_title TEXT;
BEGIN
    -- Get campaign info
    SELECT title INTO v_campaign_title FROM public.campaigns WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campanha não encontrada.';
    END IF;

    -- Select a random confirmed or paid ticket
    SELECT * INTO v_winning_ticket
    FROM public.tickets
    WHERE campaign_id = p_campaign_id AND status IN ('confirmed', 'paid')
    ORDER BY random()
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nenhum bilhete confirmado ou pago encontrado para esta campanha.';
    END IF;

    -- Register the winner in winners table
    INSERT INTO public.winners (campaign_id, winner_name, ticket_number, prize_description, draw_date, winner_type)
    SELECT
        p_campaign_id,
        p.name,
        v_winning_ticket.number,
        v_campaign_title || ' - Sorteio Realizado',
        now(),
        'raffle'
    FROM public.profiles p
    WHERE p.user_id = v_winning_ticket.user_id
    RETURNING id INTO v_winner_id;

    -- Create Draw Log if the table exists (we verified it does)
    INSERT INTO public.draw_logs (campaign_id, winner_id, executed_by, draw_method, details)
    VALUES (p_campaign_id, v_winner_id, p_executed_by, 'automatic', jsonb_build_object(
        'ticket_number', v_winning_ticket.number,
        'user_id', v_winning_ticket.user_id,
        'execution_time', now()
    ));

    -- Update campaign status and draw number
    UPDATE public.campaigns 
    SET 
        status = 'completed',
        draw_number = v_winning_ticket.number,
        draw_date = now()
    WHERE id = p_campaign_id;

    RETURN v_winner_id;
END;
$function$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.perform_draw(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_draw(uuid, uuid) TO service_role;
