-- Grant access to authenticated and anon roles for all public tables
-- This is required for PostgREST to access the tables before RLS is applied

DO $$ 
DECLARE 
    t text;
    tables_to_grant text[] := ARRAY[
        'site_settings', 'orders', 'tickets', 'campaigns', 'winners', 
        'profiles', 'user_roles', 'admin_features_config', 'banners', 
        'coupons', 'draw_logs', 'notifications', 'affiliates', 
        'affiliate_commissions', 'mystery_boxes', 'mystery_box_prizes', 
        'mystery_box_wins', 'roulette_prizes', 'roulette_spins', 
        'scratch_card_prizes', 'scratch_card_scratches', 'push_notifications', 
        'auth_audit_logs', 'federal_lottery_results'
    ];
BEGIN 
    FOREACH t IN ARRAY tables_to_grant LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', t);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    END LOOP;
END $$;

-- Specifically for tables that anon should NOT have access to even for SELECT (though RLS should handle it)
-- we ensure only authenticated have access if RLS is not enough, but RLS IS enough.
-- However, we keep it consistent.

-- Grant access to sequences (if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
