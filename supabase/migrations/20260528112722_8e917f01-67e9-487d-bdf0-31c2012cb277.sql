-- Add type and active status to affiliates
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'common';
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add campaign_id to affiliate_commissions
ALTER TABLE public.affiliate_commissions ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id);

-- Create table for tracking clicks
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    referrer_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS and Permissions
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.affiliate_clicks TO authenticated;
GRANT SELECT, INSERT ON public.affiliate_clicks TO anon;
GRANT ALL ON public.affiliate_clicks TO service_role;

-- Policies for affiliate_clicks
CREATE POLICY "Anyone can insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Affiliates can view their own clicks" ON public.affiliate_clicks FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.affiliates 
        WHERE id = affiliate_clicks.affiliate_id 
        AND user_id = auth.uid()
    )
);

-- Policy for affiliates to see their own commissions
CREATE POLICY "Affiliates can view their own commissions" ON public.affiliate_commissions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.affiliates 
        WHERE id = affiliate_commissions.affiliate_id 
        AND user_id = auth.uid()
    )
);

-- Policy for affiliates to see their own profile
CREATE POLICY "Affiliates can view their own profile" ON public.affiliates FOR SELECT USING (user_id = auth.uid());
