-- Create scratch_card_prizes table
CREATE TABLE public.scratch_card_prizes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    label TEXT NOT NULL,
    value NUMERIC NOT NULL DEFAULT 0,
    prize_type TEXT NOT NULL DEFAULT 'balance', -- balance, ticket, physical, etc.
    chance_percent NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    campaign_id UUID REFERENCES public.campaigns(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scratch_card_scratches table
CREATE TABLE public.scratch_card_scratches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    prize_id UUID REFERENCES public.scratch_card_prizes(id),
    prize_label TEXT,
    prize_value NUMERIC,
    prize_type TEXT,
    cost NUMERIC NOT NULL DEFAULT 0,
    is_winner BOOLEAN NOT NULL DEFAULT false,
    campaign_id UUID REFERENCES public.campaigns(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scratch_card_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch_card_scratches ENABLE ROW LEVEL SECURITY;

-- Policies for scratch_card_prizes
CREATE POLICY "Prizes are viewable by everyone" 
ON public.scratch_card_prizes FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage scratch_card_prizes" 
ON public.scratch_card_prizes FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Policies for scratch_card_scratches
CREATE POLICY "Users can view their own scratches" 
ON public.scratch_card_scratches FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scratches" 
ON public.scratch_card_scratches FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all scratches" 
ON public.scratch_card_scratches FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Trigger for updated_at on scratch_card_prizes
CREATE TRIGGER update_scratch_card_prizes_updated_at
BEFORE UPDATE ON public.scratch_card_prizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
