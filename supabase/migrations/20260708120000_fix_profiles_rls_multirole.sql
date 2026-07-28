-- Fix: profiles RLS policies fail with "more than one row" when a user has
-- multiple roles (e.g. both admin and master). Replace scalar subqueries with
-- has_role() and dedupe stacked roles.

-- 1) Remove stacked admin rows for users who are also master
DELETE FROM public.user_roles ur
WHERE ur.role = 'admin'
  AND EXISTS (
    SELECT 1 FROM public.user_roles m
    WHERE m.user_id = ur.user_id AND m.role = 'master'
  );

-- 2) Rewrite profiles admin policies using has_role() (SECURITY DEFINER)
DROP POLICY IF EXISTS "Admins see profiles except master" ON public.profiles;
DROP POLICY IF EXISTS "Admins update profiles except master" ON public.profiles;

CREATE POLICY "Admins see profiles except master"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'master')
  OR (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'client_admin'))
    AND NOT public.has_role(profiles.user_id, 'master')
  )
);

CREATE POLICY "Admins update profiles except master"
ON public.profiles FOR UPDATE
USING (
  public.has_role(auth.uid(), 'master')
  OR (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'client_admin'))
    AND NOT public.has_role(profiles.user_id, 'master')
  )
);
