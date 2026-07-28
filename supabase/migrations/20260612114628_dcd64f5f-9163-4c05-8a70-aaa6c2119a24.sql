ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS mystery_box_available_count INTEGER DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS roulette_available_count INTEGER DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS scratch_cards_available_count INTEGER DEFAULT 0;

-- Grant access to existing roles
GRANT SELECT, UPDATE ON public.campaigns TO authenticated;
GRANT SELECT ON public.campaigns TO anon;
GRANT ALL ON public.campaigns TO service_role;