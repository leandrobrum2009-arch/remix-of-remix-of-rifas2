-- Remove the redundant foreign key constraint
ALTER TABLE public.winners DROP CONSTRAINT IF EXISTS winners_campaign_id_fkey;
