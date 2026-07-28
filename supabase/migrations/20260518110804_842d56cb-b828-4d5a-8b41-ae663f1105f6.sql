CREATE OR REPLACE FUNCTION public.on_profile_created_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.user_id,
        'Bem-vindo(a)!',
        'Sua conta foi criada com sucesso. Explore as campanhas e boa sorte!',
        'bonus'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_on_profile_created_notification
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.on_profile_created_notification();