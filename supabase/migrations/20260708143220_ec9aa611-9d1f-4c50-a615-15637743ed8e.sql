-- Fix admin users listing/editing after multi-role and explicit Data API grants rollout.

-- Ensure authenticated app users can reach the admin-related tables through the Data API.
-- RLS still controls which rows each user can see or change.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_features_config TO authenticated;
GRANT ALL ON public.admin_features_config TO service_role;

-- Replace fragile scalar-subquery policies on profiles with security-definer role checks.
DROP POLICY IF EXISTS "Admins see profiles except master" ON public.profiles;
DROP POLICY IF EXISTS "Admins update profiles except master" ON public.profiles;

CREATE POLICY "Admins see profiles except master"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'master')
  OR (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'client_admin'))
    AND NOT public.has_role(profiles.user_id, 'master')
  )
);

CREATE POLICY "Admins update profiles except master"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'master')
  OR (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'client_admin'))
    AND NOT public.has_role(profiles.user_id, 'master')
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'master')
  OR (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'client_admin'))
    AND NOT public.has_role(profiles.user_id, 'master')
  )
);

-- Replace fragile scalar-subquery policy on feature configs used by the users screen.
DROP POLICY IF EXISTS "Master manage all feature configs" ON public.admin_features_config;

CREATE POLICY "Master manage all feature configs"
ON public.admin_features_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));
