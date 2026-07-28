import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) { setProfile(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          if (payload?.new) setProfile((prev: any) => ({ ...(prev || {}), ...payload.new }));
          else fetchProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchProfile]);

  return { profile, refetch: fetchProfile, setProfile };
}
