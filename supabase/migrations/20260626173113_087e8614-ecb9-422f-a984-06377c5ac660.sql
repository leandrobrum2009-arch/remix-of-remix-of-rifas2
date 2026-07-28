
DROP POLICY IF EXISTS "Admins can manage scratch_card_prizes" ON public.scratch_card_prizes;
CREATE POLICY "Admins can manage scratch_card_prizes" ON public.scratch_card_prizes
FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'client_admin')
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'client_admin')
);

DROP POLICY IF EXISTS "Admins can manage mystery_box_prizes" ON public.mystery_box_prizes;
CREATE POLICY "Admins can manage mystery_box_prizes" ON public.mystery_box_prizes
FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'client_admin')
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'client_admin')
);

DROP POLICY IF EXISTS "Admins can manage roulette_prizes" ON public.roulette_prizes;
CREATE POLICY "Admins can manage roulette_prizes" ON public.roulette_prizes
FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'client_admin')
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'client_admin')
);
