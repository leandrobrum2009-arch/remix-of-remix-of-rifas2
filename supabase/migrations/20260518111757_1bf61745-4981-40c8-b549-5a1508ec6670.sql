ALTER TABLE public.profiles ADD COLUMN referred_by_code TEXT;
CREATE INDEX idx_profiles_referred_by_code ON public.profiles(referred_by_code);