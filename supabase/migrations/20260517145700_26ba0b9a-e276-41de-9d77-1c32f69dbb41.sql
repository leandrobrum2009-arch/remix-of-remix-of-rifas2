-- Function to notify user on mystery box win
CREATE OR REPLACE FUNCTION public.create_mystery_box_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.user_id,
        'Você ganhou um prêmio!',
        'Parabéns! Você abriu uma caixa e ganhou: ' || NEW.prize_title,
        'win'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for mystery box wins
CREATE TRIGGER mystery_box_notification_trigger
AFTER INSERT ON public.mystery_box_wins
FOR EACH ROW
EXECUTE FUNCTION public.create_mystery_box_notification();

-- Function to notify user on roulette win
CREATE OR REPLACE FUNCTION public.create_roulette_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.user_id,
        'Prêmio na Roleta!',
        'Incrível! Você girou a roleta e ganhou: ' || NEW.prize_label,
        'win'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for roulette spins
CREATE TRIGGER roulette_notification_trigger
AFTER INSERT ON public.roulette_spins
FOR EACH ROW
EXECUTE FUNCTION public.create_roulette_notification();
