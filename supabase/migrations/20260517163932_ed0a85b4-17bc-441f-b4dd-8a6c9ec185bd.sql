-- Table for Federal Lottery Results
CREATE TABLE IF NOT EXISTS public.federal_lottery_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concurso TEXT UNIQUE NOT NULL,
    data_sorteio DATE NOT NULL,
    premios JSONB NOT NULL, -- Array of objects: [{"premio": "1", "numero": "12345"}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.federal_lottery_results ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone
CREATE POLICY "Federal results are viewable by everyone" ON public.federal_lottery_results FOR SELECT USING (true);

-- Allow service role to manage
CREATE POLICY "Service role can manage federal results" ON public.federal_lottery_results FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Add stripe_session_id to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
