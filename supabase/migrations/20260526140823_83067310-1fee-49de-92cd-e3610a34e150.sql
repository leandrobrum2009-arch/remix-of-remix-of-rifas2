CREATE OR REPLACE FUNCTION public.notify_campaign_draw(p_campaign_id uuid)
RETURNS void AS $$
DECLARE
    v_campaign_title TEXT;
    v_draw_date TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT title, draw_date INTO v_campaign_title, v_draw_date FROM public.campaigns WHERE id = p_campaign_id;
    
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT DISTINCT user_id, 
           'Lembrete de Sorteio', 
           'O sorteio da campanha "' || v_campaign_title || '" ocorrerá em breve: ' || to_char(v_draw_date, 'DD/MM/YYYY HH24:MI') || '.',
           'draw_reminder'
    FROM public.tickets
    WHERE campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
