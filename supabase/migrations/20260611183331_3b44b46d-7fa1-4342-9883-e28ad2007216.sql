ALTER TABLE public.lucky_hours ADD COLUMN IF NOT EXISTS draw_type TEXT DEFAULT 'hourly' CHECK (draw_type IN ('hourly', 'greater_smaller'));
ALTER TABLE public.lucky_hours ADD COLUMN IF NOT EXISTS rule_id TEXT; -- Optional link to prize_rules JSON index or ID

COMMENT ON COLUMN public.lucky_hours.draw_type IS 'Distinguishes between traditional Hourly Prize and Greater/Smaller Ticket draws.';

CREATE INDEX IF NOT EXISTS idx_lucky_hours_campaign_type ON public.lucky_hours(campaign_id, draw_type);
