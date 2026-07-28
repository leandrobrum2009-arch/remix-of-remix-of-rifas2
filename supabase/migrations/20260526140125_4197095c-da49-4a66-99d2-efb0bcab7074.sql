-- Update constraint to allow 'hidden' status
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'upcoming'::text, 'hidden'::text]));

-- Create a hidden campaign for balance deposits if it doesn't exist
INSERT INTO public.campaigns (id, title, slug, ticket_price, total_tickets, sold_tickets, status, ticket_generation_type)
VALUES ('00000000-0000-0000-0000-000000000001', 'Depósito de Saldo', 'deposito', 1, 1000000, 0, 'hidden', 'auto')
ON CONFLICT (id) DO NOTHING;

-- Update handle_order_payment to support balance recharge
CREATE OR REPLACE FUNCTION public.handle_order_payment(p_order_id UUID, p_payment_id TEXT DEFAULT NULL, p_payment_provider TEXT DEFAULT NULL)
RETURNS void AS $$
  DECLARE
      v_campaign_id UUID;
      v_user_id UUID;
      v_quantity INTEGER;
      v_current_status TEXT;
      v_total_amount NUMERIC;
      v_is_deposit BOOLEAN;
  BEGIN
      -- Get order details with a lock
      SELECT o.campaign_id, o.user_id, o.quantity, o.payment_status, o.total_amount
      INTO v_campaign_id, v_user_id, v_quantity, v_current_status, v_total_amount
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
