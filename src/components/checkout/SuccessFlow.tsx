import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, ArrowRight, Video, Users, ExternalLink, 
  Ticket, Sparkles, Clock, Star, Play, Gift, 
  ChevronRight, AlertCircle, Share2, Instagram, MessageCircle, Crown, ShoppingCart, Percent, TrendingUp,
  Trophy, PartyPopper, Printer, User, Phone, Hash, Calendar, DollarSign, RotateCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import Roulette from "@/components/Roulette";
import ScratchCard from "@/components/ScratchCard";
import { supabase } from "@/integrations/supabase/client";
import { useCampaigns } from "@/hooks/useData";
import { toast } from "sonner";

interface SuccessFlowProps {
  order: any;
  campaign: any;
  onClose?: () => void;
  onBuyMore?: (quantity: number) => void;
}


export default function SuccessFlow({ order, campaign, onClose, onBuyMore }: SuccessFlowProps) {
  const [step, setStep] = useState(1);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [availableSpins, setAvailableSpins] = useState(0);
  const [availableScratchCards, setAvailableScratchCards] = useState(0);
  const [rewardsFetched, setRewardsFetched] = useState(false);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [localTickets, setLocalTickets] = useState<any[]>([]);
  const [hasCheckedLucky, setHasCheckedLucky] = useState(false);
  const [isGameInProgress, setIsGameInProgress] = useState(false);
  const [showUpsellBundles, setShowUpsellBundles] = useState(false);
  const [upsellAlreadyShown, setUpsellAlreadyShown] = useState(false);
  const { data: otherCampaigns } = useCampaigns();
  const navigate = useNavigate();

  const detailsRef = useRef<HTMLDivElement>(null);

  const displayTickets = useMemo(() => {
    return localTickets.length > 0 ? localTickets : (order.tickets || []);
  }, [localTickets, order.tickets]);

  const premiumTickets = useMemo(() => {
    return displayTickets.filter((t: any) => t.is_lucky);
  }, [displayTickets]);

  useEffect(() => {
    // Check if upsell was already shown in this session for this campaign
    const shownKey = `upsell_shown_${campaign.id}`;
    const wasShown = sessionStorage.getItem(shownKey);
    if (wasShown) {
      setUpsellAlreadyShown(true);
    }

    // We check for 'paid' status, but we also allow if it's already in SuccessFlow 
    // to start fetching rewards even if DB is still updating
    if (!rewardsFetched && (order.payment_status === 'paid' || step === 1)) {
      fetchRewards();
      setRewardsFetched(true);
      
      const fetchAllTickets = async () => {
        const { data } = await supabase
          .from('tickets')
          .select('*')
          .eq('order_id', order.id);
        
        if (data && data.length > 0) {
          setLocalTickets(data);
          setHasCheckedLucky(true);
        } else {
          // Retry logic if tickets aren't ready
          setTimeout(fetchAllTickets, 2000);
        }
      };

      fetchAllTickets();
    }
  }, [order, step]);

  // Handle automatic transitions
  useEffect(() => {
    if (step === 1 && hasCheckedLucky) {
      const timer = setTimeout(() => {
        // First priority: Upsell if enabled and not already shown
        if (campaign.upsell_enabled && !upsellAlreadyShown) {
          setStep(3);
          const shownKey = `upsell_shown_${campaign.id}`;
          sessionStorage.setItem(shownKey, 'true');
          setUpsellAlreadyShown(true);
        } else if (premiumTickets.length > 0) {
          setStep(0); // Show premium tickets step
        } else if (campaign.roulette_enabled && availableSpins > 0) {
          setStep(2); // Auto-start roulette if enabled
        } else if (campaign.scratch_cards_enabled && availableScratchCards > 0) {
          setStep(5); // Auto-start scratch card if enabled
        } else {
          setStep(6); // Go to order details
        }
      }, 3000); // Wait 3 seconds on "Payment Identified" screen
      return () => clearTimeout(timer);
    }
  }, [step, hasCheckedLucky, premiumTickets, availableSpins, availableScratchCards, campaign.upsell_enabled, upsellAlreadyShown]);

  useEffect(() => {
    if (step === 3) {
      const timer = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  const fetchRewards = async () => {
    if (rewardsFetched) return;
    
    // Check if features are enabled in campaign
    const isRouletteEnabled = campaign.roulette_enabled === true;
    const isScratchEnabled = campaign.scratch_cards_enabled === true;

    console.log("Checking rewards:", { isRouletteEnabled, isScratchEnabled, quantity: order.quantity });

    if (isRouletteEnabled) {
      // The rule is now: 1 free spin per paid order
      setAvailableSpins(1);
    } else {
      setAvailableSpins(0);
    }

    if (isScratchEnabled) {
      // The rule is now: 1 free scratch per paid order
      setAvailableScratchCards(1);
    } else {
      setAvailableScratchCards(0);
    }

    const { data } = await supabase.from('roulette_prizes').select('*').eq('campaign_id', campaign.id);
    if (data) setPrizes(data);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Meu pedido na ação ${campaign.title}`,
        text: `Acabei de comprar ${order.quantity} cotas para concorrer a ${campaign.title}! Meus números: ${displayTickets.map((t: any) => t.number).join(', ')}`,
        url: window.location.href
      });
    } else {
      toast.info("Compartilhamento não suportado neste navegador.");
    }
  };

  const handleReprocess = async () => {
    try {
      const { data: response, error } = await supabase.rpc('reprocess_order_prizes', { p_order_id: order.id });
      if (error) throw error;
      const data = response as any;
      if (data.success) {
        toast.success("Sincronização concluída!");
        fetchRewards();
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + err.message);
    }
  };

  return (
    <div className="w-full space-y-2 md:space-y-4 max-w-full">
      {/* Top Games Bar (only if available) */}
      {(availableSpins > 0 || availableScratchCards > 0) && (
        <div className="flex items-center justify-center gap-2 mb-2">
          {availableSpins > 0 && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 rounded-full bg-amber-500/10 border-amber-500/20 text-[8px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500/20"
              onClick={() => setStep(2)}
              disabled={isGameInProgress}
            >
              <RotateCw className="mr-1.5 h-3 w-3" /> ROLETA DISPONÍVEL
            </Button>
          )}
          {availableScratchCards > 0 && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 rounded-full bg-emerald-500/10 border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/20"
              onClick={() => setStep(5)}
              disabled={isGameInProgress}
            >
              <Sparkles className="mr-1.5 h-3 w-3" /> RASPARDINHA DISPONÍVEL
            </Button>
          )}
        </div>
      )}

      {/* Mini Stepper */}
      <div className="flex items-center justify-center gap-2 mb-1">
        {[1, 3, 6, 2, 5].map((s) => (
          <div 
            key={s} 
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              step === s ? "w-8 bg-primary" : "w-2 bg-white/10"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" variants={containerVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <Card className="border-none bg-black/40 backdrop-blur-xl border border-white/5 overflow-hidden rounded-3xl">
              <CardContent className="p-4 md:p-8 text-center space-y-4 md:space-y-6">
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mx-auto h-24 w-24 rounded-full bg-amber-500 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)]"
                >
                  <Trophy className="h-12 w-12 text-white" />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-amber-500">COTA PREMIADA!</h2>
                  <p className="text-white/80 font-bold">PARABÉNS! Você encontrou {premiumTickets.length} cota(s) premiada(s)!</p>
                </div>

                <div className="grid gap-3">
                  {premiumTickets.map((ticket: any) => (
                    <div key={ticket.id} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-white">#{ticket.number}</div>
                        <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest text-amber-500">Prêmio Instantâneo</p>
                          <p className="text-sm font-bold text-white">Consulte seu prêmio no regulamento</p>
                        </div>
                      </div>
                      <PartyPopper className="h-6 w-6 text-amber-500 animate-bounce" />
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => setStep(6)} 
                  className="w-full h-16 rounded-2xl bg-amber-500 text-white font-black uppercase italic tracking-widest text-lg shadow-lg hover:scale-105 transition-transform"
                >
                  VER MEUS DETALHES
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1" variants={containerVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <Card className="border-none bg-black/40 backdrop-blur-xl border border-white/5 overflow-hidden rounded-3xl">
              <CardContent className="p-4 md:p-8 text-center space-y-3 md:space-y-6">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }} 
                  animate={{ scale: 1, rotate: 0 }} 
                  className="mx-auto h-24 w-24 rounded-full bg-primary flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary-rgb),0.5)]"
                >
                  <CheckCircle2 className="h-12 w-12 text-black" />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter">Pagamento Identificado!</h2>
                  <p className="text-white/60 font-medium">Seu pagamento foi aprovado com sucesso.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 text-left">
                  <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase truncate">{campaign.title}</p>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Cotas Adquiridas: {order.quantity}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: "100%" }} 
                      transition={{ duration: 3 }}
                      className="h-full bg-primary"
                    />
                  </div>
                  <div className="space-y-3 w-full">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 animate-pulse text-center">
                      Verificando seus prêmios instantâneos...
                    </p>
                    <Button 
                      className="w-full h-12 rounded-xl bg-primary text-black font-black uppercase tracking-widest text-[10px]"
                      onClick={() => setStep(6)}
                    >
                      Ver Detalhes da Compra <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 text-center italic">
                      Seus números já estão garantidos!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div key="step6" variants={containerVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <Card className="border-none bg-black/40 backdrop-blur-xl border border-white/5 overflow-hidden rounded-3xl">
              <CardContent className="p-0">
                <div ref={detailsRef} className="p-3 md:p-8 space-y-3 md:space-y-8 bg-card text-card-foreground">
                  <div className="flex items-center justify-between border-b border-border pb-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter">Comprovante</h2>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pedido #{order.id?.substring(0, 8)}</p>
                    </div>
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nome Completo</p>
                          <p className="text-sm font-bold uppercase">{order.profiles?.name || "Usuário"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Telefone</p>
                          <p className="text-sm font-bold">{order.profiles?.phone || "Não informado"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                          <Hash className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Transação</p>
                          <p className="text-sm font-bold uppercase">{order.id?.substring(0, 12)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Data e Hora</p>
                          <p className="text-sm font-bold">{new Date().toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                          <Ticket className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Quantidade</p>
                          <p className="text-sm font-bold">{order.quantity} Cotas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valor Total</p>
                          <p className="text-sm font-bold">R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border space-y-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Seus Números da Sorte:</p>
                    <div className="flex flex-wrap gap-2">
                      {displayTickets.map((t: any) => (
                        <Badge key={t.id} variant="secondary" className="px-3 py-1 font-black text-xs bg-primary/10 text-primary border-primary/20">
                          #{t.number}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-8 bg-zinc-950 border-t border-white/5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="rounded-2xl gap-2 font-bold uppercase tracking-widest text-[10px] border-white/10" onClick={handlePrint}>
                      <Printer className="h-4 w-4" /> Imprimir
                    </Button>
                    <Button variant="outline" className="rounded-2xl gap-2 font-bold uppercase tracking-widest text-[10px] border-white/10" onClick={handleShare}>
                      <Share2 className="h-4 w-4" /> Compartilhar
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase italic tracking-widest text-[10px] shadow-lg"
                      onClick={() => setStep(2)}
                      disabled={availableSpins === 0}
                    >
                      <RotateCw className="mr-2 h-4 w-4" /> ROLETA ({availableSpins})
                    </Button>
                    <Button 
                      className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase italic tracking-widest text-[10px] shadow-lg"
                      onClick={() => setStep(5)}
                      disabled={availableScratchCards === 0}
                    >
                      <Sparkles className="mr-2 h-4 w-4" /> RASPARDINHA ({availableScratchCards})
                    </Button>
                  </div>

                  <Button 
                    className="w-full h-16 rounded-2xl bg-primary text-black font-black uppercase italic tracking-widest text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform animate-button-flash"
                    onClick={() => {
                      if (availableSpins > 0) setStep(2);
                      else if (availableScratchCards > 0) setStep(5);
                      else onClose?.();
                    }}
                  >
                    GIRAR ROLETA AGORA <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                  
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary" onClick={handleReprocess}>
                      Não recebeu seus prêmios? Sincronizar agora
                    </Button>
                    {onClose && (
                      <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={onClose}>
                        Fechar Modal
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" variants={containerVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-black uppercase italic tracking-tighter">Sua Sorte Instantânea</h2>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[8px] font-black uppercase tracking-widest border-white/10" onClick={() => setStep(6)} disabled={isGameInProgress}>
                    Ver Detalhes
                 </Button>
                 <Badge className="bg-primary text-black font-bold h-7">{availableSpins} giros restantes</Badge>
               </div>
            </div>
            
            <Roulette 
              prizes={prizes} 
              campaign={campaign} 
              availableSpins={availableSpins}
              onSpinStart={() => setIsGameInProgress(true)}
              onSpinComplete={() => {
                setAvailableSpins(prev => prev - 1);
                setIsGameInProgress(false);
              }}
            />
            
            <Button variant="outline" className="w-full h-12 rounded-2xl border-white/10 text-white/60 font-bold uppercase tracking-widest text-xs" onClick={() => setStep(5)} disabled={isGameInProgress}>
              Pular para Raspadinha <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="step5" variants={containerVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-black uppercase italic tracking-tighter">Raspadinha da Sorte</h2>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[8px] font-black uppercase tracking-widest border-white/10" onClick={() => setStep(6)} disabled={isGameInProgress}>
                    Ver Detalhes
                 </Button>
                 <Badge className="bg-primary text-black font-bold h-7">{availableScratchCards} restantes</Badge>
               </div>
            </div>
            
            <ScratchCard 
              campaignId={campaign.id}
              onStart={() => setIsGameInProgress(true)}
              onComplete={() => {
                setAvailableScratchCards(prev => prev - 1);
                setIsGameInProgress(false);
              }}
            />
            
            <Button variant="outline" className="w-full h-12 rounded-2xl border-white/10 text-white/60 font-bold uppercase tracking-widest text-xs" onClick={() => setStep(3)} disabled={isGameInProgress}>
              Continuar para próxima etapa <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" variants={containerVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <div className="text-center space-y-2">
              <Badge className="bg-destructive text-white animate-bounce mb-2">OFERTA ÚNICA E EXCLUSIVA</Badge>
              <p className="text-xs font-black uppercase tracking-widest text-white/40">Sua chance expira em:</p>
              <p className="text-4xl font-black text-destructive font-mono tracking-tighter shadow-destructive/20 drop-shadow-lg">{formatTime(countdown)}</p>
            </div>

            <Card className="border-none bg-black/40 backdrop-blur-xl border border-white/5 overflow-hidden rounded-3xl shadow-2xl">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-zinc-900 flex items-center justify-center group cursor-pointer border-b border-white/5">
                  {campaign.upsell_video_url ? (
                    <iframe 
                      src={campaign.upsell_video_url} 
                      className="w-full h-full" 
                      allow="autoplay; fullscreen" 
                      allowFullScreen
                    />
                  ) : (
                    <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover opacity-60" />
                  )}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-destructive text-white gap-2 font-black italic shadow-lg">
                      <span className="h-2 w-2 rounded-full bg-white animate-ping" /> OPORTUNIDADE DE OURO
                    </Badge>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="text-center space-y-3">
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-tight text-white">
                      ATENÇÃO, {(order.profiles?.name || "Campeão").split(' ')[0]}! <br />
                      <span className="text-primary text-animate-gradient">ESTRATÉGIA DE CHANCES ATIVADA!</span>
                    </h2>
                    <p className="text-sm text-white/80 font-bold leading-relaxed">
                      O sistema identificou que você está no 'Fluxo de Sorte'. Comprar mais cotas AGORA aumenta em <span className="text-primary">{campaign.upsell_probability || "98%"} suas chances de ser sorteado</span> e ser o grande vencedor!
                    </p>
                  </div>

                  {showUpsellBundles ? (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {(campaign.price_bundles && campaign.price_bundles.length > 0 ? campaign.price_bundles : [
                        { quantity: 50, price: 45.00 },
                        { quantity: 100, price: 80.00 },
                        { quantity: 200, price: 150.00 },
                        { quantity: 500, price: 350.00 }
                      ]).slice(0, 4).map((bundle: any) => (

                        <Button 
                          key={bundle.quantity}
                          variant="outline"
                          className="h-20 rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-1 group transition-all"
                          onClick={() => onBuyMore?.(bundle.quantity)}
                        >
                          <span className="text-xl font-black italic tracking-tighter text-white group-hover:scale-110 transition-transform">+{bundle.quantity}</span>
                          <span className="text-[10px] font-black uppercase text-primary tracking-widest">R$ {Number(bundle.price).toFixed(2).replace('.', ',')}</span>
                        </Button>
                      ))}
                      <Button 
                        variant="ghost" 
                        className="col-span-2 text-[10px] font-black uppercase tracking-widest text-white/30"
                        onClick={() => setShowUpsellBundles(false)}
                      >
                        Voltar
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Percent className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-xs font-black uppercase text-white/70">Desconto Exclusivo Liberado</span>
                        </div>
                        <Badge className="bg-green-500 text-white font-black italic">ATIVO!</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Sua probabilidade de vitória subiu para {campaign.upsell_probability || "98%"}</span>
                      </div>
                      <Progress value={parseInt(campaign.upsell_probability) || 98} className="h-3 bg-white/5" indicatorClassName="bg-primary" />
                    </div>
                  )}

                  {!showUpsellBundles && (
                    <div className="space-y-4">
                      <Button 
                        className="w-full h-20 rounded-2xl bg-primary text-black font-black uppercase italic tracking-widest text-xl shadow-[0_15px_30px_rgba(var(--primary-rgb),0.4)] hover:scale-[1.02] transition-transform animate-pulse border-b-4 border-black/20"
                        onClick={() => {
                          if (onBuyMore) {
                            setShowUpsellBundles(true);
                          } else {
                            navigate(`/campanha/${campaign.slug}?upsell=true`);
                          }
                        }}

                      >
                        GARANTIR MAIS CHANCES AGORA
                      </Button>
                      
                      <Button variant="ghost" className="w-full text-white/30 hover:text-white/60 font-bold uppercase tracking-widest text-[10px]" onClick={() => setStep(6)}>
                        Ver meus números e entrar no grupo
                      </Button>

                      <div className="grid grid-cols-2 gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          className="h-12 rounded-xl border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest"
                          onClick={() => setStep(2)}
                          disabled={availableSpins === 0}
                        >
                          <RotateCw className="mr-2 h-3 w-3 text-primary" /> ROLETA ({availableSpins})
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-12 rounded-xl border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest"
                          onClick={() => setStep(5)}
                          disabled={availableScratchCards === 0}
                        >
                          <Sparkles className="mr-2 h-3 w-3 text-primary" /> RASPARDINHA ({availableScratchCards})
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="step4" variants={containerVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
            <Card className="border-none bg-black/40 backdrop-blur-xl border border-white/5 overflow-hidden rounded-3xl">
              <CardContent className="p-8 text-center space-y-8">
                <div className="space-y-4">
                  <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-xl">
                    <Crown className="h-10 w-10 text-black" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter">ENTRA PRO TIME VIP.</h2>
                    <p className="text-white/60 text-sm font-medium">Fique por dentro de sorteios exclusivos e ganhe cotas grátis toda semana!</p>
                  </div>
                </div>

                {campaign.vip_group_link && (
                  <div className="space-y-4">
                    <a href={campaign.vip_group_link} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full h-16 rounded-2xl bg-primary text-black font-black uppercase italic tracking-widest text-lg shadow-lg hover:scale-[1.02] transition-transform">
                        QUERO ENTRAR NO VIP <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </a>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Acesso imediato ao grupo oficial</p>
                  </div>
                )}

                <div className="pt-8 border-t border-white/5 space-y-4">
                  <Button 
                    variant="ghost" 
                    className="w-full text-white/30 hover:text-white/60 font-bold uppercase tracking-widest text-[10px]" 
                    onClick={() => onClose ? onClose() : navigate(`/campanha/${campaign.slug || campaign.id}`)}
                  >
                    FECHAR E VOLTAR PARA AÇÃO
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
