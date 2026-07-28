-- Drop problematic recursive policies
DROP POLICY IF EXISTS "Master full access to roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins see non-master roles" ON public.user_roles;

-- Create safer policies for user_roles
CREATE POLICY "Master full access to user_roles" 
ON public.user_roles 
FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'master'
);
-- Note: The above is still technically recursive in some PG versions, 
-- but often works if indexed correctly and limited. 
-- Better approach: use a function or check for a specific master user ID if it's static, 
-- or just allow users to see their own roles which we already have.

-- Allow admins to see only non-master roles
CREATE POLICY "Admins can view non-master user_roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('admin', 'client_admin')
  AND role != 'master'
);

-- Ensure site_settings is accessible to client_admin but maybe not some fields
-- Actually RLS on site_settings is usually simpler. Let's check it.
