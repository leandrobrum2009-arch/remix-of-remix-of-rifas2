-- Atualizando a função de trigger para lidar com cancelamentos
CREATE OR REPLACE FUNCTION public.process_paid_order()
RETURNS TRIGGER AS $$
 DECLARE
     v_campaign_id UUID;
     v_user_id UUID;
     v_quantity INTEGER;
     v_ticket_type TEXT;
     v_total_tickets INTEGER;
     v_pad_len INTEGER;
     v_count INTEGER := 0;
     v_cashback_rate NUMERIC := 0.02;
     v_max_attempts INTEGER := 0;
 BEGIN
     -- 1. Handle Paid status
     IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
         v_campaign_id := NEW.campaign_id;
         v_user_id := NEW.user_id;
         v_quantity := NEW.quantity;

         -- Get campaign info
         SELECT ticket_generation_type, total_tickets, LENGTH(total_tickets::text)
         INTO v_ticket_type, v_total_tickets, v_pad_len
         FROM public.campaigns WHERE id = v_campaign_id;

         -- Process Cashback & Stats
         UPDATE public.profiles
         SET cashback_balance = cashback_balance + (NEW.total_amount * v_cashback_rate),
             points = points + FLOOR(NEW.total_amount * 10),
             xp = xp + FLOOR(NEW.total_amount * 5)
         WHERE user_id = v_user_id;

         -- Confirm Reserved Tickets
         UPDATE public.tickets
         SET status = 'confirmed',
             reservation_expires_at = NULL
         WHERE order_id = NEW.id AND status = 'reserved';

         -- Generate Random Tickets if auto
         IF v_ticket_type = 'auto' THEN
             SELECT count(*) INTO v_count FROM public.tickets WHERE order_id = NEW.id;
             
             WHILE v_count < v_quantity AND v_max_attempts < (v_quantity * 5) LOOP
                 v_max_attempts := v_max_attempts + 1;
                 
                 INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status)
                 SELECT NEW.id, v_campaign_id, v_user_id, LPAD(floor(random() * v_total_tickets)::text, v_pad_len, '0'), 'confirmed'
                 WHERE NOT EXISTS (
                    SELECT 1 FROM public.tickets WHERE campaign_id = v_campaign_id AND number = LPAD(floor(random() * v_total_tickets)::text, v_pad_len, '0')
                 )
                 ON CONFLICT DO NOTHING;
                 
                 SELECT count(*) INTO v_count FROM public.tickets WHERE order_id = NEW.id;
             END LOOP;
         END IF;

         -- Update Campaign sold count
         UPDATE public.campaigns
         SET sold_tickets = (SELECT count(*) FROM public.tickets WHERE campaign_id = v_campaign_id AND status = 'confirmed')
         WHERE id = v_campaign_id;

     -- 2. Handle Cancelled status
     ELSIF NEW.payment_status = 'cancelled' AND (OLD.payment_status != 'cancelled') THEN
         -- Release reserved tickets
         DELETE FROM public.tickets WHERE order_id = NEW.id AND status = 'reserved';
         
         -- If it was previously confirmed/paid (manual override), we might need to handle those too
         DELETE FROM public.tickets WHERE order_id = NEW.id AND status = 'confirmed';

         -- Update Campaign sold count
         UPDATE public.campaigns
         SET sold_tickets = (SELECT count(*) FROM public.tickets WHERE campaign_id = NEW.campaign_id AND status = 'confirmed')
         WHERE id = NEW.campaign_id;
     END IF;

     RETURN NEW;
 END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
