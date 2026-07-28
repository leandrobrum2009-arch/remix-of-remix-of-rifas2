import { motion } from "framer-motion";
import { Trophy, Play, Phone, Star, ShieldCheck, RotateCw, Sparkles, Ticket, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Winner } from "@/hooks/useData";

interface WinnerCardProps {
  winner: Winner;
  index: number;
}

const WinnerCard = ({ winner, index }: WinnerCardProps) => {
  const campaignTitle = winner.campaigns?.title || "Campanha";
  const logoUrl =
    (typeof window !== "undefined" &&
      (localStorage.getItem("site_logo") ||
        localStorage.getItem("tenant_site_logo"))) ||
    "/placeholder.svg";
  const typeLabels = {
    raffle: { label: "Sorteio da Ação", icon: Ticket, color: "bg-primary/20 text-primary" },
    roulette: { label: "Roleta da Sorte", icon: RotateCw, color: "bg-purple-500/20 text-purple-500" },
    scratchcard: { label: "Raspadinha", icon: Sparkles, color: "bg-amber-500/20 text-amber-500" },
    lucky_number: { label: "Cota Premiada", icon: Star, color: "bg-blue-500/20 text-blue-500" }
  };
  
  const currentType = typeLabels[winner.winner_type || 'raffle'];
  const Icon = currentType.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-4 md:p-6 shadow-sm hover:border-primary/30 hover:shadow-md transition-all group border-light-path border-[#22c55e]/20"
    >
      {/* Background Icon */}
      <Trophy className="absolute -right-4 -top-4 h-32 w-32 text-primary/5 rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-6" />

      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between">
          <div className="relative">
            <div className="h-12 w-12 sm:h-16 sm:w-16 overflow-hidden rounded-lg sm:rounded-xl border-2 border-primary/20 bg-secondary/30 flex items-center justify-center p-2">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-full w-full object-contain opacity-90"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary border-2 border-card flex items-center justify-center shadow-lg">
              <Trophy className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest italic px-2 py-0.5", currentType.color)}>
              <Icon className="mr-1 h-3 w-3" /> {currentType.label}
            </Badge>
            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
              <Calendar className="h-3 w-3" /> {new Date(winner.draw_date).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mt-2">
          <h3 className="font-display text-base sm:text-lg md:text-xl font-black uppercase italic tracking-tighter leading-none group-hover:text-primary transition-colors">
            {winner.winner_name}
          </h3>
          <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-muted-foreground truncate">{campaignTitle}</p>
        </div>

        <div className="mt-5 p-4 md:p-5 rounded-xl bg-secondary/50 border border-border space-y-4">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
            <span className="text-muted-foreground">Prêmio</span>
            <span className="text-primary neon-text-primary italic font-black">{winner.prize_description}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
            <span className="text-muted-foreground">Nº da sorte</span>
            <span className="font-mono text-xs font-black text-foreground px-2.5 py-1 rounded-lg bg-card border border-border shadow-sm">{winner.ticket_number}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Entrega Realizada</span>
          </div>
          {winner.video_url && (
            <Button size="sm" variant="outline" className="h-9 rounded-full gap-2 border-border bg-secondary/50 hover:bg-secondary text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Play className="h-3 w-3 fill-current" /> Vídeo
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default WinnerCard;
