ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS vip_group_link TEXT,
ADD COLUMN IF NOT EXISTS vip_group_video_url TEXT,
ADD COLUMN IF NOT EXISTS upsell_video_url TEXT,
ADD COLUMN IF NOT EXISTS upsell_offer_text TEXT,
ADD COLUMN IF NOT EXISTS upsell_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS upsell_probability TEXT DEFAULT '98%';