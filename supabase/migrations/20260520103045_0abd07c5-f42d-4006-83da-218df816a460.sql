-- 1. Update tickets status check constraint
ALTER TABLE public.tickets DROP CONSTRAINT tickets_status_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'reserved'::text, 'expired'::text]));

-- 2. Update reserve_tickets function
CREATE OR REPLACE FUNCTION public.reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[] DEFAULT NULL::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
     v_order_id UUID;
     v_total_amount NUMERIC;
     v_ticket_price NUMERIC;
     v_num TEXT;
     v_total_tickets INTEGER;
     v_pad_len INTEGER;
     v_ticket_type TEXT;
     v_expiration_interval INTERVAL := '2 minutes';
 BEGIN
     -- Get campaign details
     SELECT ticket_price, total_tickets, LENGTH(total_tickets::text), ticket_generation_type
     INTO v_ticket_price, v_total_tickets, v_pad_len, v_ticket_type
     FROM public.campaigns WHERE id = p_campaign_id;

     -- Calculate total
     v_total_amount := v_ticket_price * p_quantity;

     -- Create Order with 2 minute expiration
     INSERT INTO public.orders (user_id, campaign_id, quantity, total_amount, payment_status, expires_at)
     VALUES (p_user_id, p_campaign_id, p_quantity, v_total_amount, 'pending', now() + v_expiration_interval)
     RETURNING id INTO v_order_id;

     -- Reserve Numbers
     IF (p_numbers IS NOT NULL AND array_length(p_numbers, 1) > 0) OR v_ticket_type = 'manual' THEN
         IF p_numbers IS NOT NULL AND array_length(p_numbers, 1) > 0 THEN
             FOR v_num IN SELECT unnest(p_numbers) LOOP
                 -- Check if already exists/sold
                 IF EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_num AND (status IN ('confirmed', 'reserved') AND reservation_expires_at > now())) THEN
                     RAISE EXCEPTION 'Ticket % already reserved or sold', v_num;
                 END IF;

                 -- Check if protected
                 IF EXISTS (
                     SELECT 1 FROM campaigns
                     WHERE id = p_campaign_id
                     AND (lucky_numbers_prizes @> ('[{"number":"' || v_num || '", "protected":true}]')::jsonb)
                 ) THEN
                     RAISE EXCEPTION 'Ticket % already reserved or sold', v_num;
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

-- 3. Create function to release expired tickets
CREATE OR REPLACE FUNCTION public.release_expired_tickets()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Mark tickets as expired
    UPDATE public.tickets
    SET status = 'expired'
    WHERE status = 'reserved' AND reservation_expires_at < now();

    -- Mark orders as expired
    UPDATE public.orders
    SET payment_status = 'expired'
    WHERE payment_status = 'pending' AND expires_at < now();
END;
$function$;
