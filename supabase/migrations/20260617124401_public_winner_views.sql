-- Remove publicly exposed user_id from winners tables by replacing
-- broad public SELECT policies with privacy-preserving views.

DROP POLICY IF EXISTS "Public can view mystery box winners" ON public.mystery_box_wins;
DROP POLICY IF EXISTS "Public can view claimed roulette prizes" ON public.roulette_spins;
DROP POLICY IF EXISTS "Public can view claimed scratch prizes" ON public.scratch_card_scratches;

CREATE OR REPLACE VIEW public.mystery_box_wins_public
WITH (security_invoker = true) AS
SELECT
  w.id,
  w.config_id,
  w.box_id,
  w.prize_id,
  w.prize_title,
  w.prize_value,
  w.created_at,
  c.campaign_id,
  c.name AS box_name,
  COALESCE(p.name, 'Ganhador') AS winner_name,
  p.avatar_url
FROM public.mystery_box_wins w
LEFT JOIN public.mystery_box_configs c ON c.id = w.config_id
LEFT JOIN public.profiles p ON p.user_id = w.user_id;

CREATE OR REPLACE VIEW public.roulette_spins_public
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.campaign_id,
  s.prize_label,
  s.prize_value,
  s.prize_type,
  s.is_free,
  s.created_at,
  COALESCE(p.name, 'Ganhador') AS winner_name,
  p.avatar_url
FROM public.roulette_spins s
LEFT JOIN public.profiles p ON p.user_id = s.user_id
WHERE s.prize_label IS NOT NULL
  AND s.prize_label <> 'Tente novamente';

CREATE OR REPLACE VIEW public.scratch_card_scratches_public
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.campaign_id,
  s.prize_label,
  s.prize_value,
  s.prize_type,
  s.prize_id,
  s.is_winner,
  s.created_at,
  COALESCE(p.name, 'Ganhador') AS winner_name,
  p.avatar_url
FROM public.scratch_card_scratches s
LEFT JOIN public.profiles p ON p.user_id = s.user_id
WHERE s.is_winner = true;

GRANT SELECT ON public.mystery_box_wins_public TO anon, authenticated;
GRANT SELECT ON public.roulette_spins_public TO anon, authenticated;
GRANT SELECT ON public.scratch_card_scratches_public TO anon, authenticated;
