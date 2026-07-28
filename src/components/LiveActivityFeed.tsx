 import { useEffect, useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { Trophy, Zap, Clock, Users, Gift, Gamepad2 } from "lucide-react";
 import { useRouletteSpins, useMysteryBoxWins, RouletteSpin, MysteryBoxWin, useGlobalStats } from "@/hooks/useData";
 import { supabase } from "@/integrations/supabase/client";
 import { useQueryClient } from "@tanstack/react-query";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { Badge } from "@/components/ui/badge";
 import { formatDistanceToNow } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 type Activity = (RouletteSpin | MysteryBoxWin) & { type: 'roulette' | 'box' };
 
 const LiveActivityFeed = () => {
   const { data: rouletteSpins } = useRouletteSpins(5);
   const { data: boxWins } = useMysteryBoxWins(5);
   const [activities, setActivities] = useState<Activity[]>([]);
  const { data: stats } = useGlobalStats();
  const queryClient = useQueryClient();
 
   useEffect(() => {
     const combined: Activity[] = [
       ...(rouletteSpins?.map(s => ({ ...s, type: 'roulette' as const })) || []),
       ...(boxWins?.map(w => ({ ...w, type: 'box' as const })) || [])
     ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, 6);
     
     setActivities(combined);
   }, [rouletteSpins, boxWins]);
 
   useEffect(() => {
     const channel = supabase
       .channel("live-activity")
       .on(
         "postgres_changes",
         { event: "INSERT", schema: "public", table: "roulette_spins" },
         () => queryClient.invalidateQueries({ queryKey: ["roulette_spins"] })
       )
       .on(
         "postgres_changes",
         { event: "INSERT", schema: "public", table: "mystery_box_wins" },
         () => queryClient.invalidateQueries({ queryKey: ["mystery_box_wins"] })
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [queryClient]);
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <h3 className="text-sm font-black uppercase tracking-widest italic text-foreground">Atividade em <span className="text-primary">Tempo Real</span></h3>
         </div>
          <Badge variant="outline" className="text-[8px] border-primary/30 text-primary uppercase gap-1">
            <Users className="h-2 w-2" /> {stats?.onlineUsers || 1} Online
          </Badge>
       </div>
 
      <div className="flex flex-col md:grid gap-3 overflow-x-auto md:overflow-visible no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
         <div className="flex md:flex-col gap-3 min-w-max md:min-w-0">
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                  className="relative overflow-hidden flex items-center gap-3 p-3 rounded-2xl bg-secondary/50 border border-border group hover:border-primary/30 transition-all w-[240px] md:w-full will-change-transform"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-primary/20 shrink-0">
                  <AvatarImage src={activity.profiles?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px] md:text-sm">
                    {activity.profiles?.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] md:text-[11px] font-black uppercase tracking-tight truncate text-foreground">
                      {activity.profiles?.name || "Usuário"}
                    </p>
                    <span className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1 shrink-0">
                      <Clock className="h-2 w-2" /> {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate italic">
                    {activity.type === 'roulette' ? 'Ganhou ' : 'Abriu a caixa e ganhou '}
                    <span className={activity.type === 'roulette' ? "text-primary font-bold not-italic" : "text-amber-500 font-bold not-italic"}>
                      {activity.type === 'roulette' ? (activity as RouletteSpin).prize_label : (activity as MysteryBoxWin).prize_title}
                    </span>
                  </p>
                </div>

                <div className={`flex items-center justify-center h-7 w-7 md:h-8 md:w-8 rounded-full shrink-0 ${activity.type === 'roulette' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'}`}>
                  {activity.type === 'roulette' ? <Gamepad2 className="h-3 w-3 md:h-4 md:w-4" /> : <Gift className="h-3 w-3 md:h-4 md:w-4" />}
                </div>
              </motion.div>
            ))}
        </div>
      </div>
     </div>
   );
 };
 
 export default LiveActivityFeed;