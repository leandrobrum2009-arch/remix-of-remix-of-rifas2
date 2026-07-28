CREATE OR REPLACE VIEW public.tickets_public AS
SELECT id, number, status, campaign_id, created_at, is_lucky
FROM public.tickets
WHERE status IN ('confirmed', 'paid')
   OR (status = 'reserved' AND reservation_expires_at > now());

ALTER VIEW public.tickets_public SET (security_invoker = off);
GRANT SELECT ON public.tickets_public TO anon, authenticated;