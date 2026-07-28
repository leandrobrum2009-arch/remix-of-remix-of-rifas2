import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentTenantId } from "@/lib/tenant";

/**
 * Apply the current tenant filter to any Supabase query builder.
 * No-op when the tenant id is not yet resolved so the very first
 * render doesn't crash — RLS (Fase 7) is the hard security boundary.
 */
const scopeTenant = <T,>(q: T): T => {
  const tid = getCurrentTenantId();
  return tid ? ((q as any).eq("tenant_id", tid) as T) : q;
};

export interface PriceBundle {
  quantity: number;
  price: number;
  label?: string;
  is_popular?: boolean;
}

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  status: string;
  ltp_code: string | null;
  urgency_tag: string | null;
  draw_date: string | null;
  price_bundles: PriceBundle[] | null;
  min_tickets: number;
  max_tickets: number;
  mystery_box_enabled: boolean;
  roulette_enabled: boolean;
  ranking_enabled: boolean;
  roulette_spin_cost: number;
  roulette_free_tickets: number;
  roulette_multiplier_max: number;
  featured: boolean;
  gallery_urls?: string[];
  video_url?: string;
  hero_image_url?: string | null;
  regulations?: string;
  auto_numbers?: boolean;
  manual_numbers?: boolean;
  lucky_numbers_prizes?: any[];
  federal_lottery_draw?: boolean;
  draw_number?: string;
  concurso?: string;
  payment_methods?: string[];
  sales_goal?: number;
  ticket_generation_type?: 'manual' | 'auto';
  roulette_payout_rate?: number;
  show_instant_prizes?: boolean;
  show_roulette_status?: boolean;
  roulette_rules?: { min_tickets: number; spins: number }[];
  scratch_cards_enabled?: boolean;
  scratch_card_cost?: number;
  scratch_card_rules?: any[];
  main_prizes?: { position: number, prize: string }[];
  sections_order?: string[];
  show_timer?: boolean;
  fake_progress_enabled?: boolean;
  fake_progress_percentage?: number;
  progress_text?: string | null;
  timer_end_date?: string | null;
  created_at: string;
  live_stream_url?: string;
  live_stream_enabled?: boolean;
  mystery_box_available_count?: number;
  roulette_available_count?: number;
  scratch_cards_available_count?: number;
  prize_rules?: any[];
  winners?: Winner[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  order_index: number | null;
  is_active: boolean | null;
}

 export type MysteryBoxRarity = 'common' | 'rare' | 'epic' | 'legendary';
 
 export interface MysteryBoxConfig {
   id: string;
   campaign_id: string;
   name: string;
   rarity: MysteryBoxRarity;
   cost: number;
   image_url: string | null;
   is_active: boolean;
 }
 
 export interface MysteryBoxPrize {
   id: string;
   config_id: string;
   title: string;
   description: string | null;
   prize_type: string;
   prize_value: number | null;
   chance_percent: number;
   image_url: string | null;
   rarity: MysteryBoxRarity;
 }

export interface RoulettePrize {
  id: string;
  campaign_id: string;
  label: string;
  prize_type: 'points' | 'balance' | 'ticket' | 'physical';
  value: number | null;
  chance_percent: number;
  color: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
   created_at: string;
 }

export const useCampaignStats = (campaignId: string) =>
  useQuery({
    queryKey: ["campaign-stats", campaignId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("*", { count: 'estimated', head: true })
        .eq("campaign_id", campaignId)
        .eq("payment_status", "paid");
      
      if (error) throw error;
      
      const { data: uniqueUsers } = await supabase
        .from("orders")
        .select("user_id")
        .eq("campaign_id", campaignId)
        .eq("payment_status", "paid")
        .limit(5000);
        
      const uniqueCount = new Set(uniqueUsers?.map(o => o.user_id)).size;

      return {
        ordersCount: count || 0,
        participantsCount: uniqueCount || 0
      };
    },
    enabled: !!campaignId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

 export interface Winner {
   id: string;
   campaign_id: string;
   winner_name: string;
   ticket_number: string;
   prize_description: string;
   phone_masked: string | null;
   video_url: string | null;
   avatar_url?: string | null;
   draw_date: string;
    campaigns?: { title: string } | null;
    winner_type?: 'raffle' | 'roulette' | 'scratchcard' | 'lucky_number';
    prize_index?: number;
  }
 
 export interface WalletTransaction {
   id: string;
   user_id: string;
   type: 'deposit' | 'withdrawal' | 'referral_bonus' | 'cashback' | 'prize_win';
   amount: number;
   status: 'pending' | 'completed' | 'rejected' | 'cancelled';
   pix_key: string | null;
   description: string | null;
   created_at: string;
 }
 
 export interface UserAchievement {
   id: string;
   user_id: string;
   achievement_key: string;
   title: string;
   description: string | null;
   icon: string | null;
    points_reward: number;
    created_at: string;
  }
  
  export interface UserReward {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    points_cost: number;
    status: 'pending' | 'claimed' | 'cancelled';
    created_at: string;
  }

export interface RouletteSpin {
  id: string;
  user_id: string;
  campaign_id: string;
  prize_label: string;
  prize_type: string;
  prize_value: number | null;
  created_at: string;
  winner_name?: string;
  avatar_url?: string | null;
  profiles?: { name: string; avatar_url: string | null } | null;
  campaigns?: { title: string } | null;
}

export interface ScratchCardPrize {
  id: string;
  campaign_id?: string;
  label: string;
  prize_type: string;
  value: number;
  chance_percent: number;
  image_url?: string;
}

export interface ScratchCardScratch {
  id: string;
  user_id: string;
  campaign_id?: string;
  prize_label: string;
  prize_type: string;
  prize_value: number | null;
  is_winner: boolean;
  created_at: string;
  winner_name?: string;
  avatar_url?: string | null;
  profiles?: { name: string; avatar_url: string | null } | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  published_at: string;
}
 
 export interface LuckyHour {
   id: string;
   campaign_id: string;
   title: string;
   prize_description: string;
   draw_time: string;
   draw_type: 'hourly' | 'greater_smaller';
   rule_id?: string;
   winner_name: string | null;
   winning_number: string | null;
   status: 'scheduled' | 'completed';
   audit_log?: any[];
   is_approved?: boolean;
   approved_by?: string;
   approved_at?: string;
   draft_winner_name?: string;
   draft_winning_number?: string;
   created_at: string;
   updated_at: string;
 }

export const useCampaigns = () =>
  useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await scopeTenant(
        supabase.from("campaigns").select("*, winners(*)"),
      ).order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) as Campaign[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

export const useActiveBanners = () => {
  return useQuery({
    queryKey: ["active-banners"],
    queryFn: async () => {
      const { data, error } = await scopeTenant(
        (supabase as any)
          .from("banners")
          .select("id, title, subtitle, image_url, link_url, order_index, is_active")
          .eq("is_active", true),
      ).order("order_index", { ascending: true });
      if (error) throw error;
      return (data as any) as Banner[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCampaignRanking = (campaignId: string, limit = 10) =>
  useQuery({
    queryKey: ["campaign-ranking", campaignId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('user_id, quantity, profiles(name, avatar_url)')
        .eq('campaign_id', campaignId)
        .eq('payment_status', 'paid')
        .limit(2000);
      
      if (error) throw error;

      const grouped = data.reduce((acc: any, curr: any) => {
        const userId = curr.user_id;
        if (!acc[userId]) {
          acc[userId] = {
            name: curr.profiles?.name || 'Usuário',
            avatar_url: curr.profiles?.avatar_url,
            total_tickets: 0
          };
        }
        acc[userId].total_tickets += curr.quantity;
        return acc;
      }, {});

      return Object.values(grouped).sort((a: any, b: any) => b.total_tickets - a.total_tickets).slice(0, limit);
    },
    enabled: !!campaignId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

export const useCampaignLuckyWinners = (campaignId: string) =>
  useQuery({
    queryKey: ["campaign-lucky-winners", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("winners")
        .select("ticket_number, winner_name, avatar_url, draw_date, prize_description")
        .eq("campaign_id", campaignId)
        .eq("winner_type", "lucky_number");
      
      if (error) throw error;
      return (data as any[]).map((w) => ({
        number: w.ticket_number,
        profiles: { name: w.winner_name, avatar_url: w.avatar_url },
        created_at: w.draw_date,
        prize_label: w.prize_description,
        prize_title: w.prize_description,
      }));
    },
    enabled: !!campaignId,
  });

export const useCampaignTicketStats = (campaignId: string) =>
  useQuery({
    queryKey: ["campaign-ticket-stats", campaignId],
    queryFn: async () => {
      // Fetch the campaign to see if there are active ranking prizes with time filters
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('ranking_prizes')
        .eq('id', campaignId)
        .single();

      const rankingPrizes = (campaign?.ranking_prizes as any[]) || [];
      const activePrize = rankingPrizes.find(p => p.active);

      let query = supabase
        .from('tickets')
        .select('number, status, profiles!user_id(name)')
        .eq('campaign_id', campaignId)
        .in('status', ['confirmed', 'paid']);

      // Apply date filter if an active prize exists
      if (activePrize && activePrize.start_date && activePrize.end_date) {
        query = query
          .gte('created_at', activePrize.start_date)
          .lte('created_at', activePrize.end_date);
      }

      // Get highest 1 ticket (as requested by user: "São duas pessoas")
      const { data: highest, error: hError } = await query
        .order('number', { ascending: false })
        .limit(1);
      
      if (hError) throw hError;

      // Re-create query for lowest to avoid filter carryover if any
      let lowQuery = supabase
        .from('tickets')
        .select('number, status, profiles!user_id(name)')
        .eq('campaign_id', campaignId)
        .in('status', ['confirmed', 'paid']);

      if (activePrize && activePrize.start_date && activePrize.end_date) {
        lowQuery = lowQuery
          .gte('created_at', activePrize.start_date)
          .lte('created_at', activePrize.end_date);
      }

      const { data: lowest, error: lError } = await lowQuery
        .order('number', { ascending: true })
        .limit(1);
      
      if (lError) throw lError;
      
      return {
        highestTickets: highest || [],
        lowestTickets: lowest || [],
        activePrize: activePrize || null
      };
    },
    enabled: !!campaignId
  });


export const useCampaign = (idOrSlug: string) =>
  useQuery({
    queryKey: ["campaign", idOrSlug],
    queryFn: async () => {
      // Try to fetch by ID first, then by slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      
      let query = supabase.from("campaigns").select("*, winners(*)");
      
      if (isUuid) {
        query = query.eq("id", idOrSlug);
      } else {
        query = query.eq("slug", idOrSlug);
      }

      let { data, error } = await query.maybeSingle();
      
      // Fallback: if not found by primary method, try the other one
      if (!data && !error && idOrSlug) {
        if (isUuid) {
          // If it looked like a UUID but wasn't found as ID, try as slug
          const slugQuery = supabase.from("campaigns").select("*, winners(*)").eq("slug", idOrSlug);
          const fallback = await slugQuery.maybeSingle();
          data = fallback.data;
          error = fallback.error;
        } else {
          // If it didn't look like a UUID but wasn't found as slug, 
          // double check if it actually IS a UUID and try as ID
          const isActuallyUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
          if (isActuallyUuid) {
            const idQuery = supabase.from("campaigns").select("*, winners(*)").eq("id", idOrSlug);
            const fallback = await idQuery.maybeSingle();
            data = fallback.data;
            error = fallback.error;
          }
        }
      }
      
      if (error) throw error;
      return (data as any) as Campaign | null;
    },
    enabled: !!idOrSlug,
  });

export const useWinners = () =>
  useQuery({
    queryKey: ["winners"],
    queryFn: async () => {
      const { data, error } = await scopeTenant(
        supabase.from("winners").select("*, campaigns(title)"),
      )
        .order("draw_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Winner[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export const useUserTickets = (userId: string, campaignId: string) =>
  useQuery({
    queryKey: ["user-tickets", userId, campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('number, status')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .in('status', ['confirmed', 'paid'])
        .order('number', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!campaignId,
  });

export const useAnnouncements = () =>
  useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await scopeTenant(
        supabase.from("announcements").select("*"),
      ).order("published_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });

 export const useMysteryBoxConfigs = (campaignId: string) =>
   useQuery({
     queryKey: ["mystery_box_configs", campaignId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("mystery_box_configs")
         .select("*")
         .eq("campaign_id", campaignId)
         .eq("is_active", true)
         .order("cost", { ascending: true });
       if (error) throw error;
       return data as MysteryBoxConfig[];
     },
     enabled: !!campaignId,
   });
 
 export const useMysteryBoxPrizes = (configId: string) =>
   useQuery({
     queryKey: ["mystery_box_prizes", configId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("mystery_box_prizes")
         .select("*")
         .eq("config_id", configId);
       if (error) throw error;
       return data as MysteryBoxPrize[];
     },
     enabled: !!configId,
   });

export const useRoulettePrizes = (campaignId: string) =>
  useQuery({
    queryKey: ["roulette_prizes", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roulette_prizes")
        .select("*")
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return data as RoulettePrize[];
    },
    enabled: !!campaignId,
  });

export const useLuckyHours = (campaignId: string) =>
  useQuery({
    queryKey: ["lucky_hours", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lucky_hours_public" as any)
        .select("*")
        .eq("campaign_id", campaignId)
        .order("draw_time", { ascending: true });
      if (error) throw error;
      return data as unknown as LuckyHour[];
    },
    enabled: !!campaignId,
  });

export interface MysteryBoxWin {
  id: string;
  user_id: string;
  box_id: string;
  prize_title: string;
  prize_value: number | null;
  created_at: string;
  profiles?: { name: string; avatar_url: string | null } | null;
}

export const useMysteryBoxWins = (limit = 5) =>
  useQuery({
    queryKey: ["mystery_box_wins", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mystery_box_wins_public" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data as any[]) || []).map((w) => ({
        ...w,
        profiles: { name: w.winner_name || "Ganhador", avatar_url: w.avatar_url || null },
      })) as MysteryBoxWin[];
    },
  });

export const useCampaignMysteryBoxWins = (campaignId: string, limit = 10) =>
  useQuery({
    queryKey: ["campaign-mystery-box-wins", campaignId, limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_campaign_mystery_box_wins", {
        p_campaign_id: campaignId,
        p_limit: limit,
      });
      if (error) throw error;
      return ((data || []) as any[]).map((w) => ({
        ...w,
        profiles: { name: w.winner_name || "Ganhador", avatar_url: w.avatar_url || null },
      })) as MysteryBoxWin[];
    },
    enabled: !!campaignId,
  });

export const useCampaignRouletteSpins = (campaignId: string, limit = 10) =>
  useQuery({
    queryKey: ["campaign-roulette-spins", campaignId, limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_campaign_roulette_wins", {
        p_campaign_id: campaignId,
        p_limit: limit,
      });
      if (error) throw error;
       return ((data || []) as any[]).map((s) => ({
         ...s,
         profiles: { name: s.winner_name || "Ganhador", avatar_url: s.avatar_url || null },
       })) as RouletteSpin[];
     },
     enabled: !!campaignId,
   });

export const useGlobalRouletteSpins = (limit = 20) =>
  useQuery({
    queryKey: ["global-roulette-spins", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roulette_spins_public" as any)
        .select("*, campaigns(title)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data as any[]) || []).map((s) => ({
        ...s,
        profiles: { name: s.winner_name || "Ganhador", avatar_url: s.avatar_url || null },
      })) as (RouletteSpin & { campaigns: { title: string } })[];
    },
  });

export const useScratchCardPrizes = (campaignId?: string) =>
  useQuery({
    queryKey: ["scratch_card_prizes", campaignId],
    queryFn: async () => {
      let query = supabase
        .from("scratch_card_prizes")
        .select("*")
        .eq("is_active", true);
      
      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      } else {
        query = query.is("campaign_id", null);
      }
      
      const { data, error } = await query.order("created_at", { ascending: true });
        
      if (error) throw error;
      return data as ScratchCardPrize[];
    },
  });

export const useGlobalScratchCardScratches = (limit = 20) =>
  useQuery({
    queryKey: ["global-scratch-card-scratches", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scratch_card_scratches_public" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data as any[]) || []).map((s) => ({
        ...s,
        profiles: { name: s.winner_name || "Ganhador", avatar_url: s.avatar_url || null },
      })) as ScratchCardScratch[];
    },
  });

export const useUserCampaignSpins = (userId: string, campaignId: string) =>
  useQuery({
    queryKey: ["user-campaign-spins", userId, campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roulette_spins")
        .select("*")
        .eq("user_id", userId)
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!campaignId,
  });

export const useCampaignScratchWins = (campaignId: string, limit = 100) =>
  useQuery({
    queryKey: ["campaign-scratch-wins", campaignId, limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_campaign_scratch_wins", {
        p_campaign_id: campaignId,
        p_limit: limit,
      });
      if (error) throw error;
      return ((data || []) as any[]).map((s) => ({
        ...s,
        is_winner: true,
        profiles: { name: s.winner_name || "Ganhador", avatar_url: s.avatar_url || null },
      })) as ScratchCardScratch[];
    },
    enabled: !!campaignId,
  });

export const useUserCampaignScratches = (userId: string, campaignId: string) =>
  useQuery({
    queryKey: ["user-campaign-scratches", userId, campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scratch_card_scratches")
        .select("*")
        .eq("user_id", userId)
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!campaignId,
  });

export const useUserNotifications = (userId: string) =>
  useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId,
  });

export const markNotificationsAsRead = async (userId: string) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
  return true;
};

export const useUserReferrals = (referralCode: string) =>
  useQuery({
    queryKey: ["referrals", referralCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, created_at, avatar_url")
        .eq("referred_by_code", referralCode)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!referralCode,
  });

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
  orders?: { 
    campaigns: { title: string }
  };
}

export const useAffiliateCommissions = (affiliateId: string) =>
  useQuery({
    queryKey: ["affiliate-commissions", affiliateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("*, orders!order_id(campaigns(title))")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AffiliateCommission[];
    },
    enabled: !!affiliateId,
  });

export interface Ticket {
  id: string;
  order_id: string;
  campaign_id: string;
  user_id: string;
  number: string;
  status: string;
  is_lucky: boolean;
  reservation_expires_at: string | null;
  created_at: string;
}

export const useTickets = (campaignId: string, enabled = true) =>
  useQuery({
    queryKey: ["tickets", campaignId, enabled],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets_public" as any)
        .select("*")
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return data as unknown as Ticket[];
    },
    enabled: !!campaignId && enabled,
  });

export const useRouletteSpins = (limit = 10) =>
  useQuery({
    queryKey: ["roulette_spins", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roulette_spins_public" as any)
        .select("*, campaigns(title)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data as any[]) || []).map((s) => ({
        ...s,
        profiles: { name: s.winner_name || "Ganhador", avatar_url: s.avatar_url || null },
      })) as RouletteSpin[];
    },
  });

export const useRanking = (limit = 10, category: 'points' | 'xp' = 'points') =>
  useQuery({
    queryKey: ["ranking", category, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url, points, xp, vip_level")
        .order(category, { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
 
export const useUserOrders = (userId: string) => {
  return useQuery({
    queryKey: ["user-orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *, 
          campaigns(
            title, 
            image_url, 
            ticket_generation_type, 
            draw_number,
            status
          ), 
          tickets(*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};
 
 export const useUserSpins = (userId: string) => {
   return useQuery({
     queryKey: ["user-spins", userId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("roulette_spins")
         .select("*, campaigns(title)")
         .eq("user_id", userId)
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
     enabled: !!userId,
   });
 };
 
   export const useUserMysteryBoxWins = (userId: string) => {
     return useQuery({
       queryKey: ["user-mystery-box-wins", userId],
       queryFn: async () => {
         const { data, error } = await supabase
           .from("mystery_box_wins")
           .select("*")
           .eq("user_id", userId)
           .order("created_at", { ascending: false });
         if (error) throw error;
         return data;
       },
       enabled: !!userId,
     });
   };
   
   export const useUserWalletTransactions = (userId: string) => {
     return useQuery({
       queryKey: ["user-wallet-transactions", userId],
       queryFn: async () => {
         const { data, error } = await supabase
           .from("wallet_transactions")
           .select("*")
           .eq("user_id", userId)
           .order("created_at", { ascending: false });
         if (error) throw error;
         return data as WalletTransaction[];
       },
       enabled: !!userId,
     });
   };
   
   export const useUserAchievements = (userId: string) => {
     return useQuery({
       queryKey: ["user-achievements", userId],
       queryFn: async () => {
         const { data, error } = await supabase
           .from("user_achievements")
           .select("*")
           .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as UserAchievement[];
      },
      enabled: !!userId,
    });
  };
  
  export const useUserRewards = (userId: string) => {
    return useQuery({
      queryKey: ["user-rewards", userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("user_rewards")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as UserReward[];
      },
      enabled: !!userId,
    });
  };

export const useSiteSettings = () =>
  useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const hostname =
        typeof window !== "undefined" ? window.location.hostname : "";

      // 1) Base site_settings (legacy global table).
      const { data: baseRows, error: baseErr } = await supabase
        .from("site_settings")
        .select("key, value");
      if (baseErr) throw baseErr;

      const settingsMap: Record<string, string> = {};
      (baseRows ?? []).forEach((s: any) => {
        settingsMap[s.key] = s.value;
      });

      // 2) Overlay tenant_settings for the current hostname (white-label).
      // Resolved by domain match; falls back to the `default` tenant so the
      // legacy global settings remain the source of truth until tenants
      // are configured per client.
      try {
        let tenantId: string | null = null;
        if (hostname) {
          const { data: dom } = await supabase
            .from("tenant_domains")
            .select("tenant_id")
            .ilike("domain", hostname)
            .maybeSingle();
          tenantId = (dom as any)?.tenant_id ?? null;
        }
        if (!tenantId) {
          const { data: def } = await supabase
            .from("tenants")
            .select("id")
            .eq("slug", "default")
            .maybeSingle();
          tenantId = (def as any)?.id ?? null;
        }
        if (tenantId) {
          const { data: tRows } = await supabase
            .from("tenant_settings")
            .select("key, value")
            .eq("tenant_id", tenantId);
          (tRows ?? []).forEach((s: any) => {
            if (s?.value !== null && s?.value !== undefined && s.value !== "") {
              settingsMap[s.key] = s.value;
            }
          });
          settingsMap.__tenant_id = tenantId;
        }
      } catch (e) {
        // Non-fatal: tenant overlay is opportunistic while Fase 5+ rolls out.
        console.warn("[useSiteSettings] tenant overlay failed", e);
      }

      return settingsMap;
    },
    staleTime: 1000 * 30, // 30s — settings change from admin and must reflect quickly
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

export const useGlobalStats = () =>
  useQuery({
    queryKey: ["global-stats"],
    queryFn: async () => {
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: 'estimated', head: true });
        
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: 'estimated', head: true });
        
      const { data: recentActive } = await supabase
        .from("orders")
        .select("user_id")
        .gt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .limit(500);
        
      const activeCount = new Set(recentActive?.map(o => o.user_id)).size;
      
      return {
        totalUsers: usersCount || 0,
        totalOrders: ordersCount || 0,
        onlineUsers: Math.max(activeCount, Math.floor((usersCount || 0) * 0.2) + 1) // At least 20% or 1
      };
    },
    refetchInterval: 5 * 60_000, // Refresh every 5min
    staleTime: 4 * 60_000,
    refetchOnWindowFocus: false,
  });

// User prizes grouped by campaign — for the "Meus Prêmios" panel.
export const useUserPrizesByCampaign = (userId: string) =>
  useQuery({
    queryKey: ["user-prizes-by-campaign", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [ordersRes, spinsRes, scratchesRes, boxWinsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, campaign_id, payment_status, created_at, campaigns(id, title, slug, image_url, draw_number, status, draw_date), tickets(number, is_lucky)")
          .eq("user_id", userId)
          .eq("payment_status", "paid"),
        supabase
          .from("roulette_spins")
          .select("id, campaign_id, prize_label, prize_value, prize_type, created_at, campaigns(id, title, slug, image_url)")
          .eq("user_id", userId)
          .not("prize_label", "is", null)
          .neq("prize_type", "none"),
        supabase
          .from("scratch_card_scratches")
          .select("id, campaign_id, prize_label, prize_value, prize_type, created_at, is_winner, campaigns(id, title, slug, image_url)")
          .eq("user_id", userId)
          .eq("is_winner", true),
        supabase
          .from("mystery_box_wins")
          .select("id, prize_title, prize_value, created_at, mystery_box_configs!config_id(campaign_id, name, campaigns(id, title, slug, image_url))")
          .eq("user_id", userId),
      ]);

      const map: Record<string, any> = {};
      const touch = (camp: any) => {
        if (!camp?.id) return null;
        if (!map[camp.id]) {
          map[camp.id] = {
            campaign: camp,
            mainPrize: null as any,
            spins: [] as any[],
            scratches: [] as any[],
            boxes: [] as any[],
            total: 0,
          };
        }
        return map[camp.id];
      };

      (ordersRes.data || []).forEach((o: any) => {
        const bucket = touch(o.campaigns);
        if (!bucket) return;
        const drawNumber = o.campaigns?.draw_number;
        if (drawNumber) {
          const win = (o.tickets || []).find((t: any) => t.number === drawNumber);
          if (win) bucket.mainPrize = { number: drawNumber, draw_date: o.campaigns?.draw_date };
        }
      });
      (spinsRes.data || []).forEach((s: any) => {
        const bucket = touch(s.campaigns);
        if (!bucket) return;
        bucket.spins.push(s);
        bucket.total += Number(s.prize_value || 0);
      });
      (scratchesRes.data || []).forEach((s: any) => {
        const bucket = touch(s.campaigns);
        if (!bucket) return;
        bucket.scratches.push(s);
        bucket.total += Number(s.prize_value || 0);
      });
      (boxWinsRes.data || []).forEach((b: any) => {
        const camp = b.mystery_box_configs?.campaigns;
        const bucket = touch(camp);
        if (!bucket) return;
        bucket.boxes.push({ ...b, box_name: b.mystery_box_configs?.name });
        bucket.total += Number(b.prize_value || 0);
      });

      return Object.values(map).sort((a: any, b: any) => b.total - a.total);
    },
  });
