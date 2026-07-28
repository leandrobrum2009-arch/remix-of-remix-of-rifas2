ALTER TABLE public.mystery_box_wins REPLICA IDENTITY FULL;
ALTER TABLE public.roulette_spins REPLICA IDENTITY FULL;
ALTER TABLE public.tickets REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.mystery_box_wins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_spins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;