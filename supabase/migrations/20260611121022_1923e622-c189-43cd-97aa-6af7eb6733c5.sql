-- Create purchase_logs table
CREATE TABLE IF NOT EXISTS public.purchase_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'order_created', 'payment_confirmed', 'commission_generated', 'error'
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT ON public.purchase_logs TO authenticated;
GRANT ALL ON public.purchase_logs TO service_role;

-- Enable RLS
ALTER TABLE public.purchase_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admin to view all logs (using user_roles table)
CREATE POLICY "Admins can view all purchase logs" ON public.purchase_logs
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND (role::text = 'admin' OR role::text = 'superadmin')));

-- Function to record log
CREATE OR REPLACE FUNCTION public.record_purchase_log(
    p_order_id UUID,
    p_event_type TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.purchase_logs (order_id, event_type, message, metadata)
    VALUES (p_order_id, p_event_type, p_message, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log order creation
CREATE OR REPLACE FUNCTION public.log_order_creation() RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.record_purchase_log(
        NEW.id,
        'order_created',
        format('Pedido criado: %s cotas para a campanha %s. Total: %s', NEW.quantity, NEW.campaign_id, NEW.total_amount),
        jsonb_build_object(
            'quantity', NEW.quantity,
            'campaign_id', NEW.campaign_id,
            'total_amount', NEW.total_amount,
            'affiliate_id', NEW.affiliate_id
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on retry
DROP TRIGGER IF EXISTS tr_log_order_creation ON public.orders;
CREATE TRIGGER tr_log_order_creation
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_creation();

-- Update handle_affiliate_commission to include logging
CREATE OR REPLACE FUNCTION public.handle_affiliate_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_commission_rate NUMERIC;
    v_commission_amount NUMERIC;
    v_site_commission_rate NUMERIC;
BEGIN
    -- Log payment confirmation
    IF (NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid')) THEN
        PERFORM public.record_purchase_log(
            NEW.id,
            'payment_confirmed',
            format('Pagamento confirmado para o pedido %s', NEW.id),
            jsonb_build_object('paid_at', NEW.paid_at)
        );
        
        -- Only proceed with commission if there is an affiliate
        IF (NEW.affiliate_id IS NOT NULL) THEN
            -- Get site-wide commission rate as fallback
            SELECT COALESCE(value::numeric / 100, 0.1) INTO v_site_commission_rate 
            FROM public.site_settings 
            WHERE key = 'affiliate_commission_percent';

            -- Get affiliate specific rate
            SELECT COALESCE(commission_rate, v_site_commission_rate) INTO v_commission_rate 
            FROM public.affiliates 
            WHERE id = NEW.affiliate_id AND is_active = true;

            IF v_commission_rate IS NOT NULL THEN
                -- Calculate amount
                v_commission_amount := NEW.total_amount * v_commission_rate;

                -- Create commission record
                INSERT INTO public.affiliate_commissions (
                    affiliate_id,
                    order_id,
                    campaign_id,
                    amount,
                    status
                ) VALUES (
                    NEW.affiliate_id,
                    NEW.id,
                    NEW.campaign_id,
                    v_commission_amount,
                    'paid' -- Auto-paid if order is paid
                );

                -- Update total earned for the affiliate
                UPDATE public.affiliates 
                SET total_earned = COALESCE(total_earned, 0) + v_commission_amount
                WHERE id = NEW.affiliate_id;

                -- Log commission generation
                PERFORM public.record_purchase_log(
                    NEW.id,
                    'commission_generated',
                    format('Comissão de %s gerada para o afiliado %s', v_commission_amount, NEW.affiliate_id),
                    jsonb_build_object(
                        'affiliate_id', NEW.affiliate_id,
                        'amount', v_commission_amount,
                        'rate', v_commission_rate
                    )
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;
