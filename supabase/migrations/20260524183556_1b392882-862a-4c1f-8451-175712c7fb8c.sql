-- Add direct foreign key relationships to allow PostgREST joins with profiles
-- Note: profiles.user_id is unique, so we can reference it.

-- Fix for tickets table
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_user_id_profiles_fkey,
ADD CONSTRAINT tickets_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Fix for winners table
ALTER TABLE public.winners 
DROP CONSTRAINT IF EXISTS winners_user_id_profiles_fkey,
ADD CONSTRAINT winners_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Fix for mystery_box_wins table
ALTER TABLE public.mystery_box_wins 
DROP CONSTRAINT IF EXISTS mystery_box_wins_user_id_profiles_fkey,
ADD CONSTRAINT mystery_box_wins_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Fix for roulette_spins table
ALTER TABLE public.roulette_spins 
DROP CONSTRAINT IF EXISTS roulette_spins_user_id_profiles_fkey,
ADD CONSTRAINT roulette_spins_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Fix for scratch_card_scratches table
ALTER TABLE public.scratch_card_scratches 
DROP CONSTRAINT IF EXISTS scratch_card_scratches_user_id_profiles_fkey,
ADD CONSTRAINT scratch_card_scratches_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Hardening functions by setting search_path
-- We use DO blocks to safely apply changes to overloaded functions if needed or just handle the ones we listed
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.repair_order(uuid) SET search_path = public;
ALTER FUNCTION public.audit_all_paid_orders() SET search_path = public;
ALTER FUNCTION public.perform_draw(uuid) SET search_path = public;
ALTER FUNCTION public.perform_draw(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.duplicate_campaign(uuid) SET search_path = public;
ALTER FUNCTION public.manual_perform_draw(uuid, text) SET search_path = public;
ALTER FUNCTION public.get_order_inconsistencies() SET search_path = public;
ALTER FUNCTION public.process_paid_order() SET search_path = public;

-- Add RLS policies for missing tables
-- processed_webhooks
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access to processed_webhooks" ON public.processed_webhooks;
CREATE POLICY "Admins have full access to processed_webhooks" 
ON public.processed_webhooks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access to webhook_events" ON public.webhook_events;
CREATE POLICY "Admins have full access to webhook_events" 
ON public.webhook_events 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));
