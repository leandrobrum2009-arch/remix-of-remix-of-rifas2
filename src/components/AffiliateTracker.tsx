import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const AffiliateTracker = () => {
  const { search, pathname } = useLocation();

  useEffect(() => {
    const trackClick = async () => {
      const urlParams = new URLSearchParams(search);
      const refCode = urlParams.get("ref");
      
      if (!refCode) return;

      // Store in local storage for later attribution (checkout)
      localStorage.setItem("referred_by", refCode);

      try {
        // Find affiliate by referral code
        const { data: affiliate } = await supabase
          .from("affiliates")
          .select("id")
          .eq("referral_code", refCode)
          .eq("is_active", true)
          .maybeSingle();

        if (affiliate) {
          // Identify campaign if possible from URL
          let campaignId = null;
          if (pathname.includes("/campanha/")) {
            campaignId = pathname.split("/").pop();
          }

          // Record click
          await supabase.from("affiliate_clicks").insert({
            affiliate_id: affiliate.id,
            campaign_id: campaignId && campaignId.length === 36 ? campaignId : null,
            referrer_url: document.referrer,
            user_agent: navigator.userAgent
          });
        }
      } catch (error) {
        console.error("Error tracking affiliate click:", error);
      }
    };

    trackClick();
  }, [search, pathname]);

  return null;
};
