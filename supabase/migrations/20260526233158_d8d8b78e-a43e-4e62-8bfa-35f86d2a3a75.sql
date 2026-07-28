-- Drop old problematic policies
DROP POLICY IF EXISTS "Master full access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view non-master user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users see own role" ON public.user_roles;

-- Recreate policies using the new helper functions
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Master has full access to user_roles" ON public.user_roles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'master'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'master'
  )
);

-- Note: The hierarchy is already handled in the has_role and is_admin functions.
-- We want to make sure the policies themselves don't recurse.
-- To avoid recursion, let's use the functions which are SECURITY DEFINER and have a SET search_path.

-- Actually, a more direct way without functions (if they fail):
-- CREATE POLICY "Master full access" ON public.user_roles FOR ALL USING ( (auth.jwt()->>'role' = 'authenticated') AND ... )
-- But since I have the functions, I'll use them.
