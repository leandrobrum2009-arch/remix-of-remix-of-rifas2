-- Improve process_paid_order to handle batch inserts and status transitions
CREATE OR REPLACE FUNCTION public.process_paid_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     -- Fire when payment_status changes to 'paid' from anything else
     IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
         v_campaign_id := NEW.campaign_id;
         v_user_id := NEW.user_id;
         v_quantity := NEW.quantity;

         -- Get campaign info
         SELECT ticket_generation_type, total_tickets, LENGTH(total_tickets::text)
         INTO v_ticket_type, v_total_tickets, v_pad_len
         FROM public.campaigns WHERE id = v_campaign_id;

         -- 1. Process Cashback & Stats
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
         -- Optimized for performance to handle larger quantities
         IF v_ticket_type = 'auto' THEN
             -- Check if we already have some tickets (in case of partial success/retry)
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

         -- 4. Update Campaign sold count accurately
         UPDATE public.campaigns
         SET sold_tickets = (SELECT count(*) FROM public.tickets WHERE campaign_id = v_campaign_id AND status = 'confirmed')
         WHERE id = v_campaign_id;

     END IF;
     RETURN NEW;
 END;
 $function$;

-- Update reserve_tickets to check campaign status and timing
CREATE OR REPLACE FUNCTION public.reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[] DEFAULT NULL::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
     v_order_id UUID;
     v_total_amount NUMERIC;
     v_ticket_price NUMERIC;
     v_num TEXT;
     v_total_tickets INTEGER;
     v_pad_len INTEGER;
     v_ticket_type TEXT;
     v_campaign_status TEXT;
     v_draw_date TIMESTAMPTZ;
     v_expiration_interval INTERVAL := '15 minutes'; -- Increased to 15 min as requested in UI
 BEGIN
     -- Get campaign details and check validity
     SELECT ticket_price, total_tickets, LENGTH(total_tickets::text), ticket_generation_type, status, draw_date
     INTO v_ticket_price, v_total_tickets, v_pad_len, v_ticket_type, v_campaign_status, v_draw_date
     FROM public.campaigns WHERE id = p_campaign_id;

     -- Ensure campaign is active
     IF v_campaign_status != 'active' THEN
         RAISE EXCEPTION 'Esta campanha não está aceitando novos pedidos (Status: %).', v_campaign_status;
     END IF;

     -- Ensure draw date hasn't passed
     IF v_draw_date IS NOT NULL AND v_draw_date < now() THEN
         RAISE EXCEPTION 'O período de vendas para esta campanha já encerrou.';
     END IF;

     -- Calculate total
     v_total_amount := v_ticket_price * p_quantity;

     -- Create Order
     INSERT INTO public.orders (user_id, campaign_id, quantity, total_amount, payment_status, expires_at)
     VALUES (p_user_id, p_campaign_id, p_quantity, v_total_amount, 'pending', now() + v_expiration_interval)
     RETURNING id INTO v_order_id;

     -- Reserve Numbers
     IF (p_numbers IS NOT NULL AND array_length(p_numbers, 1) > 0) OR v_ticket_type = 'manual' THEN
         IF p_numbers IS NOT NULL AND array_length(p_numbers, 1) > 0 THEN
             FOR v_num IN SELECT unnest(p_numbers) LOOP
                 -- Check if already exists/sold
                 IF EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_num AND (status IN ('confirmed', 'reserved') AND (reservation_expires_at IS NULL OR reservation_expires_at > now()))) THEN
                     RAISE EXCEPTION 'O número % já foi reservado ou vendido.', v_num;
                 END IF;

                 -- Check if protected
                 IF EXISTS (
                     SELECT 1 FROM campaigns
                     WHERE id = p_campaign_id
                     AND (lucky_numbers_prizes @> ('[{"number":"' || v_num || '", "protected":true}]')::jsonb)
                 ) THEN
                     RAISE EXCEPTION 'O número % não está disponível para reserva.', v_num;
                 END IF;

                 -- Delete old expired record if exists to avoid unique constraint error
                 DELETE FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_num;

                 INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status, reservation_expires_at)
                 VALUES (v_order_id, p_campaign_id, p_user_id, v_num, 'reserved', now() + v_expiration_interval);
             END LOOP;
         END IF;
     END IF;

     RETURN v_order_id;
 END;
 $function$;