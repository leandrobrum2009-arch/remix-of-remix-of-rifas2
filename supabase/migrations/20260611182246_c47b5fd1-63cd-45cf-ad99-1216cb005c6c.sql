CREATE TABLE public.lucky_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prize_description TEXT NOT NULL,
  draw_time TIMESTAMP WITH TIME ZONE NOT NULL,
  winner_name TEXT,
  winning_number TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lucky_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lucky_hours TO authenticated;
GRANT ALL ON public.lucky_hours TO service_role;

ALTER TABLE public.lucky_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lucky hours" ON public.lucky_hours
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage lucky hours" ON public.lucky_hours
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_lucky_hours_updated_at 
  BEFORE UPDATE ON public.lucky_hours 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();