CREATE OR REPLACE FUNCTION public.duplicate_campaign(p_campaign_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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
