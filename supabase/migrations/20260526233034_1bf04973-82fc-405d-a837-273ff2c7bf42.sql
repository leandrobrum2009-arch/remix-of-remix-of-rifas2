-- Redefine has_role to handle hierarchy
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Master has all roles
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'master') THEN
    RETURN TRUE;
  END IF;

  -- Admin has moderator and user roles
  IF _role = 'admin' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
  ELSIF _role = 'moderator' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator'));
  ELSIF _role = 'user' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator', 'user', 'client_admin'));
  ELSIF _role = 'client_admin' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'client_admin');
  ELSE
    -- For any other role (like master itself), check exact match
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
  END IF;
END;
$function$;

-- Also create a helper function is_admin for clearer policies
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role IN ('admin', 'master', 'client_admin')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Grant access to the new function
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
