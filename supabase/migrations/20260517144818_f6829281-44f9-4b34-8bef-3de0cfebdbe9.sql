-- Add new columns to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS regulations TEXT,
ADD COLUMN IF NOT EXISTS auto_numbers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS manual_numbers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lucky_numbers_prizes JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS federal_lottery_draw BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS draw_number TEXT,
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '["pix", "stripe", "mercadopago", "card"]';

-- Add new columns to tickets for lucky numbers and reservations
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS is_lucky BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for expired reservations
CREATE INDEX IF NOT EXISTS idx_tickets_reservation_expires ON public.tickets (reservation_expires_at) WHERE reservation_expires_at IS NOT NULL;

-- Function to cleanup expired ticket reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS void AS $$
BEGIN
    DELETE FROM public.tickets
    WHERE status = 'reserved' AND reservation_expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
