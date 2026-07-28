
-- 1. current_tenant_id(): resolve o tenant atual da requisição.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim text;
  v_header text;
  v_default uuid;
BEGIN
  BEGIN
    v_claim := current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,tenant_id}';
  EXCEPTION WHEN OTHERS THEN
    v_claim := NULL;
  END;
  IF v_claim IS NOT NULL AND v_claim <> '' THEN
    RETURN v_claim::uuid;
  END IF;

  BEGIN
    v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
  EXCEPTION WHEN OTHERS THEN
    v_header := NULL;
  END;
  IF v_header IS NOT NULL AND v_header <> '' THEN
    RETURN v_header::uuid;
  END IF;

  SELECT id INTO v_default FROM public.tenants WHERE slug = 'default' LIMIT 1;
  RETURN v_default;
END;
$$;

-- 2. Trigger function that auto-fills tenant_id on insert.
CREATE OR REPLACE FUNCTION public.set_tenant_id_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attach trigger + RESTRICTIVE tenant policy to every tenant-scoped table.
DO $mig$
DECLARE
  t text;
  tables text[] := ARRAY[
    'admin_features_config','affiliate_clicks','affiliate_commissions','affiliates',
    'announcements','app_versions','auth_audit_logs','banners','campaigns','coupons',
    'custom_presets','draw_logs','federal_lottery_results','lucky_hours',
    'mystery_box_configs','mystery_box_prizes','mystery_box_wins','mystery_boxes',
    'notifications','orders','payment_failures','processed_webhooks','profiles',
    'purchase_logs','push_notifications','roulette_prizes','roulette_spins',
    'scratch_card_prizes','scratch_card_scratches','site_settings','tickets',
    'user_achievements','user_rewards','user_roles','wallet_transactions',
    'webhook_events','winners'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- BEFORE INSERT trigger to auto-populate tenant_id
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_tenant_id
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert()',
      t
    );

    -- RESTRICTIVE tenant isolation policy (AND on top of existing policies).
    -- `master` role bypasses isolation for cross-tenant admin operations.
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation" ON public.%I
         AS RESTRICTIVE
         FOR ALL
         TO public
         USING (
           tenant_id IS NOT DISTINCT FROM public.current_tenant_id()
           OR public.has_role(auth.uid(), ''master''::app_role)
         )
         WITH CHECK (
           tenant_id IS NOT DISTINCT FROM public.current_tenant_id()
           OR public.has_role(auth.uid(), ''master''::app_role)
         )',
      t
    );
  END LOOP;
END
$mig$;
