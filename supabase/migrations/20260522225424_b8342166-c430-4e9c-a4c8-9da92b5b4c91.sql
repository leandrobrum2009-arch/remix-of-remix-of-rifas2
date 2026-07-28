-- Update perform_draw to look for 'confirmed' tickets
CREATE OR REPLACE FUNCTION public.perform_draw(p_campaign_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_winning_ticket RECORD;
    v_winner_id UUID;
BEGIN
    -- Select a random confirmed ticket
    SELECT * INTO v_winning_ticket
    FROM public.tickets
    WHERE campaign_id = p_campaign_id AND status = 'confirmed'
    ORDER BY random()
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nenhum bilhete confirmado encontrado para esta campanha.';
    END IF;

    -- Register the winner
    INSERT INTO public.winners (campaign_id, winner_name, ticket_number, prize_description, draw_date, winner_type)
    SELECT
        p_campaign_id,
        p.name,
        v_winning_ticket.number,
        c.title || ' - Sorteio Realizado',
        now(),
        'raffle'
    FROM public.profiles p, public.campaigns c
    WHERE p.user_id = v_winning_ticket.user_id AND c.id = p_campaign_id
    RETURNING id INTO v_winner_id;

    -- Update campaign status
    UPDATE public.campaigns SET status = 'completed' WHERE id = p_campaign_id;

    RETURN v_winner_id;
END;
$function$;

-- Update manual_perform_draw to look for 'confirmed' tickets
CREATE OR REPLACE FUNCTION public.manual_perform_draw(p_campaign_id uuid, p_ticket_number text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_winning_ticket RECORD;
    v_winner_id UUID;
BEGIN
    -- 1. Check if the ticket exists and is confirmed
    SELECT * INTO v_winning_ticket
    FROM public.tickets
    WHERE campaign_id = p_campaign_id AND number = p_ticket_number AND status = 'confirmed'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bilhete % não encontrado ou não está confirmado para esta campanha.', p_ticket_number;
    END IF;

    -- 2. Register the winner
    INSERT INTO public.winners (campaign_id, winner_name, ticket_number, prize_description, draw_date, winner_type)
    SELECT
        p_campaign_id,
        p.name,
        p_ticket_number,
        c.title || ' - Sorteio Manual',
        now(),
        'raffle'
    FROM public.profiles p, public.campaigns c
    WHERE p.user_id = v_winning_ticket.user_id AND c.id = p_campaign_id
    RETURNING id INTO v_winner_id;

    -- 3. Update campaign status
    UPDATE public.campaigns SET status = 'completed' WHERE id = p_campaign_id;

    RETURN v_winner_id;
END;
$function$;

-- Ensure has_role search_path is secure
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;

-- Ensure users can read user_roles for the has_role function (though it is security definer, sometimes it helps with RLS debugging)
-- But wait, security definer should already bypass RLS for the owner.
-- Let's just make sure the owner of user_roles is postgres.
ALTER TABLE public.user_roles OWNER TO postgres;
