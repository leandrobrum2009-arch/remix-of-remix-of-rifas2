-- Add description to scratch_card_scratches if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scratch_card_scratches' AND column_name = 'description') THEN
        ALTER TABLE public.scratch_card_scratches ADD COLUMN description TEXT;
    END IF;
END $$;

-- Update process_paid_order to create scratch card credits
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
     v_lucky_ticket RECORD;
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

         -- Check for lucky numbers in this order and grant scratch card credits
         FOR v_lucky_ticket IN 
            SELECT number FROM public.tickets 
            WHERE order_id = NEW.id AND is_lucky = true AND status = 'confirmed'
         LOOP
            INSERT INTO public.scratch_card_scratches (user_id, campaign_id, description)
            VALUES (v_user_id, v_campaign_id, 'Cota Premiada #' || v_lucky_ticket.number);
         END LOOP;

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
$function$;

-- Improve process_scratch_card_play to handle no prizes gracefully
CREATE OR REPLACE FUNCTION public.process_scratch_card_play(p_campaign_id uuid, p_cost numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
     v_user_id UUID;
     v_prize RECORD;
     v_is_winner BOOLEAN := false;
     v_prize_id UUID := NULL;
     v_prize_label TEXT := 'Tente novamente';
     v_prize_value NUMERIC := 0;
     v_prize_type TEXT := 'none';
     v_new_balance NUMERIC;
     v_total_chance NUMERIC;
     v_random_val NUMERIC;
     v_current_chance NUMERIC := 0;
     v_credit_id UUID;
 BEGIN
     v_user_id := auth.uid();
     IF v_user_id IS NULL THEN
         RAISE EXCEPTION 'Não autorizado';
     END IF;

     -- 1. Check for credits first (unplayed scratches)
     SELECT id INTO v_credit_id
     FROM public.scratch_card_scratches
     WHERE user_id = v_user_id 
     AND (campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND campaign_id IS NULL)) 
     AND prize_label IS NULL
     LIMIT 1;

     IF v_credit_id IS NULL AND p_cost > 0 THEN
         -- Check balance if cost > 0 and no credits
         SELECT balance INTO v_new_balance FROM public.profiles WHERE user_id = v_user_id;
         IF v_new_balance IS NULL OR v_new_balance < p_cost THEN
             RAISE EXCEPTION 'Saldo insuficiente';
         END IF;

         -- Deduct cost
         UPDATE public.profiles SET balance = balance - p_cost WHERE user_id = v_user_id;
     ELSIF v_credit_id IS NULL AND p_cost = 0 THEN
         -- If free play requested but no credit and cost is 0
         RAISE EXCEPTION 'Você não possui raspadinhas disponíveis!';
     END IF;

     -- Get prizes
     SELECT SUM(chance_percent) INTO v_total_chance
     FROM public.scratch_card_prizes
     WHERE is_active = true
     AND (campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND campaign_id IS NULL));

     IF v_total_chance IS NOT NULL AND v_total_chance > 0 THEN
         v_random_val := random() * 100;

         IF v_random_val <= v_total_chance THEN
             FOR v_prize IN
                 SELECT * FROM public.scratch_card_prizes
                 WHERE is_active = true
                 AND (campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND campaign_id IS NULL))
                 ORDER BY id
             LOOP
                 v_current_chance := v_current_chance + v_prize.chance_percent;
                 IF v_random_val <= v_current_chance THEN
                     v_is_winner := true;
                     v_prize_id := v_prize.id;
                     v_prize_label := v_prize.label;
                     v_prize_value := v_prize.value;
                     v_prize_type := v_prize.prize_type;
                     EXIT;
                 END IF;
             END LOOP;
         END IF;
     END IF;

     -- Handle winner rewards
     IF v_is_winner THEN
         IF v_prize_type = 'balance' THEN
             UPDATE public.profiles SET balance = balance + v_prize_value WHERE user_id = v_user_id;
         ELSIF v_prize_type = 'points' THEN
             UPDATE public.profiles SET points = COALESCE(points, 0) + v_prize_value::integer WHERE user_id = v_user_id;
         END IF;
     END IF;

     -- 2. Record scratch result
     IF v_credit_id IS NOT NULL THEN
         -- Update the credit row
         UPDATE public.scratch_card_scratches SET
             prize_id = v_prize_id,
             prize_label = v_prize_label,
             prize_value = v_prize_value,
             prize_type = v_prize_type,
             is_winner = v_is_winner,
             created_at = now()
         WHERE id = v_credit_id;
     ELSE
         -- Insert new row (for paid games)
         INSERT INTO public.scratch_card_scratches (
             user_id, prize_id, prize_label, prize_value, prize_type, cost, is_winner, campaign_id
         ) VALUES (
             v_user_id, v_prize_id, v_prize_label, v_prize_value, v_prize_type, p_cost, v_is_winner, p_campaign_id
         );
     END IF;

     -- Get updated balance
     SELECT balance INTO v_new_balance FROM public.profiles WHERE user_id = v_user_id;

     RETURN json_build_object(
         'is_winner', v_is_winner,
         'prize', json_build_object(
             'label', v_prize_label,
             'value', v_prize_value,
             'prize_type', v_prize_type
         ),
         'new_balance', v_new_balance
     );
 END;
 $function$;
