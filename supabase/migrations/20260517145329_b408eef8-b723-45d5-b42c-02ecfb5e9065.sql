DROP TABLE IF EXISTS public.roulette_spins;

CREATE TABLE public.roulette_spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id),
  prize_label TEXT NOT NULL,
  prize_type TEXT NOT NULL,
  prize_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roulette_spins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view roulette spins" ON public.roulette_spins
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own spins" ON public.roulette_spins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_roulette_spins_created_at ON public.roulette_spins (created_at DESC);
