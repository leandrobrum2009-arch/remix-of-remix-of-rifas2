 import { useState, useEffect, useMemo, useRef } from "react";
 import { motion, AnimatePresence, useAnimation } from "framer-motion";
 import { 
   Gift, Sparkles, Box, Loader2, Trophy, Zap, 
   Coins, Package, Star, Crown, ChevronRight, X,
   ShoppingBag, Ticket, CreditCard
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { 
   MysteryBoxConfig, 
   MysteryBoxPrize, 
   useMysteryBoxWins
 } from "@/hooks/useData";
 import { toast } from "sonner";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { useQueryClient } from "@tanstack/react-query";
 import confetti from "canvas-confetti";
 import { formatDistanceToNow } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { playSound, hapticFeedback } from "@/lib/sounds";
 
interface MysteryBoxProps {
  boxes: MysteryBoxConfig[];
  campaignId?: string;
  isCompact?: boolean;
}

const RARITY_CONFIG = {
   common: { color: "#94a3b8", glow: "shadow-[0_0_20px_rgba(148,163,184,0.3)]", bg: "from-slate-500/20 to-slate-900/40", border: "border-slate-500/30", icon: Package, label: "Comum" },
   rare: { color: "#3b82f6", glow: "shadow-[0_0_30px_rgba(59,130,246,0.4)]", bg: "from-blue-600/20 to-blue-950/40", border: "border-blue-500/30", icon: Star, label: "Raro" },
   epic: { color: "#a855f7", glow: "shadow-[0_0_40px_rgba(168,85,247,0.5)]", bg: "from-purple-600/20 to-purple-950/40", border: "border-purple-500/30", icon: Zap, label: "Épico" },
   legendary: { color: "#eab308", glow: "shadow-[0_0_50px_rgba(234,179,8,0.6)]", bg: "from-amber-500/20 to-amber-950/40", border: "border-amber-500/40", icon: Crown, label: "Lendário" }
 };
 
 const SOUND_URLS = {
   shake: "https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3",
   reveal: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
   tick: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3",
   open: "https://assets.mixkit.co/active_storage/sfx/1103/1103-preview.mp3"
 };
 
const MysteryBox = ({ boxes, campaignId, isCompact }: MysteryBoxProps) => {
  const [selectedBox, setSelectedBox] = useState<MysteryBoxConfig | null>(null);
   const [isOpening, setIsOpening] = useState(false);
   const [isRevealing, setIsRevealing] = useState(false);
   const [winningPrize, setWinningPrize] = useState<MysteryBoxPrize | null>(null);
   const [userProfile, setUserProfile] = useState<any>(null);
   const { user } = useAuth();
   const queryClient = useQueryClient();
    const { data: recentWins } = useMysteryBoxWins(10);
    const boxControls = useAnimation();
 
   const [potentialPrizes, setPotentialPrizes] = useState<MysteryBoxPrize[]>([]);
 
   const fetchUserProfile = async () => {
     if (!user) return;
     const { data } = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
     setUserProfile(data);
   };
 
   useEffect(() => {
     fetchUserProfile();
   }, [user]);
 
   const handleStartOpening = async (box: MysteryBoxConfig) => {
     if (!user) {
       toast.error("Entre para abrir caixas!");
       return;
     }
     if ((userProfile?.balance || 0) < Number(box.cost)) {
       toast.error("Saldo insuficiente!");
       return;
     }
      const { data: prizes, error: prizesError } = await supabase.from('mystery_box_prizes').select('*').eq('config_id', box.id);
      if (prizesError || !prizes || prizes.length === 0) {
        toast.error("Esta caixa está vazia no momento!");
        return;
      }
      setPotentialPrizes(prizes);
      setSelectedBox(box);
      setIsOpening(true);
    };
 
    const handleFinalOpen = async () => {
      if (!selectedBox || !user || !potentialPrizes.length) return;
      const { data, error } = await (supabase as any).rpc('process_mystery_box_open', {
        p_config_id: selectedBox.id,
      });

      if (error) {
        toast.error(error.message || "Erro ao abrir a caixa.");
        return;
      }

      const prize = (data as any)?.prize as MysteryBoxPrize;
      if (!prize) {
        toast.error("Não foi possível revelar o prêmio.");
        return;
      }

     setWinningPrize(prize);
      setIsRevealing(true);
      playSound('open');
      setUserProfile((prev: any) => ({ ...prev, balance: (data as any)?.new_balance ?? prev?.balance }));
      queryClient.invalidateQueries({ queryKey: ["mystery_box_wins"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      if (campaignId) {
        queryClient.invalidateQueries({ queryKey: ["campaign-mystery-box-wins", campaignId] });
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "campaign-mystery-box-wins" && query.queryKey[1] === campaignId,
        });
      }
   };
 
  const renderBoxes = () => (
    <div className={cn("grid", isCompact ? "gap-2" : "gap-4", boxes.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
      {boxes.map((box) => {
        const config = RARITY_CONFIG[box.rarity as keyof typeof RARITY_CONFIG];
        const Icon = config.icon;
        return (
          <motion.div
            key={box.id}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
             onClick={() => { handleStartOpening(box); playSound('click'); hapticFeedback(); }}
            className={cn("group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-500", isCompact ? "p-3" : "p-6 md:rounded-3xl", config.border, config.bg, "hover:" + config.glow)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-0" />
            <div className={cn("relative z-10", isCompact ? "space-y-2" : "space-y-4")}>
              <div className="flex items-center justify-between">
                <Badge className="bg-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-widest">{config.label}</Badge>
                <Icon className={cn("opacity-50", isCompact ? "h-4 w-4" : "h-5 w-5")} style={{ color: config.color }} />
              </div>
              <div className={cn("relative flex items-center justify-center", isCompact ? "py-2" : "aspect-square py-4")}>
                 <motion.div animate={{ y: [0, -10, 0], rotate: [0, -2, 2, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                    <Box className={cn("drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-500", isCompact ? "h-14 w-14" : "h-24 w-24")} style={{ color: config.color }} />
                 </motion.div>
              </div>
              <div className="text-center space-y-1">
                <h3 className={cn("font-black uppercase tracking-tighter", isCompact ? "text-xs" : "text-lg")}>{box.name}</h3>
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Coins className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
                  <span className={cn("font-bold", isCompact ? "text-sm" : "text-xl")}>R$ {Number(box.cost).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className={cn("space-y-6", isCompact && "relative")}>
      {/* Dynamic Rule Legend (Admin Configured) */}
      {boxes.length > 1 && (
        <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-black uppercase tracking-widest text-orange-500">Caixas Surpresas</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase italic">Escolha uma caixa para abrir. Cada caixa tem seu próprio conjunto de prêmios e chances.</p>
        </div>
      )}

      <div className={isCompact ? "" : "space-y-8"}>
        {isCompact ? (
          renderBoxes()
        ) : false ? (
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/50 border border-border hover:border-orange-500/50 hover:bg-card transition-all group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-tight text-foreground">Caixas Misteriosas</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Abra caixas e ganhe prêmios</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-500/10 text-orange-500 border-none text-[9px] font-black">{boxes.length} Opções</Badge>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl bg-zinc-950/95 border-white/10 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2">
                  <Gift className="h-5 w-5 text-orange-500" /> Caixas <span className="text-orange-500">Misteriosas</span>
                </DialogTitle>
              </DialogHeader>
              <div className="py-6 overflow-y-auto max-h-[70vh] no-scrollbar">
                {renderBoxes()}
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          renderBoxes()
        )}
      </div>

       <AnimatePresence>
         {isOpening && selectedBox && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn(
             "flex items-center justify-center bg-black/95 backdrop-blur-xl",
             isCompact ? "absolute inset-0 z-30 p-3 rounded-2xl" : "fixed inset-0 z-[100] p-4"
           )}>
             <button onClick={() => { setIsOpening(false); setIsRevealing(false); setWinningPrize(null); }} className={cn("absolute text-white/40 hover:text-white", isCompact ? "top-2 right-2" : "top-8 right-8")}><X className={isCompact ? "h-5 w-5" : "h-8 w-8"} /></button>
             <div className={cn("w-full text-center", isCompact ? "max-w-xs space-y-4" : "max-w-xl space-y-12")}>
               {!isRevealing ? (
                <div className={isCompact ? "space-y-4" : "space-y-8"}>
                  <div className="relative inline-block">
                    <motion.div
                      animate={{ 
                        y: [0, -20, 0],
                        rotate: [0, -5, 5, -5, 5, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="relative z-10"
                    >
                      <Box className={isCompact ? "h-24 w-24" : "h-64 w-64"} style={{ color: RARITY_CONFIG[selectedBox.rarity as keyof typeof RARITY_CONFIG].color }} />
                    </motion.div>
                    {/* Neon Smoke Effect */}
                    <div className="absolute inset-0 -z-10">
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 blur-3xl opacity-30 rounded-full"
                        style={{ backgroundColor: RARITY_CONFIG[selectedBox.rarity as keyof typeof RARITY_CONFIG].color }}
                      />
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-primary/20 via-transparent to-transparent blur-2xl" />
                    </div>
                  </div>

                  <div className={isCompact ? "space-y-2" : "space-y-4"}>
                    <h2 className={cn("font-black uppercase italic tracking-tighter text-white", isCompact ? "text-lg" : "text-4xl")}>
                      CAIXA <span style={{ color: RARITY_CONFIG[selectedBox.rarity as keyof typeof RARITY_CONFIG].color }}>{selectedBox.rarity.toUpperCase()}</span>
                    </h2>
                    <p className={cn("text-white/60 uppercase tracking-widest font-bold", isCompact ? "text-[10px]" : "text-sm")}>Confirmar abertura por R$ {Number(selectedBox.cost).toFixed(2)}?</p>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <Button 
                      size={isCompact ? "sm" : "lg"}
                      onClick={handleFinalOpen} 
                      className={cn("rounded-2xl font-black uppercase italic tracking-widest glow-primary", isCompact ? "h-10 px-6 text-sm" : "h-16 px-12 text-xl")}
                    >
                      ABRIR AGORA
                    </Button>
                  </div>
                </div>
              ) : (
                <OpeningAnimation 
                  prize={winningPrize} 
                  potentialPrizes={potentialPrizes} 
                  rarityColor={RARITY_CONFIG[selectedBox.rarity as keyof typeof RARITY_CONFIG].color} 
                  playSound={playSound}
                  onComplete={() => { 
                    playSound('reveal');
                    confetti({ 
                      particleCount: 150, 
                      spread: 70, 
                      origin: { y: 0.6 }, 
                      colors: [RARITY_CONFIG[selectedBox.rarity as keyof typeof RARITY_CONFIG].color, '#ffffff'] 
                    }); 
                  }} 
                />
              )}
            </div>
          </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

 const OpeningAnimation = ({ prize, potentialPrizes, rarityColor, onComplete, playSound }: any) => {
   const [stage, setStage] = useState<'shake' | 'roll' | 'reveal'>('shake');
   useEffect(() => {
     const sequence = async () => {
       playSound('shake');
       await new Promise(r => setTimeout(r, 1500));
       setStage('roll');
       
       // Ticks during roll
       const tickInterval = setInterval(() => playSound('tick'), 200);
       setTimeout(() => clearInterval(tickInterval), 3800);
       
       await new Promise(r => setTimeout(r, 4000));
       setStage('reveal');
       onComplete();
     };
     sequence();
   }, []);
   return (
     <div className="relative min-h-[400px] flex items-center justify-center">
       <AnimatePresence mode="wait">
         {stage === 'shake' && (
           <motion.div key="shaking" exit={{ scale: 0, opacity: 0 }} className="relative">
              <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0], y: [0, -20, 0] }} transition={{ duration: 0.3, repeat: 5 }}>
                <Box className="h-48 w-48" style={{ color: rarityColor }} />
              </motion.div>
              <p className="mt-8 text-xl font-black uppercase italic tracking-widest animate-pulse">Sintonizando Sorte...</p>
           </motion.div>
         )}
         {stage === 'roll' && (
           <motion.div key="rolling" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full relative py-20 overflow-hidden">
             <div className="flex items-center justify-center relative">
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-primary/50 z-20" />
                <motion.div initial={{ x: 1000 }} animate={{ x: -2000 }} transition={{ duration: 4, ease: [0.2, 0, 0.1, 1] }} className="flex gap-4 items-center">
                  {[...potentialPrizes, ...potentialPrizes, ...potentialPrizes].map((p, i) => (
                    <div key={i} className={cn("flex-shrink-0 w-32 h-44 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center p-4 gap-3", p.id === prize?.id ? "border-primary/50 bg-primary/10" : "")}>
                      <div className="h-16 w-16 rounded-xl bg-black/40 flex items-center justify-center"><PrizeIcon type={p.prize_type} className="h-8 w-8 text-white/60" /></div>
                      <span className="text-[10px] font-black uppercase tracking-tighter text-center leading-none">{p.title}</span>
                    </div>
                  ))}
                </motion.div>
             </div>
           </motion.div>
         )}
         {stage === 'reveal' && (
           <motion.div key="reveal" initial={{ scale: 0, rotate: -180, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", damping: 12 }} className="space-y-8">
            <div className="relative inline-block perspective-1000">
              <motion.div 
                initial={{ rotateY: 90, scale: 0.5 }}
                animate={{ rotateY: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="w-72 h-96 rounded-2xl md:rounded-[3rem] border-4 bg-zinc-950 relative overflow-hidden group holographic-card shadow-2xl"
                style={{ borderColor: rarityColor }}
              >
                {/* Premium Reflections */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/10 opacity-30 z-10" />
                <motion.div 
                  animate={{ x: [-200, 400] }} 
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-20 bg-white/20 blur-2xl -skew-x-12 z-20"
                />
                
                <div className="relative h-full flex flex-col items-center justify-center p-8 gap-8 z-30">
                   <div className="h-28 w-28 rounded-xl md:rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <PrizeIcon type={prize?.prize_type} className="h-16 w-16" style={{ color: rarityColor }} />
                   </div>
                   
                   <div className="space-y-3">
                     <Badge className="bg-white/10 text-white border-white/20 text-[10px] font-black italic px-4">ITEM DESBLOQUEADO</Badge>
                     <h2 className="text-3xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{prize?.title}</h2>
                     <p className="text-sm text-white/50 font-bold uppercase tracking-widest">{prize?.description || 'Prêmio Instantâneo'}</p>
                   </div>

                   {prize?.prize_value > 0 && (
                     <div className="pt-2">
                       <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Valor do Resgate</p>
                       <p className="text-3xl font-black italic" style={{ color: rarityColor }}>R$ {Number(prize.prize_value).toFixed(2)}</p>
                     </div>
                   )}
                </div>

                {/* Holographic Overlays */}
                <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
              </motion.div>
            </div>
             <Button onClick={() => window.location.reload()} className="h-14 rounded-2xl font-black uppercase tracking-widest italic text-lg glow-primary">Abrir Outra</Button>
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
 };
 
 const PrizeIcon = ({ type, className, style }: { type: string, className?: string, style?: any }) => {
   switch (type) {
    case 'cash': return <CreditCard className={className} style={style} />;
    case 'credits': return <Coins className={className} style={style} />;
    case 'product': return <ShoppingBag className={className} style={style} />;
    case 'tickets': return <Ticket className={className} style={style} />;
    case 'vip': return <Crown className={className} style={style} />;
    default: return <Gift className={className} style={style} />;
   }
 };
 
 export default MysteryBox;
