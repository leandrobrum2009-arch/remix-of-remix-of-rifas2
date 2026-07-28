CREATE OR REPLACE FUNCTION public.process_paid_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
     v_campaign_id UUID;
     v_user_id UUID;
     v_quantity INTEGER;
     v_ticket_type TEXT;
     v_total_tickets INTEGER;
     v_pad_len INTEGER;
     v_num TEXT;
     v_count INTEGER := 0;
     v_cashback_rate NUMERIC := 0.02;
 BEGIN
     IF NEW.payment_status = 'paid' AND OLD.payment_status = 'pending' THEN
         v_campaign_id := NEW.campaign_id;
         v_user_id := NEW.user_id;
         v_quantity := NEW.quantity;

         -- Get campaign info
         SELECT ticket_generation_type, total_tickets, LENGTH(total_tickets::text)
         INTO v_ticket_type, v_total_tickets, v_pad_len
         FROM public.campaigns WHERE id = v_campaign_id;

         -- 1. Process Cashback
         UPDATE public.profiles
         SET cashback_balance = cashback_balance + (NEW.total_amount * v_cashback_rate),
             points = points + FLOOR(NEW.total_amount * 10),
             xp = xp + FLOOR(NEW.total_amount * 5)
         WHERE user_id = v_user_id;

         -- 2. Confirm Reserved Tickets (for Manual selection)
         UPDATE public.tickets
         SET status = 'confirmed',
             reservation_expires_at = NULL
         WHERE order_id = NEW.id AND status = 'reserved';

         -- 3. Generate Random Tickets (for Auto selection)
         IF v_ticket_type = 'auto' THEN
             WHILE v_count < v_quantity LOOP
                 v_num := LPAD(floor(random() * v_total_tickets)::text, v_pad_len, '0');
                 
                 -- Check if exists or protected
                 IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = v_campaign_id AND number = v_num) AND
                    NOT EXISTS (
                        SELECT 1 FROM campaigns 
                        WHERE id = v_campaign_id 
                        AND (lucky_numbers_prizes @> ('[{"number":"' || v_num || '", "protected":true}]')::jsonb)
                    ) 
                 THEN
                     INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status)
                     VALUES (NEW.id, v_campaign_id, v_user_id, v_num, 'confirmed');
                     v_count := v_count + 1;
                 END IF;
             END LOOP;
         END IF;

         -- 4. Update Campaign sold count
         UPDATE public.campaigns
         SET sold_tickets = sold_tickets + v_quantity
         WHERE id = v_campaign_id;

     END IF;
     RETURN NEW;
 END;
 $function$;
