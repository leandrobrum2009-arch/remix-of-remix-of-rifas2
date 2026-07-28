import confetti from 'canvas-confetti';
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { RotateCw, Star, Trophy, Users, Zap, ShoppingCart, Sparkles, Coins, Gift, Info, FileText, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RoulettePrize, Campaign, useGlobalRouletteSpins, useGlobalStats } from "@/hooks/useData";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { playSound as playGlobalSound, hapticFeedback } from "@/lib/sounds";
import { Slider } from "@/components/ui/slider";


interface RouletteProps {
  prizes: RoulettePrize[];
  onSpinComplete?: (prize: RoulettePrize) => void;
  onSpinStart?: () => void;
  campaign: Campaign;
  availableSpins?: number;
  isSimulation?: boolean;
}

const SOUND_URLS = {
  spin: "https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  tick: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3"
};

const Roulette = ({ prizes: initialPrizes, onSpinComplete, onSpinStart, campaign, availableSpins = 0, isSimulation = false }: RouletteProps) => {
  const prizes = useMemo(() => {
    let basePrizes = [...(initialPrizes || [])];
    
    // If no prizes configured, show example list
    if (basePrizes.length === 0) {
      basePrizes = [
        { id: 'p1', label: 'R$ 50 no PIX', value: 50, prize_type: 'balance', chance_percent: 10, color: '#22c55e' },
        { id: 'p2', label: 'R$ 100 no PIX', value: 100, prize_type: 'balance', chance_percent: 5, color: '#10b981' },
        { id: 'p3', label: 'Cota Premiada', value: 1, prize_type: 'ticket', chance_percent: 2, color: '#f59e0b' },
        { id: 'p4', label: 'Caixa Surpresa', value: 0, prize_type: 'physical', chance_percent: 1, color: '#8b5cf6' },
        { id: 'p5', label: 'R$ 5000 no PIX', value: 5000, prize_type: 'balance', chance_percent: 0.1, color: '#ef4444' },
      ] as any[];
    }

    // Filter out existing "Tente novamente" to interperse them manually
    const realPrizes = basePrizes.filter(p => (p.prize_type as any) !== 'none' && p.label !== 'Tente novamente');
    
    // Calculate total chance of real prizes
    const totalRealChance = realPrizes.reduce((acc, p) => acc + (Number(p.chance_percent) || 0), 0);
    const lossChancePerSegment = Math.max(0, (100 - totalRealChance) / Math.max(1, realPrizes.length));
    
    // Create segments: Real Prize -> Loss -> Real Prize -> Loss ...
    let segments: any[] = [];
    
    if (realPrizes.length === 0) {
        segments = [{ id: 'loss-1', label: 'Tente novamente', value: 0, prize_type: 'none', chance_percent: 100, color: '#3f3f46' }];
    } else {
        realPrizes.forEach((p, i) => {
            segments.push({ ...p });
            segments.push({
                id: `loss-${i}-${Date.now()}`,
                label: 'Tente novamente',
                value: 0,
                prize_type: 'none',
                chance_percent: lossChancePerSegment,
                color: i % 2 === 0 ? '#1f1f23' : '#313135'
            });
        });
    }
    
    // Ensure we have at least 8 segments for a good look
    if (segments.length < 8 && segments.length > 0) {
        const pattern = [...segments];
        while (segments.length < 8) {
            segments = [...segments, ...pattern.map((p, idx) => ({ ...p, id: `${p.id}-dup-${segments.length + idx}` }))];
        }
    }
    
    return segments;
  }, [initialPrizes, campaign.id]);

  const { data: globalSpins } = useGlobalRouletteSpins(10);
  const { data: stats } = useGlobalStats();
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinPower, setSpinPower] = useState(5);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [wonPrize, setWonPrize] = useState<RoulettePrize | null>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const controls = useAnimation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
    setUserProfile(data);
  };

  const getWeightedPrize = () => {
    const totalWeight = prizes.reduce((acc, p) => acc + (Number(p.chance_percent) || 0), 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < prizes.length; i++) {
      if (random < (Number(prizes[i].chance_percent) || 0)) {
        return { prize: prizes[i], index: i };
      }
      random -= (Number(prizes[i].chance_percent) || 0);
    }
    return { prize: prizes[0], index: 0 };
  };

  const spin = async () => {
    if (isSpinning) {
      return;
    }
    
    if (!isSimulation && !user) {
      toast.error("Você precisa estar logado para girar a roleta!");
      return;
    }
    
    const spinCost = Number(campaign.roulette_spin_cost || 0);
    const isUsingFreeSpins = availableSpins >= 1;
    
    if (!isSimulation && !isUsingFreeSpins) {
      if (spinCost > 0) {
        if ((userProfile?.balance || 0) < spinCost) {
          toast.error(`Saldo insuficiente! O giro custa R$ ${spinCost.toFixed(2)}.`);
          return;
        }
      } else {
        toast.error(`Você não possui giros disponíveis! Compre mais cotas para ganhar giros grátis.`);
        return;
      }
    }

    setIsSpinning(true);
    if (onSpinStart) onSpinStart();
    playGlobalSound('shake'); 
    hapticFeedback();

    await controls.start({
      scale: [1, 1.05, 1],
      transition: { duration: 0.2 }
    });

    let wonPrizeData;
    let final_value;
    let is_free;
    let new_balance;

    if (isSimulation) {
      // For simulation, just pick a random prize locally
      const { prize, index } = getWeightedPrize();
      wonPrizeData = prize;
    } else {
      const { data: result, error: spinError } = await supabase.rpc('process_roulette_spin', {
        p_campaign_id: campaign.id,
        p_multiplier: 1
      });

      if (spinError) {
        setIsSpinning(false);
        toast.error(spinError.message || "Erro ao processar o giro.");
        return;
      }

      const res = result as any;
      wonPrizeData = res.prize;
      final_value = res.final_value;
      is_free = res.is_free;
      new_balance = res.new_balance;
      
      // If no new_balance was returned but we paid with balance, we should update it manually
      if (new_balance === undefined && !is_free && spinCost > 0) {
        new_balance = Number(userProfile.balance) - spinCost;
      }
    }

    const prize = wonPrizeData as RoulettePrize;
    
    // Find all matching indices in our visual segments
    const matchingIndices = prizes.reduce((acc: number[], p, idx) => {
      // For real prizes, match by ID or Label+Type
      if ((prize.prize_type as any) !== 'none') {
        if (p.id === prize.id || (p.label === prize.label && p.prize_type === prize.prize_type)) {
          acc.push(idx);
        }
      } else {
        // For losses, match all loss segments
        if ((p.prize_type as any) === 'none' || p.label === 'Tente novamente') {
          acc.push(idx);
        }
      }
      return acc;
    }, []);
    
    // Pick one at random if there are multiple segments (likely for "Tente novamente")
    const visualIndex = matchingIndices.length > 0 
      ? matchingIndices[Math.floor(Math.random() * matchingIndices.length)] 
      : 0;
    
    const segmentAngle = 360 / (prizes.length || 1);
    const extraSpins = 10 + Math.floor(spinPower); // User power affects number of spins
    
    const targetAngle = (Math.ceil(currentRotation / 360) + extraSpins) * 360 - (visualIndex * segmentAngle);
    
    setCurrentRotation(targetAngle);
    
    // Higher power means faster spin but potentially longer duration
    const spinDuration = 6 + (spinPower / 2.5); // 6.4s to 10s
    
    await controls.start({
      rotate: targetAngle,
      transition: { 
        duration: spinDuration, 
        ease: [0.1, 0, 0, 1] // Very smooth decelerating ease
      }
    });
    
    // WAIT for the wheel to fully settle before showing any message
    await new Promise(resolve => setTimeout(resolve, 800));
    
    playGlobalSound('win');
    setWonPrize(prize);
    setShowWinAnimation(true);

    if (!isSimulation) {
      queryClient.invalidateQueries({ queryKey: ["roulette_spins"] });
      queryClient.invalidateQueries({ queryKey: ["user-campaign-spins"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-roulette-spins", campaign.id] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "campaign-roulette-spins" && query.queryKey[1] === campaign.id,
      });
      queryClient.invalidateQueries({ queryKey: ["user-prizes-by-campaign", user?.id] });
      if (new_balance !== undefined) setUserProfile(prev => ({ ...prev, balance: new_balance }));

      if ((prize.prize_type as any) !== 'none') {
        setTimeout(async () => {
          await supabase.from("notifications").insert({
            user_id: user!.id,
            title: "Você ganhou na roleta!",
            message: `Parabéns! Você ganhou ${prize.label} na Roleta da Sorte.`,
            type: "win"
          });
        }, 100);
      }
    }

    setIsSpinning(false);
    
    if ((prize.prize_type as any) !== 'none') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: [prize.color || '#FACC15', '#ffffff']
      });

      if (isSimulation) {
        toast.success(`[Simulação] Você ganharia: ${prize.label}!`);
      } else {
        toast.success(`Parabéns! Você ganhou: ${prize.label}!`);
      }
    } else {
      toast.info("Não foi dessa vez! Tente novamente.");
    }
    
    setTimeout(() => {
      setShowWinAnimation(false);
      setWonPrize(null);
    }, 5000);

    if (onSpinComplete && !isSimulation) onSpinComplete(prize);
  };

  return (
    <div className="flex flex-col items-center gap-4 md:gap-8 pt-10 md:pt-12 pb-6 md:pb-10 relative overflow-hidden rounded-2xl md:rounded-3xl bg-black/40 border border-white/5 backdrop-blur-xl w-full">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden rounded-2xl md:rounded-3xl">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="flex flex-col items-center gap-4 z-10">
        <div className="flex items-center gap-3 w-full justify-center">
          <Badge className="bg-destructive/90 hover:bg-destructive text-white animate-pulse flex items-center gap-2 text-xs font-black px-3 py-1 border-none shadow-[0_0_15px_rgba(239,68,68,0.5)] uppercase italic">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> AO VIVO
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <button 
                disabled={isSpinning}
                className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-primary" /> 
                Regras
              </button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-black italic uppercase italic tracking-tighter flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Regras e Prêmios de Engajamento
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-black uppercase text-primary tracking-widest italic">Giros Grátis</h4>
                  {campaign.roulette_rules && campaign.roulette_rules.length > 0 ? (
                    <div className="space-y-2">
                      {campaign.roulette_rules.map((rule, i) => (
                        <p key={i} className="text-sm text-white/70 leading-relaxed flex items-center gap-2">
                          <Zap className="h-3 w-3 text-primary" />
                          Ganhe <span className="text-white font-bold">{rule.spins} {rule.spins > 1 ? 'giros' : 'giro'}</span> ao participar!
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/70 leading-relaxed">
                      Você ganha <span className="text-white font-bold">1 giro grátis</span> automaticamente ao realizar um pedido nesta campanha.
                    </p>
                  )}
                  <p className="text-[11px] text-white/40 italic mt-2">Os giros são liberados após a confirmação do pagamento.</p>
                </div>
                
                {campaign.prize_rules && campaign.prize_rules.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-black uppercase text-amber-500 tracking-widest italic">Prêmios de Engajamento</h4>
                    <div className="space-y-2">
                      {campaign.prize_rules.map((rule: any, i: number) => {
                        if (!rule.active) return null;
                        let ruleText = "";
                        let ruleIcon = <Trophy className="h-3 w-3 text-amber-500" />;
                        
                        if (rule.type === 'greater_smaller') {
                          ruleText = `Maior Cota: ${rule.prize_greater} | Menor Cota: ${rule.prize_smaller}`;
                        } else if (rule.type === 'mystery_box') {
                          ruleText = `Ganhe ${rule.reward_quantity} Caixa(s) Misteriosa(s) ao comprar ${rule.min_tickets} cotas`;
                          ruleIcon = <Gift className="h-3 w-3 text-purple-500" />;
                        } else if (rule.type === 'roulette') {
                          ruleText = `Ganhe ${rule.reward_quantity} Giro(s) de Roleta ao comprar ${rule.min_tickets} cotas`;
                          ruleIcon = <RotateCw className="h-3 w-3 text-primary" />;
                        } else if (rule.type === 'scratch_card') {
                          ruleText = `Ganhe ${rule.reward_quantity} Raspadinha(s) ao comprar ${rule.min_tickets} cotas`;
                          ruleIcon = <Sparkles className="h-3 w-3 text-amber-500" />;
                        }
                        
                        return (
                          <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/10">
                            <p className="text-xs text-white/70 leading-relaxed flex items-center gap-2">
                              {ruleIcon}
                              {ruleText}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <h4 className="text-sm font-black uppercase text-primary tracking-widest italic">Multiplicadores</h4>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Ao selecionar um multiplicador (ex: 2x, 5x, 10x), você aumenta o <span className="text-white font-bold">valor do prêmio</span> proporcionalmente, mas o custo do giro também aumenta na mesma proporção.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-black uppercase text-primary tracking-widest italic">Tipos de Prêmios</h4>
                  <ul className="text-sm text-white/70 space-y-2">
                    <li className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-yellow-400" />
                      <span className="font-bold text-white">Saldo:</span> Adicionado instantaneamente à sua carteira.
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span className="font-bold text-white">Cotas:</span> Números da sorte para a campanha atual.
                    </li>
                    <li className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-purple-400" />
                      <span className="font-bold text-white">Prêmios Físicos:</span> Nossa equipe entrará em contato para entrega.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] text-white/40 uppercase font-bold text-center tracking-widest">
                    Boa sorte! O sistema garante aleatoriedade total baseada nas chances de cada item.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-2 text-xs font-bold text-white/60 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
            <Users className="h-3.5 w-3.5 text-primary" /> 
            <span className="text-white">{stats?.onlineUsers || 1}</span> online
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl justify-center">
            <div className="flex flex-col items-center gap-1 px-8">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Giros Disponíveis</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-white/20 hover:text-white/40" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-900 border-white/10 text-[10px] max-w-[200px]">
                      <p>Participe de qualquer campanha para ganhar giros grátis.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-lg font-black text-primary flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                {availableSpins}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 animate-pulse">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              Participe e Ganhe Giros Grátis!
            </span>
          </div>
         </div>
       </div>
 
       {/* Live Win Feed */}
       <div className="w-full px-4 md:px-6 mb-2 md:mb-4">
         <div className="bg-white/5 border border-white/10 rounded-2xl p-2 md:p-3 backdrop-blur-md overflow-hidden relative">
           <div className="flex items-center gap-2 mb-1 md:mb-2">
             <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary animate-pulse" />
             <span className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-widest">Ganhadores em Tempo Real</span>
           </div>
           <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
             {globalSpins?.map((spin, i) => (
               <div key={i} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 flex-shrink-0">
                 <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black text-primary">
                   {spin.profiles?.name?.substring(0, 1)}
                 </div>
                 <span className="text-[10px] font-bold text-white">{spin.profiles?.name}</span>
                 <span className="text-[10px] text-white/40">ganhou</span>
                 <span className="text-[10px] font-black text-primary uppercase">{spin.prize_label}</span>
               </div>
             ))}
             {(!globalSpins || globalSpins.length === 0) && (
               <span className="text-[10px] text-white/20 italic">Aguardando novos giros...</span>
             )}
           </div>
         </div>
       </div>
 
       <div className="relative group scale-[0.45] xs:scale-[0.55] sm:scale-[0.75] md:scale-100 transition-transform duration-500">
        {/* Metallic Outer Ring */}
        <div className="absolute -inset-6 md:-inset-10 rounded-full border-[6px] md:border-[12px] border-white/5 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -inset-4 md:-inset-6 rounded-full border-[1px] md:border-[2px] border-white/20 pointer-events-none" />
        
        {/* Neon Ring */}
        <div className="absolute -inset-3 md:-inset-4 rounded-full border border-primary/30 shadow-[0_0_50px_rgba(var(--primary),0.2)] animate-pulse pointer-events-none" />

        {/* Pointer (Premium Metallic) */}
        <div className="absolute -top-6 md:-top-8 left-1/2 z-20 -translate-x-1/2 transform drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
          <div className="w-8 h-12 md:w-10 md:h-14 bg-gradient-to-b from-white via-zinc-200 to-zinc-400 clip-path-triangle rotate-180 relative">
             <div className="absolute inset-[2px] bg-gradient-to-b from-zinc-100 to-zinc-500 clip-path-triangle" />
          </div>
        </div>

        {/* Wheel */}
        <div className="relative h-48 w-48 sm:h-64 sm:w-64 md:h-[350px] md:w-[350px] rounded-full p-2 bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-[0_0_100px_rgba(0,0,0,0.8)] border-4 border-zinc-900 overflow-hidden">
          <motion.div
            animate={controls}
            initial={{ rotate: 0 }}
            className="relative h-full w-full rounded-full overflow-hidden shadow-inner"
            style={{ backfaceVisibility: "hidden" }}
            >
            {prizes.map((prize, i) => {
              const angle = 360 / prizes.length;
              const rotate = i * angle;
              return (
                <div
                  key={prize.id}
                  className="absolute inset-0 origin-center"
                  style={{
                    transform: `rotate(${rotate}deg)`,
                    backgroundColor: prize.color || (i % 2 === 0 ? "#111" : "#1a1a1a"),
                    clipPath: `polygon(50% 50%, ${50 - Math.tan((angle / 2 + 0.5) * Math.PI / 180) * 50}% 0%, ${50 + Math.tan((angle / 2 + 0.5) * Math.PI / 180) * 50}% 0%)`,
                    borderLeft: prizes.length > 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                  }}
                >
                  <div className="absolute top-4 sm:top-6 md:top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sm:gap-2 text-center" style={{ width: '60px' }}>
                    <span className="text-[8px] sm:text-[10px] md:text-[12px] font-black text-white uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] break-words leading-tight">
                      {prize.label}
                    </span>
                    {prize.prize_type === 'balance' && <Coins className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 drop-shadow-md" />}
                    {prize.prize_type === 'ticket' && <Star className="h-3 w-3 sm:h-4 sm:w-4 text-primary drop-shadow-md" />}
                  </div>
                </div>
              );
            })}
            
            {/* Light Bulbs around the edge */}
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="absolute w-2 h-2 rounded-full bg-white/40 border border-white/20"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${i * 30}deg) translate(0, -195px)`,
                }}
              />
            ))}
          </motion.div>
        </div>
        
        {/* Center hub */}
        <div className="absolute inset-0 m-auto h-20 w-20 md:h-28 md:w-28 rounded-full z-30 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-600 p-[2px] shadow-2xl">
            <div className="h-full w-full rounded-full bg-zinc-900 flex items-center justify-center border-4 border-zinc-800">
              <div className="flex flex-col items-center">
                <Star className="h-6 w-6 md:h-10 md:w-10 text-primary fill-primary animate-pulse drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="flex flex-col items-center gap-4 z-10 w-full px-6 pb-4">
          <div className="w-full md:w-72 space-y-3 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                <Gauge className="h-3 w-3" />
                Potência do Giro
              </span>
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter transition-colors",
                spinPower < 4 ? "bg-blue-500/20 text-blue-400" : 
                spinPower < 8 ? "bg-primary/20 text-primary" : 
                "bg-red-500/20 text-red-400"
              )}>
                {spinPower < 4 ? "Fraco" : spinPower < 8 ? "Moderado" : "Forte"}
              </span>
            </div>
            <Slider 
              value={[spinPower]} 
              max={10} 
              min={1}
              step={1} 
              onValueChange={(v) => setSpinPower(v[0])}
              disabled={isSpinning}
              className="py-2"
            />
          </div>

          <Button
            onClick={spin}
            disabled={isSpinning}
            size="lg"
            className="h-14 md:h-16 w-full md:w-72 gap-3 text-base md:text-lg font-black uppercase italic tracking-tighter bg-gradient-to-r from-primary to-purple-600 hover:scale-105 transition-all duration-300 shadow-[0_20px_40px_-15px_rgba(var(--primary),0.5)] border-none group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            {isSpinning ? (
              <RotateCw className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Zap className="h-6 w-6 fill-current" />
                {isSimulation ? "Simular Giro Grátis" : "Girar Agora"}
              </>
            )}
          </Button>
          
          <div className="flex items-center gap-2 text-white/40">
             <Zap className="h-4 w-4" />
             <span className="text-xs font-bold uppercase tracking-widest text-center">Gire e ganhe prêmios instantâneos</span>
          </div>
        </div>

      {/* Win Modal / Animation */}
      <AnimatePresence>
        {showWinAnimation && wonPrize && (wonPrize.prize_type as any) !== 'none' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-6 pointer-events-none"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <div className="relative flex flex-col items-center gap-6 p-10 rounded-[40px] bg-zinc-900 border-2 border-primary/50 shadow-[0_0_100px_rgba(var(--primary),0.3)] overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
              
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Trophy className="h-24 w-24 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
              </motion.div>
              
              <div className="text-center space-y-2">
                <h2 className="text-4xl md:text-6xl font-black uppercase italic italic text-white leading-none tracking-tighter">
                  PARABÉNS!
                </h2>
                <p className="text-primary font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Você acaba de ganhar
                  <Sparkles className="h-4 w-4" />
                </p>
              </div>

              <div className="bg-white/5 px-8 py-4 rounded-3xl border border-white/10 backdrop-blur-xl">
                <span className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
                  {wonPrize.label}
                </span>
              </div>

              <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-widest">
                O prêmio foi adicionado à sua conta
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .clip-path-triangle {
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }
      `}</style>
    </div>
  );
};

export default Roulette;