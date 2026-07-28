ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS prize_rules JSONB DEFAULT '[]';

COMMENT ON COLUMN public.campaigns.prize_rules IS 'Stores automated prize rules, e.g., [{"type": "greater_smaller", "label": "Greater/Smaller Ticket", "prize_greater": "Prize A", "prize_smaller": "Prize B"}]';