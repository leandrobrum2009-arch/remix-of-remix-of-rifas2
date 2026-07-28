-- Adicionar índices para otimizar consultas comuns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_featured ON public.campaigns(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_mystery_box_configs_active ON public.mystery_box_configs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mystery_box_configs_campaign ON public.mystery_box_configs(campaign_id);

-- Garantir que as permissões continuem corretas (boas práticas após alterações estruturais de performance)
GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.tickets TO authenticated;
GRANT SELECT ON public.mystery_box_configs TO anon, authenticated;
GRANT ALL ON public.campaigns TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.tickets TO service_role;
GRANT ALL ON public.mystery_box_configs TO service_role;