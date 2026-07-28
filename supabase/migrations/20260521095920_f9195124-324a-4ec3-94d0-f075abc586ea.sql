CREATE OR REPLACE FUNCTION pay_with_balance(p_order_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order_amount NUMERIC;
    v_user_balance NUMERIC;
    v_campaign_id UUID;
    v_order_status TEXT;
    v_quantity INTEGER;
BEGIN
    -- Get order details
    SELECT total_amount, campaign_id, payment_status, quantity 
    INTO v_order_amount, v_campaign_id, v_order_status, v_quantity
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
        RETURN jsonb_build_object('success', false, 'message', 'Saldo insuficiente');
    END IF;

    -- Subtract balance
    UPDATE profiles SET balance = balance - v_order_amount WHERE user_id = p_user_id;

    -- Update order status
    UPDATE orders SET payment_status = 'paid', paid_at = NOW() WHERE id = p_order_id;

    -- Update tickets status
    UPDATE tickets SET status = 'paid' WHERE order_id = p_order_id;

    -- The triggers or other logic should handle awarding spins when order is paid
    -- If there are no triggers, we might need to award spins here
    
    RETURN jsonb_build_object('success', true, 'message', 'Pagamento realizado com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;