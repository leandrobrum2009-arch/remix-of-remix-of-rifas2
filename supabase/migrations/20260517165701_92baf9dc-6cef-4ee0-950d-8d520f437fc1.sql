-- Permite que administradores gerenciem resultados da Loteria Federal
CREATE POLICY "Admins can manage federal results"
ON public.federal_lottery_results
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Permite que administradores visualizem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
