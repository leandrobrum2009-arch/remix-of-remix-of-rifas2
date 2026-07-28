CREATE OR REPLACE FUNCTION public.pay_with_balance(p_order_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_auth_user_id uuid;
    v_order record;
    v_user_balance numeric;
    v_new_balance numeric;
BEGIN
    v_auth_user_id := auth.uid();

    IF v_auth_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado');
    END IF;

    IF p_user_id IS NULL OR p_user_id <> v_auth_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário inválido para este pagamento');
    END IF;

    SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
      AND user_id = v_auth_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado ou não pertence a este usuário');
    END IF;

    IF v_order.payment_status = 'paid' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este pedido já consta como pago');
    END IF;

    IF v_order.campaign_id = '00000000-0000-0000-0000-000000000001'::uuid THEN
        RETURN jsonb_build_object('success', false, 'message', 'Depósito deve ser pago via PIX');
    END IF;

    SELECT balance
    INTO v_user_balance
    FROM public.profiles
    WHERE user_id = v_auth_user_id
    FOR UPDATE;

    IF v_user_balance IS NULL OR v_user_balance < v_order.total_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Saldo insuficiente. Seu saldo atual é R$ ' || COALESCE(v_user_balance, 0)
        );
    END IF;

    UPDATE public.profiles
    SET balance = balance - v_order.total_amount
    WHERE user_id = v_auth_user_id
    RETURNING balance INTO v_new_balance;

    PERFORM public.handle_order_payment(p_order_id, 'balance_' || p_order_id::text, 'balance');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pagamento realizado com sucesso via saldo!',
        'new_balance', v_new_balance
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Erro inesperado: ' || SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_campaign_id uuid;
    v_user_id uuid;
    v_quantity integer;
    v_ticket_type text;
    v_total_tickets integer;
    v_pad_len integer;
    v_count integer := 0;
    v_cashback_rate numeric := 0.02;
    v_max_attempts integer := 0;
    v_lucky_ticket record;
    v_random_num text;
BEGIN
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid') THEN
        v_campaign_id := NEW.campaign_id;
        v_user_id := NEW.user_id;
        v_quantity := COALESCE(NEW.quantity, 0);

        SELECT ticket_generation_type, total_tickets, length(total_tickets::text)
        INTO v_ticket_type, v_total_tickets, v_pad_len
        FROM public.campaigns
        WHERE id = v_campaign_id;

        IF v_campaign_id <> '00000000-0000-0000-0000-000000000001'::uuid THEN
            UPDATE public.profiles
            SET cashback_balance = COALESCE(cashback_balance, 0) + (NEW.total_amount * v_cashback_rate),
                points = COALESCE(points, 0) + floor(NEW.total_amount * 10),
                xp = COALESCE(xp, 0) + floor(NEW.total_amount * 5)
            WHERE user_id = v_user_id;

            UPDATE public.tickets
            SET status = 'confirmed',
                reservation_expires_at = NULL
            WHERE order_id = NEW.id
              AND status = 'reserved';

            IF v_ticket_type = 'auto' THEN
                SELECT count(*) INTO v_count
                FROM public.tickets
                WHERE order_id = NEW.id;

                WHILE v_count < v_quantity AND v_max_attempts < GREATEST(v_quantity * 20, 100) LOOP
                    v_max_attempts := v_max_attempts + 1;
                    v_random_num := lpad(floor(random() * v_total_tickets)::text, v_pad_len, '0');

                    IF NOT EXISTS (
                        SELECT 1
                        FROM public.tickets
                        WHERE campaign_id = v_campaign_id
                          AND number = v_random_num
                          AND status IN ('reserved', 'confirmed', 'paid')
                    ) THEN
                        INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status)
                        VALUES (NEW.id, v_campaign_id, v_user_id, v_random_num, 'confirmed')
                        ON CONFLICT DO NOTHING;
                    END IF;

                    SELECT count(*) INTO v_count
                    FROM public.tickets
                    WHERE order_id = NEW.id;
                END LOOP;
            END IF;

            FOR v_lucky_ticket IN
                SELECT number
                FROM public.tickets
                WHERE order_id = NEW.id
                  AND is_lucky = true
                  AND status = 'confirmed'
            LOOP
                INSERT INTO public.scratch_card_scratches (user_id, campaign_id, description)
                VALUES (v_user_id, v_campaign_id, 'Cota Premiada #' || v_lucky_ticket.number);
            END LOOP;

            UPDATE public.campaigns
            SET sold_tickets = (
                SELECT count(*)
                FROM public.tickets
                WHERE campaign_id = v_campaign_id
                  AND status IN ('confirmed', 'paid')
            )
            WHERE id = v_campaign_id;
        END IF;

    ELSIF NEW.payment_status = 'cancelled' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'cancelled') THEN
        DELETE FROM public.tickets
        WHERE order_id = NEW.id
          AND status IN ('reserved', 'confirmed', 'paid');

        UPDATE public.campaigns
        SET sold_tickets = (
            SELECT count(*)
            FROM public.tickets
            WHERE campaign_id = NEW.campaign_id
              AND status IN ('confirmed', 'paid')
        )
        WHERE id = NEW.campaign_id;
    END IF;

    RETURN NEW;
END;
$function$;

UPDATE public.campaigns c
SET sold_tickets = counts.confirmed_count
FROM (
    SELECT campaign_id, count(*)::integer AS confirmed_count
    FROM public.tickets
    WHERE status IN ('confirmed', 'paid')
    GROUP BY campaign_id
) counts
WHERE c.id = counts.campaign_id;