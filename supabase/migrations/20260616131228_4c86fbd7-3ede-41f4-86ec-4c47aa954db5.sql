DROP FUNCTION IF EXISTS public.get_campaign_mystery_box_wins(uuid, integer);

CREATE FUNCTION public.get_campaign_mystery_box_wins(p_campaign_id uuid, p_limit integer DEFAULT 200)
RETURNS TABLE(id uuid, config_id uuid, box_name text, prize_title text, prize_value numeric, created_at timestamp with time zone, winner_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    w.id,
    w.config_id,
    c.name AS box_name,
    w.prize_title,
    w.prize_value,
    w.created_at,
    COALESCE(NULLIF(p.name, ''), 'Ganhador') AS winner_name,
    p.avatar_url
  FROM public.mystery_box_wins w
  INNER JOIN public.mystery_box_configs c ON c.id = w.config_id
  LEFT JOIN public.profiles p ON p.user_id = w.user_id
  WHERE c.campaign_id = p_campaign_id
  ORDER BY w.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
$function$;

GRANT EXECUTE ON FUNCTION public.get_campaign_mystery_box_wins(uuid, integer) TO anon, authenticated, service_role;