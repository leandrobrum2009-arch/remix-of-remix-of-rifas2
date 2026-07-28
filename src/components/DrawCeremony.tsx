import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Zap, Star, ShieldCheck, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playSound, hapticFeedback } from "@/lib/sounds";

interface DrawCeremonyProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any;
  manualNumber?: string;
  prizeIndex?: number;
  allowUnassigned?: boolean;
  onFinished: (winnerId: string) => void;
}

export const DrawCeremony = ({ 
  isOpen, 
  onOpenChange, 
  campaign, 
  manualNumber, 
  prizeIndex = 1, 
  allowUnassigned = false, 
  onFinished 
}: DrawCeremonyProps) => {
  const [phase, setStatus] = useState<'countdown' | 'rolling' | 'winner'>('countdown');
  const [countdown, setCountdown] = useState(5);
  const [rollingNumber, setRollingNumber] = useState("");
  const [winner, setWinner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const padLen = campaign?.total_tickets ? String(campaign.total_tickets).length : 6;

  useEffect(() => {
    if (isOpen) {
      startCeremony();
    } else {
      resetCeremony();
    }
  }, [isOpen]);

  const resetCeremony = () => {
    setStatus('countdown');
    setCountdown(5);
    setRollingNumber("");
    setWinner(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startCeremony = () => {
    playSound('hover');
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          startRolling();
          return 0;
        }
        playSound('click');
        return prev - 1;
      });
    }, 1000);
  };

  const startRolling = () => {
    setStatus('rolling');
    playSound('hover');
    
    let iterations = 0;
    const maxIterations = 40;
    
    const rollInterval = setInterval(() => {
      setRollingNumber(generateRandomNumber());
      iterations++;
      
      if (iterations >= maxIterations) {
        clearInterval(rollInterval);
        finishDraw();
      }
    }, 100);
  };

  const generateRandomNumber = () => {
    return Math.floor(Math.random() * (campaign?.total_tickets || 1000000))
      .toString()
      .padStart(padLen, '0');
  };

  const finishDraw = async () => {
    setLoading(true);
    try {
      let result;
      if (manualNumber) {
        result = await supabase.rpc('manual_perform_draw', {
          p_campaign_id: campaign.id,
          p_ticket_number: manualNumber,
          p_prize_index: prizeIndex
        });
      } else {
        result = await supabase.rpc('perform_draw', {
          p_campaign_id: campaign.id,
          p_prize_index: prizeIndex,
          p_allow_unassigned: allowUnassigned
        });
      }

      if (result.error) throw result.error;
      
      const winnerId = result.data;
      
      // Fetch winner details
      const { data: winnerData } = await supabase
        .from('winners')
        .select('*')
        .eq('id', winnerId)
        .single();
        
      setWinner(winnerData);
      setRollingNumber(winnerData.ticket_number);
      setStatus('winner');
      playSound('success');
      hapticFeedback();
      onFinished(winnerId);
    } catch (error: any) {
      toast.error("Erro no sorteio: " + error.message);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div className="relative min-h-[500px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-background via-background to-primary/5">
          
          {/* Animated Background Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -top-20 -right-20 w-64 h-64 bg-primary rounded-full blur-[100px]" 
            />
            <motion.div 
               animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.05, 0.15, 0.05]
              }}
              transition={{ duration: 7, repeat: Infinity }}
              className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-600 rounded-full blur-[100px]" 
            />
          </div>

          <AnimatePresence mode="wait">
            {phase === 'countdown' && (
              <motion.div 
                key="countdown"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className="text-center space-y-8 relative z-10"
              >
                <div className="h-20 w-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
                  O sorteio começará em...
                </h2>
                <div className="text-9xl font-black text-primary italic drop-shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]">
                  {countdown}
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em]">Prepare o seu coração</p>
              </motion.div>
            )}

            {phase === 'rolling' && (
              <motion.div 
                key="rolling"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-12 relative z-10 w-full"
              >
                <div className="space-y-4">
                  <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1 text-xs font-black uppercase tracking-widest italic animate-bounce">
                    🎰 SORTEANDO AGORA 🎰
                  </Badge>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">
                    Quem será o <span className="text-animate-gradient">Ganhador</span>?
                  </h2>
                </div>

                <div className="flex justify-center gap-3">
                  {rollingNumber.split("").map((digit, i) => (
                    <motion.div 
                      key={i}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="h-24 w-16 bg-card border-2 border-primary/30 rounded-2xl flex items-center justify-center text-5xl font-black text-primary shadow-xl shadow-primary/10 italic"
                    >
                      {digit}
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col items-center gap-4">
                   <Loader2 className="h-8 w-8 text-primary animate-spin" />
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Processando milhares de bilhetes...</p>
                </div>
              </motion.div>
            )}

            {phase === 'winner' && winner && (
              <motion.div 
                key="winner"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8 relative z-10 w-full"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full scale-150" 
                  />
                  <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-white/20 ring-8 ring-primary/10">
                    <Trophy className="h-16 w-16 text-white drop-shadow-lg" />
                  </div>
                  <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-amber-500 animate-pulse" />
                  <Sparkles className="absolute -bottom-4 -left-4 h-6 w-6 text-primary animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground leading-none">
                    TEMOS UM <span className="text-primary">VENCEDOR!</span>
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">Parabéns pela grande conquista</p>
                </div>

                <div className="bg-card/50 backdrop-blur-xl border border-primary/20 rounded-3xl p-8 space-y-6 shadow-xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                     <ShieldCheck className="h-24 w-24 text-primary" />
                   </div>
                   
                   <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nome do Ganhador</p>
                     <h3 className="text-3xl font-black text-foreground uppercase italic tracking-tight">{winner.winner_name}</h3>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-2xl bg-secondary/50 border border-border text-left">
                       <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Bilhete Premiado</p>
                       <p className="text-2xl font-mono font-black text-primary tracking-tighter italic">{winner.ticket_number}</p>
                     </div>
                     <div className="p-4 rounded-2xl bg-secondary/50 border border-border text-left">
                       <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Campanha</p>
                       <p className="text-xs font-black text-foreground uppercase truncate">{campaign.title}</p>
                     </div>
                   </div>
                </div>

                <Button 
                  onClick={() => onOpenChange(false)} 
                  className="w-full h-16 rounded-2xl font-black uppercase italic tracking-widest glow-primary text-lg"
                >
                  CONCLUIR CERIMÔNIA
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};