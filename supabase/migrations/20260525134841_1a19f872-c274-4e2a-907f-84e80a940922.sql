-- Fix foreign key constraint on scratch_card_scratches
ALTER TABLE public.scratch_card_scratches DROP CONSTRAINT IF EXISTS "scratch_card_scratches_user_id_fkey";

-- Drop existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.process_scratch_card_play(uuid, numeric);

-- Re-implement handle_order_payment to give 1 spin and 1 scratch per order
CREATE OR REPLACE FUNCTION public.handle_order_payment(p_order_id uuid, p_payment_id text DEFAULT NULL::text, p_payment_provider text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      v_campaign_id UUID;
      v_user_id UUID;
      v_quantity INTEGER;
      v_current_status TEXT;
  BEGIN
      -- Get order details with a lock
      SELECT o.campaign_id, o.user_id, o.quantity, o.payment_status
      INTO v_campaign_id, v_user_id, v_quantity, v_current_status
      FROM public.orders o
      WHERE o.id = p_order_id
      FOR UPDATE;

      -- Update Order status if not already paid
      IF v_current_status != 'paid' THEN
          UPDATE public.orders
          SET payment_status = 'paid',
              paid_at = now(),
              payment_id = COALESCE(p_payment_id, orders.payment_id),
              payment_provider = COALESCE(p_payment_provider, orders.payment_provider)
          WHERE id = p_order_id;
          
          -- Award 1 Roulette Spin (if not already awarded too many)
          -- We check if they have at least 1 pending spin
          IF NOT EXISTS (
              SELECT 1 FROM public.roulette_spins 
              WHERE user_id = v_user_id AND campaign_id = v_campaign_id AND prize_label IS NULL
          ) THEN
              INSERT INTO public.roulette_spins (user_id, campaign_id, is_free)
              VALUES (v_user_id, v_campaign_id, true);
          END IF;

          -- Award 1 Scratch Card (if not already awarded)
          -- We use a NULL prize_label to indicate a "credit"
          IF NOT EXISTS (
              SELECT 1 FROM public.scratch_card_scratches
              WHERE user_id = v_user_id AND (campaign_id = v_campaign_id OR campaign_id IS NULL) AND prize_label IS NULL
          ) THEN
              INSERT INTO public.scratch_card_scratches (user_id, campaign_id, prize_label, cost, is_winner)
              VALUES (v_user_id, v_campaign_id, NULL, 0, false);
          END IF;
      END IF;
  END;
  $function$;

-- Re-implement process_scratch_card_play to consume credits
CREATE OR REPLACE FUNCTION public.process_scratch_card_play(p_campaign_id uuid, p_cost numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
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

     -- 1. Check for credits first
     SELECT id INTO v_credit_id
     FROM public.scratch_card_scratches
     WHERE user_id = v_user_id AND (campaign_id = p_campaign_id OR campaign_id IS NULL) AND prize_label IS NULL
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

     -- 2. Record scratch
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
         -- Insert new row
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