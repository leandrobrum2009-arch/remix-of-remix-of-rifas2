import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useRole = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (error) throw error;
      const roles = data?.map(r => r.role?.toLowerCase()) || [];
      const rolePriority = ['master', 'client_admin', 'admin'];
      const role = rolePriority.find(p => roles.includes(p)) || 'user';
      return role as string;
    },
    enabled: !!user,
  });
};

export const useIsMaster = () => {
  const { data: role } = useRole();
  return role === "master";
};

export const useIsAdmin = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      // Check user_roles table directly for any administrative role
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching user roles:", error);
        return false;
      }
      
      const roles = rolesData?.map(r => r.role) || [];
      const isAdmin = roles.some(role => ["admin", "master", "client_admin"].includes(role));
      
      return isAdmin;
    },
    enabled: !!user,
  });
};

export const useFeatureAccess = () => {
  const { user } = useAuth();
  const { data: role } = useRole();
  
  return useQuery({
    queryKey: ["feature-access", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Master has access to everything
      if (role === "master") {
        return {
          scratch_cards_enabled: true,
          lucky_numbers_enabled: true,
          roulette_enabled: true,
          page_editing_enabled: true,
          sales_page_models_enabled: true,
          campaigns_management_enabled: true,
          orders_management_enabled: true,
          users_management_enabled: true,
          affiliates_management_enabled: true,
          settings_management_enabled: true
        };
      }

      const { data, error } = await supabase
        .from("admin_features_config")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      
      // Default values
      return data || {
        scratch_cards_enabled: true,
        lucky_numbers_enabled: true,
        roulette_enabled: true,
        page_editing_enabled: true,
        sales_page_models_enabled: true,
        campaigns_management_enabled: true,
        orders_management_enabled: true,
        users_management_enabled: true,
        affiliates_management_enabled: true,
        settings_management_enabled: false
      };
    },
    enabled: !!user && !!role,
  });
};

export const useAdminCampaigns = () =>
  useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, winners(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
       return data;
     },
   });
 
 export const useAdminUsers = () => {
   const { data: role } = useRole();
   return useQuery({
     queryKey: ["admin-users", role],
     queryFn: async () => {
       const { data: profiles, error } = await supabase
         .from("profiles")
         .select("*")
         .order("created_at", { ascending: false });
      if (error) {
        console.error("[useAdminUsers] profiles error:", error);
        throw new Error(
          `Falha ao listar profiles: ${error.message}` +
          (error.details ? ` | detalhes: ${error.details}` : "") +
          (error.hint ? ` | hint: ${error.hint}` : "") +
          (error.code ? ` | code: ${error.code}` : "")
        );
      }

      // Fetch roles and feature configs — surface errors instead of silently ignoring
      const { data: userRoles, error: rolesError } = await supabase.from("user_roles").select("*");
      if (rolesError) {
        console.error("[useAdminUsers] user_roles error:", rolesError);
        throw new Error(`Falha ao listar user_roles: ${rolesError.message}${rolesError.hint ? ` | hint: ${rolesError.hint}` : ""}`);
      }
      const { data: featureConfigs, error: featuresError } = await supabase.from("admin_features_config").select("*");
      if (featuresError) {
        console.error("[useAdminUsers] admin_features_config error:", featuresError);
        throw new Error(`Falha ao listar admin_features_config: ${featuresError.message}${featuresError.hint ? ` | hint: ${featuresError.hint}` : ""}`);
      }
       
        let results = profiles.map(profile => {
          const matchingRoles = userRoles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
          const userRole = (['master', 'client_admin', 'admin', 'moderator'] as any[]).find(p => matchingRoles.includes(p)) || 'user';
          return {
            ...profile,
            role: userRole as any,
            features: featureConfigs?.find(f => f.user_id === profile.user_id) || null
          };
        });

        // Filter users based on role
        if (role === 'client_admin') {
          // Client admin only sees regular users
          results = results.filter(u => !u.role || u.role === 'user');
        } else if (role === 'admin') {
          // Admin sees everything except masters
          results = results.filter(u => u.role !== "master");
        } else if (role !== "master") {
          // Any other role (if somehow here) also shouldn't see masters
          results = results.filter(u => u.role !== "master");
        }
       
       return results;
     },
     enabled: !!role,
   });
 };
 
 export const useAdminAffiliates = () => {
   const { data: userRole } = useRole();
   return useQuery({
     queryKey: ["admin-affiliates", userRole],
     queryFn: async () => {
       const { data: affiliates, error } = await supabase
         .from("affiliates")
         .select("*, profiles(name, email)")
         .order("created_at", { ascending: false });
       if (error) throw error;

       // Fetch roles to filter if necessary
       const { data: userRoles } = await supabase.from("user_roles").select("*");
       
       let results = affiliates.map(affiliate => ({
         ...affiliate,
         role: userRoles?.find(r => r.user_id === affiliate.user_id)?.role || "user"
       }));

       // Filter based on requester's role
       if (userRole === 'client_admin') {
         // Client admin shouldn't see admins or masters
         results = results.filter(a => a.role === 'user');
       } else if (userRole === 'admin') {
         // Admin shouldn't see masters
         results = results.filter(a => a.role !== 'master');
       }

       return results;
     },
    });
 };
 
 export const useUpdateAffiliate = () => {
   const queryClient = useQueryClient();
   return useMutation({
     mutationFn: async ({ id, ...data }: { id: string; commission_rate?: number; type?: string; is_active?: boolean }) => {
       const { error } = await supabase
         .from("affiliates")
         .update(data)
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
       toast.success("Afiliado atualizado com sucesso!");
     },
     onError: (error: any) => {
       toast.error("Erro ao atualizar afiliado: " + error.message);
     },
   });
 };

 export const useCreateAffiliate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { user_id: string; commission_rate: number; type: string; referral_code: string }) => {
      const { error } = await supabase
        .from("affiliates")
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success("Afiliado criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar afiliado: " + error.message);
    },
  });
};
 
 export const useAdminRoulette = () =>
   useQuery({
     queryKey: ["admin-roulette-prizes"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("roulette_prizes")
         .select("*")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
 export const useAdminMysteryBoxes = () =>
   useQuery({
     queryKey: ["admin-mystery-boxes"],
     queryFn: async () => {
       const { data, error } = await supabase
        .from("mystery_box_configs")
        .select("*, campaigns(id, title)")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
  });
 
 export const useAdminScratchCards = () =>
   useQuery({
     queryKey: ["admin-scratch-card-prizes"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("scratch_card_prizes")
         .select("*")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
 export const useAdminScratchCardStats = () =>
   useQuery({
     queryKey: ["admin-scratch-card-stats"],
     queryFn: async () => {
       const { data: scratches, error } = await supabase
         .from("scratch_card_scratches")
         .select("*");
 
       if (error) throw error;
 
       const totalScratches = scratches.length;
       const totalPrizesValue = scratches.reduce((acc, scratch) => acc + (Number(scratch.prize_value) || 0), 0);
       const winnersCount = scratches.filter(scratch => scratch.is_winner).length;
       const losersCount = totalScratches - winnersCount;
 
       return {
         totalScratches,
         totalPrizesValue,
         winnersCount,
         losersCount
       };
     },
   });
 
 export const useAdminCoupons = () =>
   useQuery({
     queryKey: ["admin-coupons"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("coupons")
         .select("*")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
 export const useAdminBanners = () =>
   useQuery({
     queryKey: ["admin-banners"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("banners")
         .select("*")
         .order("order_index", { ascending: true });
       if (error) throw error;
       return data;
     },
   });
 
 export const useAdminNotifications = () =>
   useQuery({
     queryKey: ["admin-notifications"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("push_notifications")
         .select("*")
         .order("sent_at", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
 export const useUpdateOrderStatus = () => {
   const queryClient = useQueryClient();
   return useMutation({
     mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
       const { error } = await supabase
         .from("orders")
         .update({ payment_status: status })
         .eq("id", orderId);
       if (error) throw error;
     },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
        toast.success("Status do pedido atualizado!");
      },
     onError: (error: any) => {
       toast.error("Erro ao atualizar pedido: " + error.message);
     },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      toast.success("Pedido excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir pedido: " + error.message);
    },
  });
};

export const useAdminOrders = () =>
  useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, campaigns(title), profiles!user_id(name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useAdminRouletteStats = () =>
  useQuery({
    queryKey: ["admin-roulette-stats"],
    queryFn: async () => {
      const { data: spins, error } = await supabase
        .from("roulette_spins")
        .select("*");

      if (error) throw error;

      const totalSpins = spins.length;
      const totalPrizesValue = spins.reduce((acc, spin) => acc + (Number(spin.prize_value) || 0), 0);
      const freeSpinsCount = spins.filter(spin => (spin as any).is_free).length;
      const paidSpinsCount = totalSpins - freeSpinsCount;

      // Get campaigns to calculate spin cost revenue
      const { data: campaigns } = await supabase.from("campaigns").select("id, roulette_spin_cost");
      
      let estimatedRevenue = 0;
      spins.forEach(spin => {
        if (!(spin as any).is_free) {
          const campaign = campaigns?.find(c => c.id === spin.campaign_id);
          if (campaign && campaign.roulette_spin_cost) {
            // This is an estimate as we don't store the multiplier at spin time yet in the DB 
            // but we can infer it or we should add multiplier to roulette_spins table
            // For now, let's just sum the prize_value if it's not free as a proxy or just use the spin_cost
            // Actually, we should probably add 'multiplier' and 'cost_paid' to roulette_spins table for accuracy.
            estimatedRevenue += Number(campaign.roulette_spin_cost);
          }
        }
      });

      return {
        totalSpins,
        totalPrizesValue,
        freeSpinsCount,
        paidSpinsCount,
        estimatedRevenue
      };
    },
  });

export const useAdminWinners = () =>
  useQuery({
    queryKey: ["admin-winners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("winners")
        .select("*, campaigns(title, image_url)")
        .order("draw_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useAdminTickets = (campaignId: string, search?: string) =>
  useQuery({
    queryKey: ["admin-tickets", campaignId, search],
    queryFn: async () => {
      if (!campaignId) return [];
      let query = supabase
        .from("tickets")
        .select("*, profiles!user_id(name, phone)")
        .eq("campaign_id", campaignId)
        .in("status", ["confirmed", "paid"]);
      
      if (search) {
        query = query.or(`number.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
