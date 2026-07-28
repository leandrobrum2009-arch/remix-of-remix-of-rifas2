-- Update pay_with_balance to set payment_provider and be more robust
CREATE OR REPLACE FUNCTION public.pay_with_balance(p_order_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_order_amount NUMERIC;
    v_user_balance NUMERIC;
    v_order_status TEXT;
BEGIN
    -- Get order details
    SELECT total_amount, payment_status
    INTO v_order_amount, v_order_status
    FROM orders
    WHERE id = p_order_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado ou não pertence a este usuário');
    END IF;

    IF v_order_status = 'paid' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este pedido já consta como pago');
    END IF;

    -- Get user balance
    SELECT balance INTO v_user_balance FROM profiles WHERE user_id = p_user_id;

    IF v_user_balance < v_order_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saldo insuficiente. Seu saldo atual é R$ ' || COALESCE(v_user_balance, 0));
    END IF;

    -- Subtract balance
    UPDATE profiles SET balance = balance - v_order_amount WHERE user_id = p_user_id;

    -- Finalize payment using the unique handle_order_payment function
    -- We set provider as 'balance'
    PERFORM public.handle_order_payment(p_order_id, 'balance_' || p_order_id::text, 'balance');

    RETURN jsonb_build_object('success', true, 'message', 'Pagamento realizado com sucesso via saldo!');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Erro inesperado: ' || SQLERRM);
END;
$function$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
