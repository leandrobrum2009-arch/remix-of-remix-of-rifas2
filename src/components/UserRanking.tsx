import { Trophy, Medal, Star, Crown, Zap, TrendingUp, Users, Calendar, ArrowDownCircle, ArrowUpCircle, Sparkles } from "lucide-react";
import { useRanking } from "@/hooks/useData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserRankingProps {
  users?: any[];
  title?: string;
  stats?: {
    highestTickets: any[];
    lowestTickets: any[];
    userTickets?: any[];
    activePrize?: {
      title: string;
      prize_maior: string;
      prize_menor: string;
      end_date: string;
    } | null;
  } | null;
}

const UserRanking = ({ users, title, stats }: UserRankingProps) => {
  const [category, setCategory] = useState<'points' | 'xp'>('points');
  const { data: globalRanking, isLoading } = useRanking(15, category);

  const ranking = users || (stats ? [] : globalRanking) || [];
  const podium = ranking.slice(0, 3) || [];
  const rest = ranking.slice(3) || [];

  if (isLoading && !users && !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 h-64 mb-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-full w-full rounded-3xl" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {stats?.activePrize && (
        <div className="bg-card border border-border rounded-2xl md:rounded-3xl overflow-hidden shadow-lg">
          <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground italic">Maior e Menor Bilhete</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Resultados instantâneos da campanha</p>
              </div>
            </div>
            <Badge variant="outline" className="rounded-full bg-primary/20 text-primary border-primary/30 text-[10px] font-black h-8 px-4 gap-2">
              <Sparkles className="h-3 w-3 text-primary" /> PROVA SOCIAL
            </Badge>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl w-fit border border-primary/20">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">HOJE</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                A geração de maior e menor bilhete contabiliza compras entre 
                <br />
                <span className="text-foreground font-bold">{new Date().toLocaleDateString('pt-BR')} 00:00:00</span> e <span className="text-foreground font-bold">{new Date().toLocaleDateString('pt-BR')} 23:59:59</span>.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-muted-foreground">Promoção acaba em</span>
                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-bold px-4 py-1 rounded-full text-xs">
                  Sorteio finalizado
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-secondary/30 border border-border/50 rounded-2xl md:rounded-3xl p-8 flex flex-col items-center justify-center space-y-4 text-center group hover:bg-secondary/40 transition-all duration-300">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <ArrowDownCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest">Menor Bilhete</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black uppercase italic tracking-tighter text-foreground">
                    {(Array.isArray(stats.lowestTickets[0]?.profiles) ? stats.lowestTickets[0].profiles[0]?.name : stats.lowestTickets[0]?.profiles?.name) || "AGUARDANDO..."}
                  </h4>
                </div>
                <div className="bg-primary text-black px-8 py-3 rounded-2xl text-3xl font-black italic shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
                  {stats.lowestTickets[0]?.number || "000000"}
                </div>
                <div className="space-y-1">
                  <div className="bg-primary/20 text-primary border border-primary/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                    Comprou: R$ {stats.activePrize.prize_menor || "14,01"}
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
                    {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="bg-secondary/30 border border-border/50 rounded-2xl md:rounded-3xl p-8 flex flex-col items-center justify-center space-y-4 text-center group hover:bg-secondary/40 transition-all duration-300">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <ArrowUpCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest">Maior Bilhete</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black uppercase italic tracking-tighter text-foreground">
                    {(Array.isArray(stats.highestTickets[0]?.profiles) ? stats.highestTickets[0].profiles[0]?.name : stats.highestTickets[0]?.profiles?.name) || "AGUARDANDO..."}
                  </h4>
                </div>
                <div className="bg-primary text-black px-8 py-3 rounded-2xl text-3xl font-black italic shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
                  {stats.highestTickets[0]?.number || "999999"}
                </div>
                <div className="space-y-1">
                  <div className="bg-primary/20 text-primary border border-primary/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                    Comprou: R$ {stats.activePrize.prize_maior || "14,01"}
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
                    {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PodiumPlace = ({ user, rank, category, className }: { user: any, rank: number, category: string, className?: string }) => {
  if (!user) return <div className={cn("flex-1", className)} />;

  const isFirst = rank === 1;
  const isCampaign = category === 'tickets';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.2, type: "spring", stiffness: 100 }}
      className={cn(
        "flex-1 flex flex-col items-center relative",
        isFirst ? "z-10" : "z-0",
        className
      )}
    >
      <div className="relative mb-4 group">
        <div className={cn(
          "absolute inset-0 blur-2xl opacity-40 rounded-full",
          rank === 1 ? "bg-yellow-500" : rank === 2 ? "bg-slate-300" : "bg-amber-700"
        )} />
        
        <div className={cn(
          "relative h-20 w-20 md:h-28 md:w-28 rounded-2xl md:rounded-3xl p-1 bg-gradient-to-tr transition-transform duration-500 group-hover:scale-110",
          rank === 1 ? "from-yellow-400 to-amber-600 rotate-3" : 
          rank === 2 ? "from-slate-300 to-slate-500 -rotate-3" : 
          "from-amber-600 to-amber-900 rotate-6"
        )}>
          <div className="h-full w-full rounded-xl md:rounded-2xl bg-card p-1">
            <Avatar className="h-full w-full rounded-lg md:rounded-xl border-none">
              <AvatarImage src={user.avatar_url || ""} />
              <AvatarFallback className="bg-zinc-800 text-white font-black text-xl">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className={cn(
          "absolute -top-6 left-1/2 -translate-x-1/2 z-20 transition-transform duration-500 group-hover:-translate-y-2",
          rank === 1 ? "scale-125" : "scale-100"
        )}>
          {rank === 1 ? (
            <Crown className="h-10 w-10 text-yellow-400 fill-yellow-400 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
          ) : (
            <div className={cn(
              "h-8 w-8 rounded-full border-2 flex items-center justify-center font-black italic text-sm",
              rank === 2 ? "bg-slate-300 border-slate-400 text-slate-800" : "bg-amber-700 border-amber-800 text-amber-100"
            )}>
              {rank}
            </div>
          )}
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-xs md:text-sm font-black uppercase tracking-tighter truncate max-w-[100px] md:max-w-none">
          {user.name}
        </h3>
        <div className="flex flex-col items-center">
          <p className={cn(
            "font-black italic tracking-tighter",
            isFirst ? "text-xl md:text-2xl text-yellow-500" : "text-lg md:text-xl text-foreground/80"
          )}>
            {isCampaign ? user.total_tickets : (category === 'points' ? user.points : user.xp)}
            <span className="text-[8px] md:text-[10px] uppercase ml-1 opacity-50 font-black">
              {isCampaign ? 'cotas' : (category === 'points' ? 'pts' : 'xp')}
            </span>
          </p>
          {!isCampaign && (
            <Badge variant="outline" className="text-[7px] md:text-[8px] border-white/10 text-muted-foreground uppercase font-black px-2 py-0 h-3 md:h-4">
              NÍVEL {user.vip_level || 1} VIP
            </Badge>
          )}
        </div>
      </div>

      <div className={cn(
        "mt-4 w-full rounded-t-2xl md:rounded-t-3xl border-t border-x border-white/5 bg-gradient-to-b from-white/5 to-transparent",
        rank === 1 ? "h-24 md:h-32 shadow-[0_0_40px_rgba(250,204,21,0.05)]" : 
        rank === 2 ? "h-16 md:h-24" : 
        "h-12 md:h-20"
      )} />
    </motion.div>
  );
};

export default UserRanking;
