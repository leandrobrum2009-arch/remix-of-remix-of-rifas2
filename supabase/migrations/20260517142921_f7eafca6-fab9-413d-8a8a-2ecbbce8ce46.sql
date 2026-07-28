-- Add gamification and balance fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cashback_balance NUMERIC(10,2) DEFAULT 0;

-- Add advanced fields to campaigns
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS price_bundles JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS min_tickets INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_tickets INTEGER DEFAULT 10000,
ADD COLUMN IF NOT EXISTS mystery_box_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS roulette_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ranking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Create Mystery Boxes table
CREATE TABLE IF NOT EXISTS public.mystery_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    prize_value NUMERIC(10,2),
    chance_percent NUMERIC(5,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mystery_boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mystery boxes are publicly readable" ON public.mystery_boxes FOR SELECT USING (true);
CREATE POLICY "Admins can manage mystery boxes" ON public.mystery_boxes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create Roulette Prizes table
CREATE TABLE IF NOT EXISTS public.roulette_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    prize_type TEXT NOT NULL DEFAULT 'points' CHECK (prize_type IN ('points', 'balance', 'ticket', 'physical')),
    value NUMERIC(10,2),
    chance_percent NUMERIC(5,2) DEFAULT 10.00,
    color TEXT DEFAULT '#primary',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.roulette_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roulette prizes are publicly readable" ON public.roulette_prizes FOR SELECT USING (true);
CREATE POLICY "Admins can manage roulette prizes" ON public.roulette_prizes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create Affiliate Commissions table
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view their commissions" ON public.affiliate_commissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid())
);

-- Create User Rewards table
CREATE TABLE IF NOT EXISTS public.user_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view rewards" ON public.user_rewards FOR SELECT USING (true);

-- Enable Realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Function to handle cashback and affiliate commissions on paid orders
CREATE OR REPLACE FUNCTION public.process_paid_order()
RETURNS TRIGGER AS $$
DECLARE
    v_affiliate_id UUID;
    v_commission_rate NUMERIC;
    v_cashback_rate NUMERIC := 0.02; -- 2% default cashback
BEGIN
    IF NEW.payment_status = 'paid' AND OLD.payment_status = 'pending' THEN
        -- 1. Process Cashback
        UPDATE public.profiles
        SET cashback_balance = cashback_balance + (NEW.total_amount * v_cashback_rate),
            points = points + FLOOR(NEW.total_amount * 10), -- 10 points per R$ 1
            xp = xp + FLOOR(NEW.total_amount * 5)
        WHERE user_id = NEW.user_id;

        -- 2. Process Affiliate (if exists - assuming we store affiliate_id on orders or track via referral)
        -- For now, let's assume we might have an affiliate_id on the order (adding it below)
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_paid
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.process_paid_order();

-- Add referral column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id);
