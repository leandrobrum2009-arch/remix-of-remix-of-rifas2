-- Set search_path for public functions with correct signatures
ALTER FUNCTION public.on_order_paid_notification() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_reservations() SET search_path = public;
ALTER FUNCTION public.create_mystery_box_notification() SET search_path = public;
ALTER FUNCTION public.create_roulette_notification() SET search_path = public;
ALTER FUNCTION public.on_profile_created_notification() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.increment_balance(numeric, uuid) SET search_path = public;
ALTER FUNCTION public.perform_draw(uuid) SET search_path = public;
ALTER FUNCTION public.sync_federal_lottery() SET search_path = public;
ALTER FUNCTION public.release_expired_tickets() SET search_path = public;
ALTER FUNCTION public.reserve_tickets(uuid, uuid, integer, text[]) SET search_path = public;
ALTER FUNCTION public.manual_perform_draw(uuid, text) SET search_path = public;
ALTER FUNCTION public.process_roulette_spin(uuid, integer) SET search_path = public;
ALTER FUNCTION public.process_scratch_card_play(uuid, numeric) SET search_path = public;
ALTER FUNCTION public.process_paid_order() SET search_path = public;
ALTER FUNCTION public.handle_order_payment(uuid) SET search_path = public;
ALTER FUNCTION public.protect_profile_fields() SET search_path = public;
ALTER FUNCTION public.pay_with_balance(uuid, uuid) SET search_path = public;

-- Tighten storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'campaigns' AND (storage.foldername(name))[1] IS NOT NULL);

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON storage.objects;
CREATE POLICY "Public profiles are viewable by everyone" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IS NOT NULL);

-- Ensure RLS is enabled on all tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;
