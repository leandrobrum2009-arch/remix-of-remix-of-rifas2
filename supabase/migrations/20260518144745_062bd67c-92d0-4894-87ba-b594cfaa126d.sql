-- Add missing foreign keys to orders
ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_campaigns
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
ON DELETE CASCADE;

-- Add missing foreign keys to winners
ALTER TABLE public.winners
ADD CONSTRAINT fk_winners_campaigns
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
ON DELETE CASCADE;

-- Add email column to profiles to facilitate admin access
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_campaign_id ON public.orders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_winners_campaign_id ON public.winners(campaign_id);