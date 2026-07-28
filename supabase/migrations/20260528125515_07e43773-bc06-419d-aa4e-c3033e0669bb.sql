-- Add foreign key from affiliates to profiles
ALTER TABLE public.affiliates
ADD CONSTRAINT affiliates_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;
