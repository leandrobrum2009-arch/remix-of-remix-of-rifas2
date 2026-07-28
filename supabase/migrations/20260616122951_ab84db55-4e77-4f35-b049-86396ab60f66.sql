ALTER PUBLICATION supabase_realtime ADD TABLE public.scratch_card_scratches;
ALTER TABLE public.scratch_card_scratches REPLICA IDENTITY FULL;
ALTER TABLE public.roulette_spins REPLICA IDENTITY FULL;
ALTER TABLE public.mystery_box_wins REPLICA IDENTITY FULL;