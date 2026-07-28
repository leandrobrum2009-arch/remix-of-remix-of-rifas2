-- Update profiles policies to isolate master users
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

CREATE POLICY "Admins see profiles except master" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'master'
  OR 
  (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'client_admin')
    AND 
    NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE public.user_roles.user_id = public.profiles.user_id 
      AND public.user_roles.role = 'master'
    )
  )
);

CREATE POLICY "Admins update profiles except master" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'master'
  OR 
  (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'client_admin')
    AND 
    NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE public.user_roles.user_id = public.profiles.user_id 
      AND public.user_roles.role = 'master'
    )
  )
)
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'master'
  OR 
  (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'client_admin')
    AND 
    NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE public.user_roles.user_id = public.profiles.user_id 
      AND public.user_roles.role = 'master'
    )
  )
);

-- Update user_roles policies to isolate master role
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master can manage all roles" ON public.user_roles;

-- Allow users to see their own role
CREATE POLICY "Users see own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Master can see and manage all roles
CREATE POLICY "Master full access to roles" 
ON public.user_roles 
FOR ALL 
TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'master');

-- Admins can see non-master roles
CREATE POLICY "Admins see non-master roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'client_admin')
  AND role != 'master'
);

-- Ensure admin_features_config is readable by the user themselves and master
ALTER TABLE public.admin_features_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feature config" ON public.admin_features_config;
CREATE POLICY "Users view own feature config" 
ON public.admin_features_config 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Master can manage all feature configs" ON public.admin_features_config;
CREATE POLICY "Master manage all feature configs" 
ON public.admin_features_config 
FOR ALL 
TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'master');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_features_config TO authenticated;
GRANT ALL ON public.admin_features_config TO service_role;
