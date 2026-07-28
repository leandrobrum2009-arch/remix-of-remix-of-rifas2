import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, Gift, Gamepad2, Hash, Clock, User, Sparkles, DollarSign, Calendar
} from "lucide-react";
import { 
  useCampaignMysteryBoxWins, 
  useCampaignRouletteSpins, 
  useCampaignLuckyWinners,
  Campaign
} from "@/hooks/useData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CampaignPublicInfoProps {
  campaign: Campaign;
}

const CampaignPublicInfo = ({ campaign }: CampaignPublicInfoProps) => {
  const { data: mysteryBoxWins } = useCampaignMysteryBoxWins(campaign.id, 10);
  const { data: rouletteSpins } = useCampaignRouletteSpins(campaign.id, 10);
  const { data: luckyWinners } = useCampaignLuckyWinners(campaign.id);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`campaign-winners-${campaign.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mystery_box_wins" }, () => {
        queryClient.invalidateQueries({ queryKey: ["campaign-mystery-box-wins", campaign.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "roulette_spins", filter: `campaign_id=eq.${campaign.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["campaign-roulette-spins", campaign.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `campaign_id=eq.${campaign.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["campaign-lucky-winners", campaign.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [campaign.id, queryClient]);

  const luckyPrizesMap = useMemo(() => {
    const map: Record<string, string> = {};
    campaign.lucky_numbers_prizes?.forEach((p: any) => {
      map[p.number] = p.prize;
    });
    return map;
  }, [campaign.lucky_numbers_prizes]);

  const allWinners = useMemo(() => {
    const combined: any[] = [
      ...(mysteryBoxWins?.map(w => ({ ...w, type: 'mystery' })) || []),
      ...(rouletteSpins?.filter((s: any) => s.prize_label && s.prize_type !== 'none').map(s => ({ ...s, type: 'roulette' })) || []),
      ...(luckyWinners?.map(l => ({ ...l, type: 'lucky' })) || [])
    ];
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [mysteryBoxWins, rouletteSpins, luckyWinners]);

  const formatBRL = (v: any) => {
    const n = Number(v || 0);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getPrizeLabel = (w: any) => {
    if (w.type === 'mystery') return w.prize_title;
    if (w.type === 'roulette') return w.prize_label;
    return luckyPrizesMap[w.number] || `Cota #${w.number}`;
  };

  const getPrizeValue = (w: any) => {
    if (w.type === 'mystery') return Number(w.prize_value || 0);
    if (w.type === 'roulette') return Number(w.prize_value || 0);
    return 0;
  };

  const getTypeLabel = (t: string) => t === 'mystery' ? 'Caixa Misteriosa' : t === 'roulette' ? 'Roleta' : 'Cota Premiada';

  if (allWinners.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
       {/* Winners History */}
       <section className="space-y-6">
         <div className="flex items-center gap-3">
           <div className="h-10 w-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
             <Trophy className="h-6 w-6 text-yellow-500" />
           </div>
           <div>
             <h2 className="text-xl font-black uppercase italic tracking-tighter">Histórico de Ganhadores</h2>
             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Veja quem já levou prêmios nesta edição</p>
           </div>
         </div>
 
         <div className="space-y-3">
           {allWinners.length > 0 ? (
             <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 bg-secondary/50 p-4 border-b border-border hidden sm:grid">
                 <span className="col-span-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ganhador</span>
                 <span className="col-span-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prêmio</span>
                 <span className="col-span-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Data/Hora</span>
               </div>
               <div className="divide-y divide-border">
                  {allWinners.map((win, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelected(win)}
                      className="w-full text-left flex flex-col sm:grid sm:grid-cols-12 p-4 gap-3 sm:gap-0 sm:items-center hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div className="col-span-5 flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                          <AvatarImage src={win.profiles?.avatar_url || ""} />
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {win.profiles?.name?.substring(0, 2).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground leading-tight">{win.profiles?.name || "Participante"}</span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Vencedor Verificado</span>
                        </div>
                      </div>
                      <div className="col-span-4 flex flex-wrap items-center gap-2">
                        {win.type === 'mystery' && (
                          <div className="flex items-center gap-2 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                            <Gift className="h-3 w-3 text-purple-500" />
                            <span className="text-[10px] font-black text-purple-600 uppercase italic">{win.prize_title}</span>
                          </div>
                        )}
                        {win.type === 'roulette' && (
                          <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                            <Gamepad2 className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] font-black text-blue-600 uppercase italic">{win.prize_label}</span>
                          </div>
                        )}
                        {win.type === 'lucky' && (
                          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            <Hash className="h-3 w-3 text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase italic">
                              Cota #{win.number}: {luckyPrizesMap[win.number] || "Prêmio"}
                            </span>
                          </div>
                        )}
                        {getPrizeValue(win) > 0 && (
                          <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20">
                            <DollarSign className="h-3 w-3 text-yellow-500" />
                            <span className="text-[10px] font-black text-yellow-600 uppercase italic">{formatBRL(getPrizeValue(win))}</span>
                          </div>
                        )}
                      </div>
                      <div className="col-span-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                            {format(new Date(win.created_at), "dd MMM", { locale: ptBR })}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                            às {format(new Date(win.created_at), "HH:mm")}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-12 rounded-3xl border border-dashed border-border bg-card/30">
               <Trophy className="h-10 w-10 mb-4 text-muted-foreground opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhum ganhador registrado ainda.</p>
             </div>
           )}
         </div>
       </section>

      {/* Prize Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 uppercase italic tracking-tight">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Detalhes do Prêmio
                </DialogTitle>
                <DialogDescription className="text-xs uppercase tracking-widest font-bold">
                  {getTypeLabel(selected.type)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 border border-border">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={selected.profiles?.avatar_url || ""} />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">
                      {selected.profiles?.name?.substring(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-black uppercase">{selected.profiles?.name || "Participante"}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Vencedor Verificado</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Prêmio</p>
                    <p className="text-sm font-black text-foreground">{getPrizeLabel(selected)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Valor</p>
                    <p className="text-sm font-black text-yellow-600">
                      {getPrizeValue(selected) > 0 ? formatBRL(getPrizeValue(selected)) : "—"}
                    </p>
                  </div>
                  {selected.type === 'lucky' && (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 col-span-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Número Premiado</p>
                      <p className="text-lg font-black text-emerald-600">#{selected.number}</p>
                    </div>
                  )}
                  {selected.type === 'roulette' && selected.prize_type && (
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 col-span-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tipo</p>
                      <p className="text-sm font-black text-blue-600 uppercase">{selected.prize_type}</p>
                    </div>
                  )}
                  {selected.type === 'mystery' && selected.prize_description && (
                    <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 col-span-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Descrição</p>
                      <p className="text-xs font-bold text-foreground">{selected.prize_description}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border col-span-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-bold text-foreground">
                      {format(new Date(selected.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignPublicInfo;