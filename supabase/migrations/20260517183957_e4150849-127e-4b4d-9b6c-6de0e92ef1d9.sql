-- Create banners table
CREATE TABLE public.banners (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create coupons table
CREATE TABLE public.coupons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL,
    min_purchase_amount NUMERIC DEFAULT 0,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add coupon info to orders
ALTER TABLE public.orders 
ADD COLUMN coupon_id UUID REFERENCES public.coupons(id),
ADD COLUMN discount_amount NUMERIC(10,2) DEFAULT 0;

-- Create site_settings table
CREATE TABLE public.site_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create push_notifications table
CREATE TABLE public.push_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link_url TEXT,
    sent_by UUID REFERENCES auth.users(id),
    target_type TEXT DEFAULT 'all', -- 'all', 'user', 'affiliate'
    target_user_id UUID REFERENCES auth.users(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- Admin Policies
CREATE POLICY "Admins have full access to banners" ON public.banners
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Banners are publicly readable" ON public.banners
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins have full access to coupons" ON public.coupons
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins have full access to site_settings" ON public.site_settings
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Site settings are publicly readable" ON public.site_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins have full access to push_notifications" ON public.push_notifications
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own notifications" ON public.push_notifications
    FOR SELECT USING (target_user_id = auth.uid() OR target_type = 'all');

-- Seed initial settings
INSERT INTO public.site_settings (key, value, description) VALUES
('cashback_percent', '5', 'Porcentagem de cashback em compras'),
('affiliate_commission_percent', '10', 'Comissão padrão para afiliados'),
('min_withdrawal_amount', '50', 'Valor mínimo para saque'),
('support_whatsapp', '+5500000000000', 'Número do WhatsApp de suporte');
