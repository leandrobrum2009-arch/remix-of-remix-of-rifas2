-- Enable RLS on draw_logs if not already enabled
ALTER TABLE public.draw_logs ENABLE ROW LEVEL SECURITY;

-- Allow master to see all logs
CREATE POLICY "Master see all draw logs" 
ON public.draw_logs 
FOR SELECT 
TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'master');

-- Allow non-master admins to see logs NOT executed by master
CREATE POLICY "Admins see non-master draw logs" 
ON public.draw_logs 
FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'client_admin')
  AND 
  NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = public.draw_logs.executed_by 
    AND public.user_roles.role = 'master'
  )
);
