CREATE TABLE IF NOT EXISTS public.payment_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    error_message TEXT,
    error_code TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.payment_failures TO authenticated;
GRANT ALL ON public.payment_failures TO service_role;

ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment failures" ON public.payment_failures
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment failures" ON public.payment_failures
    FOR INSERT WITH CHECK (auth.uid() = user_id);