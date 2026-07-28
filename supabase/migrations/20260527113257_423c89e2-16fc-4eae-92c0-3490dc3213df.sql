-- Update check_is_master without changing parameter name
CREATE OR REPLACE FUNCTION public.check_is_master(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = $1 
    AND public.user_roles.role = 'master'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update is_admin without changing parameter name
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = $1 
    AND public.user_roles.role IN ('admin', 'master', 'client_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update has_role without changing parameter names
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  -- Master has all roles
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role = 'master') THEN
    RETURN TRUE;
  END IF;

  -- Admin logic
  IF $2 = 'admin' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role = 'admin');
  ELSIF $2 = 'moderator' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role IN ('admin', 'moderator'));
  ELSIF $2 = 'user' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role IN ('admin', 'moderator', 'user', 'client_admin'));
  ELSIF $2 = 'client_admin' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role = 'client_admin');
  ELSE
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role = $2);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
