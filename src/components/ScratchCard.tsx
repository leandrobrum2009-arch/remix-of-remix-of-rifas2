import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Zap, RefreshCw, Gift, History, Clock, User, Loader2, RotateCw, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { playSound, hapticFeedback } from "@/lib/sounds";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalScratchCardScratches } from "@/hooks/useData";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScratchCardProps {
  prizeLabel?: string;
  prizeImage?: string;
  isWinner?: boolean;
  onComplete?: () => void;
  onStart?: () => void;
  cost?: number;
  potentialPrizes?: string[];
  isSimulation?: boolean;
  campaignId?: string;
  availableScratches?: number;
}

const ScratchCard = ({ 
  prizeLabel: initialPrizeLabel, 
  prizeImage, 
  isWinner: initialIsWinner, 
  onComplete, 
  onStart, 
  cost = 0,
  potentialPrizes = [],
  isSimulation = false,
  campaignId,
  availableScratches = 0
}: ScratchCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: globalWins } = useGlobalScratchCardScratches(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const [prizeLabel, setPrizeLabel] = useState(initialPrizeLabel || "");
  const [isWinner, setIsWinner] = useState(initialIsWinner ?? false);
  const [localHistory, setLocalHistory] = useState<{name: string, prize: string, time: string, isWinner: boolean}[]>([]);
  
  // Create a 3x3 grid of symbols for credibility
  const [gridSymbols, setGridSymbols] = useState<string[]>([]);

  const history = useMemo(() => {
    if (!globalWins || !Array.isArray(globalWins)) return localHistory.slice(0, 10);

    const apiHistory = globalWins.map(win => ({
      name: win.profiles?.name || "Usuário",
      prize: win.prize_label || "Prêmio",
      time: win.created_at ? formatDistanceToNow(new Date(win.created_at), { addSuffix: true, locale: ptBR }) : "Agora",
      isWinner: win.is_winner
    }));
    
    return [...localHistory, ...apiHistory].slice(0, 10);
  }, [globalWins, localHistory]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const isDrawingRef = useRef(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const lastPosRef = useRef<{x: number, y: number} | null>(null);

  const initCanvas = useCallback(() => {
    if (canvasRef.current && canvasSize.width > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";

      // Premium golden foil layer
      const gradient = ctx.createLinearGradient(0, 0, canvasSize.width, canvasSize.height);
      gradient.addColorStop(0, "#d4a437");
      gradient.addColorStop(0.45, "#f4d976");
      gradient.addColorStop(0.55, "#fff3b0");
      gradient.addColorStop(1, "#b8861f");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Subtle shimmer streaks
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1.5;
      for (let i = -canvasSize.height; i < canvasSize.width; i += 14) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + canvasSize.height, canvasSize.height);
        ctx.stroke();
      }

      // Vignette
      const vignette = ctx.createRadialGradient(
        canvasSize.width / 2, canvasSize.height / 2, canvasSize.width * 0.2,
        canvasSize.width / 2, canvasSize.height / 2, canvasSize.width * 0.75
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Centered "RASPE AQUI" label
      ctx.fillStyle = "rgba(60, 35, 0, 0.75)";
      ctx.font = "900 28px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("RASPE AQUI", canvasSize.width / 2, canvasSize.height / 2 - 6);
      ctx.fillStyle = "rgba(60, 35, 0, 0.55)";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.fillText("USE O DEDO OU O MOUSE", canvasSize.width / 2, canvasSize.height / 2 + 22);
    }
  }, [canvasSize]);

  useEffect(() => {
    initCanvas();
  }, [canvasSize, initCanvas]);

  const generateGrid = useCallback((winner: boolean, label: string) => {
    const symbols = Array(9).fill("Tente novamente");
    const otherPrizes = (potentialPrizes && potentialPrizes.length > 0) 
      ? potentialPrizes.filter(p => p !== label)
      : ["R$ 5", "R$ 10", "Giro Grátis", "VIP"];

    if (winner && label) {
      // Place 3 winning symbols in random positions
      const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);
      symbols[positions[0]] = label;
      symbols[positions[1]] = label;
      symbols[positions[2]] = label;
      
      // Fill the rest with random stuff
      for (let i = 3; i < 9; i++) {
        symbols[positions[i]] = otherPrizes[Math.floor(Math.random() * otherPrizes.length)];
      }
    } else {
      // Fill with random stuff but no 3-matches
      const usedCounts: Record<string, number> = {};
      for (let i = 0; i < 9; i++) {
        let pool = [...otherPrizes, "Tente novamente"];
        let choice = pool[Math.floor(Math.random() * pool.length)];
        
        // Ensure no 3 matches
        while (usedCounts[choice] >= 2) {
          choice = pool[Math.floor(Math.random() * pool.length)];
        }
        
        symbols[i] = choice;
        usedCounts[choice] = (usedCounts[choice] || 0) + 1;
      }
    }
    setGridSymbols(symbols);
  }, [potentialPrizes]);

  useEffect(() => {
    // Initial random grid
    if (gridSymbols.length === 0) {
      generateGrid(false, "");
    }
  }, [generateGrid, gridSymbols.length]);

  const resetScratchCard = () => {
    setHasStarted(false);
    setIsScratched(false);
    setApiReady(false);
    setScratchPercentage(0);
    isDrawingRef.current = false;
    lastPosRef.current = null;
    setPrizeLabel("");
    setIsWinner(false);
    setGridSymbols([]);
    initCanvas();
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setCanvasSize({ width, height });
        }
      }
    };

    // Initial size update
    const timeoutId = setTimeout(updateSize, 100);
    
    const observer = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  const getPointerPos = (e: React.PointerEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startScratch = async () => {
    if (isSimulation) {
      const winner = Math.random() > 0.7;
      const label = winner ? "R$ 10,00 Simulado" : "Tente novamente";
      setIsWinner(winner);
      setPrizeLabel(label);
      generateGrid(winner, label);
      setApiReady(true);
      return;
    }

    if (!user) {
      toast.error("Entre para jogar e ganhar prêmios reais!");
      isDrawingRef.current = false;
      setHasStarted(false);
      return;
    }

    if (availableScratches <= 0 && cost <= 0) {
      toast.error("Você não possui raspadinhas disponíveis!");
      isDrawingRef.current = false;
      setHasStarted(false);
      return;
    }

    setIsProcessing(true);
    if (onStart) onStart();
    try {
      const { data, error } = await supabase.rpc('process_scratch_card_play', {
        p_campaign_id: campaignId || null,
        p_cost: Number(cost) || 0
      });

      if (error) {
        toast.error(error.message || "Erro ao processar a raspadinha");
        setHasStarted(false);
        isDrawingRef.current = false;
        throw error;
      }

      const res = data as any;
      const winner = res.is_winner;
      const label = winner ? (res.prize?.label || "Prêmio!") : "Tente novamente";
      
      setIsWinner(winner);
      setPrizeLabel(label);
      generateGrid(winner, label);
      setApiReady(true);
      
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-campaign-scratches"] });
      if (campaignId) {
        queryClient.invalidateQueries({ queryKey: ["campaign-scratch-wins", campaignId] });
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "campaign-scratch-wins" && query.queryKey[1] === campaignId,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-scratch-card-stats"] });
    } catch (error: any) {
      console.error("Scratch error:", error);
      setHasStarted(false);
      isDrawingRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  const scratch = (x: number, y: number) => {
    if (!canvasRef.current || isScratched) return;

    if (!hasStarted) {
      setHasStarted(true);
      startScratch();
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 80;

    if (lastPosRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    lastPosRef.current = { x, y };

    // Sample percentage cheaply on a downscaled grid
    if (Math.random() > 0.75) {
      const step = 12;
      const w = canvas.width;
      const h = canvas.height;
      const sample = ctx.getImageData(0, 0, w, h).data;
      let cleared = 0;
      let total = 0;
      for (let py = 0; py < h; py += step) {
        for (let px = 0; px < w; px += step) {
          const idx = (py * w + px) * 4 + 3;
          if (sample[idx] === 0) cleared++;
          total++;
        }
      }
      const percentage = (cleared / total) * 100;
      setScratchPercentage(percentage);
      if (percentage > 40 && !isScratched) {
        reveal();
      }
    }
  };

  const reveal = () => {
    setIsScratched(true);
    lastPosRef.current = null;
    // Fully clear so the prize is fully visible
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (isWinner && prizeLabel !== "Tente novamente") {
      playSound('win');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      const newEntry = {
        name: "Você",
        prize: prizeLabel,
        time: "Agora",
        isWinner: true
      };
      setLocalHistory(prev => [newEntry, ...prev].slice(0, 5));
      
      if (!isSimulation && user) {
        supabase.from("notifications").insert({
          user_id: user.id,
          title: "Ganhou na raspadinha!",
          message: `Parabéns! Você ganhou ${prizeLabel} na raspadinha.`,
          type: "win"
        }).then(({ error }) => {
          if (error) console.error("Error inserting notification:", error);
        });
      }
    } else {
      const newEntry = {
        name: "Você",
        prize: "Tente novamente",
        time: "Agora",
        isWinner: false
      };
      setLocalHistory(prev => [newEntry, ...prev].slice(0, 5));
    }
    if (onComplete) onComplete();
    queryClient.invalidateQueries({ queryKey: ["global-scratch-card-scratches"] });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isScratched || isProcessing) return;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const { x, y } = getPointerPos(e);
    scratch(x, y);
    hapticFeedback();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    const { x, y } = getPointerPos(e);
    scratch(x, y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    try { (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto p-4 md:p-6 rounded-3xl bg-zinc-900/50 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden relative">
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/20 blur-[80px] rounded-full" />

      <div className="w-full flex justify-between items-center z-10">
        <Badge className={cn("bg-primary/20 text-primary border-none text-[10px] font-black uppercase tracking-widest", isSimulation && "bg-amber-500/20 text-amber-500")}>
          {isSimulation ? "Simulador de Sorte" : "Raspadinha Premiada"}
        </Badge>
        <div className="flex items-center gap-2">
           <div className={cn("h-2 w-2 rounded-full animate-pulse", isSimulation ? "bg-amber-500" : "bg-green-500")} />
           <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
             {isSimulation ? "Versão de Teste" : "Ativo Agora"}
           </span>
        </div>
      </div>

      <div className="text-center space-y-2 z-10">
        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-tight">
          Tente a sua <span className="text-primary neon-text-primary">Sorte</span>!
        </h2>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
            Raspe o cartão e descubra seu prêmio instantâneo
          </p>
          {!isSimulation && (
            <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-black uppercase italic mt-1">
              {availableScratches} {availableScratches === 1 ? 'raspadinha disponível' : 'raspadinhas disponíveis'}
            </Badge>
          )}
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10 bg-zinc-950 group"
        style={{ cursor: isScratched ? "default" : "grab", touchAction: "none" }}
      >
        {/* Background revealed when scratched: single bold prize reveal */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 text-center">
          {apiReady ? (
            <>
              <div className={cn(
                "h-20 w-20 md:h-24 md:w-24 rounded-full flex items-center justify-center mb-3 border",
                isWinner ? "bg-primary/15 border-primary/40 shadow-[0_0_40px_rgba(34,197,94,0.4)]" : "bg-white/5 border-white/10"
              )}>
                {isWinner ? (
                  <Trophy className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                ) : (
                  <Zap className="h-10 w-10 md:h-12 md:w-12 text-white/30" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.25em] mb-1",
                isWinner ? "text-primary" : "text-white/40"
              )}>
                {isWinner ? "Você Ganhou" : "Não foi dessa vez"}
              </span>
              <span className={cn(
                "text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none",
                isWinner ? "text-white" : "text-white/60"
              )}>
                {prizeLabel || "Tente novamente"}
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-40">
              <Gift className="h-14 w-14 text-white/40" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Prêmio Surpresa</span>
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none z-10">
          {isProcessing && !apiReady && scratchPercentage > 40 && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-2xl">
              <div className="bg-zinc-900/90 p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center gap-3 scale-90 md:scale-100">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-bold text-white uppercase tracking-widest">Validando Sorte...</p>
              </div>
            </div>
          )}
        </div>

        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none" }}
          className={cn(
            "absolute inset-0 z-20 transition-opacity duration-500 select-none",
            (isScratched) && "opacity-0 pointer-events-none",
            isProcessing && "cursor-wait"
          )}
        />

        {!hasStarted && !isScratched && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full border border-white/10"
          >
            <Hand className="h-3 w-3 text-white/70 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Arraste para raspar</span>
          </motion.div>
        )}
      </div>

      <div className="w-full flex flex-col gap-4 z-10">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
           <span>Área raspada: {Math.round(scratchPercentage)}%</span>
           {cost > 0 && <span>Custo: R$ {cost.toFixed(2)}</span>}
        </div>
        
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${scratchPercentage}%` }}
          />
        </div>

        {isScratched && !isProcessing && (
          <Button 
            className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest glow-primary group"
            onClick={resetScratchCard}
          >
            TENTAR NOVAMENTE <RefreshCw className="ml-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
          </Button>
        )}
      </div>

      <div className="pt-4 border-t border-white/5 w-full flex flex-col gap-4">
        <div className="flex justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <Trophy className="h-4 w-4 text-primary opacity-50" />
            <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">Grandes Prêmios</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-amber-500 opacity-50" />
            <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">Instantâneo</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Gift className="h-4 w-4 text-secondary opacity-50" />
            <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">Prêmios VIP</span>
          </div>
        </div>
      </div>

      <div className="w-full mt-4 space-y-3 z-10 text-left">
        {/* Campaign Reward Rules Section */}
        {potentialPrizes && potentialPrizes.length > 0 && (
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-white">REGRAS DE RECOMPENSA</span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-white/60 font-medium italic">Ao comprar cotas nesta campanha, você pode desbloquear:</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-bold text-white/80 uppercase">Giros de Roleta</span>
                  </div>
                  <span className="text-[9px] font-black text-primary italic uppercase tracking-tighter">Bônus Automático</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Gift className="h-3 w-3 text-purple-500" />
                    <span className="text-[10px] font-bold text-white/80 uppercase">Itens Misteriosos</span>
                  </div>
                  <span className="text-[9px] font-black text-purple-500 italic uppercase tracking-tighter">Conforme Regulamento</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 px-1 pt-2">
          <History className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Histórico Recente</span>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
          <AnimatePresence>
            {history.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary opacity-60" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white">{item.name}</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-2 w-2 text-white/40" />
                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">{item.time}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-tighter",
                    item.isWinner ? "text-primary" : "text-white/40"
                  )}>
                    {item.prize}
                  </p>
                  <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
                    {item.isWinner ? "Ganhador" : "Participou"}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ScratchCard;