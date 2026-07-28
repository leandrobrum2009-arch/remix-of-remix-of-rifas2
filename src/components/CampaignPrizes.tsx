import { Trophy, Star, Gift, Sparkles, Medal, RotateCw, Coins, Ticket, CreditCard, ShoppingBag, Crown as CrownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MainPrize {
  position: number;
  prize: string;
}

interface InstantPrize {
  number: string;
  prize: string;
  protected?: boolean;
  is_won?: boolean;
}

interface RoulettePrize {
  id: string;
  label: string;
  prize_type: string;
  value: number | null;
  color: string | null;
}

interface CampaignPrizesProps {
  mainPrizes?: MainPrize[];
  instantPrizes?: InstantPrize[];
  roulettePrizes?: RoulettePrize[];
  showInstant?: boolean;
  soldTickets?: string[];
}

const CampaignPrizes = ({ mainPrizes, instantPrizes, roulettePrizes, showInstant = true, soldTickets = [] }: CampaignPrizesProps) => {
  const luckyNumbers = instantPrizes?.filter(p => !p.protected) || [];

  return (
    <div className="space-y-10">
      {/* Main Prizes */}
      {mainPrizes && mainPrizes.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Premiação Principal</h2>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {mainPrizes.sort((a, b) => a.position - b.position).map((p, i) => (
              <div 
                key={i} 
                className={cn(
                  "group relative overflow-hidden rounded-3xl border p-6 transition-all duration-500",
                  i === 0 
                    ? "bg-gradient-to-br from-amber-500/20 to-amber-950/40 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]" 
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  {i === 0 ? <Crown className="h-12 w-12 text-amber-500" /> : <Medal className="h-12 w-12" />}
                </div>
                
                <div className="relative z-10 flex flex-col items-center text-center gap-4">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl",
                    i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-amber-700 text-white" : "bg-white/10 text-white"
                  )}>
                    {p.position}º
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{i === 0 ? "O GRANDE PRÊMIO" : `${p.position}º LUGAR`}</p>
                    <p className="text-lg font-black uppercase italic tracking-tighter text-white leading-tight">{p.prize}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instant Prizes (Lucky Numbers) */}
      {showInstant && luckyNumbers.length > 0 && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Star className="h-6 w-6 text-amber-500" />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Cotas Premiadas</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-green-500/30 text-green-500 uppercase font-black text-[10px] tracking-widest px-3">
                {luckyNumbers.filter(p => !soldTickets.includes(p.number)).length} Disponíveis
              </Badge>
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 uppercase font-black text-[10px] tracking-widest px-3">
                {luckyNumbers.filter(p => soldTickets.includes(p.number)).length} Premiadas
              </Badge>
            </div>
          </div>

          <div className="space-y-10">
            {/* Disponíveis */}
            {luckyNumbers.filter(p => !soldTickets.includes(p.number)).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Números Disponíveis</h4>
                  <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {luckyNumbers.filter(p => !soldTickets.includes(p.number)).map((p, i) => (
                    <div 
                      key={i} 
                      className="group flex items-center justify-between p-4 rounded-2xl border border-border bg-card/50 hover:border-green-500/50 hover:bg-secondary transition-all duration-300 shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-green-500 text-white flex items-center justify-center font-mono font-black text-sm shadow-inner group-hover:scale-110 transition-transform duration-300">
                          {p.number}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Prêmio</p>
                          <p className="text-xs font-black uppercase italic tracking-tighter text-white">{p.prize}</p>
                        </div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Premiadas */}
            {luckyNumbers.filter(p => soldTickets.includes(p.number)).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Números Já Premiados</h4>
                  <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {luckyNumbers.filter(p => soldTickets.includes(p.number)).map((p, i) => (
                    <div 
                      key={i} 
                      className="group flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-mono font-black text-sm shadow-inner">
                          {p.number}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Prêmio</p>
                          <p className="text-xs font-black uppercase italic tracking-tighter text-white">{p.prize}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[8px] uppercase font-black px-2">Esgotada</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roulette Prizes */}
      {roulettePrizes && roulettePrizes.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <RotateCw className="h-6 w-6 text-purple-500" />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Prêmios da Roleta</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roulettePrizes.map((p, i) => (
              <div 
                key={i} 
                className="group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card/50 hover:border-purple-500/50 hover:bg-secondary transition-all duration-300 shadow-sm"
              >
                <div 
                  className="h-10 w-10 rounded-xl flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: p.color || '#1a1a1a' }}
                >
                  <RoulettePrizeIcon type={p.prize_type} className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Roleta da Sorte</p>
                  <p className="text-xs font-black uppercase italic tracking-tighter text-white">{p.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RoulettePrizeIcon = ({ type, className }: { type: string, className?: string }) => {
  switch (type) {
    case 'balance': return <CreditCard className={className} />;
    case 'points': return <Coins className={className} />;
    case 'ticket': return <Ticket className={className} />;
    case 'physical': return <ShoppingBag className={className} />;
    default: return <Gift className={className} />;
  }
};

const Crown = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  </svg>
);

export default CampaignPrizes;