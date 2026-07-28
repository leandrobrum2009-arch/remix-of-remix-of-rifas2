ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scratch_cards_enabled BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scratch_card_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scratch_card_rules JSONB DEFAULT '[]'::jsonb;