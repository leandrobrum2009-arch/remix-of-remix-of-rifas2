-- =====================================================================
-- ESTRUTURA COMPLETA DO BANCO (schema public)
-- Rode este arquivo inteiro no SQL Editor do seu Supabase externo.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

-- enum app_role
CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user',
    'master',
    'client_admin'
);


--
-- Name: mystery_box_rarity; Type: TYPE; Schema: public; Owner: -
--

-- enum mystery_box_rarity
CREATE TYPE public.mystery_box_rarity AS ENUM (
    'common',
    'rare',
    'epic',
    'legendary'
);


--
-- Name: audit_all_paid_orders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_all_paid_orders() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_order_id UUID;
    v_fixed_count INTEGER := 0;
    v_total_paid INTEGER := 0;
BEGIN
    -- Selecionar todos os pedidos pagos
    FOR v_order_id IN SELECT id FROM public.orders WHERE payment_status = 'paid' LOOP
        v_total_paid := v_total_paid + 1;
        PERFORM public.repair_order(v_order_id);
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Auditoria completa realizada em ' || v_total_paid || ' pedidos pagos.',
        'total_audited', v_total_paid
    );
END;
$$;


--
-- Name: campaigns_set_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.campaigns_set_slug() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  base text;
  candidate text;
  i int := 1;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 OR NEW.slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-' THEN
    base := public.slugify(NEW.title);
    IF base IS NULL OR base = '' THEN base := 'campanha'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.campaigns WHERE slug = candidate AND id <> NEW.id) LOOP
      i := i + 1;
      candidate := base || '-' || i;
    END LOOP;
    NEW.slug := candidate;
  ELSE
    NEW.slug := public.slugify(NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_data_integrity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_data_integrity() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_campaigns_mismatch jsonb;
  v_negative_balances jsonb;
  v_orphan_tickets integer;
  v_paid_no_tickets integer;
  v_expired_reservations integer;
  v_duplicate_settings jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'master'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 1. Campanhas onde sold_tickets diverge da contagem real de tickets confirmed/paid
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_campaigns_mismatch
  FROM (
    SELECT c.id, c.title, c.sold_tickets AS stored,
           (SELECT count(*) FROM public.tickets t
             WHERE t.campaign_id = c.id AND t.status IN ('confirmed','paid')) AS actual
    FROM public.campaigns c
    WHERE c.sold_tickets IS DISTINCT FROM
          (SELECT count(*)::int FROM public.tickets t
            WHERE t.campaign_id = c.id AND t.status IN ('confirmed','paid'))
  ) t;

  -- 2. Perfis com saldo negativo (nunca deveria acontecer)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_negative_balances
  FROM (
    SELECT user_id, balance, cashback_balance, points
    FROM public.profiles
    WHERE COALESCE(balance,0) < 0
       OR COALESCE(cashback_balance,0) < 0
       OR COALESCE(points,0) < 0
  ) t;

  -- 3. Tickets órfãos (order_id apontando para pedido inexistente)
  SELECT count(*) INTO v_orphan_tickets
  FROM public.tickets t
  LEFT JOIN public.orders o ON o.id = t.order_id
  WHERE t.order_id IS NOT NULL AND o.id IS NULL;

  -- 4. Pedidos pagos (não-depósito) sem tickets
  SELECT count(*) INTO v_paid_no_tickets
  FROM public.orders o
  WHERE o.payment_status = 'paid'
    AND o.campaign_id <> '00000000-0000-0000-0000-000000000001'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.tickets t WHERE t.order_id = o.id);

  -- 5. Reservas expiradas ainda presentes (cleanup falhou)
  SELECT count(*) INTO v_expired_reservations
  FROM public.tickets
  WHERE status = 'reserved' AND reservation_expires_at < now();

  -- 6. Chaves duplicadas em site_settings
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_duplicate_settings
  FROM (
    SELECT key, count(*) AS occurrences
    FROM public.site_settings
    GROUP BY key HAVING count(*) > 1
  ) t;

  RETURN jsonb_build_object(
    'checked_at', now(),
    'ok', (
      jsonb_array_length(v_campaigns_mismatch) = 0
      AND jsonb_array_length(v_negative_balances) = 0
      AND v_orphan_tickets = 0
      AND v_paid_no_tickets = 0
      AND v_expired_reservations = 0
      AND jsonb_array_length(v_duplicate_settings) = 0
    ),
    'campaigns_progress_mismatch', v_campaigns_mismatch,
    'negative_balances', v_negative_balances,
    'orphan_tickets', v_orphan_tickets,
    'paid_orders_without_tickets', v_paid_no_tickets,
    'expired_reservations_pending_cleanup', v_expired_reservations,
    'duplicate_site_settings_keys', v_duplicate_settings
  );
END;
$$;


--
-- Name: check_is_master(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_is_master(user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = $1 
    AND public.user_roles.role = 'master'
  );
END;
$_$;


--
-- Name: cleanup_expired_reservations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_reservations() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    DELETE FROM public.tickets
    WHERE status = 'reserved' AND reservation_expires_at < now();
END;
$$;


--
-- Name: create_mystery_box_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_mystery_box_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.user_id,
        'Você ganhou um prêmio!',
        'Parabéns! Você abriu uma caixa e ganhou: ' || NEW.prize_title,
        'win'
    );
    RETURN NEW;
END;
$$;


--
-- Name: create_roulette_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_roulette_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Only notify if prize_label is set (spin completed)
    -- And either it's a new row or prize_label was previously NULL
    IF NEW.prize_label IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.prize_label IS NULL) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Prêmio na Roleta!',
            'Incrível! Você girou a roleta e ganhou: ' || NEW.prize_label,
            'win'
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: current_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_tenant_id() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_claim text;
  v_default uuid;
BEGIN
  BEGIN
    v_claim := current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,tenant_id}';
  EXCEPTION WHEN OTHERS THEN
    v_claim := NULL;
  END;
  IF v_claim IS NOT NULL AND v_claim <> '' THEN
    RETURN v_claim::uuid;
  END IF;

  SELECT id INTO v_default FROM public.tenants WHERE slug = 'default' LIMIT 1;
  RETURN v_default;
END;
$$;


--
-- Name: diagnose_table_permissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.diagnose_table_permissions() RETURNS TABLE(table_name text, can_select boolean, can_insert boolean, can_update boolean, can_delete boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  tables_to_check TEXT[] := ARRAY['site_settings', 'orders', 'tickets', 'campaigns', 'winners', 'user_roles', 'profiles'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_check LOOP
    table_name := t;
    -- We check the 'authenticated' role since that's what PostgREST users use
    can_select := has_table_privilege('authenticated', 'public.' || t, 'SELECT');
    can_insert := has_table_privilege('authenticated', 'public.' || t, 'INSERT');
    can_update := has_table_privilege('authenticated', 'public.' || t, 'UPDATE');
    can_delete := has_table_privilege('authenticated', 'public.' || t, 'DELETE');
    RETURN NEXT;
  END LOOP;
END;
$$;


--
-- Name: duplicate_campaign(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.duplicate_campaign(p_campaign_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_new_campaign_id UUID;
    v_campaign RECORD;
    v_config RECORD;
    v_new_config_id UUID;
BEGIN
    -- 1. Get original campaign data
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;

    -- 2. Insert new campaign
    INSERT INTO public.campaigns (
        title, slug, subtitle, description, image_url, ticket_price, total_tickets, 
        sold_tickets, status, ltp_code, urgency_tag, draw_date, price_bundles, 
        min_tickets, max_tickets, mystery_box_enabled, roulette_enabled, ranking_enabled, 
        featured, gallery_urls, video_url, regulations, auto_numbers, manual_numbers, 
        lucky_numbers_prizes, federal_lottery_draw, draw_number, payment_methods, 
        sales_goal, roulette_spin_cost, roulette_free_tickets, roulette_multiplier_max, 
        ticket_generation_type, roulette_payout_rate, show_instant_prizes, 
        show_roulette_status, main_prizes, roulette_rules, sections_order, 
        timer_end_date, scratch_cards_enabled, scratch_card_cost, scratch_card_rules, 
        vip_group_link, vip_group_video_url, upsell_video_url, upsell_offer_text, 
        upsell_enabled, upsell_probability, ranking_prizes
    )
    VALUES (
        v_campaign.title || ' (Cópia)',
        v_campaign.slug || '-copia-' || floor(random() * 10000)::text,
        v_campaign.subtitle, v_campaign.description, v_campaign.image_url, v_campaign.ticket_price, v_campaign.total_tickets,
        0, 'draft', v_campaign.ltp_code, v_campaign.urgency_tag, v_campaign.draw_date, v_campaign.price_bundles,
        v_campaign.min_tickets, v_campaign.max_tickets, v_campaign.mystery_box_enabled, v_campaign.roulette_enabled, v_campaign.ranking_enabled,
        v_campaign.featured, v_campaign.gallery_urls, v_campaign.video_url, v_campaign.regulations, v_campaign.auto_numbers, v_campaign.manual_numbers,
        v_campaign.lucky_numbers_prizes, v_campaign.federal_lottery_draw, v_campaign.draw_number, v_campaign.payment_methods,
        v_campaign.sales_goal, v_campaign.roulette_spin_cost, v_campaign.roulette_free_tickets, v_campaign.roulette_multiplier_max,
        v_campaign.ticket_generation_type, v_campaign.roulette_payout_rate, v_campaign.show_instant_prizes,
        v_campaign.show_roulette_status, v_campaign.main_prizes, v_campaign.roulette_rules, v_campaign.sections_order,
        v_campaign.timer_end_date, v_campaign.scratch_cards_enabled, v_campaign.scratch_card_cost, v_campaign.scratch_card_rules,
        v_campaign.vip_group_link, v_campaign.vip_group_video_url, v_campaign.upsell_video_url, v_campaign.upsell_offer_text,
        v_campaign.upsell_enabled, v_campaign.upsell_probability, v_campaign.ranking_prizes
    )
    RETURNING id INTO v_new_campaign_id;

    -- 3. Copy roulette prizes
    INSERT INTO public.roulette_prizes (campaign_id, label, prize_type, value, chance_percent, color)
    SELECT v_new_campaign_id, label, prize_type, value, chance_percent, color
    FROM public.roulette_prizes
    WHERE campaign_id = p_campaign_id;

    -- 4. Copy scratch card prizes
    INSERT INTO public.scratch_card_prizes (label, value, prize_type, chance_percent, image_url, is_active, campaign_id)
    SELECT label, value, prize_type, chance_percent, image_url, is_active, v_new_campaign_id
    FROM public.scratch_card_prizes
    WHERE campaign_id = p_campaign_id;

    -- 5. Copy mystery box configs and their prizes
    FOR v_config IN SELECT * FROM public.mystery_box_configs WHERE campaign_id = p_campaign_id LOOP
        INSERT INTO public.mystery_box_configs (campaign_id, name, rarity, cost, image_url, is_active)
        VALUES (v_new_campaign_id, v_config.name, v_config.rarity, v_config.cost, v_config.image_url, v_config.is_active)
        RETURNING id INTO v_new_config_id;

        INSERT INTO public.mystery_box_prizes (config_id, title, description, prize_type, prize_value, chance_percent, image_url, rarity)
        SELECT v_new_config_id, title, description, prize_type, prize_value, chance_percent, image_url, rarity
        FROM public.mystery_box_prizes
        WHERE config_id = v_config.id;
    END LOOP;

    RETURN v_new_campaign_id;
END;
$$;


--
-- Name: get_campaign_mystery_box_wins(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_campaign_mystery_box_wins(p_campaign_id uuid, p_limit integer DEFAULT 200) RETURNS TABLE(id uuid, config_id uuid, box_name text, prize_title text, prize_value numeric, created_at timestamp with time zone, winner_name text, avatar_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_campaign_roulette_wins(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_campaign_roulette_wins(p_campaign_id uuid, p_limit integer DEFAULT 200) RETURNS TABLE(id uuid, campaign_id uuid, prize_label text, prize_type text, prize_value numeric, created_at timestamp with time zone, winner_name text, avatar_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    rs.id,
    rs.campaign_id,
    rs.prize_label,
    rs.prize_type,
    rs.prize_value,
    rs.created_at,
    COALESCE(NULLIF(p.name, ''), 'Ganhador') AS winner_name,
    p.avatar_url
  FROM public.roulette_spins rs
  LEFT JOIN public.profiles p ON p.user_id = rs.user_id
  WHERE rs.campaign_id = p_campaign_id
    AND rs.prize_label IS NOT NULL
    AND rs.prize_label <> 'Tente novamente'
    AND COALESCE(rs.prize_type, '') <> 'none'
  ORDER BY rs.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
$$;


--
-- Name: get_campaign_scratch_wins(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_campaign_scratch_wins(p_campaign_id uuid, p_limit integer DEFAULT 200) RETURNS TABLE(id uuid, campaign_id uuid, prize_label text, prize_type text, prize_value numeric, created_at timestamp with time zone, winner_name text, avatar_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    s.id,
    s.campaign_id,
    s.prize_label,
    s.prize_type,
    s.prize_value,
    s.created_at,
    COALESCE(NULLIF(p.name, ''), 'Ganhador') AS winner_name,
    p.avatar_url
  FROM public.scratch_card_scratches s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.campaign_id = p_campaign_id
    AND s.is_winner = true
    AND s.prize_label IS NOT NULL
  ORDER BY s.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
$$;


--
-- Name: get_order_inconsistencies(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_order_inconsistencies() RETURNS TABLE(id uuid, customer_name text, quantity integer, tickets_generated bigint, payment_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id, 
        p.name as customer_name, 
        o.quantity, 
        COUNT(t.id) as tickets_generated,
        o.payment_status
    FROM public.orders o
    LEFT JOIN public.profiles p ON o.user_id = p.user_id
    LEFT JOIN public.tickets t ON o.id = t.order_id
    WHERE o.payment_status = 'paid'
    GROUP BY o.id, p.name, o.quantity, o.payment_status
    HAVING COUNT(t.id) != o.quantity;
END;
$$;


--
-- Name: handle_affiliate_commission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_affiliate_commission() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: handle_auth_user_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_auth_user_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET 
    name = COALESCE(NEW.raw_user_meta_data->>'name', name),
    updated_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name);
  RETURN NEW;
END;
$$;


--
-- Name: handle_order_payment(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_order_payment(p_order_id uuid, p_payment_id text DEFAULT NULL::text, p_payment_provider text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
    v_campaign_id UUID;
    v_user_id UUID;
    v_quantity INTEGER;
    v_current_status TEXT;
    v_total_amount NUMERIC;
    v_is_deposit BOOLEAN;
    v_affiliate_id UUID;
    v_commission_rate NUMERIC;
    v_commission_amount NUMERIC;
    v_referred_by_code TEXT;
    v_bonus_amount NUMERIC := 0;
    v_tiers JSONB;
BEGIN
    SELECT o.campaign_id, o.user_id, o.quantity, o.payment_status, o.total_amount, o.affiliate_id
    INTO v_campaign_id, v_user_id, v_quantity, v_current_status, v_total_amount, v_affiliate_id
    FROM public.orders o
    WHERE o.id = p_order_id
    FOR UPDATE;

    v_is_deposit := (v_campaign_id = '00000000-0000-0000-0000-000000000001');

    IF v_current_status != 'paid' THEN
        UPDATE public.orders
        SET payment_status = 'paid',
            paid_at = now(),
            payment_id = COALESCE(p_payment_id, orders.payment_id),
            payment_provider = COALESCE(p_payment_provider, orders.payment_provider)
        WHERE id = p_order_id;

        IF v_is_deposit THEN
            UPDATE public.profiles
            SET balance = balance + v_total_amount
            WHERE user_id = v_user_id;

            INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
            VALUES (v_user_id, v_total_amount, 'deposit', 'completed', 'Depósito via PIX');

            -- Deposit bonus lookup (highest applicable tier)
            BEGIN
                SELECT value::jsonb INTO v_tiers
                FROM public.site_settings
                WHERE key = 'deposit_bonus_tiers';
            EXCEPTION WHEN OTHERS THEN
                v_tiers := NULL;
            END;

            IF v_tiers IS NOT NULL AND jsonb_typeof(v_tiers) = 'array' THEN
                SELECT COALESCE(MAX((elem->>'bonus')::numeric), 0)
                INTO v_bonus_amount
                FROM jsonb_array_elements(v_tiers) elem
                WHERE (elem->>'min')::numeric <= v_total_amount
                  AND (elem->>'bonus')::numeric > 0
                  AND (elem->>'min')::numeric = (
                    SELECT MAX((e2->>'min')::numeric)
                    FROM jsonb_array_elements(v_tiers) e2
                    WHERE (e2->>'min')::numeric <= v_total_amount
                  );
            END IF;

            IF COALESCE(v_bonus_amount, 0) > 0 THEN
                UPDATE public.profiles
                SET balance = balance + v_bonus_amount
                WHERE user_id = v_user_id;

                INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
                VALUES (v_user_id, v_bonus_amount, 'bonus', 'completed',
                        'Bônus de depósito (R$ ' || v_total_amount::text || ')');
            END IF;
        ELSE
            IF v_affiliate_id IS NULL THEN
                SELECT referred_by_code INTO v_referred_by_code FROM public.profiles WHERE user_id = v_user_id;
                IF v_referred_by_code IS NOT NULL THEN
                    SELECT id INTO v_affiliate_id FROM public.affiliates WHERE referral_code = v_referred_by_code AND is_active = true LIMIT 1;
                    IF v_affiliate_id IS NOT NULL THEN
                        UPDATE public.orders SET affiliate_id = v_affiliate_id WHERE id = p_order_id;
                    END IF;
                END IF;
            END IF;

            IF v_affiliate_id IS NOT NULL THEN
                SELECT commission_rate INTO v_commission_rate FROM public.affiliates WHERE id = v_affiliate_id;
                v_commission_amount := v_total_amount * v_commission_rate;
                INSERT INTO public.affiliate_commissions (affiliate_id, order_id, campaign_id, amount, status)
                VALUES (v_affiliate_id, p_order_id, v_campaign_id, v_commission_amount, 'pending');
                UPDATE public.affiliates SET total_earned = total_earned + v_commission_amount WHERE id = v_affiliate_id;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM public.roulette_spins
                WHERE user_id = v_user_id AND campaign_id = v_campaign_id AND prize_label IS NULL
            ) THEN
                INSERT INTO public.roulette_spins (user_id, campaign_id, is_free)
                VALUES (v_user_id, v_campaign_id, true);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM public.scratch_card_scratches
                WHERE user_id = v_user_id AND (campaign_id = v_campaign_id OR campaign_id IS NULL) AND prize_label IS NULL
            ) THEN
                INSERT INTO public.scratch_card_scratches (user_id, campaign_id, prize_label, cost, is_winner)
                VALUES (v_user_id, v_campaign_id, NULL, 0, false);
            END IF;
        END IF;
    END IF;
END;
$_$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
BEGIN
  -- Master has all roles
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role = 'master') THEN
    RETURN TRUE;
  END IF;

  -- Admin logic
  IF $2 = 'admin' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role = 'admin');
  ELSIF $2 = 'moderator' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role IN ('admin', 'moderator'));
  ELSIF $2 = 'user' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role IN ('admin', 'moderator', 'user', 'client_admin'));
  ELSIF $2 = 'client_admin' THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role = 'client_admin');
  ELSE
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE public.user_roles.user_id = $1 AND public.user_roles.role = $2);
  END IF;
END;
$_$;


--
-- Name: increment_balance(numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_balance(amount numeric, user_uuid uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.profiles
  SET balance = balance + amount
  WHERE user_id = user_uuid;
END;
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = $1 
    AND public.user_roles.role IN ('admin', 'master', 'client_admin')
  );
END;
$_$;


--
-- Name: log_order_creation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_order_creation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: manual_perform_draw(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.manual_perform_draw(p_campaign_id uuid, p_ticket_number text, p_prize_index integer DEFAULT 1) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_winning_ticket RECORD;
    v_winner_id UUID;
    v_campaign RECORD;
    v_winner_name TEXT;
    v_user_id UUID;
    v_prize_desc TEXT;
BEGIN
    -- Obter informações da campanha
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campanha não encontrada.';
    END IF;

    v_prize_desc := v_campaign.title || ' - ' || p_prize_index || 'º Prêmio (Manual)';

    -- Verifica se existe um bilhete vendido para esse número
    SELECT t.user_id, p.name INTO v_user_id, v_winner_name
    FROM public.tickets t
    JOIN public.profiles p ON p.user_id = t.user_id
    WHERE t.campaign_id = p_campaign_id AND t.number = p_ticket_number AND t.status IN ('confirmed', 'paid')
    LIMIT 1;

    IF v_winner_name IS NULL THEN
        v_winner_name := 'Sorteado (Não vendido)';
        v_user_id := NULL;
    END IF;

    -- Remover ganhador anterior deste prêmio
    DELETE FROM public.winners 
    WHERE campaign_id = p_campaign_id 
    AND winner_type = 'raffle' 
    AND prize_index = p_prize_index;

    -- Registrar o ganhador
    INSERT INTO public.winners (
        campaign_id, 
        user_id,
        winner_name, 
        ticket_number, 
        prize_description, 
        draw_date, 
        winner_type,
        prize_index
    )
    VALUES (
        p_campaign_id,
        v_user_id,
        v_winner_name,
        p_ticket_number,
        v_prize_desc,
        CURRENT_DATE,
        'raffle',
        p_prize_index
    )
    RETURNING id INTO v_winner_id;

    -- Se for o primeiro prêmio, atualiza o status principal da campanha
    IF p_prize_index = 1 THEN
        UPDATE public.campaigns 
        SET 
            status = 'completed',
            draw_number = p_ticket_number,
            draw_date = now()
        WHERE id = p_campaign_id;
    END IF;

    RETURN v_winner_id;
END;
$$;


--
-- Name: notify_campaign_draw(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_campaign_draw(p_campaign_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_campaign_title TEXT;
    v_draw_date TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT title, draw_date INTO v_campaign_title, v_draw_date FROM public.campaigns WHERE id = p_campaign_id;
    
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT DISTINCT user_id, 
           'Lembrete de Sorteio', 
           'O sorteio da campanha "' || v_campaign_title || '" ocorrerá em breve: ' || to_char(v_draw_date, 'DD/MM/YYYY HH24:MI') || '.',
           'draw_reminder'
    FROM public.tickets
    WHERE campaign_id = p_campaign_id;
END;
$$;


--
-- Name: on_order_paid_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.on_order_paid_notification() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Pagamento Confirmado!',
            'Seu pagamento para a campanha foi confirmado. Boa sorte!',
            'win'
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: on_profile_created_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.on_profile_created_notification() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.user_id,
        'Bem-vindo(a)!',
        'Sua conta foi criada com sucesso. Explore as campanhas e boa sorte!',
        'bonus'
    );
    RETURN NEW;
END;
$$;


--
-- Name: pay_with_balance(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pay_with_balance(p_order_id uuid, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
    v_auth_user_id uuid;
    v_order record;
    v_user_balance numeric;
    v_new_balance numeric;
BEGIN
    v_auth_user_id := auth.uid();

    IF v_auth_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado');
    END IF;

    IF p_user_id IS NULL OR p_user_id <> v_auth_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário inválido para este pagamento');
    END IF;

    SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
      AND user_id = v_auth_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado ou não pertence a este usuário');
    END IF;

    IF v_order.payment_status = 'paid' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este pedido já consta como pago');
    END IF;

    IF v_order.campaign_id = '00000000-0000-0000-0000-000000000001'::uuid THEN
        RETURN jsonb_build_object('success', false, 'message', 'Depósito deve ser pago via PIX');
    END IF;

    SELECT balance
    INTO v_user_balance
    FROM public.profiles
    WHERE user_id = v_auth_user_id
    FOR UPDATE;

    IF v_user_balance IS NULL OR v_user_balance < v_order.total_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Saldo insuficiente. Seu saldo atual é R$ ' || COALESCE(v_user_balance, 0)
        );
    END IF;

    UPDATE public.profiles
    SET balance = balance - v_order.total_amount
    WHERE user_id = v_auth_user_id
    RETURNING balance INTO v_new_balance;

    PERFORM public.handle_order_payment(p_order_id, 'balance_' || p_order_id::text, 'balance');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pagamento realizado com sucesso via saldo!',
        'new_balance', v_new_balance
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Erro inesperado: ' || SQLERRM);
END;
$_$;


--
-- Name: perform_draw(uuid, uuid, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.perform_draw(p_campaign_id uuid, p_executed_by uuid DEFAULT NULL::uuid, p_prize_index integer DEFAULT 1, p_allow_unassigned boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_winning_ticket RECORD;
    v_winner_id UUID;
    v_campaign RECORD;
    v_winner_name TEXT;
    v_user_id UUID;
    v_winning_number TEXT;
    v_prize_desc TEXT;
BEGIN
    -- Obter informações da campanha
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campanha não encontrada.';
    END IF;

    -- Determinar a descrição do prêmio baseado no índice
    v_prize_desc := v_campaign.title || ' - ' || p_prize_index || 'º Prêmio';
    
    IF p_allow_unassigned THEN
        -- Sorteia qualquer número dentro do range total
        v_winning_number := LPAD(FLOOR(RANDOM() * v_campaign.total_tickets)::TEXT, LENGTH((v_campaign.total_tickets - 1)::TEXT), '0');
        
        -- Verifica se existe um bilhete vendido para esse número
        SELECT t.user_id, p.name INTO v_user_id, v_winner_name
        FROM public.tickets t
        JOIN public.profiles p ON p.user_id = t.user_id
        WHERE t.campaign_id = p_campaign_id AND t.number = v_winning_number AND t.status IN ('confirmed', 'paid')
        LIMIT 1;
        
        IF v_winner_name IS NULL THEN
            v_winner_name := 'Número não vendido';
            v_user_id := NULL;
        END IF;
    ELSE
        -- Sorteia apenas entre bilhetes confirmados ou pagos
        SELECT t.number, t.user_id, p.name INTO v_winning_number, v_user_id, v_winner_name
        FROM public.tickets t
        JOIN public.profiles p ON p.user_id = t.user_id
        WHERE t.campaign_id = p_campaign_id AND t.status IN ('confirmed', 'paid')
        ORDER BY random()
        LIMIT 1;

        IF v_winning_number IS NULL THEN
            RAISE EXCEPTION 'Nenhum bilhete confirmado ou pago encontrado para esta campanha.';
        END IF;
    END IF;

    -- Remover ganhador anterior deste prêmio para evitar duplicatas
    DELETE FROM public.winners 
    WHERE campaign_id = p_campaign_id 
    AND winner_type = 'raffle' 
    AND prize_index = p_prize_index;

    -- Registrar o ganhador
    INSERT INTO public.winners (
        campaign_id, 
        user_id,
        winner_name, 
        ticket_number, 
        prize_description, 
        draw_date, 
        winner_type,
        prize_index
    )
    VALUES (
        p_campaign_id,
        v_user_id,
        v_winner_name,
        v_winning_number,
        v_prize_desc,
        CURRENT_DATE,
        'raffle',
        p_prize_index
    )
    RETURNING id INTO v_winner_id;

    -- Registrar log
    INSERT INTO public.draw_logs (campaign_id, winner_id, executed_by, draw_method, details)
    VALUES (p_campaign_id, v_winner_id, p_executed_by, 'automatic', jsonb_build_object(
        'ticket_number', v_winning_number,
        'user_id', v_user_id,
        'prize_index', p_prize_index,
        'allow_unassigned', p_allow_unassigned,
        'execution_time', now()
    ));

    -- Se for o primeiro prêmio, atualiza o status principal da campanha
    IF p_prize_index = 1 THEN
        UPDATE public.campaigns 
        SET 
            status = 'completed',
            draw_number = v_winning_number,
            draw_date = now()
        WHERE id = p_campaign_id;
    END IF;

    RETURN v_winner_id;
END;
$$;


--
-- Name: process_lottery_draw_auto(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_lottery_draw_auto() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_campaign RECORD;
    v_winning_number TEXT;
    v_prize_key TEXT;
    v_prize_index INTEGER;
BEGIN
    -- Percorrer prêmios de 1 a 5
    FOR v_prize_index IN 1..5 LOOP
        v_prize_key := v_prize_index::TEXT;
        v_winning_number := NEW.premios->>v_prize_key;
        
        IF v_winning_number IS NOT NULL THEN
            -- Encontrar campanhas ativas vinculadas a este concurso e que usam sorteio federal
            FOR v_campaign IN 
                SELECT id FROM public.campaigns 
                WHERE concurso = NEW.concurso 
                AND status IN ('active', 'completed') -- 'completed' para permitir redownload/atualização
                AND federal_lottery_draw = true
            LOOP
                -- Realizar o sorteio para o índice correspondente
                PERFORM public.manual_perform_draw(v_campaign.id, v_winning_number, v_prize_index);
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$;


--
-- Name: process_mystery_box_open(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_mystery_box_open(p_config_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_user_id uuid;
    v_box record;
    v_prize record;
    v_user_balance numeric;
    v_total_chance numeric := 0;
    v_random_val numeric;
    v_current_chance numeric := 0;
    v_win_id uuid;
    v_new_balance numeric;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Entre para abrir caixas!';
    END IF;

    SELECT mbc.*, c.mystery_box_enabled
    INTO v_box
    FROM public.mystery_box_configs mbc
    JOIN public.campaigns c ON c.id = mbc.campaign_id
    WHERE mbc.id = p_config_id
      AND mbc.is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Caixa indisponível no momento';
    END IF;

    IF NOT COALESCE(v_box.mystery_box_enabled, false) THEN
        RAISE EXCEPTION 'Caixa desativada nesta campanha';
    END IF;

    SELECT COALESCE(SUM(mbp.chance_percent), 0) INTO v_total_chance
    FROM public.mystery_box_prizes mbp
    WHERE mbp.config_id = p_config_id
      AND COALESCE(mbp.chance_percent, 0) > 0
      AND NOT EXISTS (
          SELECT 1
          FROM public.mystery_box_wins mbw
          WHERE mbw.prize_id = mbp.id
      );

    IF v_total_chance <= 0 THEN
        RAISE EXCEPTION 'Todos os prêmios desta caixa já foram contemplados';
    END IF;

    SELECT balance INTO v_user_balance
    FROM public.profiles
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_user_balance IS NULL OR v_user_balance < COALESCE(v_box.cost, 0) THEN
        RAISE EXCEPTION 'Saldo insuficiente!';
    END IF;

    v_random_val := random() * v_total_chance;

    FOR v_prize IN
        SELECT mbp.*
        FROM public.mystery_box_prizes mbp
        WHERE mbp.config_id = p_config_id
          AND COALESCE(mbp.chance_percent, 0) > 0
          AND NOT EXISTS (
              SELECT 1
              FROM public.mystery_box_wins mbw
              WHERE mbw.prize_id = mbp.id
          )
        ORDER BY mbp.created_at ASC, mbp.id ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        v_current_chance := v_current_chance + COALESCE(v_prize.chance_percent, 0);
        IF v_random_val <= v_current_chance THEN
            EXIT;
        END IF;
    END LOOP;

    IF v_prize.id IS NULL THEN
        RAISE EXCEPTION 'Nenhum prêmio disponível nesta caixa';
    END IF;

    IF COALESCE(v_box.cost, 0) > 0 THEN
        UPDATE public.profiles
        SET balance = balance - v_box.cost
        WHERE user_id = v_user_id;
    END IF;

    INSERT INTO public.mystery_box_wins (
        user_id, box_id, config_id, prize_id, prize_title, prize_value
    ) VALUES (
        v_user_id, p_config_id, p_config_id, v_prize.id, v_prize.title, v_prize.prize_value
    )
    RETURNING id INTO v_win_id;

    IF v_prize.prize_type IN ('balance', 'cash', 'fixed_value') THEN
        UPDATE public.profiles
        SET balance = balance + COALESCE(v_prize.prize_value, 0)
        WHERE user_id = v_user_id;
    ELSIF v_prize.prize_type = 'points' THEN
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + COALESCE(v_prize.prize_value, 0)::integer
        WHERE user_id = v_user_id;
    END IF;

    SELECT balance INTO v_new_balance
    FROM public.profiles
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'win_id', v_win_id,
        'new_balance', v_new_balance,
        'prize', jsonb_build_object(
            'id', v_prize.id,
            'title', v_prize.title,
            'description', v_prize.description,
            'prize_type', v_prize.prize_type,
            'prize_value', v_prize.prize_value,
            'image_url', v_prize.image_url,
            'rarity', v_prize.rarity
        )
    );
END;
$$;


--
-- Name: process_overdue_lucky_hours(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_overdue_lucky_hours() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_draw RECORD;
BEGIN
    -- Find all scheduled draws where the draw_time has passed
    FOR v_draw IN 
        SELECT id 
        FROM lucky_hours 
        WHERE status = 'scheduled' 
          AND draw_time <= now()
    LOOP
        -- Run the draw for each
        PERFORM run_lucky_hour_draw(v_draw.id);
    END LOOP;
END;
$$;


--
-- Name: process_paid_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_paid_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_campaign_id uuid;
    v_user_id uuid;
    v_quantity integer;
    v_ticket_type text;
    v_total_tickets integer;
    v_pad_len integer;
    v_count integer := 0;
    v_cashback_rate numeric := 0.02;
    v_max_attempts integer := 0;
    v_lucky_ticket record;
    v_random_num text;
BEGIN
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid') THEN
        v_campaign_id := NEW.campaign_id;
        v_user_id := NEW.user_id;
        v_quantity := COALESCE(NEW.quantity, 0);

        SELECT ticket_generation_type, total_tickets, length(total_tickets::text)
        INTO v_ticket_type, v_total_tickets, v_pad_len
        FROM public.campaigns
        WHERE id = v_campaign_id;

        IF v_campaign_id <> '00000000-0000-0000-0000-000000000001'::uuid THEN
            UPDATE public.profiles
            SET cashback_balance = COALESCE(cashback_balance, 0) + (NEW.total_amount * v_cashback_rate),
                points = COALESCE(points, 0) + floor(NEW.total_amount * 10),
                xp = COALESCE(xp, 0) + floor(NEW.total_amount * 5)
            WHERE user_id = v_user_id;

            UPDATE public.tickets
            SET status = 'confirmed',
                reservation_expires_at = NULL
            WHERE order_id = NEW.id
              AND status = 'reserved';

            IF v_ticket_type = 'auto' THEN
                SELECT count(*) INTO v_count
                FROM public.tickets
                WHERE order_id = NEW.id;

                WHILE v_count < v_quantity AND v_max_attempts < GREATEST(v_quantity * 20, 100) LOOP
                    v_max_attempts := v_max_attempts + 1;
                    v_random_num := lpad(floor(random() * v_total_tickets)::text, v_pad_len, '0');

                    IF NOT EXISTS (
                        SELECT 1
                        FROM public.tickets
                        WHERE campaign_id = v_campaign_id
                          AND number = v_random_num
                          AND status IN ('reserved', 'confirmed', 'paid')
                    ) THEN
                        INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status)
                        VALUES (NEW.id, v_campaign_id, v_user_id, v_random_num, 'confirmed')
                        ON CONFLICT DO NOTHING;
                    END IF;

                    SELECT count(*) INTO v_count
                    FROM public.tickets
                    WHERE order_id = NEW.id;
                END LOOP;
            END IF;

            FOR v_lucky_ticket IN
                SELECT number
                FROM public.tickets
                WHERE order_id = NEW.id
                  AND is_lucky = true
                  AND status = 'confirmed'
            LOOP
                INSERT INTO public.scratch_card_scratches (user_id, campaign_id, description)
                VALUES (v_user_id, v_campaign_id, 'Cota Premiada #' || v_lucky_ticket.number);
            END LOOP;

            UPDATE public.campaigns
            SET sold_tickets = (
                SELECT count(*)
                FROM public.tickets
                WHERE campaign_id = v_campaign_id
                  AND status IN ('confirmed', 'paid')
            )
            WHERE id = v_campaign_id;
        END IF;

    ELSIF NEW.payment_status = 'cancelled' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'cancelled') THEN
        DELETE FROM public.tickets
        WHERE order_id = NEW.id
          AND status IN ('reserved', 'confirmed', 'paid');

        UPDATE public.campaigns
        SET sold_tickets = (
            SELECT count(*)
            FROM public.tickets
            WHERE campaign_id = NEW.campaign_id
              AND status IN ('confirmed', 'paid')
        )
        WHERE id = NEW.campaign_id;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: process_roulette_spin(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_roulette_spin(p_campaign_id uuid, p_multiplier integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_campaign_record RECORD;
  v_spin_cost NUMERIC;
  v_total_cost NUMERIC;
  v_user_balance NUMERIC;
  v_selected_prize RECORD;
  v_random_val NUMERIC;
  v_final_value NUMERIC := 0;
  v_is_free BOOLEAN := FALSE;
  v_pre_awarded_spin_id UUID;
  v_prize_label TEXT := 'Tente novamente';
  v_prize_type TEXT := 'none';
  v_prize_color TEXT := '#ef4444';
  v_is_win BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_campaign_record
  FROM public.campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

  IF NOT v_campaign_record.roulette_enabled THEN
    RAISE EXCEPTION 'Roleta desativada';
  END IF;

  IF p_multiplier < 1 OR p_multiplier > COALESCE(v_campaign_record.roulette_multiplier_max, 10) THEN
    RAISE EXCEPTION 'Multiplicador inválido';
  END IF;

  SELECT id INTO v_pre_awarded_spin_id
  FROM public.roulette_spins
  WHERE user_id = v_user_id
    AND campaign_id = p_campaign_id
    AND prize_label IS NULL
    AND is_free = TRUE
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_pre_awarded_spin_id IS NOT NULL THEN
    v_is_free := TRUE;
    v_total_cost := 0;
  ELSE
    v_spin_cost := COALESCE(v_campaign_record.roulette_spin_cost, 0);
    v_total_cost := v_spin_cost * p_multiplier;

    IF v_total_cost > 0 THEN
      SELECT balance INTO v_user_balance
      FROM public.profiles
      WHERE user_id = v_user_id;

      IF v_user_balance IS NULL OR v_user_balance < v_total_cost THEN
        RAISE EXCEPTION 'Saldo insuficiente';
      END IF;

      UPDATE public.profiles
      SET balance = balance - v_total_cost
      WHERE user_id = v_user_id;
    ELSIF v_spin_cost = 0 AND COALESCE(v_campaign_record.roulette_free_tickets, 0) > 0 THEN
      RAISE EXCEPTION 'Sem giros disponíveis';
    END IF;
  END IF;

  v_random_val := random() * 100;

  WITH configured_slots AS (
    SELECT
      rp.*,
      row_number() OVER (PARTITION BY rp.label ORDER BY rp.id) AS slot_number
    FROM public.roulette_prizes rp
    WHERE rp.campaign_id = p_campaign_id
      AND COALESCE(rp.chance_percent, 0) > 0
      AND rp.label IS NOT NULL
      AND rp.label <> 'Tente novamente'
      AND COALESCE(rp.prize_type, '') <> 'none'
  ), taken_by_label AS (
    SELECT
      rs.prize_label,
      count(*)::integer AS taken_count
    FROM public.roulette_spins rs
    WHERE rs.campaign_id = p_campaign_id
      AND rs.prize_label IS NOT NULL
      AND rs.prize_label <> 'Tente novamente'
      AND COALESCE(rs.prize_type, '') <> 'none'
    GROUP BY rs.prize_label
  ), available_slots AS (
    SELECT cs.*
    FROM configured_slots cs
    LEFT JOIN taken_by_label tb ON tb.prize_label = cs.label
    WHERE cs.slot_number > COALESCE(tb.taken_count, 0)
  ), weighted AS (
    SELECT
      available_slots.*,
      SUM(COALESCE(chance_percent, 0)) OVER (ORDER BY id) AS cumulative_weight
    FROM available_slots
  )
  SELECT * INTO v_selected_prize
  FROM weighted
  WHERE cumulative_weight >= v_random_val
  ORDER BY cumulative_weight ASC
  LIMIT 1;

  IF v_selected_prize IS NOT NULL THEN
    v_is_win := TRUE;
    v_prize_label := v_selected_prize.label;
    v_prize_type := v_selected_prize.prize_type;
    v_prize_color := COALESCE(v_selected_prize.color, '#FACC15');
    v_final_value := COALESCE(v_selected_prize.value, 0) * p_multiplier;
  END IF;

  IF v_pre_awarded_spin_id IS NOT NULL THEN
    UPDATE public.roulette_spins
    SET prize_label = v_prize_label,
        prize_type = v_prize_type,
        prize_value = v_final_value,
        created_at = now()
    WHERE id = v_pre_awarded_spin_id;
  ELSE
    INSERT INTO public.roulette_spins (user_id, campaign_id, prize_label, prize_type, prize_value, is_free)
    VALUES (v_user_id, p_campaign_id, v_prize_label, v_prize_type, v_final_value, FALSE);
  END IF;

  IF v_is_win THEN
    IF v_prize_type IN ('balance', 'fixed_value') THEN
      UPDATE public.profiles
      SET balance = balance + v_final_value
      WHERE user_id = v_user_id;
    ELSIF v_prize_type = 'points' THEN
      UPDATE public.profiles
      SET points = COALESCE(points, 0) + v_final_value::integer
      WHERE user_id = v_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'prize', CASE
      WHEN v_is_win THEN row_to_json(v_selected_prize)
      ELSE json_build_object('label', v_prize_label, 'prize_type', v_prize_type, 'color', v_prize_color)
    END,
    'final_value', v_final_value,
    'is_free', v_is_free,
    'new_balance', (SELECT balance FROM public.profiles WHERE user_id = v_user_id)
  );
END;
$$;


--
-- Name: process_scratch_card_play(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_scratch_card_play(p_campaign_id uuid, p_cost numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_user_id uuid;
    v_prize record;
    v_is_winner boolean := false;
    v_prize_id uuid := NULL;
    v_prize_label text := 'Tente novamente';
    v_prize_value numeric := 0;
    v_prize_type text := 'none';
    v_new_balance numeric;
    v_total_chance numeric := 0;
    v_random_val numeric;
    v_current_chance numeric := 0;
    v_credit_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    SELECT id INTO v_credit_id
    FROM public.scratch_card_scratches
    WHERE user_id = v_user_id
      AND (campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND campaign_id IS NULL))
      AND prize_label IS NULL
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_credit_id IS NULL AND p_cost > 0 THEN
        SELECT balance INTO v_new_balance
        FROM public.profiles
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF v_new_balance IS NULL OR v_new_balance < p_cost THEN
            RAISE EXCEPTION 'Saldo insuficiente';
        END IF;

        UPDATE public.profiles
        SET balance = balance - p_cost
        WHERE user_id = v_user_id;
    ELSIF v_credit_id IS NULL AND p_cost = 0 THEN
        RAISE EXCEPTION 'Você não possui raspadinhas disponíveis!';
    END IF;

    SELECT COALESCE(SUM(sp.chance_percent), 0) INTO v_total_chance
    FROM public.scratch_card_prizes sp
    WHERE sp.is_active = true
      AND COALESCE(sp.chance_percent, 0) > 0
      AND (sp.campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND sp.campaign_id IS NULL))
      AND NOT EXISTS (
          SELECT 1
          FROM public.scratch_card_scratches s
          WHERE s.prize_id = sp.id
            AND s.is_winner = true
      );

    IF v_total_chance > 0 THEN
        v_random_val := random() * 100;

        IF v_random_val <= v_total_chance THEN
            FOR v_prize IN
                SELECT sp.*
                FROM public.scratch_card_prizes sp
                WHERE sp.is_active = true
                  AND COALESCE(sp.chance_percent, 0) > 0
                  AND (sp.campaign_id = p_campaign_id OR (p_campaign_id IS NULL AND sp.campaign_id IS NULL))
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.scratch_card_scratches s
                      WHERE s.prize_id = sp.id
                        AND s.is_winner = true
                  )
                ORDER BY sp.created_at ASC, sp.id ASC
                FOR UPDATE SKIP LOCKED
            LOOP
                v_current_chance := v_current_chance + COALESCE(v_prize.chance_percent, 0);
                IF v_random_val <= v_current_chance THEN
                    v_is_winner := true;
                    v_prize_id := v_prize.id;
                    v_prize_label := v_prize.label;
                    v_prize_value := COALESCE(v_prize.value, 0);
                    v_prize_type := COALESCE(v_prize.prize_type, 'none');
                    EXIT;
                END IF;
            END LOOP;
        END IF;
    END IF;

    IF v_is_winner THEN
        IF v_prize_type IN ('balance', 'cash', 'fixed_value') THEN
            UPDATE public.profiles
            SET balance = balance + v_prize_value
            WHERE user_id = v_user_id;
        ELSIF v_prize_type = 'points' THEN
            UPDATE public.profiles
            SET points = COALESCE(points, 0) + v_prize_value::integer
            WHERE user_id = v_user_id;
        END IF;
    END IF;

    IF v_credit_id IS NOT NULL THEN
        UPDATE public.scratch_card_scratches
        SET prize_id = v_prize_id,
            prize_label = v_prize_label,
            prize_value = v_prize_value,
            prize_type = v_prize_type,
            is_winner = v_is_winner,
            created_at = now()
        WHERE id = v_credit_id;
    ELSE
        INSERT INTO public.scratch_card_scratches (
            user_id, prize_id, prize_label, prize_value, prize_type, cost, is_winner, campaign_id
        ) VALUES (
            v_user_id, v_prize_id, v_prize_label, v_prize_value, v_prize_type, p_cost, v_is_winner, p_campaign_id
        );
    END IF;

    SELECT balance INTO v_new_balance
    FROM public.profiles
    WHERE user_id = v_user_id;

    RETURN json_build_object(
        'is_winner', v_is_winner,
        'prize', json_build_object(
            'id', v_prize_id,
            'label', v_prize_label,
            'value', v_prize_value,
            'prize_type', v_prize_type
        ),
        'new_balance', v_new_balance
    );
END;
$$;


--
-- Name: protect_profile_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_profile_fields() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND NOT (
       has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'master'::app_role)
       OR has_role(auth.uid(), 'client_admin'::app_role)
     ) THEN
    IF current_user = 'authenticated' THEN
      NEW.balance = OLD.balance;
      NEW.points = OLD.points;
      NEW.xp = OLD.xp;
      NEW.vip_level = OLD.vip_level;
      NEW.cashback_balance = OLD.cashback_balance;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: record_purchase_log(uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_purchase_log(p_order_id uuid, p_event_type text, p_message text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.purchase_logs (order_id, event_type, message, metadata)
    VALUES (p_order_id, p_event_type, p_message, p_metadata);
END;
$$;


--
-- Name: release_expired_tickets(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_expired_tickets() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Delete expired reserved tickets to free up the numbers
    DELETE FROM public.tickets
    WHERE status = 'reserved' AND reservation_expires_at < now();

    -- Mark orders as expired
    UPDATE public.orders
    SET payment_status = 'expired'
    WHERE payment_status = 'pending' AND expires_at < now();
END;
$$;


--
-- Name: repair_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.repair_order(p_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_order RECORD;
    v_campaign RECORD;
    v_tickets_count INTEGER;
    v_pad_len INTEGER;
    v_count INTEGER := 0;
    v_max_attempts INTEGER := 0;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    
    IF v_order IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado');
    END IF;

    IF v_order.payment_status != 'paid' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Apenas pedidos pagos podem ser auditados');
    END IF;

    -- Corrigir timestamp de pagamento se ausente
    IF v_order.paid_at IS NULL THEN
        UPDATE public.orders SET paid_at = v_order.created_at WHERE id = p_order_id;
    END IF;

    SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_order.campaign_id;
    v_pad_len := LENGTH(v_campaign.total_tickets::text);

    -- 1. Confirmar tickets existentes (Manual ou Reservados)
    UPDATE public.tickets 
    SET status = 'confirmed', 
        reservation_expires_at = NULL 
    WHERE order_id = p_order_id AND status != 'confirmed';

    -- 2. Gerar tickets faltantes se for 'auto'
    IF v_campaign.ticket_generation_type = 'auto' THEN
        SELECT count(*) INTO v_count FROM public.tickets WHERE order_id = p_order_id;
        
        WHILE v_count < v_order.quantity AND v_max_attempts < (v_order.quantity * 5) LOOP
            v_max_attempts := v_max_attempts + 1;
            
            INSERT INTO public.tickets (order_id, campaign_id, user_id, number, status)
            SELECT p_order_id, v_order.campaign_id, v_order.user_id, LPAD(floor(random() * v_campaign.total_tickets)::text, v_pad_len, '0'), 'confirmed'
            WHERE NOT EXISTS (
               SELECT 1 FROM public.tickets WHERE campaign_id = v_order.campaign_id AND number = LPAD(floor(random() * v_campaign.total_tickets)::text, v_pad_len, '0')
            )
            ON CONFLICT DO NOTHING;
            
            SELECT count(*) INTO v_count FROM public.tickets WHERE order_id = p_order_id;
        END LOOP;
    ELSE
        SELECT count(*) INTO v_count FROM public.tickets WHERE order_id = p_order_id;
    END IF;

    -- 3. Atualizar contagem da campanha
    UPDATE public.campaigns
    SET sold_tickets = (SELECT count(*) FROM public.tickets WHERE campaign_id = v_order.campaign_id AND status = 'confirmed')
    WHERE id = v_order.campaign_id;

    RETURN jsonb_build_object('success', true, 'message', 'Pedido auditado e corrigido. Total de tickets: ' || v_count);
END;
$$;


--
-- Name: reprocess_order_prizes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reprocess_order_prizes(p_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_status TEXT;
    v_user_id UUID;
BEGIN
    SELECT payment_status, user_id INTO v_status, v_user_id FROM orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido não encontrado');
    END IF;
    
    IF v_status != 'paid' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido ainda não está pago');
    END IF;
    
    -- Call handle_order_payment which is now idempotent for prizes
    PERFORM public.handle_order_payment(p_order_id);
    
    RETURN jsonb_build_object('success', true, 'message', 'Prêmios reprocessados com sucesso');
END;
$$;


--
-- Name: reserve_tickets(uuid, uuid, integer, text[], uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[] DEFAULT NULL::text[], p_affiliate_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_order_id UUID;
    v_total_amount NUMERIC;
    v_ticket_price NUMERIC;
    v_price_bundles JSONB;
    v_matched_price NUMERIC;
    v_bundle RECORD;
    v_num TEXT;
    v_total_tickets INTEGER;
    v_pad_len INTEGER;
    v_ticket_type TEXT;
    v_campaign_status TEXT;
    v_draw_date TIMESTAMPTZ;
    v_expiration_interval INTERVAL := '15 minutes';
    v_available_count INTEGER;
    v_generated_count INTEGER := 0;
    v_random_num TEXT;
BEGIN
    -- Get campaign details and check validity
    SELECT ticket_price, price_bundles, total_tickets, LENGTH(total_tickets::text), ticket_generation_type, status, draw_date
    INTO v_ticket_price, v_price_bundles, v_total_tickets, v_pad_len, v_ticket_type, v_campaign_status, v_draw_date
    FROM public.campaigns WHERE id = p_campaign_id;

    -- Ensure campaign is active
    IF v_campaign_status != 'active' THEN
        RAISE EXCEPTION 'Esta campanha não está aceitando novos pedidos (Status: %).', v_campaign_status;
    END IF;

    -- Ensure draw date hasn't passed
    IF v_draw_date IS NOT NULL AND v_draw_date < now() THEN
        RAISE EXCEPTION 'O período de vendas para esta campanha já encerrou.';
    END IF;

    -- Calculate total amount with bundle support
    v_matched_price := NULL;
    
    -- Check if quantity matches a bundle
    IF v_price_bundles IS NOT NULL AND jsonb_array_length(v_price_bundles) > 0 THEN
        FOR v_bundle IN SELECT * FROM jsonb_to_recordset(v_price_bundles) AS x(quantity INTEGER, price NUMERIC) LOOP
            IF v_bundle.quantity = p_quantity THEN
                v_matched_price := v_bundle.price;
                EXIT;
            END IF;
        END LOOP;
    END IF;

    -- If no bundle matched, use unit price
    IF v_matched_price IS NOT NULL THEN
        v_total_amount := v_matched_price;
    ELSE
        v_total_amount := v_ticket_price * p_quantity;
    END IF;

    -- Create Order
    INSERT INTO public.orders (user_id, campaign_id, quantity, total_amount, payment_status, expires_at, affiliate_id)
    VALUES (p_user_id, p_campaign_id, p_quantity, v_total_amount, 'pending', now() + v_expiration_interval, p_affiliate_id)
    RETURNING id INTO v_order_id;

    -- Reserve Numbers
    IF (p_numbers IS NOT NULL AND array_length(p_numbers, 1) > 0) THEN
        -- Manual selection
        FOREACH v_num IN ARRAY p_numbers LOOP
            -- Check if number is already taken
            IF EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_num AND (status IN ('confirmed', 'paid') OR (status = 'reserved' AND reservation_expires_at > now()))) THEN
                RAISE EXCEPTION 'O número % já está reservado ou pago.', v_num;
            END IF;

            INSERT INTO public.tickets (campaign_id, user_id, order_id, number, status, reservation_expires_at)
            VALUES (p_campaign_id, p_user_id, v_order_id, v_num, 'reserved', now() + v_expiration_interval);
        END LOOP;
    ELSE
        -- Automatic generation
        -- Get count of available numbers
        SELECT v_total_tickets - COUNT(*) INTO v_available_count
        FROM public.tickets 
        WHERE campaign_id = p_campaign_id 
        AND (status IN ('confirmed', 'paid') OR (status = 'reserved' AND reservation_expires_at > now()));

        IF v_available_count < p_quantity THEN
            RAISE EXCEPTION 'Não há cotas suficientes disponíveis. Disponível: %, Solicitado: %', v_available_count, p_quantity;
        END IF;

        -- Generate random numbers that are not taken
        WHILE v_generated_count < p_quantity LOOP
            v_random_num := LPAD(FLOOR(RANDOM() * v_total_tickets)::text, v_pad_len, '0');
            
            -- Check if number is taken
            IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE campaign_id = p_campaign_id AND number = v_random_num AND (status IN ('confirmed', 'paid') OR (status = 'reserved' AND reservation_expires_at > now()))) THEN
                INSERT INTO public.tickets (campaign_id, user_id, order_id, number, status, reservation_expires_at)
                VALUES (p_campaign_id, p_user_id, v_order_id, v_random_num, 'reserved', now() + v_expiration_interval);
                v_generated_count := v_generated_count + 1;
            END IF;
        END LOOP;
    END IF;

    RETURN v_order_id;
END;
$$;


--
-- Name: reveal_gift_results(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reveal_gift_results(p_campaign_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: run_lucky_hour_draw(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_lucky_hour_draw(p_lucky_hour_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_lucky_hour RECORD;
    v_campaign RECORD;
    v_winner_ticket RECORD;
    v_winner_name TEXT;
    v_winner_number TEXT;
    v_result JSONB;
BEGIN
    -- 1. Get the lucky hour record
    SELECT * INTO v_lucky_hour FROM lucky_hours WHERE id = p_lucky_hour_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sorteio não encontrado.');
    END IF;

    IF v_lucky_hour.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este sorteio já foi realizado.');
    END IF;

    -- 2. Get campaign info
    SELECT * INTO v_campaign FROM campaigns WHERE id = v_lucky_hour.campaign_id;

    -- 3. Find the winner based on draw type
    IF v_lucky_hour.draw_type = 'hourly' THEN
        -- Random winner from paid/confirmed tickets
        SELECT t.number, p.name INTO v_winner_number, v_winner_name
        FROM tickets t
        JOIN profiles p ON t.user_id = p.id
        WHERE t.campaign_id = v_lucky_hour.campaign_id
          AND t.status IN ('confirmed', 'paid')
        ORDER BY random()
        LIMIT 1;
    ELSIF v_lucky_hour.draw_type = 'greater_smaller' THEN
        -- Check if it's "Maior" or "Menor" by title or prize description
        -- Default to Greater if not specified
        IF v_lucky_hour.title ILIKE '%menor%' OR v_lucky_hour.prize_description ILIKE '%menor%' THEN
            -- Lowest ticket number
            SELECT t.number, p.name INTO v_winner_number, v_winner_name
            FROM tickets t
            JOIN profiles p ON t.user_id = p.id
            WHERE t.campaign_id = v_lucky_hour.campaign_id
              AND t.status IN ('confirmed', 'paid')
            ORDER BY t.number ASC
            LIMIT 1;
        ELSE
            -- Highest ticket number
            SELECT t.number, p.name INTO v_winner_number, v_winner_name
            FROM tickets t
            JOIN profiles p ON t.user_id = p.id
            WHERE t.campaign_id = v_lucky_hour.campaign_id
              AND t.status IN ('confirmed', 'paid')
            ORDER BY t.number DESC
            LIMIT 1;
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Tipo de sorteio desconhecido.');
    END IF;

    IF v_winner_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nenhum bilhete vendido encontrado para esta campanha.');
    END IF;

    -- 4. Update the record
    UPDATE lucky_hours
    SET 
        winner_name = v_winner_name,
        winning_number = v_winner_number,
        status = 'completed',
        is_approved = true, -- Auto-approve since it's system-calculated
        approved_at = now(),
        updated_at = now(),
        audit_log = COALESCE(audit_log, '[]'::jsonb) || jsonb_build_object(
            'timestamp', now(),
            'action', 'auto_draw',
            'details', jsonb_build_object(
                'winner_name', v_winner_name,
                'winning_number', v_winner_number
            )
        )
    WHERE id = p_lucky_hour_id;

    -- 5. Create a record in winners table
    INSERT INTO winners (
        campaign_id,
        winner_name,
        ticket_number,
        prize_description,
        draw_date,
        winner_type
    ) VALUES (
        v_lucky_hour.campaign_id,
        v_winner_name,
        v_winner_number,
        v_lucky_hour.prize_description,
        now(),
        'lucky_number'
    );

    RETURN jsonb_build_object(
        'success', true, 
        'winner_name', v_winner_name, 
        'winning_number', v_winner_number
    );
END;
$$;


--
-- Name: set_tenant_id_on_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_tenant_id_on_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: slugify(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.slugify(input text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(public.unaccent(coalesce(input,''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;


--
-- Name: sync_federal_lottery(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_federal_lottery() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://hjmjhjwvfsefanmnbsdd.supabase.co/functions/v1/federal-lottery',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_features_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_features_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scratch_cards_enabled boolean DEFAULT true,
    lucky_numbers_enabled boolean DEFAULT true,
    roulette_enabled boolean DEFAULT true,
    page_editing_enabled boolean DEFAULT true,
    sales_page_models_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    campaigns_management_enabled boolean DEFAULT true,
    orders_management_enabled boolean DEFAULT true,
    users_management_enabled boolean DEFAULT true,
    affiliates_management_enabled boolean DEFAULT true,
    settings_management_enabled boolean DEFAULT false,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: affiliate_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    affiliate_id uuid,
    campaign_id uuid,
    user_id uuid,
    ip_address text,
    user_agent text,
    referrer_url text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: affiliate_commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_commissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    affiliate_id uuid,
    order_id uuid,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    campaign_id uuid,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid,
    CONSTRAINT affiliate_commissions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text])))
);


--
-- Name: affiliates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    referral_code text NOT NULL,
    commission_rate numeric(5,2) DEFAULT 10.00 NOT NULL,
    total_earned numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'common'::text,
    is_active boolean DEFAULT true,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: app_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    type text NOT NULL,
    notes text,
    released_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid,
    CONSTRAINT app_versions_type_check CHECK ((type = ANY (ARRAY['code'::text, 'database'::text])))
);


--
-- Name: auth_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    event text NOT NULL,
    resource text,
    status text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    user_agent text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subtitle text,
    image_url text NOT NULL,
    link_url text,
    is_active boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: campaign_gift_prizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_gift_prizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    ticket_number text NOT NULL,
    prize_type text NOT NULL,
    prize_value_cents integer,
    prize_title text NOT NULL,
    prize_image_url text,
    winner_order_id uuid,
    revealed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT campaign_gift_prizes_prize_type_check CHECK ((prize_type = ANY (ARRAY['pix'::text, 'item'::text])))
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    subtitle text,
    description text,
    image_url text,
    ticket_price numeric(10,2) DEFAULT 0.99 NOT NULL,
    total_tickets integer DEFAULT 100000 NOT NULL,
    sold_tickets integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    ltp_code text,
    urgency_tag text,
    draw_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    price_bundles jsonb DEFAULT '[]'::jsonb,
    min_tickets integer DEFAULT 1,
    max_tickets integer DEFAULT 10000,
    mystery_box_enabled boolean DEFAULT false,
    roulette_enabled boolean DEFAULT false,
    ranking_enabled boolean DEFAULT true,
    featured boolean DEFAULT false,
    gallery_urls jsonb DEFAULT '[]'::jsonb,
    video_url text,
    regulations text,
    auto_numbers boolean DEFAULT true,
    manual_numbers boolean DEFAULT false,
    lucky_numbers_prizes jsonb DEFAULT '[]'::jsonb,
    federal_lottery_draw boolean DEFAULT false,
    draw_number text,
    payment_methods jsonb DEFAULT '["pix", "stripe", "mercadopago", "card"]'::jsonb,
    sales_goal numeric,
    roulette_spin_cost numeric(10,2) DEFAULT 5.00,
    roulette_free_tickets integer DEFAULT 1,
    roulette_multiplier_max integer DEFAULT 5,
    ticket_generation_type text DEFAULT 'auto'::text,
    roulette_payout_rate numeric DEFAULT 0,
    show_instant_prizes boolean DEFAULT true,
    show_roulette_status boolean DEFAULT true,
    main_prizes jsonb DEFAULT '[]'::jsonb,
    roulette_rules jsonb DEFAULT '[]'::jsonb,
    show_timer boolean DEFAULT false,
    sections_order jsonb DEFAULT '["gallery", "header", "progress", "purchase", "description", "prizes", "winners", "ranking"]'::jsonb,
    timer_end_date timestamp with time zone,
    scratch_cards_enabled boolean DEFAULT false,
    scratch_card_cost numeric(10,2) DEFAULT 0,
    scratch_card_rules jsonb DEFAULT '[]'::jsonb,
    vip_group_link text,
    vip_group_video_url text,
    upsell_video_url text,
    upsell_offer_text text,
    upsell_enabled boolean DEFAULT false,
    upsell_probability text DEFAULT '98%'::text,
    ranking_prizes jsonb DEFAULT '[]'::jsonb,
    live_stream_url text,
    prize_rules jsonb DEFAULT '[]'::jsonb,
    fake_progress_percentage integer DEFAULT 0,
    fake_progress_enabled boolean DEFAULT false,
    progress_text text,
    live_stream_enabled boolean DEFAULT false,
    mystery_box_available_count integer DEFAULT 0,
    roulette_available_count integer DEFAULT 0,
    scratch_cards_available_count integer DEFAULT 0,
    image_overlay_enabled boolean DEFAULT true NOT NULL,
    concurso text,
    hero_image_url text,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid,
    gift_mode_enabled boolean DEFAULT false NOT NULL,
    gift_reveal_mode text DEFAULT 'on_draw'::text NOT NULL,
    gift_results_revealed boolean DEFAULT false NOT NULL,
    CONSTRAINT campaigns_gift_reveal_mode_check CHECK ((gift_reveal_mode = ANY (ARRAY['on_draw'::text, 'on_sold_out'::text]))),
    CONSTRAINT campaigns_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'upcoming'::text, 'hidden'::text, 'paused'::text, 'audit'::text, 'draft'::text])))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    pix_code text,
    expires_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    affiliate_id uuid,
    pix_qr_code_base64 text,
    stripe_session_id text,
    coupon_id uuid,
    discount_amount numeric(10,2) DEFAULT 0,
    payment_id text,
    payment_provider text,
    proof_url text,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid,
    CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    cpf text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    points integer DEFAULT 0,
    xp integer DEFAULT 0,
    vip_level integer DEFAULT 1,
    balance numeric(10,2) DEFAULT 0,
    cashback_balance numeric(10,2) DEFAULT 0,
    referred_by_code text,
    email text,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);

ALTER TABLE ONLY public.profiles REPLICA IDENTITY FULL;


--
-- Name: campaign_gift_prizes_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.campaign_gift_prizes_public WITH (security_invoker='true') AS
 SELECT gp.id,
    gp.campaign_id,
    gp.ticket_number,
    gp.revealed_at,
        CASE
            WHEN c.gift_results_revealed THEN gp.prize_type
            ELSE NULL::text
        END AS prize_type,
        CASE
            WHEN c.gift_results_revealed THEN gp.prize_title
            ELSE NULL::text
        END AS prize_title,
        CASE
            WHEN c.gift_results_revealed THEN gp.prize_image_url
            ELSE NULL::text
        END AS prize_image_url,
        CASE
            WHEN c.gift_results_revealed THEN gp.prize_value_cents
            ELSE NULL::integer
        END AS prize_value_cents,
        CASE
            WHEN c.gift_results_revealed THEN gp.winner_order_id
            ELSE NULL::uuid
        END AS winner_order_id,
        CASE
            WHEN c.gift_results_revealed THEN ( SELECT p.name
               FROM (public.orders o
                 JOIN public.profiles p ON ((p.user_id = o.user_id)))
              WHERE (o.id = gp.winner_order_id))
            ELSE NULL::text
        END AS winner_name
   FROM (public.campaign_gift_prizes gp
     JOIN public.campaigns c ON ((c.id = gp.campaign_id)));


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    min_purchase_amount numeric DEFAULT 0,
    max_uses integer,
    current_uses integer DEFAULT 0,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid,
    CONSTRAINT coupons_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))
);


--
-- Name: custom_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    "values" jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: draw_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draw_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    winner_id uuid,
    executed_by uuid,
    draw_method text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: federal_lottery_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.federal_lottery_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concurso text NOT NULL,
    data_sorteio date NOT NULL,
    premios jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: lucky_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lucky_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    title text NOT NULL,
    prize_description text NOT NULL,
    draw_time timestamp with time zone NOT NULL,
    winner_name text,
    winning_number text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log jsonb DEFAULT '[]'::jsonb,
    draw_type text DEFAULT 'hourly'::text,
    rule_id text,
    is_approved boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    draft_winner_name text,
    draft_winning_number text,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid,
    CONSTRAINT lucky_hours_draw_type_check CHECK ((draw_type = ANY (ARRAY['hourly'::text, 'greater_smaller'::text]))),
    CONSTRAINT lucky_hours_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'completed'::text])))
);


--
-- Name: lucky_hours_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lucky_hours_public WITH (security_invoker='true') AS
 SELECT id,
    campaign_id,
    title,
    prize_description,
    draw_time,
    draw_type,
    rule_id,
    status,
    is_approved,
        CASE
            WHEN COALESCE(is_approved, false) THEN winner_name
            ELSE NULL::text
        END AS winner_name,
        CASE
            WHEN COALESCE(is_approved, false) THEN winning_number
            ELSE NULL::text
        END AS winning_number,
    created_at,
    updated_at
   FROM public.lucky_hours;


--
-- Name: mystery_box_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mystery_box_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    name text NOT NULL,
    rarity public.mystery_box_rarity DEFAULT 'common'::public.mystery_box_rarity NOT NULL,
    cost numeric(10,2) DEFAULT 0 NOT NULL,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: mystery_box_prizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mystery_box_prizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id uuid,
    title text NOT NULL,
    description text,
    prize_type text DEFAULT 'cash'::text NOT NULL,
    prize_value numeric(10,2) DEFAULT 0,
    chance_percent numeric(5,2) DEFAULT 1.00 NOT NULL,
    image_url text,
    rarity public.mystery_box_rarity DEFAULT 'common'::public.mystery_box_rarity NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: mystery_box_wins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mystery_box_wins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    box_id uuid NOT NULL,
    prize_title text NOT NULL,
    prize_value numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    prize_id uuid,
    config_id uuid,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);

ALTER TABLE ONLY public.mystery_box_wins REPLICA IDENTITY FULL;


--
-- Name: mystery_boxes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mystery_boxes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    title text NOT NULL,
    description text,
    prize_value numeric(10,2),
    chance_percent numeric(5,2) DEFAULT 1.00,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    cost_to_open numeric DEFAULT 0,
    rarity text DEFAULT 'Comum'::text,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: orders_public_ranking; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.orders_public_ranking WITH (security_invoker='on') AS
 SELECT id,
    user_id,
    campaign_id,
    quantity,
    created_at,
    paid_at
   FROM public.orders
  WHERE (payment_status = 'paid'::text);


--
-- Name: payment_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    user_id uuid,
    provider text NOT NULL,
    error_message text,
    error_code text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: processed_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_webhooks (
    id text NOT NULL,
    provider text NOT NULL,
    processed_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: purchase_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    event_type text NOT NULL,
    message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: push_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    link_url text,
    sent_by uuid,
    target_type text DEFAULT 'all'::text,
    target_user_id uuid,
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: roulette_prizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roulette_prizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    label text NOT NULL,
    prize_type text DEFAULT 'points'::text NOT NULL,
    value numeric(10,2),
    chance_percent numeric(5,2) DEFAULT 10.00,
    color text DEFAULT '#primary'::text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid,
    CONSTRAINT roulette_prizes_prize_type_check CHECK ((prize_type = ANY (ARRAY['points'::text, 'balance'::text, 'ticket'::text, 'physical'::text])))
);


--
-- Name: roulette_spins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roulette_spins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    prize_label text,
    prize_type text,
    prize_value numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_free boolean DEFAULT false,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);

ALTER TABLE ONLY public.roulette_spins REPLICA IDENTITY FULL;


--
-- Name: scratch_card_prizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scratch_card_prizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    value numeric DEFAULT 0 NOT NULL,
    prize_type text DEFAULT 'balance'::text NOT NULL,
    chance_percent numeric DEFAULT 0 NOT NULL,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    campaign_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: scratch_card_scratches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scratch_card_scratches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prize_id uuid,
    prize_label text,
    prize_value numeric,
    prize_type text,
    cost numeric DEFAULT 0 NOT NULL,
    is_winner boolean DEFAULT false NOT NULL,
    campaign_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);

ALTER TABLE ONLY public.scratch_card_scratches REPLICA IDENTITY FULL;


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: tenant_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    key text NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    plan text DEFAULT 'default'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    user_id uuid NOT NULL,
    number text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_lucky boolean DEFAULT false,
    reservation_expires_at timestamp with time zone,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid,
    CONSTRAINT tickets_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'reserved'::text, 'expired'::text])))
);

ALTER TABLE ONLY public.tickets REPLICA IDENTITY FULL;


--
-- Name: tickets_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.tickets_public WITH (security_invoker='on') AS
 SELECT id,
    number,
    status,
    campaign_id,
    created_at,
    is_lucky
   FROM public.tickets
  WHERE ((status = ANY (ARRAY['confirmed'::text, 'paid'::text])) OR ((status = 'reserved'::text) AND (reservation_expires_at > now())));


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    achievement_key text NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    points_reward integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: user_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    description text,
    points_cost integer NOT NULL,
    status text DEFAULT 'available'::text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric(15,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    pix_key text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid,
    CONSTRAINT wallet_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text]))),
    CONSTRAINT wallet_transactions_type_check CHECK ((type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'referral_bonus'::text, 'cashback'::text, 'prize_win'::text])))
);


--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    event_id text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0,
    last_attempt_at timestamp with time zone,
    error_log text,
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: winners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.winners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    user_id uuid,
    winner_name text NOT NULL,
    ticket_number text NOT NULL,
    prize_description text NOT NULL,
    phone_masked text,
    video_url text,
    draw_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_url text,
    winner_type text DEFAULT 'raffle'::text,
    prize_index integer DEFAULT 1,
    prize_name text,
    tenant_id uuid DEFAULT '1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73'::uuid
);


--
-- Name: admin_features_config admin_features_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_features_config
    ADD CONSTRAINT admin_features_config_pkey PRIMARY KEY (id);


--
-- Name: admin_features_config admin_features_config_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_features_config
    ADD CONSTRAINT admin_features_config_user_id_key UNIQUE (user_id);


--
-- Name: affiliate_clicks affiliate_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_pkey PRIMARY KEY (id);


--
-- Name: affiliate_commissions affiliate_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_commissions
    ADD CONSTRAINT affiliate_commissions_pkey PRIMARY KEY (id);


--
-- Name: affiliates affiliates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_pkey PRIMARY KEY (id);


--
-- Name: affiliates affiliates_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_referral_code_key UNIQUE (referral_code);


--
-- Name: affiliates affiliates_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_user_id_key UNIQUE (user_id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: app_versions app_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_versions
    ADD CONSTRAINT app_versions_pkey PRIMARY KEY (id);


--
-- Name: auth_audit_logs auth_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: campaign_gift_prizes campaign_gift_prizes_campaign_id_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_gift_prizes
    ADD CONSTRAINT campaign_gift_prizes_campaign_id_ticket_number_key UNIQUE (campaign_id, ticket_number);


--
-- Name: campaign_gift_prizes campaign_gift_prizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_gift_prizes
    ADD CONSTRAINT campaign_gift_prizes_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_slug_key UNIQUE (slug);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: custom_presets custom_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_presets
    ADD CONSTRAINT custom_presets_pkey PRIMARY KEY (id);


--
-- Name: draw_logs draw_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draw_logs
    ADD CONSTRAINT draw_logs_pkey PRIMARY KEY (id);


--
-- Name: federal_lottery_results federal_lottery_results_concurso_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_lottery_results
    ADD CONSTRAINT federal_lottery_results_concurso_key UNIQUE (concurso);


--
-- Name: federal_lottery_results federal_lottery_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_lottery_results
    ADD CONSTRAINT federal_lottery_results_pkey PRIMARY KEY (id);


--
-- Name: lucky_hours lucky_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lucky_hours
    ADD CONSTRAINT lucky_hours_pkey PRIMARY KEY (id);


--
-- Name: mystery_box_configs mystery_box_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_configs
    ADD CONSTRAINT mystery_box_configs_pkey PRIMARY KEY (id);


--
-- Name: mystery_box_prizes mystery_box_prizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_prizes
    ADD CONSTRAINT mystery_box_prizes_pkey PRIMARY KEY (id);


--
-- Name: mystery_box_wins mystery_box_wins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_wins
    ADD CONSTRAINT mystery_box_wins_pkey PRIMARY KEY (id);


--
-- Name: mystery_boxes mystery_boxes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_boxes
    ADD CONSTRAINT mystery_boxes_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_failures payment_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_failures
    ADD CONSTRAINT payment_failures_pkey PRIMARY KEY (id);


--
-- Name: processed_webhooks processed_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_webhooks
    ADD CONSTRAINT processed_webhooks_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: purchase_logs purchase_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_logs
    ADD CONSTRAINT purchase_logs_pkey PRIMARY KEY (id);


--
-- Name: push_notifications push_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_notifications
    ADD CONSTRAINT push_notifications_pkey PRIMARY KEY (id);


--
-- Name: roulette_prizes roulette_prizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roulette_prizes
    ADD CONSTRAINT roulette_prizes_pkey PRIMARY KEY (id);


--
-- Name: roulette_spins roulette_spins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roulette_spins
    ADD CONSTRAINT roulette_spins_pkey PRIMARY KEY (id);


--
-- Name: scratch_card_prizes scratch_card_prizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_prizes
    ADD CONSTRAINT scratch_card_prizes_pkey PRIMARY KEY (id);


--
-- Name: scratch_card_scratches scratch_card_scratches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_scratches
    ADD CONSTRAINT scratch_card_scratches_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_key UNIQUE (key);


--
-- Name: site_settings site_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_unique UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_domains tenant_domains_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_domains
    ADD CONSTRAINT tenant_domains_domain_key UNIQUE (domain);


--
-- Name: tenant_domains tenant_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_domains
    ADD CONSTRAINT tenant_domains_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_tenant_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_key_key UNIQUE (tenant_id, key);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: tickets tickets_campaign_id_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_campaign_id_number_key UNIQUE (campaign_id, number);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_rewards user_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rewards
    ADD CONSTRAINT user_rewards_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_unique_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_unique_event UNIQUE (provider, event_id);


--
-- Name: winners winners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT winners_pkey PRIMARY KEY (id);


--
-- Name: idx_affiliate_clicks_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_clicks_tenant_id ON public.affiliate_clicks USING btree (tenant_id);


--
-- Name: idx_affiliate_commissions_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_commissions_tenant_id ON public.affiliate_commissions USING btree (tenant_id);


--
-- Name: idx_announcements_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_tenant_id ON public.announcements USING btree (tenant_id);


--
-- Name: idx_auth_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_created_at ON public.auth_audit_logs USING btree (created_at DESC);


--
-- Name: idx_auth_audit_logs_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_event ON public.auth_audit_logs USING btree (event);


--
-- Name: idx_auth_audit_logs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_tenant_id ON public.auth_audit_logs USING btree (tenant_id);


--
-- Name: idx_auth_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_user_id ON public.auth_audit_logs USING btree (user_id);


--
-- Name: idx_banners_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_banners_tenant_id ON public.banners USING btree (tenant_id);


--
-- Name: idx_campaigns_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_featured ON public.campaigns USING btree (featured) WHERE (featured = true);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_status ON public.campaigns USING btree (status);


--
-- Name: idx_campaigns_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_tenant_id ON public.campaigns USING btree (tenant_id);


--
-- Name: idx_coupons_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_tenant_id ON public.coupons USING btree (tenant_id);


--
-- Name: idx_draw_logs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draw_logs_tenant_id ON public.draw_logs USING btree (tenant_id);


--
-- Name: idx_lucky_hours_campaign_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lucky_hours_campaign_type ON public.lucky_hours USING btree (campaign_id, draw_type);


--
-- Name: idx_mystery_box_configs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mystery_box_configs_active ON public.mystery_box_configs USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_mystery_box_configs_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mystery_box_configs_campaign ON public.mystery_box_configs USING btree (campaign_id);


--
-- Name: idx_mystery_box_wins_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mystery_box_wins_created_at ON public.mystery_box_wins USING btree (created_at DESC);


--
-- Name: idx_mystery_box_wins_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mystery_box_wins_tenant_id ON public.mystery_box_wins USING btree (tenant_id);


--
-- Name: idx_notifications_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_tenant_id ON public.notifications USING btree (tenant_id);


--
-- Name: idx_orders_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_campaign_id ON public.orders USING btree (campaign_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_tenant_id ON public.orders USING btree (tenant_id);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_payment_failures_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_failures_tenant_id ON public.payment_failures USING btree (tenant_id);


--
-- Name: idx_profiles_referred_by_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_referred_by_code ON public.profiles USING btree (referred_by_code);


--
-- Name: idx_profiles_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_tenant_id ON public.profiles USING btree (tenant_id);


--
-- Name: idx_purchase_logs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_logs_tenant_id ON public.purchase_logs USING btree (tenant_id);


--
-- Name: idx_push_notifications_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_notifications_tenant_id ON public.push_notifications USING btree (tenant_id);


--
-- Name: idx_roulette_spins_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roulette_spins_created_at ON public.roulette_spins USING btree (created_at DESC);


--
-- Name: idx_roulette_spins_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roulette_spins_tenant_id ON public.roulette_spins USING btree (tenant_id);


--
-- Name: idx_scratch_card_scratches_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scratch_card_scratches_tenant_id ON public.scratch_card_scratches USING btree (tenant_id);


--
-- Name: idx_tenant_domains_domain_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_domains_domain_lower ON public.tenant_domains USING btree (lower(domain));


--
-- Name: idx_tenant_domains_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_domains_tenant_id ON public.tenant_domains USING btree (tenant_id);


--
-- Name: idx_tenant_settings_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_settings_tenant_id ON public.tenant_settings USING btree (tenant_id);


--
-- Name: idx_tickets_reservation_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_reservation_expires ON public.tickets USING btree (reservation_expires_at) WHERE (reservation_expires_at IS NOT NULL);


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- Name: idx_tickets_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_tenant_id ON public.tickets USING btree (tenant_id);


--
-- Name: idx_user_achievements_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_tenant_id ON public.user_achievements USING btree (tenant_id);


--
-- Name: idx_user_rewards_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rewards_tenant_id ON public.user_rewards USING btree (tenant_id);


--
-- Name: idx_user_roles_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_tenant_id ON public.user_roles USING btree (tenant_id);


--
-- Name: idx_wallet_transactions_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_tenant_id ON public.wallet_transactions USING btree (tenant_id);


--
-- Name: idx_webhook_events_status_attempts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_status_attempts ON public.webhook_events USING btree (status, attempts) WHERE (status <> 'processed'::text);


--
-- Name: idx_webhook_events_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_tenant_id ON public.webhook_events USING btree (tenant_id);


--
-- Name: idx_winners_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_winners_campaign_id ON public.winners USING btree (campaign_id);


--
-- Name: idx_winners_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_winners_tenant_id ON public.winners USING btree (tenant_id);


--
-- Name: mystery_box_unique_winning_prize; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mystery_box_unique_winning_prize ON public.mystery_box_wins USING btree (prize_id) WHERE (prize_id IS NOT NULL);


--
-- Name: scratch_card_unique_winning_prize; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX scratch_card_unique_winning_prize ON public.scratch_card_scratches USING btree (prize_id) WHERE ((is_winner = true) AND (prize_id IS NOT NULL));


--
-- Name: mystery_box_wins mystery_box_notification_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER mystery_box_notification_trigger AFTER INSERT ON public.mystery_box_wins FOR EACH ROW EXECUTE FUNCTION public.create_mystery_box_notification();


--
-- Name: orders on_order_paid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_order_paid AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.process_paid_order();


--
-- Name: orders on_order_paid_affiliate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_order_paid_affiliate AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_affiliate_commission();


--
-- Name: roulette_spins roulette_notification_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER roulette_notification_trigger AFTER INSERT OR UPDATE ON public.roulette_spins FOR EACH ROW EXECUTE FUNCTION public.create_roulette_notification();


--
-- Name: orders tr_log_order_creation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_log_order_creation AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_order_creation();


--
-- Name: orders tr_on_order_paid_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_on_order_paid_notification AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.on_order_paid_notification();


--
-- Name: profiles tr_on_profile_created_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_on_profile_created_notification AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_notification();


--
-- Name: campaigns trg_campaigns_set_slug; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_campaigns_set_slug BEFORE INSERT OR UPDATE OF title, slug ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.campaigns_set_slug();


--
-- Name: admin_features_config trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.admin_features_config FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: affiliate_clicks trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.affiliate_clicks FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: affiliate_commissions trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.affiliate_commissions FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: affiliates trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.affiliates FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: announcements trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: app_versions trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.app_versions FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: auth_audit_logs trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.auth_audit_logs FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: banners trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.banners FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: campaigns trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: coupons trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: custom_presets trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.custom_presets FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: draw_logs trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.draw_logs FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: federal_lottery_results trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.federal_lottery_results FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: lucky_hours trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.lucky_hours FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: mystery_box_configs trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.mystery_box_configs FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: mystery_box_prizes trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.mystery_box_prizes FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: mystery_box_wins trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.mystery_box_wins FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: mystery_boxes trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.mystery_boxes FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: notifications trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: orders trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: payment_failures trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.payment_failures FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: processed_webhooks trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.processed_webhooks FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: profiles trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: purchase_logs trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.purchase_logs FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: push_notifications trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.push_notifications FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: roulette_prizes trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.roulette_prizes FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: roulette_spins trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.roulette_spins FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: scratch_card_prizes trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.scratch_card_prizes FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: scratch_card_scratches trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.scratch_card_scratches FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: site_settings trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: tickets trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: user_achievements trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.user_achievements FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: user_rewards trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.user_rewards FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: user_roles trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: wallet_transactions trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: webhook_events trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.webhook_events FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: winners trg_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.winners FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();


--
-- Name: tenant_domains trg_tenant_domains_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tenant_domains_updated_at BEFORE UPDATE ON public.tenant_domains FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenant_settings trg_tenant_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tenant_settings_updated_at BEFORE UPDATE ON public.tenant_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenants trg_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: federal_lottery_results trigger_process_lottery_draw; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_process_lottery_draw AFTER INSERT OR UPDATE ON public.federal_lottery_results FOR EACH ROW EXECUTE FUNCTION public.process_lottery_draw_auto();


--
-- Name: profiles trigger_protect_profile_fields; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_protect_profile_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();


--
-- Name: campaign_gift_prizes update_campaign_gift_prizes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_campaign_gift_prizes_updated_at BEFORE UPDATE ON public.campaign_gift_prizes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: campaigns update_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_presets update_custom_presets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_presets_updated_at BEFORE UPDATE ON public.custom_presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lucky_hours update_lucky_hours_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lucky_hours_updated_at BEFORE UPDATE ON public.lucky_hours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scratch_card_prizes update_scratch_card_prizes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scratch_card_prizes_updated_at BEFORE UPDATE ON public.scratch_card_prizes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wallet_transactions update_wallet_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_features_config admin_features_config_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_features_config
    ADD CONSTRAINT admin_features_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: admin_features_config admin_features_config_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_features_config
    ADD CONSTRAINT admin_features_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: affiliate_clicks affiliate_clicks_affiliate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE;


--
-- Name: affiliate_clicks affiliate_clicks_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: affiliate_clicks affiliate_clicks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: affiliate_clicks affiliate_clicks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: affiliate_commissions affiliate_commissions_affiliate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_commissions
    ADD CONSTRAINT affiliate_commissions_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE;


--
-- Name: affiliate_commissions affiliate_commissions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_commissions
    ADD CONSTRAINT affiliate_commissions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: affiliate_commissions affiliate_commissions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_commissions
    ADD CONSTRAINT affiliate_commissions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: affiliate_commissions affiliate_commissions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_commissions
    ADD CONSTRAINT affiliate_commissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: affiliates affiliates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: affiliates affiliates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: affiliates affiliates_user_id_profiles_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: announcements announcements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: app_versions app_versions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_versions
    ADD CONSTRAINT app_versions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: auth_audit_logs auth_audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: auth_audit_logs auth_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


--
-- Name: banners banners_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: campaign_gift_prizes campaign_gift_prizes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_gift_prizes
    ADD CONSTRAINT campaign_gift_prizes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_gift_prizes campaign_gift_prizes_winner_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_gift_prizes
    ADD CONSTRAINT campaign_gift_prizes_winner_order_id_fkey FOREIGN KEY (winner_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: campaigns campaigns_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: coupons coupons_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: custom_presets custom_presets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_presets
    ADD CONSTRAINT custom_presets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: draw_logs draw_logs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draw_logs
    ADD CONSTRAINT draw_logs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: draw_logs draw_logs_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draw_logs
    ADD CONSTRAINT draw_logs_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: draw_logs draw_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draw_logs
    ADD CONSTRAINT draw_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: draw_logs draw_logs_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draw_logs
    ADD CONSTRAINT draw_logs_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.winners(id) ON DELETE SET NULL;


--
-- Name: federal_lottery_results federal_lottery_results_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.federal_lottery_results
    ADD CONSTRAINT federal_lottery_results_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: orders fk_orders_campaigns; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_campaigns FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: orders fk_orders_profiles; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: winners fk_winners_campaigns; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT fk_winners_campaigns FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: lucky_hours lucky_hours_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lucky_hours
    ADD CONSTRAINT lucky_hours_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: lucky_hours lucky_hours_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lucky_hours
    ADD CONSTRAINT lucky_hours_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: lucky_hours lucky_hours_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lucky_hours
    ADD CONSTRAINT lucky_hours_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: mystery_box_configs mystery_box_configs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_configs
    ADD CONSTRAINT mystery_box_configs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: mystery_box_configs mystery_box_configs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_configs
    ADD CONSTRAINT mystery_box_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: mystery_box_prizes mystery_box_prizes_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_prizes
    ADD CONSTRAINT mystery_box_prizes_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.mystery_box_configs(id) ON DELETE CASCADE;


--
-- Name: mystery_box_prizes mystery_box_prizes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_prizes
    ADD CONSTRAINT mystery_box_prizes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: mystery_box_wins mystery_box_wins_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_wins
    ADD CONSTRAINT mystery_box_wins_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.mystery_box_configs(id) ON DELETE SET NULL;


--
-- Name: mystery_box_wins mystery_box_wins_prize_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_wins
    ADD CONSTRAINT mystery_box_wins_prize_id_fkey FOREIGN KEY (prize_id) REFERENCES public.mystery_box_prizes(id) ON DELETE SET NULL;


--
-- Name: mystery_box_wins mystery_box_wins_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_wins
    ADD CONSTRAINT mystery_box_wins_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: mystery_box_wins mystery_box_wins_user_id_profiles_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_box_wins
    ADD CONSTRAINT mystery_box_wins_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: mystery_boxes mystery_boxes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_boxes
    ADD CONSTRAINT mystery_boxes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: mystery_boxes mystery_boxes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mystery_boxes
    ADD CONSTRAINT mystery_boxes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_affiliate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE SET NULL;


--
-- Name: orders orders_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;


--
-- Name: orders orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_failures payment_failures_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_failures
    ADD CONSTRAINT payment_failures_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: payment_failures payment_failures_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_failures
    ADD CONSTRAINT payment_failures_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: payment_failures payment_failures_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_failures
    ADD CONSTRAINT payment_failures_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: processed_webhooks processed_webhooks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_webhooks
    ADD CONSTRAINT processed_webhooks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: profiles profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: purchase_logs purchase_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_logs
    ADD CONSTRAINT purchase_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: purchase_logs purchase_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_logs
    ADD CONSTRAINT purchase_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: push_notifications push_notifications_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_notifications
    ADD CONSTRAINT push_notifications_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: push_notifications push_notifications_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_notifications
    ADD CONSTRAINT push_notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: push_notifications push_notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_notifications
    ADD CONSTRAINT push_notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: roulette_prizes roulette_prizes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roulette_prizes
    ADD CONSTRAINT roulette_prizes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: roulette_prizes roulette_prizes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roulette_prizes
    ADD CONSTRAINT roulette_prizes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: roulette_spins roulette_spins_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roulette_spins
    ADD CONSTRAINT roulette_spins_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: roulette_spins roulette_spins_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roulette_spins
    ADD CONSTRAINT roulette_spins_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: roulette_spins roulette_spins_user_id_profiles_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roulette_spins
    ADD CONSTRAINT roulette_spins_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: scratch_card_prizes scratch_card_prizes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_prizes
    ADD CONSTRAINT scratch_card_prizes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: scratch_card_prizes scratch_card_prizes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_prizes
    ADD CONSTRAINT scratch_card_prizes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: scratch_card_scratches scratch_card_scratches_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_scratches
    ADD CONSTRAINT scratch_card_scratches_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: scratch_card_scratches scratch_card_scratches_prize_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_scratches
    ADD CONSTRAINT scratch_card_scratches_prize_id_fkey FOREIGN KEY (prize_id) REFERENCES public.scratch_card_prizes(id) ON DELETE SET NULL;


--
-- Name: scratch_card_scratches scratch_card_scratches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_scratches
    ADD CONSTRAINT scratch_card_scratches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: scratch_card_scratches scratch_card_scratches_user_id_profiles_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_card_scratches
    ADD CONSTRAINT scratch_card_scratches_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: site_settings site_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: tenant_domains tenant_domains_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_domains
    ADD CONSTRAINT tenant_domains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_settings tenant_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: tickets tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_user_id_profiles_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_rewards user_rewards_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rewards
    ADD CONSTRAINT user_rewards_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: user_rewards user_rewards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rewards
    ADD CONSTRAINT user_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webhook_events webhook_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: winners winners_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT winners_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: winners winners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT winners_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: winners winners_user_id_profiles_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT winners_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


--
-- Name: tenant_settings Admin/master can modify settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/master can modify settings" ON public.tenant_settings TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: app_versions Admins can delete app versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete app versions" ON public.app_versions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_versions Admins can insert app versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert app versions" ON public.app_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: affiliates Admins can manage affiliates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage affiliates" ON public.affiliates TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role)));


--
-- Name: announcements Admins can manage announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage announcements" ON public.announcements USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: campaigns Admins can manage campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage campaigns" ON public.campaigns USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: mystery_box_configs Admins can manage configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage configs" ON public.mystery_box_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: custom_presets Admins can manage custom presets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage custom presets" ON public.custom_presets USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: federal_lottery_results Admins can manage federal results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage federal results" ON public.federal_lottery_results USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lucky_hours Admins can manage lucky hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage lucky hours" ON public.lucky_hours TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: mystery_boxes Admins can manage mystery boxes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage mystery boxes" ON public.mystery_boxes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: mystery_box_prizes Admins can manage mystery_box_prizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage mystery_box_prizes" ON public.mystery_box_prizes USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role)));


--
-- Name: mystery_box_prizes Admins can manage prizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage prizes" ON public.mystery_box_prizes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: roulette_prizes Admins can manage roulette prizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roulette prizes" ON public.roulette_prizes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: roulette_prizes Admins can manage roulette_prizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roulette_prizes" ON public.roulette_prizes USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role)));


--
-- Name: scratch_card_prizes Admins can manage scratch_card_prizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage scratch_card_prizes" ON public.scratch_card_prizes USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role)));


--
-- Name: site_settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.site_settings TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: winners Admins can manage winners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage winners" ON public.winners USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_versions Admins can update app versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update app versions" ON public.app_versions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins can update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: auth_audit_logs Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.auth_audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: affiliate_clicks Admins can view all clicks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all clicks" ON public.affiliate_clicks FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role)));


--
-- Name: affiliate_commissions Admins can view all commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all commissions" ON public.affiliate_commissions FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role)));


--
-- Name: mystery_box_wins Admins can view all mystery box wins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all mystery box wins" ON public.mystery_box_wins FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins can view all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: purchase_logs Admins can view all purchase logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all purchase logs" ON public.purchase_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (((user_roles.role)::text = 'admin'::text) OR ((user_roles.role)::text = 'superadmin'::text))))));


--
-- Name: user_rewards Admins can view all rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all rewards" ON public.user_rewards FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: roulette_spins Admins can view all roulette spins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roulette spins" ON public.roulette_spins FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: scratch_card_scratches Admins can view all scratches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all scratches" ON public.scratch_card_scratches FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: custom_presets Admins can view custom presets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view custom presets" ON public.custom_presets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: draw_logs Admins can view draw logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view draw logs" ON public.draw_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: site_settings Admins can view non-sensitive settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view non-sensitive settings" ON public.site_settings FOR SELECT TO authenticated USING ((public.is_admin(auth.uid()) AND (key <> ALL (ARRAY['supabase_service_role_key'::text, 'supabase_url'::text, 'mercadopago_access_token'::text, 'paggue_client_secret'::text]))));


--
-- Name: admin_features_config Admins can view their own feature config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view their own feature config" ON public.admin_features_config FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: banners Admins have full access to banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to banners" ON public.banners USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins have full access to orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to orders" ON public.orders TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: processed_webhooks Admins have full access to processed_webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to processed_webhooks" ON public.processed_webhooks USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: push_notifications Admins have full access to push_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to push_notifications" ON public.push_notifications USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tickets Admins have full access to tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to tickets" ON public.tickets TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: wallet_transactions Admins have full access to wallet_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to wallet_transactions" ON public.wallet_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: webhook_events Admins have full access to webhook_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to webhook_events" ON public.webhook_events USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coupons Admins manage coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage coupons" ON public.coupons TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: campaign_gift_prizes Admins manage gift prizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage gift prizes" ON public.campaign_gift_prizes USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: draw_logs Admins see non-master draw logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins see non-master draw logs" ON public.draw_logs FOR SELECT TO authenticated USING (((( SELECT user_roles.role
   FROM public.user_roles
  WHERE (user_roles.user_id = auth.uid())) = ANY (ARRAY['admin'::public.app_role, 'client_admin'::public.app_role])) AND (NOT (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = draw_logs.executed_by) AND (user_roles.role = 'master'::public.app_role)))))));


--
-- Name: profiles Admins see profiles except master; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins see profiles except master" ON public.profiles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'master'::public.app_role) OR ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role)) AND (NOT public.has_role(user_id, 'master'::public.app_role)))));


--
-- Name: profiles Admins update profiles except master; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update profiles except master" ON public.profiles FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'master'::public.app_role) OR ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role)) AND (NOT public.has_role(user_id, 'master'::public.app_role))))) WITH CHECK ((public.has_role(auth.uid(), 'master'::public.app_role) OR ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'client_admin'::public.app_role)) AND (NOT public.has_role(user_id, 'master'::public.app_role)))));


--
-- Name: affiliate_commissions Affiliates can view their commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Affiliates can view their commissions" ON public.affiliate_commissions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.affiliates
  WHERE ((affiliates.id = affiliate_commissions.affiliate_id) AND (affiliates.user_id = auth.uid())))));


--
-- Name: affiliate_clicks Affiliates can view their own clicks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Affiliates can view their own clicks" ON public.affiliate_clicks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.affiliates
  WHERE ((affiliates.id = affiliate_clicks.affiliate_id) AND (affiliates.user_id = auth.uid())))));


--
-- Name: affiliate_commissions Affiliates can view their own commissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Affiliates can view their own commissions" ON public.affiliate_commissions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.affiliates
  WHERE ((affiliates.id = affiliate_commissions.affiliate_id) AND (affiliates.user_id = auth.uid())))));


--
-- Name: affiliates Affiliates can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Affiliates can view their own profile" ON public.affiliates FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: announcements Announcements are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Announcements are publicly readable" ON public.announcements FOR SELECT USING (true);


--
-- Name: campaign_gift_prizes Anyone can see gift prize slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can see gift prize slots" ON public.campaign_gift_prizes FOR SELECT USING (true);


--
-- Name: app_versions Anyone can view app versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view app versions" ON public.app_versions FOR SELECT USING (true);


--
-- Name: lucky_hours Authenticated can read lucky hours (sanitized via view); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can read lucky hours (sanitized via view)" ON public.lucky_hours FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: auth_audit_logs Authenticated users insert own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users insert own audit logs" ON public.auth_audit_logs FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: banners Banners are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Banners are publicly readable" ON public.banners FOR SELECT USING ((is_active = true));


--
-- Name: campaigns Campaigns are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Campaigns are publicly readable" ON public.campaigns FOR SELECT USING (true);


--
-- Name: tenant_domains Domains are readable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Domains are readable by everyone" ON public.tenant_domains FOR SELECT USING (true);


--
-- Name: federal_lottery_results Federal results are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Federal results are viewable by everyone" ON public.federal_lottery_results FOR SELECT USING (true);


--
-- Name: site_settings Master can manage everything; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can manage everything" ON public.site_settings TO authenticated USING (public.check_is_master(auth.uid())) WITH CHECK (public.check_is_master(auth.uid()));


--
-- Name: site_settings Master can see everything; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can see everything" ON public.site_settings FOR SELECT TO authenticated USING (public.check_is_master(auth.uid()));


--
-- Name: user_roles Master has full access to user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master has full access to user_roles" ON public.user_roles TO authenticated USING (public.check_is_master(auth.uid())) WITH CHECK (public.check_is_master(auth.uid()));


--
-- Name: admin_features_config Master manage all feature configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master manage all feature configs" ON public.admin_features_config TO authenticated USING (public.has_role(auth.uid(), 'master'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role));


--
-- Name: draw_logs Master see all draw logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master see all draw logs" ON public.draw_logs FOR SELECT TO authenticated USING ((( SELECT user_roles.role
   FROM public.user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'master'::public.app_role));


--
-- Name: lucky_hours Masters can approve lucky hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Masters can approve lucky hours" ON public.lucky_hours FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'master'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role));


--
-- Name: lucky_hours Masters can manage lucky hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Masters can manage lucky hours" ON public.lucky_hours TO authenticated USING (public.has_role(auth.uid(), 'master'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role));


--
-- Name: mystery_box_configs Mystery box configs are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mystery box configs are public" ON public.mystery_box_configs FOR SELECT USING (true);


--
-- Name: mystery_box_prizes Mystery box prizes are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mystery box prizes are public" ON public.mystery_box_prizes FOR SELECT USING (true);


--
-- Name: mystery_boxes Mystery boxes are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Mystery boxes are publicly readable" ON public.mystery_boxes FOR SELECT USING (true);


--
-- Name: tenant_domains Only master can modify domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only master can modify domains" ON public.tenant_domains TO authenticated USING (public.has_role(auth.uid(), 'master'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role));


--
-- Name: tenants Only master can modify tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only master can modify tenants" ON public.tenants TO authenticated USING (public.has_role(auth.uid(), 'master'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role));


--
-- Name: affiliate_clicks Public can record affiliate clicks with valid affiliate; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can record affiliate clicks with valid affiliate" ON public.affiliate_clicks FOR INSERT TO authenticated, anon WITH CHECK (((affiliate_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.affiliates a
  WHERE ((a.id = affiliate_clicks.affiliate_id) AND (a.is_active = true))))));


--
-- Name: tickets Public can view active tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active tickets" ON public.tickets FOR SELECT TO authenticated, anon USING (((status = ANY (ARRAY['confirmed'::text, 'paid'::text])) OR ((status = 'reserved'::text) AND (reservation_expires_at > now()))));


--
-- Name: site_settings Public can view whitelisted settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view whitelisted settings" ON public.site_settings FOR SELECT TO authenticated, anon USING ((key = ANY (ARRAY['site_name'::text, 'site_title'::text, 'site_description'::text, 'site_keywords'::text, 'site_logo_url'::text, 'site_logo_height'::text, 'site_logo_height_mobile'::text, 'site_favicon_url'::text, 'primary_color'::text, 'company_name'::text, 'company_address'::text, 'company_cnpj'::text, 'company_email'::text, 'company_phone'::text, 'support_whatsapp'::text, 'home_hero_style'::text, 'home_marquee_enabled'::text, 'home_marquee_text'::text, 'home_show_games_combo'::text, 'home_show_game_roleta'::text, 'home_show_game_raspadinha'::text, 'home_show_game_caixa'::text, 'home_show_game_ranking'::text, 'home_show_game_afiliados'::text, 'home_show_how_it_works'::text, 'home_show_faq'::text, 'home_show_trust_badges'::text, 'home_show_cta'::text, 'home_show_testimonials'::text, 'home_show_hall_fame'::text, 'home_show_live_activity'::text, 'inline_show_finished_raffles'::text, 'inline_testimonials_count'::text, 'layout_mode'::text, 'hero_transition_speed'::text, 'hero_transition_type'::text, 'animation_easing'::text, 'border_shimmer_opacity'::text, 'button_glow_intensity'::text, 'button_glow_speed'::text, 'button_hover_effect'::text, 'title_shimmer_primary'::text, 'title_shimmer_secondary'::text, 'title_shimmer_secondary_light'::text, 'title_shimmer_speed'::text, 'active_payment_provider'::text, 'manual_payment_enabled'::text, 'manual_payment_pix_key'::text, 'manual_payment_pix_name'::text, 'mercadopago_public_key'::text, 'affiliate_commission_percent'::text, 'cashback_percent'::text, 'min_withdrawal_amount'::text, 'deposit_bonus_tiers'::text, 'facebook_pixel_id'::text, 'google_analytics_id'::text, 'google_tag_manager_id'::text, 'enable_download_app'::text, 'app_download_link'::text])));


--
-- Name: roulette_prizes Roulette prizes readable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Roulette prizes readable by authenticated users" ON public.roulette_prizes FOR SELECT TO authenticated USING (true);


--
-- Name: scratch_card_prizes Scratch card prizes readable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Scratch card prizes readable by authenticated users" ON public.scratch_card_prizes FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: federal_lottery_results Service role can manage federal results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage federal results" ON public.federal_lottery_results USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: tenant_settings Settings are readable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Settings are readable by everyone" ON public.tenant_settings FOR SELECT USING (true);


--
-- Name: tenants Tenants are readable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenants are readable by everyone" ON public.tenants FOR SELECT USING (true);


--
-- Name: orders Users can attach proof to own pending orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can attach proof to own pending orders" ON public.orders FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (payment_status = ANY (ARRAY['pending'::text, 'awaiting_proof'::text, 'awaiting_payment'::text])))) WITH CHECK (((auth.uid() = user_id) AND (payment_status = ANY (ARRAY['pending'::text, 'awaiting_proof'::text, 'awaiting_payment'::text]))));


--
-- Name: orders Users can create their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: tickets Users can create their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Users can insert their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notifications" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: payment_failures Users can insert their own payment failures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own payment failures" ON public.payment_failures FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wallet_transactions Users can insert their own withdrawal requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own withdrawal requests" ON public.wallet_transactions FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (type = 'withdrawal'::text)));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_achievements Users can view their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: affiliates Users can view their own affiliate; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own affiliate" ON public.affiliates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: mystery_box_wins Users can view their own mystery box wins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own mystery box wins" ON public.mystery_box_wins FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: push_notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.push_notifications FOR SELECT USING (((target_user_id = auth.uid()) OR (target_type = 'all'::text)));


--
-- Name: orders Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: payment_failures Users can view their own payment failures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payment failures" ON public.payment_failures FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_rewards Users can view their own rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own rewards" ON public.user_rewards FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: roulette_spins Users can view their own roulette spins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roulette spins" ON public.roulette_spins FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: scratch_card_scratches Users can view their own scratches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own scratches" ON public.scratch_card_scratches FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tickets Users can view their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tickets" ON public.tickets FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: wallet_transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_features_config Users view own feature config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own feature config" ON public.admin_features_config FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: winners Winners are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Winners are publicly readable" ON public.winners FOR SELECT USING (true);


--
-- Name: admin_features_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_features_config ENABLE ROW LEVEL SECURITY;

--
-- Name: affiliate_clicks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

--
-- Name: affiliate_commissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

--
-- Name: affiliates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: app_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_gift_prizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_gift_prizes ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_presets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_presets ENABLE ROW LEVEL SECURITY;

--
-- Name: draw_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.draw_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: federal_lottery_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.federal_lottery_results ENABLE ROW LEVEL SECURITY;

--
-- Name: lucky_hours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lucky_hours ENABLE ROW LEVEL SECURITY;

--
-- Name: mystery_box_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mystery_box_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: mystery_box_prizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mystery_box_prizes ENABLE ROW LEVEL SECURITY;

--
-- Name: mystery_box_wins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mystery_box_wins ENABLE ROW LEVEL SECURITY;

--
-- Name: mystery_boxes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mystery_boxes ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_failures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;

--
-- Name: processed_webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: push_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: roulette_prizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roulette_prizes ENABLE ROW LEVEL SECURITY;

--
-- Name: roulette_spins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roulette_spins ENABLE ROW LEVEL SECURITY;

--
-- Name: scratch_card_prizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scratch_card_prizes ENABLE ROW LEVEL SECURITY;

--
-- Name: scratch_card_scratches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scratch_card_scratches ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_features_config tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.admin_features_config AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: affiliate_clicks tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.affiliate_clicks AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: affiliate_commissions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.affiliate_commissions AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: affiliates tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.affiliates AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: announcements tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.announcements AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: app_versions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.app_versions AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: auth_audit_logs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.auth_audit_logs AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: banners tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.banners AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: campaigns tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.campaigns AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: coupons tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.coupons AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: custom_presets tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.custom_presets AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: draw_logs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.draw_logs AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: federal_lottery_results tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.federal_lottery_results AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: lucky_hours tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.lucky_hours AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: mystery_box_configs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.mystery_box_configs AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: mystery_box_prizes tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.mystery_box_prizes AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: mystery_box_wins tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.mystery_box_wins AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: mystery_boxes tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.mystery_boxes AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: notifications tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.notifications AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: orders tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.orders AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: payment_failures tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.payment_failures AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: processed_webhooks tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.processed_webhooks AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: profiles tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.profiles AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: purchase_logs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.purchase_logs AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: push_notifications tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.push_notifications AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: roulette_prizes tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.roulette_prizes AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: roulette_spins tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.roulette_spins AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: scratch_card_prizes tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.scratch_card_prizes AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: scratch_card_scratches tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.scratch_card_scratches AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: site_settings tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.site_settings AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: tickets tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.tickets AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: user_achievements tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.user_achievements AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: user_rewards tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.user_rewards AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: user_roles tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.user_roles AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: wallet_transactions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.wallet_transactions AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: webhook_events tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.webhook_events AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: winners tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.winners AS RESTRICTIVE USING (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role))) WITH CHECK (((NOT (tenant_id IS DISTINCT FROM public.current_tenant_id())) OR public.has_role(auth.uid(), 'master'::public.app_role)));


--
-- Name: tenant_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: winners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO sandbox_exec;


--
-- Name: FUNCTION audit_all_paid_orders(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.audit_all_paid_orders() TO anon;
GRANT ALL ON FUNCTION public.audit_all_paid_orders() TO authenticated;
GRANT ALL ON FUNCTION public.audit_all_paid_orders() TO service_role;
GRANT ALL ON FUNCTION public.audit_all_paid_orders() TO sandbox_exec;


--
-- Name: FUNCTION campaigns_set_slug(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.campaigns_set_slug() TO anon;
GRANT ALL ON FUNCTION public.campaigns_set_slug() TO authenticated;
GRANT ALL ON FUNCTION public.campaigns_set_slug() TO service_role;
GRANT ALL ON FUNCTION public.campaigns_set_slug() TO sandbox_exec;


--
-- Name: FUNCTION check_data_integrity(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_data_integrity() TO anon;
GRANT ALL ON FUNCTION public.check_data_integrity() TO authenticated;
GRANT ALL ON FUNCTION public.check_data_integrity() TO service_role;
GRANT ALL ON FUNCTION public.check_data_integrity() TO sandbox_exec;


--
-- Name: FUNCTION check_is_master(user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_is_master(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.check_is_master(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_is_master(user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.check_is_master(user_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION cleanup_expired_reservations(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cleanup_expired_reservations() TO anon;
GRANT ALL ON FUNCTION public.cleanup_expired_reservations() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_expired_reservations() TO service_role;
GRANT ALL ON FUNCTION public.cleanup_expired_reservations() TO sandbox_exec;


--
-- Name: FUNCTION create_mystery_box_notification(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_mystery_box_notification() TO anon;
GRANT ALL ON FUNCTION public.create_mystery_box_notification() TO authenticated;
GRANT ALL ON FUNCTION public.create_mystery_box_notification() TO service_role;
GRANT ALL ON FUNCTION public.create_mystery_box_notification() TO sandbox_exec;


--
-- Name: FUNCTION create_roulette_notification(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_roulette_notification() TO anon;
GRANT ALL ON FUNCTION public.create_roulette_notification() TO authenticated;
GRANT ALL ON FUNCTION public.create_roulette_notification() TO service_role;
GRANT ALL ON FUNCTION public.create_roulette_notification() TO sandbox_exec;


--
-- Name: FUNCTION current_tenant_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.current_tenant_id() TO anon;
GRANT ALL ON FUNCTION public.current_tenant_id() TO authenticated;
GRANT ALL ON FUNCTION public.current_tenant_id() TO service_role;
GRANT ALL ON FUNCTION public.current_tenant_id() TO sandbox_exec;


--
-- Name: FUNCTION diagnose_table_permissions(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.diagnose_table_permissions() TO anon;
GRANT ALL ON FUNCTION public.diagnose_table_permissions() TO authenticated;
GRANT ALL ON FUNCTION public.diagnose_table_permissions() TO service_role;
GRANT ALL ON FUNCTION public.diagnose_table_permissions() TO sandbox_exec;


--
-- Name: FUNCTION duplicate_campaign(p_campaign_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.duplicate_campaign(p_campaign_id uuid) TO anon;
GRANT ALL ON FUNCTION public.duplicate_campaign(p_campaign_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.duplicate_campaign(p_campaign_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.duplicate_campaign(p_campaign_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION get_campaign_mystery_box_wins(p_campaign_id uuid, p_limit integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_campaign_mystery_box_wins(p_campaign_id uuid, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_campaign_mystery_box_wins(p_campaign_id uuid, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_campaign_mystery_box_wins(p_campaign_id uuid, p_limit integer) TO service_role;
GRANT ALL ON FUNCTION public.get_campaign_mystery_box_wins(p_campaign_id uuid, p_limit integer) TO sandbox_exec;


--
-- Name: FUNCTION get_campaign_roulette_wins(p_campaign_id uuid, p_limit integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_campaign_roulette_wins(p_campaign_id uuid, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_campaign_roulette_wins(p_campaign_id uuid, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_campaign_roulette_wins(p_campaign_id uuid, p_limit integer) TO service_role;
GRANT ALL ON FUNCTION public.get_campaign_roulette_wins(p_campaign_id uuid, p_limit integer) TO sandbox_exec;


--
-- Name: FUNCTION get_campaign_scratch_wins(p_campaign_id uuid, p_limit integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_campaign_scratch_wins(p_campaign_id uuid, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_campaign_scratch_wins(p_campaign_id uuid, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_campaign_scratch_wins(p_campaign_id uuid, p_limit integer) TO service_role;
GRANT ALL ON FUNCTION public.get_campaign_scratch_wins(p_campaign_id uuid, p_limit integer) TO sandbox_exec;


--
-- Name: FUNCTION get_order_inconsistencies(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_order_inconsistencies() TO anon;
GRANT ALL ON FUNCTION public.get_order_inconsistencies() TO authenticated;
GRANT ALL ON FUNCTION public.get_order_inconsistencies() TO service_role;
GRANT ALL ON FUNCTION public.get_order_inconsistencies() TO sandbox_exec;


--
-- Name: FUNCTION handle_affiliate_commission(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_affiliate_commission() TO anon;
GRANT ALL ON FUNCTION public.handle_affiliate_commission() TO authenticated;
GRANT ALL ON FUNCTION public.handle_affiliate_commission() TO service_role;
GRANT ALL ON FUNCTION public.handle_affiliate_commission() TO sandbox_exec;


--
-- Name: FUNCTION handle_auth_user_update(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_auth_user_update() TO anon;
GRANT ALL ON FUNCTION public.handle_auth_user_update() TO authenticated;
GRANT ALL ON FUNCTION public.handle_auth_user_update() TO service_role;
GRANT ALL ON FUNCTION public.handle_auth_user_update() TO sandbox_exec;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO sandbox_exec;


--
-- Name: FUNCTION handle_order_payment(p_order_id uuid, p_payment_id text, p_payment_provider text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_order_payment(p_order_id uuid, p_payment_id text, p_payment_provider text) TO anon;
GRANT ALL ON FUNCTION public.handle_order_payment(p_order_id uuid, p_payment_id text, p_payment_provider text) TO authenticated;
GRANT ALL ON FUNCTION public.handle_order_payment(p_order_id uuid, p_payment_id text, p_payment_provider text) TO service_role;
GRANT ALL ON FUNCTION public.handle_order_payment(p_order_id uuid, p_payment_id text, p_payment_provider text) TO sandbox_exec;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO sandbox_exec;


--
-- Name: FUNCTION increment_balance(amount numeric, user_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_balance(amount numeric, user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_balance(amount numeric, user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_balance(amount numeric, user_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.increment_balance(amount numeric, user_uuid uuid) TO sandbox_exec;


--
-- Name: FUNCTION is_admin(_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_admin(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_admin(_user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.is_admin(_user_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION log_order_creation(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_order_creation() TO anon;
GRANT ALL ON FUNCTION public.log_order_creation() TO authenticated;
GRANT ALL ON FUNCTION public.log_order_creation() TO service_role;
GRANT ALL ON FUNCTION public.log_order_creation() TO sandbox_exec;


--
-- Name: FUNCTION manual_perform_draw(p_campaign_id uuid, p_ticket_number text, p_prize_index integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.manual_perform_draw(p_campaign_id uuid, p_ticket_number text, p_prize_index integer) TO anon;
GRANT ALL ON FUNCTION public.manual_perform_draw(p_campaign_id uuid, p_ticket_number text, p_prize_index integer) TO authenticated;
GRANT ALL ON FUNCTION public.manual_perform_draw(p_campaign_id uuid, p_ticket_number text, p_prize_index integer) TO service_role;
GRANT ALL ON FUNCTION public.manual_perform_draw(p_campaign_id uuid, p_ticket_number text, p_prize_index integer) TO sandbox_exec;


--
-- Name: FUNCTION notify_campaign_draw(p_campaign_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notify_campaign_draw(p_campaign_id uuid) TO anon;
GRANT ALL ON FUNCTION public.notify_campaign_draw(p_campaign_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.notify_campaign_draw(p_campaign_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.notify_campaign_draw(p_campaign_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION on_order_paid_notification(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.on_order_paid_notification() TO anon;
GRANT ALL ON FUNCTION public.on_order_paid_notification() TO authenticated;
GRANT ALL ON FUNCTION public.on_order_paid_notification() TO service_role;
GRANT ALL ON FUNCTION public.on_order_paid_notification() TO sandbox_exec;


--
-- Name: FUNCTION on_profile_created_notification(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.on_profile_created_notification() TO anon;
GRANT ALL ON FUNCTION public.on_profile_created_notification() TO authenticated;
GRANT ALL ON FUNCTION public.on_profile_created_notification() TO service_role;
GRANT ALL ON FUNCTION public.on_profile_created_notification() TO sandbox_exec;


--
-- Name: FUNCTION pay_with_balance(p_order_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pay_with_balance(p_order_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.pay_with_balance(p_order_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.pay_with_balance(p_order_id uuid, p_user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.pay_with_balance(p_order_id uuid, p_user_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION perform_draw(p_campaign_id uuid, p_executed_by uuid, p_prize_index integer, p_allow_unassigned boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.perform_draw(p_campaign_id uuid, p_executed_by uuid, p_prize_index integer, p_allow_unassigned boolean) TO anon;
GRANT ALL ON FUNCTION public.perform_draw(p_campaign_id uuid, p_executed_by uuid, p_prize_index integer, p_allow_unassigned boolean) TO authenticated;
GRANT ALL ON FUNCTION public.perform_draw(p_campaign_id uuid, p_executed_by uuid, p_prize_index integer, p_allow_unassigned boolean) TO service_role;
GRANT ALL ON FUNCTION public.perform_draw(p_campaign_id uuid, p_executed_by uuid, p_prize_index integer, p_allow_unassigned boolean) TO sandbox_exec;


--
-- Name: FUNCTION process_lottery_draw_auto(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.process_lottery_draw_auto() TO anon;
GRANT ALL ON FUNCTION public.process_lottery_draw_auto() TO authenticated;
GRANT ALL ON FUNCTION public.process_lottery_draw_auto() TO service_role;
GRANT ALL ON FUNCTION public.process_lottery_draw_auto() TO sandbox_exec;


--
-- Name: FUNCTION process_mystery_box_open(p_config_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.process_mystery_box_open(p_config_id uuid) TO anon;
GRANT ALL ON FUNCTION public.process_mystery_box_open(p_config_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.process_mystery_box_open(p_config_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.process_mystery_box_open(p_config_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION process_overdue_lucky_hours(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.process_overdue_lucky_hours() TO anon;
GRANT ALL ON FUNCTION public.process_overdue_lucky_hours() TO authenticated;
GRANT ALL ON FUNCTION public.process_overdue_lucky_hours() TO service_role;
GRANT ALL ON FUNCTION public.process_overdue_lucky_hours() TO sandbox_exec;


--
-- Name: FUNCTION process_paid_order(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.process_paid_order() TO anon;
GRANT ALL ON FUNCTION public.process_paid_order() TO authenticated;
GRANT ALL ON FUNCTION public.process_paid_order() TO service_role;
GRANT ALL ON FUNCTION public.process_paid_order() TO sandbox_exec;


--
-- Name: FUNCTION process_roulette_spin(p_campaign_id uuid, p_multiplier integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.process_roulette_spin(p_campaign_id uuid, p_multiplier integer) TO anon;
GRANT ALL ON FUNCTION public.process_roulette_spin(p_campaign_id uuid, p_multiplier integer) TO authenticated;
GRANT ALL ON FUNCTION public.process_roulette_spin(p_campaign_id uuid, p_multiplier integer) TO service_role;
GRANT ALL ON FUNCTION public.process_roulette_spin(p_campaign_id uuid, p_multiplier integer) TO sandbox_exec;


--
-- Name: FUNCTION process_scratch_card_play(p_campaign_id uuid, p_cost numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.process_scratch_card_play(p_campaign_id uuid, p_cost numeric) TO anon;
GRANT ALL ON FUNCTION public.process_scratch_card_play(p_campaign_id uuid, p_cost numeric) TO authenticated;
GRANT ALL ON FUNCTION public.process_scratch_card_play(p_campaign_id uuid, p_cost numeric) TO service_role;
GRANT ALL ON FUNCTION public.process_scratch_card_play(p_campaign_id uuid, p_cost numeric) TO sandbox_exec;


--
-- Name: FUNCTION protect_profile_fields(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.protect_profile_fields() TO anon;
GRANT ALL ON FUNCTION public.protect_profile_fields() TO authenticated;
GRANT ALL ON FUNCTION public.protect_profile_fields() TO service_role;
GRANT ALL ON FUNCTION public.protect_profile_fields() TO sandbox_exec;


--
-- Name: FUNCTION record_purchase_log(p_order_id uuid, p_event_type text, p_message text, p_metadata jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.record_purchase_log(p_order_id uuid, p_event_type text, p_message text, p_metadata jsonb) TO anon;
GRANT ALL ON FUNCTION public.record_purchase_log(p_order_id uuid, p_event_type text, p_message text, p_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.record_purchase_log(p_order_id uuid, p_event_type text, p_message text, p_metadata jsonb) TO service_role;
GRANT ALL ON FUNCTION public.record_purchase_log(p_order_id uuid, p_event_type text, p_message text, p_metadata jsonb) TO sandbox_exec;


--
-- Name: FUNCTION release_expired_tickets(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.release_expired_tickets() TO anon;
GRANT ALL ON FUNCTION public.release_expired_tickets() TO authenticated;
GRANT ALL ON FUNCTION public.release_expired_tickets() TO service_role;
GRANT ALL ON FUNCTION public.release_expired_tickets() TO sandbox_exec;


--
-- Name: FUNCTION repair_order(p_order_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.repair_order(p_order_id uuid) TO anon;
GRANT ALL ON FUNCTION public.repair_order(p_order_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.repair_order(p_order_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.repair_order(p_order_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION reprocess_order_prizes(p_order_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reprocess_order_prizes(p_order_id uuid) TO anon;
GRANT ALL ON FUNCTION public.reprocess_order_prizes(p_order_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reprocess_order_prizes(p_order_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.reprocess_order_prizes(p_order_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[], p_affiliate_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[], p_affiliate_id uuid) TO anon;
GRANT ALL ON FUNCTION public.reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[], p_affiliate_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[], p_affiliate_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.reserve_tickets(p_campaign_id uuid, p_user_id uuid, p_quantity integer, p_numbers text[], p_affiliate_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION reveal_gift_results(p_campaign_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reveal_gift_results(p_campaign_id uuid) TO anon;
GRANT ALL ON FUNCTION public.reveal_gift_results(p_campaign_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reveal_gift_results(p_campaign_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.reveal_gift_results(p_campaign_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION run_lucky_hour_draw(p_lucky_hour_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.run_lucky_hour_draw(p_lucky_hour_id uuid) TO anon;
GRANT ALL ON FUNCTION public.run_lucky_hour_draw(p_lucky_hour_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.run_lucky_hour_draw(p_lucky_hour_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.run_lucky_hour_draw(p_lucky_hour_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION set_tenant_id_on_insert(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_tenant_id_on_insert() TO anon;
GRANT ALL ON FUNCTION public.set_tenant_id_on_insert() TO authenticated;
GRANT ALL ON FUNCTION public.set_tenant_id_on_insert() TO service_role;
GRANT ALL ON FUNCTION public.set_tenant_id_on_insert() TO sandbox_exec;


--
-- Name: FUNCTION slugify(input text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.slugify(input text) TO anon;
GRANT ALL ON FUNCTION public.slugify(input text) TO authenticated;
GRANT ALL ON FUNCTION public.slugify(input text) TO service_role;
GRANT ALL ON FUNCTION public.slugify(input text) TO sandbox_exec;


--
-- Name: FUNCTION sync_federal_lottery(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_federal_lottery() TO anon;
GRANT ALL ON FUNCTION public.sync_federal_lottery() TO authenticated;
GRANT ALL ON FUNCTION public.sync_federal_lottery() TO service_role;
GRANT ALL ON FUNCTION public.sync_federal_lottery() TO sandbox_exec;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO sandbox_exec;


--
-- Name: TABLE admin_features_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_features_config TO anon;
GRANT ALL ON TABLE public.admin_features_config TO authenticated;
GRANT ALL ON TABLE public.admin_features_config TO service_role;
GRANT SELECT,INSERT ON TABLE public.admin_features_config TO sandbox_exec;


--
-- Name: TABLE affiliate_clicks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.affiliate_clicks TO anon;
GRANT ALL ON TABLE public.affiliate_clicks TO authenticated;
GRANT ALL ON TABLE public.affiliate_clicks TO service_role;
GRANT SELECT,INSERT ON TABLE public.affiliate_clicks TO sandbox_exec;


--
-- Name: TABLE affiliate_commissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.affiliate_commissions TO anon;
GRANT ALL ON TABLE public.affiliate_commissions TO authenticated;
GRANT ALL ON TABLE public.affiliate_commissions TO service_role;
GRANT SELECT,INSERT ON TABLE public.affiliate_commissions TO sandbox_exec;


--
-- Name: TABLE affiliates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.affiliates TO anon;
GRANT ALL ON TABLE public.affiliates TO authenticated;
GRANT ALL ON TABLE public.affiliates TO service_role;
GRANT SELECT,INSERT ON TABLE public.affiliates TO sandbox_exec;


--
-- Name: TABLE announcements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.announcements TO anon;
GRANT ALL ON TABLE public.announcements TO authenticated;
GRANT ALL ON TABLE public.announcements TO service_role;
GRANT SELECT,INSERT ON TABLE public.announcements TO sandbox_exec;


--
-- Name: TABLE app_versions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_versions TO anon;
GRANT ALL ON TABLE public.app_versions TO authenticated;
GRANT ALL ON TABLE public.app_versions TO service_role;
GRANT SELECT,INSERT ON TABLE public.app_versions TO sandbox_exec;


--
-- Name: TABLE auth_audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.auth_audit_logs TO anon;
GRANT ALL ON TABLE public.auth_audit_logs TO authenticated;
GRANT ALL ON TABLE public.auth_audit_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.auth_audit_logs TO sandbox_exec;


--
-- Name: TABLE banners; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.banners TO anon;
GRANT ALL ON TABLE public.banners TO authenticated;
GRANT ALL ON TABLE public.banners TO service_role;
GRANT SELECT,INSERT ON TABLE public.banners TO sandbox_exec;


--
-- Name: TABLE campaign_gift_prizes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.campaign_gift_prizes TO anon;
GRANT ALL ON TABLE public.campaign_gift_prizes TO authenticated;
GRANT ALL ON TABLE public.campaign_gift_prizes TO service_role;
GRANT SELECT,INSERT ON TABLE public.campaign_gift_prizes TO sandbox_exec;


--
-- Name: TABLE campaigns; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.campaigns TO anon;
GRANT ALL ON TABLE public.campaigns TO authenticated;
GRANT ALL ON TABLE public.campaigns TO service_role;
GRANT SELECT,INSERT ON TABLE public.campaigns TO sandbox_exec;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT SELECT,INSERT ON TABLE public.orders TO sandbox_exec;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT,INSERT ON TABLE public.profiles TO sandbox_exec;


--
-- Name: TABLE campaign_gift_prizes_public; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.campaign_gift_prizes_public TO anon;
GRANT ALL ON TABLE public.campaign_gift_prizes_public TO authenticated;
GRANT ALL ON TABLE public.campaign_gift_prizes_public TO service_role;
GRANT SELECT,INSERT ON TABLE public.campaign_gift_prizes_public TO sandbox_exec;


--
-- Name: TABLE coupons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.coupons TO anon;
GRANT ALL ON TABLE public.coupons TO authenticated;
GRANT ALL ON TABLE public.coupons TO service_role;
GRANT SELECT,INSERT ON TABLE public.coupons TO sandbox_exec;


--
-- Name: TABLE custom_presets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.custom_presets TO anon;
GRANT ALL ON TABLE public.custom_presets TO authenticated;
GRANT ALL ON TABLE public.custom_presets TO service_role;
GRANT SELECT,INSERT ON TABLE public.custom_presets TO sandbox_exec;


--
-- Name: TABLE draw_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.draw_logs TO anon;
GRANT ALL ON TABLE public.draw_logs TO authenticated;
GRANT ALL ON TABLE public.draw_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.draw_logs TO sandbox_exec;


--
-- Name: TABLE federal_lottery_results; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.federal_lottery_results TO anon;
GRANT ALL ON TABLE public.federal_lottery_results TO authenticated;
GRANT ALL ON TABLE public.federal_lottery_results TO service_role;
GRANT SELECT,INSERT ON TABLE public.federal_lottery_results TO sandbox_exec;


--
-- Name: TABLE lucky_hours; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lucky_hours TO anon;
GRANT ALL ON TABLE public.lucky_hours TO authenticated;
GRANT ALL ON TABLE public.lucky_hours TO service_role;
GRANT SELECT,INSERT ON TABLE public.lucky_hours TO sandbox_exec;


--
-- Name: TABLE lucky_hours_public; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lucky_hours_public TO anon;
GRANT ALL ON TABLE public.lucky_hours_public TO authenticated;
GRANT ALL ON TABLE public.lucky_hours_public TO service_role;
GRANT SELECT,INSERT ON TABLE public.lucky_hours_public TO sandbox_exec;


--
-- Name: TABLE mystery_box_configs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mystery_box_configs TO anon;
GRANT ALL ON TABLE public.mystery_box_configs TO authenticated;
GRANT ALL ON TABLE public.mystery_box_configs TO service_role;
GRANT SELECT,INSERT ON TABLE public.mystery_box_configs TO sandbox_exec;


--
-- Name: TABLE mystery_box_prizes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mystery_box_prizes TO anon;
GRANT ALL ON TABLE public.mystery_box_prizes TO authenticated;
GRANT ALL ON TABLE public.mystery_box_prizes TO service_role;
GRANT SELECT,INSERT ON TABLE public.mystery_box_prizes TO sandbox_exec;


--
-- Name: TABLE mystery_box_wins; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mystery_box_wins TO anon;
GRANT ALL ON TABLE public.mystery_box_wins TO authenticated;
GRANT ALL ON TABLE public.mystery_box_wins TO service_role;
GRANT SELECT,INSERT ON TABLE public.mystery_box_wins TO sandbox_exec;


--
-- Name: TABLE mystery_boxes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mystery_boxes TO anon;
GRANT ALL ON TABLE public.mystery_boxes TO authenticated;
GRANT ALL ON TABLE public.mystery_boxes TO service_role;
GRANT SELECT,INSERT ON TABLE public.mystery_boxes TO sandbox_exec;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;
GRANT SELECT,INSERT ON TABLE public.notifications TO sandbox_exec;


--
-- Name: TABLE orders_public_ranking; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.orders_public_ranking TO anon;
GRANT ALL ON TABLE public.orders_public_ranking TO authenticated;
GRANT ALL ON TABLE public.orders_public_ranking TO service_role;
GRANT SELECT,INSERT ON TABLE public.orders_public_ranking TO sandbox_exec;


--
-- Name: TABLE payment_failures; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_failures TO anon;
GRANT ALL ON TABLE public.payment_failures TO authenticated;
GRANT ALL ON TABLE public.payment_failures TO service_role;
GRANT SELECT,INSERT ON TABLE public.payment_failures TO sandbox_exec;


--
-- Name: TABLE processed_webhooks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.processed_webhooks TO anon;
GRANT ALL ON TABLE public.processed_webhooks TO authenticated;
GRANT ALL ON TABLE public.processed_webhooks TO service_role;
GRANT SELECT,INSERT ON TABLE public.processed_webhooks TO sandbox_exec;


--
-- Name: TABLE purchase_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.purchase_logs TO anon;
GRANT ALL ON TABLE public.purchase_logs TO authenticated;
GRANT ALL ON TABLE public.purchase_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.purchase_logs TO sandbox_exec;


--
-- Name: TABLE push_notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.push_notifications TO anon;
GRANT ALL ON TABLE public.push_notifications TO authenticated;
GRANT ALL ON TABLE public.push_notifications TO service_role;
GRANT SELECT,INSERT ON TABLE public.push_notifications TO sandbox_exec;


--
-- Name: TABLE roulette_prizes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.roulette_prizes TO anon;
GRANT ALL ON TABLE public.roulette_prizes TO authenticated;
GRANT ALL ON TABLE public.roulette_prizes TO service_role;
GRANT SELECT,INSERT ON TABLE public.roulette_prizes TO sandbox_exec;


--
-- Name: TABLE roulette_spins; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.roulette_spins TO anon;
GRANT ALL ON TABLE public.roulette_spins TO authenticated;
GRANT ALL ON TABLE public.roulette_spins TO service_role;
GRANT SELECT,INSERT ON TABLE public.roulette_spins TO sandbox_exec;


--
-- Name: TABLE scratch_card_prizes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scratch_card_prizes TO anon;
GRANT ALL ON TABLE public.scratch_card_prizes TO authenticated;
GRANT ALL ON TABLE public.scratch_card_prizes TO service_role;
GRANT SELECT,INSERT ON TABLE public.scratch_card_prizes TO sandbox_exec;


--
-- Name: TABLE scratch_card_scratches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scratch_card_scratches TO anon;
GRANT ALL ON TABLE public.scratch_card_scratches TO authenticated;
GRANT ALL ON TABLE public.scratch_card_scratches TO service_role;
GRANT SELECT,INSERT ON TABLE public.scratch_card_scratches TO sandbox_exec;


--
-- Name: TABLE site_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.site_settings TO anon;
GRANT ALL ON TABLE public.site_settings TO authenticated;
GRANT ALL ON TABLE public.site_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.site_settings TO sandbox_exec;


--
-- Name: TABLE tenant_domains; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tenant_domains TO anon;
GRANT ALL ON TABLE public.tenant_domains TO authenticated;
GRANT ALL ON TABLE public.tenant_domains TO service_role;
GRANT SELECT,INSERT ON TABLE public.tenant_domains TO sandbox_exec;


--
-- Name: TABLE tenant_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tenant_settings TO anon;
GRANT ALL ON TABLE public.tenant_settings TO authenticated;
GRANT ALL ON TABLE public.tenant_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.tenant_settings TO sandbox_exec;


--
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tenants TO anon;
GRANT ALL ON TABLE public.tenants TO authenticated;
GRANT ALL ON TABLE public.tenants TO service_role;
GRANT SELECT,INSERT ON TABLE public.tenants TO sandbox_exec;


--
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tickets TO anon;
GRANT ALL ON TABLE public.tickets TO authenticated;
GRANT ALL ON TABLE public.tickets TO service_role;
GRANT SELECT,INSERT ON TABLE public.tickets TO sandbox_exec;


--
-- Name: TABLE tickets_public; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tickets_public TO anon;
GRANT ALL ON TABLE public.tickets_public TO authenticated;
GRANT ALL ON TABLE public.tickets_public TO service_role;
GRANT SELECT,INSERT ON TABLE public.tickets_public TO sandbox_exec;


--
-- Name: TABLE user_achievements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_achievements TO anon;
GRANT ALL ON TABLE public.user_achievements TO authenticated;
GRANT ALL ON TABLE public.user_achievements TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_achievements TO sandbox_exec;


--
-- Name: TABLE user_rewards; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_rewards TO anon;
GRANT ALL ON TABLE public.user_rewards TO authenticated;
GRANT ALL ON TABLE public.user_rewards TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_rewards TO sandbox_exec;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_roles TO sandbox_exec;


--
-- Name: TABLE wallet_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wallet_transactions TO anon;
GRANT ALL ON TABLE public.wallet_transactions TO authenticated;
GRANT ALL ON TABLE public.wallet_transactions TO service_role;
GRANT SELECT,INSERT ON TABLE public.wallet_transactions TO sandbox_exec;


--
-- Name: TABLE webhook_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.webhook_events TO anon;
GRANT ALL ON TABLE public.webhook_events TO authenticated;
GRANT ALL ON TABLE public.webhook_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.webhook_events TO sandbox_exec;


--
-- Name: TABLE winners; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.winners TO anon;
GRANT ALL ON TABLE public.winners TO authenticated;
GRANT ALL ON TABLE public.winners TO service_role;
GRANT SELECT,INSERT ON TABLE public.winners TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT ON TABLES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--




-- =====================================================================
-- TRIGGERS EM auth.users (criacao automatica de profile)
-- =====================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_update();

-- =====================================================================
-- TENANT PADRAO
-- =====================================================================
INSERT INTO public.tenants (id, slug, name, is_active, plan)
VALUES ('1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73', 'default', 'Rifas Premiadas', true, 'pro')
ON CONFLICT (id) DO NOTHING;

-- leitura publica de tenants / dominios / settings (necessario sem edge function)
DROP POLICY IF EXISTS "public_read_tenants" ON public.tenants;
CREATE POLICY "public_read_tenants" ON public.tenants FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_tenant_domains" ON public.tenant_domains;
CREATE POLICY "public_read_tenant_domains" ON public.tenant_domains FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_tenant_settings" ON public.tenant_settings;
CREATE POLICY "public_read_tenant_settings" ON public.tenant_settings FOR SELECT USING (true);
GRANT SELECT ON public.tenants, public.tenant_domains, public.tenant_settings TO anon, authenticated;
