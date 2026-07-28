-- Add new columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS ticket_generation_type TEXT DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS roulette_payout_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS show_instant_prizes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_roulette_status BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS main_prizes JSONB DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.campaigns.ticket_generation_type IS 'manual or auto';
COMMENT ON COLUMN public.campaigns.roulette_payout_rate IS 'Percentage chance of winning on roulette';
COMMENT ON COLUMN public.campaigns.main_prizes IS 'Array of prizes for 1st to 5th place';