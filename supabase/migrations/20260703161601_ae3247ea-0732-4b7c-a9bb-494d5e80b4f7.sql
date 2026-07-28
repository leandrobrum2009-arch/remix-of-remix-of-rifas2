
-- Seed default deposit bonus tiers if missing
INSERT INTO public.site_settings (key, value)
VALUES ('deposit_bonus_tiers', '[{"min":50,"bonus":5},{"min":100,"bonus":15},{"min":200,"bonus":40},{"min":500,"bonus":120}]')
ON CONFLICT (key) DO NOTHING;

-- Update handle_order_payment to credit deposit bonus
CREATE OR REPLACE FUNCTION public.handle_order_payment(p_order_id UUID, p_payment_id TEXT DEFAULT NULL, p_payment_provider TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v_bonus_amount NUMERIC := 0;
    v_tiers JSONB;
BEGIN
    SELECT o.campaign_id, o.user_id, o.quantity, o.payment_status, o.total_amount, o.affiliate_id
    INTO v_campaign_id, v_user_id, v_quantity, v_current_status, v_total_amount, v_affiliate_id
    FROM public.orders o
    WHERE o.id = p_order_id
    FOR UPDATE;

    v_is_deposit := (v_campaign_id = '00000000-0000-0000-0000-000000000001');

    IF v_current_status != 'paid' THEN
        UPDATE public.orders
        SET payment_status = 'paid',
            paid_at = now(),
            payment_id = COALESCE(p_payment_id, orders.payment_id),
            payment_provider = COALESCE(p_payment_provider, orders.payment_provider)
        WHERE id = p_order_id;

        IF v_is_deposit THEN
            UPDATE public.profiles
            SET balance = balance + v_total_amount
            WHERE user_id = v_user_id;

            INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
            VALUES (v_user_id, v_total_amount, 'deposit', 'completed', 'Depósito via PIX');

            -- Deposit bonus lookup (highest applicable tier)
            BEGIN
                SELECT value::jsonb INTO v_tiers
                FROM public.site_settings
                WHERE key = 'deposit_bonus_tiers';
            EXCEPTION WHEN OTHERS THEN
                v_tiers := NULL;
            END;

            IF v_tiers IS NOT NULL AND jsonb_typeof(v_tiers) = 'array' THEN
                SELECT COALESCE(MAX((elem->>'bonus')::numeric), 0)
                INTO v_bonus_amount
                FROM jsonb_array_elements(v_tiers) elem
                WHERE (elem->>'min')::numeric <= v_total_amount
                  AND (elem->>'bonus')::numeric > 0
                  AND (elem->>'min')::numeric = (
                    SELECT MAX((e2->>'min')::numeric)
                    FROM jsonb_array_elements(v_tiers) e2
                    WHERE (e2->>'min')::numeric <= v_total_amount
                  );
            END IF;

            IF COALESCE(v_bonus_amount, 0) > 0 THEN
                UPDATE public.profiles
                SET balance = balance + v_bonus_amount
                WHERE user_id = v_user_id;

                INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
                VALUES (v_user_id, v_bonus_amount, 'bonus', 'completed',
                        'Bônus de depósito (R$ ' || v_total_amount::text || ')');
            END IF;
        ELSE
            IF v_affiliate_id IS NULL THEN
                SELECT referred_by_code INTO v_referred_by_code FROM public.profiles WHERE user_id = v_user_id;
                IF v_referred_by_code IS NOT NULL THEN
                    SELECT id INTO v_affiliate_id FROM public.affiliates WHERE referral_code = v_referred_by_code AND is_active = true LIMIT 1;
                    IF v_affiliate_id IS NOT NULL THEN
                        UPDATE public.orders SET affiliate_id = v_affiliate_id WHERE id = p_order_id;
                    END IF;
                END IF;
            END IF;

            IF v_affiliate_id IS NOT NULL THEN
                SELECT commission_rate INTO v_commission_rate FROM public.affiliates WHERE id = v_affiliate_id;
                v_commission_amount := v_total_amount * v_commission_rate;
                INSERT INTO public.affiliate_commissions (affiliate_id, order_id, campaign_id, amount, status)
                VALUES (v_affiliate_id, p_order_id, v_campaign_id, v_commission_amount, 'pending');
                UPDATE public.affiliates SET total_earned = total_earned + v_commission_amount WHERE id = v_affiliate_id;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM public.roulette_spins
                WHERE user_id = v_user_id AND campaign_id = v_campaign_id AND prize_label IS NULL
            ) THEN
                INSERT INTO public.roulette_spins (user_id, campaign_id, is_free)
                VALUES (v_user_id, v_campaign_id, true);
            END IF;

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
