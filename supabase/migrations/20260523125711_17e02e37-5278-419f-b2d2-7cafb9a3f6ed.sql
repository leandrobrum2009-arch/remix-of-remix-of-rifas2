CREATE TABLE IF NOT EXISTS public.draw_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id),
    winner_id UUID REFERENCES public.winners(id),
    executed_by UUID REFERENCES auth.users(id),
    draw_method TEXT NOT NULL, -- 'manual', 'automatic', 'federal'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.draw_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view draw logs" 
ON public.draw_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Atualizando a função perform_draw para incluir logs
CREATE OR REPLACE FUNCTION public.perform_draw(p_campaign_id UUID, p_executed_by UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    v_winning_ticket RECORD;
    v_winner_id UUID;
    v_log_id UUID;
BEGIN
    -- Select a random confirmed or paid ticket
    SELECT * INTO v_winning_ticket
    FROM public.tickets
    WHERE campaign_id = p_campaign_id AND status IN ('confirmed', 'paid')
    ORDER BY random()
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nenhum bilhete confirmado ou pago encontrado para esta campanha.';
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

    -- Create Draw Log
    INSERT INTO public.draw_logs (campaign_id, winner_id, executed_by, draw_method, details)
    VALUES (p_campaign_id, v_winner_id, p_executed_by, 'automatic', jsonb_build_object(
        'ticket_number', v_winning_ticket.number,
        'user_id', v_winning_ticket.user_id
    ));

    -- Update campaign status
    UPDATE public.campaigns SET status = 'completed' WHERE id = p_campaign_id;

    RETURN v_winner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
