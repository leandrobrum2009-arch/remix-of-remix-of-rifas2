-- Populate email column for existing users from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Ensure Master users have full access to site_settings without restrictions
-- (Already handled in previous migration, but re-verifying the policy)
DROP POLICY IF EXISTS "Master can see everything" ON public.site_settings;
CREATE POLICY "Master can see everything" 
ON public.site_settings FOR SELECT 
TO authenticated 
USING (check_is_master(auth.uid()));

DROP POLICY IF EXISTS "Master can manage everything" ON public.site_settings;
CREATE POLICY "Master can manage everything" 
ON public.site_settings FOR ALL 
TO authenticated 
USING (check_is_master(auth.uid()))
WITH CHECK (check_is_master(auth.uid()));
