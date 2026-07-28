CREATE OR REPLACE FUNCTION pay_with_balance(p_order_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
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
        RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado');
    END IF;

    IF v_order_status = 'paid' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este pedido já foi pago');
    END IF;

    -- Get user balance
    SELECT balance INTO v_user_balance FROM profiles WHERE user_id = p_user_id;

    IF v_user_balance < v_order_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saldo insuficiente (Seu saldo: R$ ' || v_user_balance || ')');
    END IF;

    -- Subtract balance
    UPDATE profiles SET balance = balance - v_order_amount WHERE user_id = p_user_id;

    -- Use handle_order_payment to finalize everything properly
    -- We temporarily mark it as something else if needed, but handle_order_payment 
    -- expects it to be NOT paid yet.
    PERFORM public.handle_order_payment(p_order_id);
    
    RETURN jsonb_build_object('success', true, 'message', 'Pagamento realizado com sucesso via saldo!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;