-- Function to handle affiliate commission calculation
CREATE OR REPLACE FUNCTION public.handle_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate NUMERIC;
    v_commission_amount NUMERIC;
    v_site_commission_rate NUMERIC;
BEGIN
    -- Only proceed if the order status changed to 'paid' and there is an affiliate
    IF (NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') AND NEW.affiliate_id IS NOT NULL) THEN
        
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
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for orders
DROP TRIGGER IF EXISTS on_order_paid_affiliate ON public.orders;
CREATE TRIGGER on_order_paid_affiliate
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_affiliate_commission();
