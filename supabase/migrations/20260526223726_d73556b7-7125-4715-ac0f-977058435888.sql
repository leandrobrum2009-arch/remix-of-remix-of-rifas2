-- Create table for admin feature permissions
CREATE TABLE IF NOT EXISTS public.admin_features_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) UNIQUE,
    scratch_cards_enabled BOOLEAN DEFAULT true,
    lucky_numbers_enabled BOOLEAN DEFAULT true,
    roulette_enabled BOOLEAN DEFAULT true,
    page_editing_enabled BOOLEAN DEFAULT true,
    sales_page_models_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_features_config TO authenticated;
GRANT ALL ON public.admin_features_config TO service_role;

-- RLS
ALTER TABLE public.admin_features_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to be safe on retry)
DROP POLICY IF EXISTS "Master can manage all feature configs" ON public.admin_features_config;
DROP POLICY IF EXISTS "Admins can view their own feature config" ON public.admin_features_config;

-- Master can see and edit everything
CREATE POLICY "Master can manage all feature configs" 
ON public.admin_features_config 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'master'
  )
);

-- Admins can see their own config
CREATE POLICY "Admins can view their own feature config" 
ON public.admin_features_config 
FOR SELECT 
USING (user_id = auth.uid());

-- Assign Master role to the main admin if they exist
DO $$
DECLARE
    main_admin_id UUID;
BEGIN
    SELECT id INTO main_admin_id FROM auth.users WHERE email = 'leandrobrum2009@gmail.com';
    IF main_admin_id IS NOT NULL THEN
        -- If user has admin role but not master, upgrade it
        IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = main_admin_id AND role = 'admin') AND 
           NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = main_admin_id AND role = 'master') THEN
            UPDATE public.user_roles SET role = 'master' WHERE user_id = main_admin_id AND role = 'admin';
        ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = main_admin_id AND role = 'master') THEN
            INSERT INTO public.user_roles (user_id, role) VALUES (main_admin_id, 'master');
        END IF;
    END IF;
END $$;
