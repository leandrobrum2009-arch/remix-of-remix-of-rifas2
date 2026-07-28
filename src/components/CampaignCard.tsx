import { motion } from "framer-motion";
import { Calendar, CheckCircle, Zap, Clock, ShieldCheck, TrendingUp, RotateCw, Star, Gift, Sparkles, Trophy, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/hooks/useData";
import CountdownTimer from "./CountdownTimer";
import { getCampaignDisplaySales } from "@/lib/campaign-progress";

interface CampaignCardProps {
  campaign: Campaign;
  index: number;
}

const CampaignCard = ({ campaign, index }: CampaignCardProps) => {
  const now = new Date();
  const isExpired = campaign.draw_date && new Date(campaign.draw_date) <= now;
  const isCompleted = campaign.status === "completed" || campaign.status === "finished" || campaign.status === "drawn" || isExpired;
  const { displaySoldTickets, rawProgress, roundedProgress, progressText } = getCampaignDisplaySales(campaign);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative h-full"
    >
      <Link to={`/campanha/${campaign.slug || campaign.id}`} className="block h-full outline-none">
        <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-3 sm:p-4 transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] group-hover:scale-[1.02] shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 border-light-path border-[#22c55e]/20">
          
          {/* Reflection Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-secondary/30">
            <img
              src={campaign.image_url || "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=640&h=360&auto=format&fit=crop"}
              alt={campaign.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-2">
              {campaign.featured && (
                <Badge className="bg-primary px-2 py-0.5 text-[8px] font-black uppercase italic tracking-widest glow-primary">
                  Premium
                </Badge>
              )}
              {roundedProgress > 80 && campaign.status === 'active' && (
                <Badge variant="destructive" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest animate-pulse">
                  Últimas Cotas
                </Badge>
              )}
              {campaign.status === 'active' && (
                <Badge className="bg-green-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest gap-1">
                  <div className="h-1 w-1 rounded-full bg-white animate-ping" /> Ao Vivo
                </Badge>
              )}
              {campaign.status === 'paused' && (
                <Badge className="bg-amber-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                  Pausada
                </Badge>
              )}
              {isCompleted && (
                <Badge className="bg-blue-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest gap-1">
                  <Trophy className="h-2 w-2" /> Finalizada
                </Badge>
              )}
              {campaign.status === 'audit' && (
                <Badge className="bg-purple-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest animate-pulse">
                  Em Auditoria
                </Badge>
              )}
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
              {campaign.draw_date && (
                <CountdownTimer targetDate={campaign.draw_date} className="scale-90 origin-left" />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-black italic text-primary neon-text-primary">
                  <Zap className="h-3 w-3 fill-current" />
                  R$ {Number(campaign.ticket_price).toFixed(2).replace(".", ",")}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-white/70">
                  <Clock className="h-3 w-3" /> 
                  {campaign.status === 'completed' || campaign.status === 'finished' ? (
                    <span>Sorteado</span>
                  ) : campaign.status === 'paused' ? (
                    <span>Pausada</span>
                  ) : campaign.draw_date && new Date(campaign.draw_date) < new Date() ? (
                    <span>Aguardando Sorteio</span>
                  ) : campaign.draw_date ? (
                    <span>Sorteio em breve</span>
                  ) : (
                    <span>Em breve</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4">
            <div>
              <h3 className="font-display text-sm sm:text-base md:text-lg font-black uppercase italic tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                {campaign.title}
              </h3>
              <p className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-muted-foreground line-clamp-1 mt-0.5 uppercase tracking-widest">
                {campaign.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 py-1">
              {campaign.lucky_numbers_prizes && campaign.lucky_numbers_prizes.length > 0 && (
                <div className="flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded-full border border-border">
                  <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                  <span className="text-[8px] font-black uppercase text-foreground">{campaign.lucky_numbers_prizes.length} cotas premiadas disponíveis</span>
                </div>
              )}
              {campaign.roulette_enabled && (
                <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <RotateCw className="h-2.5 w-2.5 text-primary" />
                  <span className="text-[8px] font-black uppercase text-primary">
                    {campaign.roulette_available_count && campaign.roulette_available_count > 0 
                      ? `${campaign.roulette_available_count} roletas disponíveis`
                      : 'roleta disponíveis'
                    }
                  </span>
                </div>
              )}
              {campaign.mystery_box_enabled && (
                <div className="flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  <Package className="h-2.5 w-2.5 text-purple-500" />
                  <span className="text-[8px] font-black uppercase text-purple-500">
                    {campaign.mystery_box_available_count && campaign.mystery_box_available_count > 0 
                      ? `${campaign.mystery_box_available_count} caixas disponíveis`
                      : 'caixas disponíveis'
                    }
                  </span>
                </div>
              )}
              {campaign.scratch_cards_enabled && (
                <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                  <span className="text-[8px] font-black uppercase text-amber-500">
                    {campaign.scratch_cards_available_count && campaign.scratch_cards_available_count > 0 
                      ? `${campaign.scratch_cards_available_count} raspadinhas disponíveis`
                      : 'raspadinhas disponíveis'
                    }
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> {isCompleted ? 'Finalizado' : `${displaySoldTickets.toLocaleString()} vendidos`}
                </span>
                <span className={cn("font-black", isCompleted ? "text-blue-500" : "text-primary")}>
                  {isCompleted ? '100%' : `${progressText}%`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden border border-border">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: isCompleted ? '100%' : `${Math.max(rawProgress, rawProgress > 0 ? 0.5 : 0)}%` }}
                  className={cn("h-full rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]", 
                    isCompleted ? "bg-blue-500" : "bg-primary"
                  )}
                />
              </div>
            </div>

            {isCompleted && (
              (() => {
                const raffleWinner = campaign.winners?.find(w => w.winner_type === 'raffle') || campaign.winners?.[0];
                const winnerName = raffleWinner?.winner_name || (campaign as any)?.winner_name;
                const winningNumber = raffleWinner?.ticket_number || (campaign as any)?.draw_number || (campaign as any)?.winning_number;
                const drawDate = raffleWinner?.draw_date || (campaign as any)?.draw_date;
                return (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Trophy className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-tighter text-blue-600">
                        {winnerName ? 'Ganhador(a)' : (winningNumber ? 'Número Sorteado' : 'Status')}
                      </p>
                      <p className="text-xs font-black text-foreground truncate">
                        {winnerName || (winningNumber ? `#${winningNumber}` : 'Acumulada / Sem Ganhador')}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        {winningNumber && (
                          <span className="font-mono text-blue-600">Nº {winningNumber}</span>
                        )}
                        {drawDate && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(drawDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                  {isCompleted ? (
                    <CheckCircle className="h-3 w-3 text-blue-500" />
                  ) : (
                    <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {isCompleted ? 'Encerrado' : 'Garantido'}
                </span>
              </div>
              <Button 
                size="sm" 
                className={cn(
                  "h-7 sm:h-8 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 relative z-10",
                  isCompleted 
                    ? "bg-secondary text-muted-foreground border-border hover:bg-secondary/80" 
                    : "glow-primary border-light-path border-[#22c55e]/30"
                )}
              >
                {isCompleted ? 'VER RESULTADO' : 'COMPRAR AGORA'}
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default CampaignCard;