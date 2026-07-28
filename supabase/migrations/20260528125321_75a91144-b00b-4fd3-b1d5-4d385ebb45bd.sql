-- Update handle_order_payment to include affiliate commission logic
CREATE OR REPLACE FUNCTION public.handle_order_payment(p_order_id UUID, p_payment_id TEXT DEFAULT NULL, p_payment_provider TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
      v_campaign_id UUID;
      v_user_id UUID;
      v_quantity INTEGER;
      v_current_status TEXT;
      v_total_amount NUMERIC;
      v_is_deposit BOOLEAN;
      v_affiliate_id UUID;
      v_commission_rate NUMERIC;
      v_commission_amount NUMERIC;
      v_referred_by_code TEXT;
  BEGIN
      -- Get order details with a lock
      SELECT o.campaign_id, o.user_id, o.quantity, o.payment_status, o.total_amount, o.affiliate_id
      INTO v_campaign_id, v_user_id, v_quantity, v_current_status, v_total_amount, v_affiliate_id
      FROM public.orders o
      WHERE o.id = p_order_id
      FOR UPDATE;

      -- Check if it's a deposit order (campaign_id is the special deposit campaign)
      v_is_deposit := (v_campaign_id = '00000000-0000-0000-0000-000000000001');

      -- Update Order status if not already paid
      IF v_current_status != 'paid' THEN
          UPDATE public.orders
          SET payment_status = 'paid',
              paid_at = now(),
              payment_id = COALESCE(p_payment_id, orders.payment_id),
              payment_provider = COALESCE(p_payment_provider, orders.payment_provider)
          WHERE id = p_order_id;
          
          IF v_is_deposit THEN
              -- It's a deposit, increment user balance
              UPDATE public.profiles
              SET balance = balance + v_total_amount
              WHERE user_id = v_user_id;

              -- Create a wallet transaction for record
              INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
              VALUES (v_user_id, v_total_amount, 'deposit', 'completed', 'Depósito via PIX');
          ELSE
              -- Standard campaign order, award rewards
              
              -- Affiliate Commission Logic
              -- If affiliate_id is not set in order, check if user was referred at registration
              IF v_affiliate_id IS NULL THEN
                  SELECT referred_by_code INTO v_referred_by_code FROM public.profiles WHERE user_id = v_user_id;
                  IF v_referred_by_code IS NOT NULL THEN
                      SELECT id INTO v_affiliate_id FROM public.affiliates WHERE referral_code = v_referred_by_code AND is_active = true LIMIT 1;
                      
                      -- Update order with affiliate info if found
                      IF v_affiliate_id IS NOT NULL THEN
                          UPDATE public.orders SET affiliate_id = v_affiliate_id WHERE id = p_order_id;
                      END IF;
                  END IF;
              END IF;

              -- If we have an affiliate, record commission
              IF v_affiliate_id IS NOT NULL THEN
                  SELECT commission_rate INTO v_commission_rate FROM public.affiliates WHERE id = v_affiliate_id;
                  v_commission_amount := v_total_amount * v_commission_rate;
                  
                  -- Record commission
                  INSERT INTO public.affiliate_commissions (affiliate_id, order_id, campaign_id, amount, status)
                  VALUES (v_affiliate_id, p_order_id, v_campaign_id, v_commission_amount, 'pending');
                  
                  -- Update affiliate total earned
                  UPDATE public.affiliates 
                  SET total_earned = total_earned + v_commission_amount 
                  WHERE id = v_affiliate_id;
              END IF;

              -- Award 1 Roulette Spin (if not already awarded too many)
              IF NOT EXISTS (
                  SELECT 1 FROM public.roulette_spins 
                  WHERE user_id = v_user_id AND campaign_id = v_campaign_id AND prize_label IS NULL
              ) THEN
                  INSERT INTO public.roulette_spins (user_id, campaign_id, is_free)
                  VALUES (v_user_id, v_campaign_id, true);
              END IF;

              -- Award 1 Scratch Card (if not already awarded)
              IF NOT EXISTS (
                  SELECT 1 FROM public.scratch_card_scratches
                  WHERE user_id = v_user_id AND (campaign_id = v_campaign_id OR campaign_id IS NULL) AND prize_label IS NULL
              ) THEN
                  INSERT INTO public.scratch_card_scratches (user_id, campaign_id, prize_label, cost, is_winner)
                  VALUES (v_user_id, v_campaign_id, NULL, 0, false);
              END IF;
          END IF;
      END IF;
  END;
$$;

-- Update RLS for affiliates table to allow client_admin to manage them
DROP POLICY IF EXISTS "Admins can manage affiliates" ON public.affiliates;
CREATE POLICY "Admins can manage affiliates"
ON public.affiliates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'client_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'client_admin'::app_role));

-- Also update RLS for affiliate_clicks and affiliate_commissions if needed
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.affiliate_commissions;
CREATE POLICY "Admins can view all commissions"
ON public.affiliate_commissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'client_admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all clicks" ON public.affiliate_clicks;
CREATE POLICY "Admins can view all clicks"
ON public.affiliate_clicks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'client_admin'::app_role));
