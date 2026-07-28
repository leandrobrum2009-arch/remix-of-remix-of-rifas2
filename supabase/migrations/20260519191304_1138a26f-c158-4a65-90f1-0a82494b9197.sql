ALTER TABLE public.winners ADD COLUMN winner_type TEXT DEFAULT 'raffle';

-- Update RLS policies to allow reading the new column (should be automatic but good to check)
COMMENT ON COLUMN public.winners.winner_type IS 'Type of win: raffle, roulette, scratchcard, lucky_number';