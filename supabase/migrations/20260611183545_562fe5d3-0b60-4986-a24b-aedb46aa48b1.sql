ALTER TABLE public.lucky_hours ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.lucky_hours ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.lucky_hours ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lucky_hours ADD COLUMN IF NOT EXISTS draft_winner_name TEXT;
ALTER TABLE public.lucky_hours ADD COLUMN IF NOT EXISTS draft_winning_number TEXT;

COMMENT ON COLUMN public.lucky_hours.is_approved IS 'Indicates if the draw result has been approved by a Master user.';

-- Master users have additional update permissions for approval fields
CREATE POLICY "Masters can approve lucky hours" ON public.lucky_hours
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'master'))
  WITH CHECK (public.has_role(auth.uid(), 'master'));
