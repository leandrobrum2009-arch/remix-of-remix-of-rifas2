
-- 1. Extend campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS gift_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_reveal_mode text NOT NULL DEFAULT 'on_draw' CHECK (gift_reveal_mode IN ('on_draw','on_sold_out')),
  ADD COLUMN IF NOT EXISTS gift_results_revealed boolean NOT NULL DEFAULT false;

-- 2. Gift prizes table
CREATE TABLE IF NOT EXISTS public.campaign_gift_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ticket_number text NOT NULL,
  prize_type text NOT NULL CHECK (prize_type IN ('pix','item')),
  prize_value_cents integer,
  prize_title text NOT NULL,
  prize_image_url text,
  winner_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  revealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, ticket_number)
);

GRANT SELECT ON public.campaign_gift_prizes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_gift_prizes TO authenticated;
GRANT ALL ON public.campaign_gift_prizes TO service_role;

ALTER TABLE public.campaign_gift_prizes ENABLE ROW LEVEL SECURITY;

-- Public can see rows exist (number + revealed_at), but not sensitive data (columns filtered via view below).
CREATE POLICY "Anyone can see gift prize slots"
  ON public.campaign_gift_prizes FOR SELECT
  USING (true);

CREATE POLICY "Admins manage gift prizes"
  ON public.campaign_gift_prizes FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'master'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'master'::app_role));

CREATE TRIGGER update_campaign_gift_prizes_updated_at
  BEFORE UPDATE ON public.campaign_gift_prizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Public view that hides prize details until revealed
CREATE OR REPLACE VIEW public.campaign_gift_prizes_public AS
SELECT
  gp.id,
  gp.campaign_id,
  gp.ticket_number,
  gp.revealed_at,
  CASE WHEN c.gift_results_revealed THEN gp.prize_type ELSE NULL END AS prize_type,
  CASE WHEN c.gift_results_revealed THEN gp.prize_title ELSE NULL END AS prize_title,
  CASE WHEN c.gift_results_revealed THEN gp.prize_image_url ELSE NULL END AS prize_image_url,
  CASE WHEN c.gift_results_revealed THEN gp.prize_value_cents ELSE NULL END AS prize_value_cents,
  CASE WHEN c.gift_results_revealed THEN gp.winner_order_id ELSE NULL END AS winner_order_id,
  CASE
    WHEN c.gift_results_revealed THEN (
      SELECT p.name FROM public.orders o
      JOIN public.profiles p ON p.user_id = o.user_id
      WHERE o.id = gp.winner_order_id
    )
    ELSE NULL
  END AS winner_name
FROM public.campaign_gift_prizes gp
JOIN public.campaigns c ON c.id = gp.campaign_id;

GRANT SELECT ON public.campaign_gift_prizes_public TO anon, authenticated;

-- 4. RPC to reveal results: associate winner_order_id per ticket and flag campaign
CREATE OR REPLACE FUNCTION public.reveal_gift_results(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'master'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.campaign_gift_prizes gp
     SET winner_order_id = t.order_id,
         revealed_at = now()
    FROM public.tickets t
   WHERE gp.campaign_id = p_campaign_id
     AND t.campaign_id = p_campaign_id
     AND t.number = gp.ticket_number
     AND t.status IN ('confirmed','paid');
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  UPDATE public.campaigns
     SET gift_results_revealed = true
   WHERE id = p_campaign_id;

  RETURN jsonb_build_object('success', true, 'revealed_slots', v_updated);
END;
$$;
