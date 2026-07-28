CREATE TABLE public.mystery_box_wins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  box_id UUID NOT NULL REFERENCES public.mystery_boxes(id),
  prize_title TEXT NOT NULL,
  prize_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add cost_to_open to mystery_boxes if it doesn't exist
ALTER TABLE public.mystery_boxes ADD COLUMN IF NOT EXISTS cost_to_open NUMERIC DEFAULT 0;

-- Enable RLS
ALTER TABLE public.mystery_box_wins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view mystery box wins" ON public.mystery_box_wins
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own wins" ON public.mystery_box_wins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_mystery_box_wins_created_at ON public.mystery_box_wins (created_at DESC);
