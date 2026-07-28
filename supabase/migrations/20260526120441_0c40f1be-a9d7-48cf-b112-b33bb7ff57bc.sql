-- Allow public read access to paid orders for ranking
CREATE POLICY "Public can view paid orders for ranking"
ON public.orders
FOR SELECT
USING (payment_status = 'paid');

-- Allow public read access to confirmed/paid tickets for stats
CREATE POLICY "Public can view confirmed/paid tickets for stats"
ON public.tickets
FOR SELECT
USING (status IN ('confirmed', 'paid'));