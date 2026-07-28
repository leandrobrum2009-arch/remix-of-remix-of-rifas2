-- Add INSERT policy for notifications
CREATE POLICY "Users can insert their own notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ensure profiles can be updated by SECURITY DEFINER functions (already exists but good to be sure)
-- Add any missing RLS for game tables if necessary
ALTER TABLE public.scratch_card_scratches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_spins ENABLE ROW LEVEL SECURITY;

-- If not already present, allow users to insert their own game plays (though RPC is preferred)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own roulette spins' AND tablename = 'roulette_spins') THEN
        CREATE POLICY "Users can insert their own roulette spins" ON public.roulette_spins FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
