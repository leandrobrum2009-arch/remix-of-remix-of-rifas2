ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS show_timer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sections_order JSONB DEFAULT '["gallery", "header", "progress", "purchase", "description", "prizes", "winners", "ranking"]'::jsonb,
ADD COLUMN IF NOT EXISTS timer_end_date TIMESTAMP WITH TIME ZONE;

-- Add a comment explaining the sections_order
COMMENT ON COLUMN public.campaigns.sections_order IS 'Order of sections on the campaign detail page: gallery, header, progress, purchase, description, prizes, winners, ranking';