-- Fix restrictive foreign keys that block admin deletions of campaigns, users, prizes, coupons, and affiliates.
-- No tenant filters or tenant structure are removed or hardcoded by this migration.

-- Campaign-related history/audit records should not block deleting a campaign.
ALTER TABLE public.draw_logs
  DROP CONSTRAINT IF EXISTS draw_logs_campaign_id_fkey;
ALTER TABLE public.draw_logs
  ADD CONSTRAINT draw_logs_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_campaign_id_fkey;
ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Campaign-owned instant game activity should be cleaned with the campaign.
ALTER TABLE public.roulette_spins
  DROP CONSTRAINT IF EXISTS roulette_spins_campaign_id_fkey;
ALTER TABLE public.roulette_spins
  ADD CONSTRAINT roulette_spins_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.scratch_card_prizes
  DROP CONSTRAINT IF EXISTS scratch_card_prizes_campaign_id_fkey;
ALTER TABLE public.scratch_card_prizes
  ADD CONSTRAINT scratch_card_prizes_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.scratch_card_scratches
  DROP CONSTRAINT IF EXISTS scratch_card_scratches_campaign_id_fkey;
ALTER TABLE public.scratch_card_scratches
  ADD CONSTRAINT scratch_card_scratches_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- Prize definitions can be removed without breaking past scratch history.
ALTER TABLE public.scratch_card_scratches
  DROP CONSTRAINT IF EXISTS scratch_card_scratches_prize_id_fkey;
ALTER TABLE public.scratch_card_scratches
  ADD CONSTRAINT scratch_card_scratches_prize_id_fkey
  FOREIGN KEY (prize_id) REFERENCES public.scratch_card_prizes(id) ON DELETE SET NULL;

-- Mystery box definitions/prizes can be removed without blocking existing win records.
ALTER TABLE public.mystery_box_wins
  DROP CONSTRAINT IF EXISTS mystery_box_wins_config_id_fkey;
ALTER TABLE public.mystery_box_wins
  ADD CONSTRAINT mystery_box_wins_config_id_fkey
  FOREIGN KEY (config_id) REFERENCES public.mystery_box_configs(id) ON DELETE SET NULL;

ALTER TABLE public.mystery_box_wins
  DROP CONSTRAINT IF EXISTS mystery_box_wins_prize_id_fkey;
ALTER TABLE public.mystery_box_wins
  ADD CONSTRAINT mystery_box_wins_prize_id_fkey
  FOREIGN KEY (prize_id) REFERENCES public.mystery_box_prizes(id) ON DELETE SET NULL;

-- Deleting a winner should not be blocked by draw logs.
ALTER TABLE public.draw_logs
  DROP CONSTRAINT IF EXISTS draw_logs_winner_id_fkey;
ALTER TABLE public.draw_logs
  ADD CONSTRAINT draw_logs_winner_id_fkey
  FOREIGN KEY (winner_id) REFERENCES public.winners(id) ON DELETE SET NULL;

-- Deleting users/admins should not be blocked by audit/approval/notification rows.
ALTER TABLE public.draw_logs
  DROP CONSTRAINT IF EXISTS draw_logs_executed_by_fkey;
ALTER TABLE public.draw_logs
  ADD CONSTRAINT draw_logs_executed_by_fkey
  FOREIGN KEY (executed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.lucky_hours
  DROP CONSTRAINT IF EXISTS lucky_hours_approved_by_fkey;
ALTER TABLE public.lucky_hours
  ADD CONSTRAINT lucky_hours_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.push_notifications
  DROP CONSTRAINT IF EXISTS push_notifications_sent_by_fkey;
ALTER TABLE public.push_notifications
  ADD CONSTRAINT push_notifications_sent_by_fkey
  FOREIGN KEY (sent_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.push_notifications
  DROP CONSTRAINT IF EXISTS push_notifications_target_user_id_fkey;
ALTER TABLE public.push_notifications
  ADD CONSTRAINT push_notifications_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- User-owned admin settings should be removed with the profile.
ALTER TABLE public.admin_features_config
  DROP CONSTRAINT IF EXISTS admin_features_config_user_id_fkey;
ALTER TABLE public.admin_features_config
  ADD CONSTRAINT admin_features_config_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Remove old duplicate NO ACTION profile constraints; cascade constraints already exist with *_profiles_fkey names.
ALTER TABLE public.mystery_box_wins
  DROP CONSTRAINT IF EXISTS mystery_box_wins_user_id_fkey;

ALTER TABLE public.roulette_spins
  DROP CONSTRAINT IF EXISTS roulette_spins_user_id_fkey;

-- Deleting coupons or affiliates should not be blocked by historical orders.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_coupon_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_coupon_id_fkey
  FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_affiliate_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_affiliate_id_fkey
  FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE SET NULL;