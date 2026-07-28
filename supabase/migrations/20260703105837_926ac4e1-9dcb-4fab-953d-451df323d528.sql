CREATE OR REPLACE FUNCTION public.check_data_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaigns_mismatch jsonb;
  v_negative_balances jsonb;
  v_orphan_tickets integer;
  v_paid_no_tickets integer;
  v_expired_reservations integer;
  v_duplicate_settings jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'master'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 1. Campanhas onde sold_tickets diverge da contagem real de tickets confirmed/paid
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_campaigns_mismatch
  FROM (
    SELECT c.id, c.title, c.sold_tickets AS stored,
           (SELECT count(*) FROM public.tickets t
             WHERE t.campaign_id = c.id AND t.status IN ('confirmed','paid')) AS actual
    FROM public.campaigns c
    WHERE c.sold_tickets IS DISTINCT FROM
          (SELECT count(*)::int FROM public.tickets t
            WHERE t.campaign_id = c.id AND t.status IN ('confirmed','paid'))
  ) t;

  -- 2. Perfis com saldo negativo (nunca deveria acontecer)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_negative_balances
  FROM (
    SELECT user_id, balance, cashback_balance, points
    FROM public.profiles
    WHERE COALESCE(balance,0) < 0
       OR COALESCE(cashback_balance,0) < 0
       OR COALESCE(points,0) < 0
  ) t;

  -- 3. Tickets órfãos (order_id apontando para pedido inexistente)
  SELECT count(*) INTO v_orphan_tickets
  FROM public.tickets t
  LEFT JOIN public.orders o ON o.id = t.order_id
  WHERE t.order_id IS NOT NULL AND o.id IS NULL;

  -- 4. Pedidos pagos (não-depósito) sem tickets
  SELECT count(*) INTO v_paid_no_tickets
  FROM public.orders o
  WHERE o.payment_status = 'paid'
    AND o.campaign_id <> '00000000-0000-0000-0000-000000000001'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.tickets t WHERE t.order_id = o.id);

  -- 5. Reservas expiradas ainda presentes (cleanup falhou)
  SELECT count(*) INTO v_expired_reservations
  FROM public.tickets
  WHERE status = 'reserved' AND reservation_expires_at < now();

  -- 6. Chaves duplicadas em site_settings
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_duplicate_settings
  FROM (
    SELECT key, count(*) AS occurrences
    FROM public.site_settings
    GROUP BY key HAVING count(*) > 1
  ) t;

  RETURN jsonb_build_object(
    'checked_at', now(),
    'ok', (
      jsonb_array_length(v_campaigns_mismatch) = 0
      AND jsonb_array_length(v_negative_balances) = 0
      AND v_orphan_tickets = 0
      AND v_paid_no_tickets = 0
      AND v_expired_reservations = 0
      AND jsonb_array_length(v_duplicate_settings) = 0
    ),
    'campaigns_progress_mismatch', v_campaigns_mismatch,
    'negative_balances', v_negative_balances,
    'orphan_tickets', v_orphan_tickets,
    'paid_orders_without_tickets', v_paid_no_tickets,
    'expired_reservations_pending_cleanup', v_expired_reservations,
    'duplicate_site_settings_keys', v_duplicate_settings
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_data_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_data_integrity() TO authenticated;