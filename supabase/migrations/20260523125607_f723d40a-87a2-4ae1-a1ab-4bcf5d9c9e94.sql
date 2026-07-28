CREATE OR REPLACE FUNCTION public.get_order_inconsistencies()
RETURNS TABLE (
    id UUID,
    customer_name TEXT,
    quantity INTEGER,
    tickets_generated BIGINT,
    payment_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id, 
        p.name as customer_name, 
        o.quantity, 
        COUNT(t.id) as tickets_generated,
        o.payment_status
    FROM public.orders o
    LEFT JOIN public.profiles p ON o.user_id = p.user_id
    LEFT JOIN public.tickets t ON o.id = t.order_id
    WHERE o.payment_status = 'paid'
    GROUP BY o.id, p.name, o.quantity, o.payment_status
    HAVING COUNT(t.id) != o.quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
