-- Fix function search paths
ALTER FUNCTION public.process_paid_order() SET search_path = public;
ALTER FUNCTION public.cleanup_expired_reservations() SET search_path = public;
ALTER FUNCTION public.create_mystery_box_notification() SET search_path = public;
ALTER FUNCTION public.create_roulette_notification() SET search_path = public;
ALTER FUNCTION public.protect_profile_fields() SET search_path = public;

-- Hide sensitive tables from the GraphQL schema
COMMENT ON TABLE public.user_roles IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.wallet_transactions IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.orders IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.tickets IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.affiliate_commissions IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.notifications IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.push_notifications IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.mystery_box_wins IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.roulette_spins IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.user_achievements IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.user_rewards IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.profiles IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.affiliates IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.coupons IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.mystery_box_configs IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.mystery_boxes IS '@graphql({"enabled": false})';
COMMENT ON TABLE public.site_settings IS '@graphql({"enabled": false})';
