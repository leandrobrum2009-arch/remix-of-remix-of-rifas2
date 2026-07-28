
DO $mig$
DECLARE
  default_tenant_id uuid := '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73';
  t text;
  tables_to_migrate text[] := ARRAY[
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
  high_volume_tables text[] := ARRAY[
    'tickets','orders','wallet_transactions','roulette_spins',
    'scratch_card_scratches','mystery_box_wins','affiliate_clicks',
    'affiliate_commissions','notifications','push_notifications','winners',
    'campaigns','profiles','draw_logs','purchase_logs','auth_audit_logs',
    'webhook_events','payment_failures','user_achievements','user_rewards',
    'user_roles','announcements','banners','coupons'
  ];
BEGIN
  -- Sanity check
  PERFORM 1 FROM public.tenants WHERE id = default_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Default tenant % not found. Run Fase 2 migration first.', default_tenant_id;
  END IF;

  -- ADD COLUMN with a constant DEFAULT is metadata-only in PG11+:
  -- existing rows read the default via attmissingval, no table rewrite,
  -- no UPDATE, no timeout.
  FOREACH t IN ARRAY tables_to_migrate LOOP
    EXECUTE format(
      'ALTER TABLE public.%I
         ADD COLUMN IF NOT EXISTS tenant_id uuid
         DEFAULT %L
         REFERENCES public.tenants(id) ON DELETE RESTRICT',
      t, default_tenant_id
    );
  END LOOP;

  -- Indexes on high-volume tables
  FOREACH t IN ARRAY high_volume_tables LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)',
      'idx_' || t || '_tenant_id', t
    );
  END LOOP;
END
$mig$;
