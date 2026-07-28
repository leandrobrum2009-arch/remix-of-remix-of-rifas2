CREATE OR REPLACE FUNCTION public.manual_perform_draw(p_campaign_id uuid, p_ticket_number text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
     v_winning_ticket RECORD;
     v_winner_id UUID;
 BEGIN
     -- 1. Check if the ticket exists and is paid
     SELECT * INTO v_winning_ticket
     FROM public.tickets
     WHERE campaign_id = p_campaign_id AND number = p_ticket_number AND status = 'paid'
     LIMIT 1;

     IF NOT FOUND THEN
         RAISE EXCEPTION 'Bilhete % não encontrado ou não está pago para esta campanha.', p_ticket_number;
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
