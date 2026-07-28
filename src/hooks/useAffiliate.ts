import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAffiliateData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["affiliate-data", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get affiliate profile
      const { data: affiliate, error: affError } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (affError) throw affError;
      if (!affiliate) return { isAffiliate: false };

      // Get commissions grouped by campaign
      const { data: commissions, error: commError } = await supabase
        .from("affiliate_commissions")
        .select("*, campaigns(title)")
        .eq("affiliate_id", affiliate.id);

      if (commError) throw commError;

      // Get total clicks
      const { count: totalClicks } = await supabase
        .from("affiliate_clicks")
        .select("*", { count: 'exact', head: true })
        .eq("affiliate_id", affiliate.id);

      // Get clicks per day (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: clicksHistory } = await supabase
        .from("affiliate_clicks")
        .select("created_at")
        .eq("affiliate_id", affiliate.id)
        .gte("created_at", sevenDaysAgo.toISOString());

      // Get active campaigns for link generation
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title, slug")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      return {
        isAffiliate: true,
        affiliate,
        commissions: commissions || [],
        totalClicks: totalClicks || 0,
        clicksHistory: clicksHistory || [],
        campaigns: campaigns || []
      };
    },
    enabled: !!user,
  });
};
