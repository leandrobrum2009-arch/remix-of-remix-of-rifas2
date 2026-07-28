-- Create Enum for Rarity
DO $$ BEGIN
    CREATE TYPE mystery_box_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Mystery Box Configs Table
CREATE TABLE IF NOT EXISTS public.mystery_box_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rarity mystery_box_rarity NOT NULL DEFAULT 'common',
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Mystery Box Prizes Table
CREATE TABLE IF NOT EXISTS public.mystery_box_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES public.mystery_box_configs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    prize_type TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'product', 'credits', 'tickets', 'vip'
    prize_value NUMERIC(10, 2) DEFAULT 0,
    chance_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    image_url TEXT,
    rarity mystery_box_rarity NOT NULL DEFAULT 'common',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mystery_box_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_box_prizes ENABLE ROW LEVEL SECURITY;

-- Policies for Configs
CREATE POLICY "Mystery box configs are public" ON public.mystery_box_configs FOR SELECT USING (true);
CREATE POLICY "Admins can manage configs" ON public.mystery_box_configs FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies for Prizes
CREATE POLICY "Mystery box prizes are public" ON public.mystery_box_prizes FOR SELECT USING (true);
CREATE POLICY "Admins can manage prizes" ON public.mystery_box_prizes FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Update mystery_box_wins to support the new structure
ALTER TABLE public.mystery_box_wins DROP CONSTRAINT IF EXISTS mystery_box_wins_box_id_fkey;
ALTER TABLE public.mystery_box_wins ADD COLUMN IF NOT EXISTS prize_id UUID REFERENCES public.mystery_box_prizes(id);
ALTER TABLE public.mystery_box_wins ADD COLUMN IF NOT EXISTS config_id UUID REFERENCES public.mystery_box_configs(id);

-- Insert some default configs for the first campaign if it exists
DO $$
DECLARE
    first_campaign_id UUID;
BEGIN
    SELECT id INTO first_campaign_id FROM campaigns LIMIT 1;
    
    IF first_campaign_id IS NOT NULL THEN
        INSERT INTO mystery_box_configs (campaign_id, name, rarity, cost)
        VALUES 
            (first_campaign_id, 'Caixa Comum', 'common', 10.00),
            (first_campaign_id, 'Caixa Rara', 'rare', 50.00),
            (first_campaign_id, 'Caixa Épica', 'epic', 150.00),
            (first_campaign_id, 'Caixa Lendária', 'legendary', 500.00)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
