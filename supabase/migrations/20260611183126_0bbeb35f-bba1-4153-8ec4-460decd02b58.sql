-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage lucky hours" ON public.lucky_hours;

-- Create role-based policies using the confirmed has_role function signature
CREATE POLICY "Masters can manage lucky hours" ON public.lucky_hours
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master'))
  WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Admins can manage lucky hours" ON public.lucky_hours
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grant table-level permissions
GRANT SELECT ON public.lucky_hours TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lucky_hours TO authenticated;
GRANT ALL ON public.lucky_hours TO service_role;
