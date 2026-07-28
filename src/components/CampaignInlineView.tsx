import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Users, TrendingUp, Gift, Sparkles, RotateCw, ChevronDown, X, Loader2, Award, Crown, Zap, Ticket, Clock, Calendar, DollarSign, Star, PackageOpen
} from "lucide-react";
import { Share2, Info, BookOpen, MousePointer2, Bell, Smartphone, Video } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CampaignPricing from "./CampaignPricing";
import MysteryBox from "./MysteryBox";
import ScratchCard from "./ScratchCard";
import Roulette from "./Roulette";
import CountdownTimer from "./CountdownTimer";
import LiveStreamPlayer from "./LiveStreamPlayer";
import CampaignLiveDraw from "./CampaignLiveDraw";
import { toast } from "sonner";
import {
  Campaign, useMysteryBoxConfigs, useRoulettePrizes, useWinners, useCampaignRanking,
  useUserCampaignSpins, useUserCampaignScratches, useCampaignTicketStats, useLuckyHours, useMysteryBoxPrizes, useScratchCardPrizes,
  useCampaignRouletteSpins, useCampaignMysteryBoxWins, useCampaignScratchWins
} from "@/hooks/useData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCampaignDisplaySales } from "@/lib/campaign-progress";

interface Props {
  campaign: Campaign;
  onBuy: (qtyOrNumbers: number | string[]) => void;
  isPurchasing?: boolean;
  isGameInProgress: boolean;
  setIsGameInProgress: (v: boolean) => void;
  luckyNumbersStatus: Record<string, boolean>;
  userId?: string;
  sectionsOrder?: string[];
}

const DEFAULT_INLINE_SECTIONS = [
  "gallery", "header", "prizes", "progress", "purchase", "roulette_footer", "scratch_footer",
  "events", "timer", "live_stream", "live_draw", "steps", "ranking", "winners", "description", "faq", "cta"
];

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; tag?: string; right?: React.ReactNode; children: React.ReactNode; tone?: string }> = ({ icon, title, tag, right, children, tone = "primary" }) => (
  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md text-[12px]", `text-${tone}`)}>{icon}</span>
        <span className="text-xs font-black uppercase tracking-tight text-foreground truncate">{title}</span>
        {tag && <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">{tag}</span>}
      </div>
      {right}
    </div>
    <div className="p-2 space-y-1.5">{children}</div>
  </div>
);

const SectionCaption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-1 -mt-1 text-[10px] leading-snug text-muted-foreground font-medium">{children}</p>
);

const InlineRow: React.FC<{ left: React.ReactNode; right: React.ReactNode; tone?: "muted" | "won" | "primary"; icon?: React.ReactNode; onClick?: () => void; clickable?: boolean }> = ({ left, right, tone = "muted", icon, onClick, clickable }) => {
  const toneCls =
    tone === "won" ? "bg-primary/15 border-primary/40 text-foreground"
    : tone === "primary" ? "bg-indigo-500/15 border-indigo-500/30 text-foreground"
    : "bg-secondary/40 border-border/60 text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border px-3 h-9 text-[11px] font-bold transition-all",
        toneCls,
        clickable && "hover:scale-[1.01] hover:shadow-sm cursor-pointer active:scale-[0.99]",
        !clickable && "cursor-default"
      )}
    >
      <span className="flex items-center gap-2 min-w-0 truncate">{left}</span>
      <span className="flex items-center gap-2 shrink-0">{right}{icon}</span>
    </button>
  );
};

const ComboRow: React.FC<{ minTickets: number; chances: number; icon: React.ReactNode; accent: "orange" | "sky" | "rose" }> = ({ minTickets, chances, icon, accent }) => {
  const grad =
    accent === "orange" ? "from-orange-700 via-orange-600 to-amber-500"
    : accent === "sky" ? "from-sky-700 via-sky-600 to-cyan-500"
    : "from-rose-700 via-rose-600 to-pink-500";
  const ring =
    accent === "orange" ? "ring-orange-400/40 shadow-orange-500/20"
    : accent === "sky" ? "ring-sky-400/40 shadow-sky-500/20"
    : "ring-rose-400/40 shadow-rose-500/20";
  const iconColor = "text-white";
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-3 h-11 text-white shadow-lg bg-gradient-to-r ring-1",
        grad, ring
      )}
    >
      <span className="text-[11px] font-black uppercase tracking-tight">A partir de {minTickets} títulos</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{chances} chance(s) de contemplação</span>
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md bg-white/15", iconColor)}>{icon}</span>
      </div>
    </motion.div>
  );
};

const CampaignInlineView: React.FC<Props> = ({
  campaign, onBuy, isPurchasing, isGameInProgress, setIsGameInProgress, luckyNumbersStatus, userId, sectionsOrder
}) => {
  const campaignId = campaign.id;
  const { data: mysteryBoxes } = useMysteryBoxConfigs(campaignId);
  const { data: roulettePrizes } = useRoulettePrizes(campaignId);
  const { data: scratchPrizes } = useScratchCardPrizes(campaignId);
  const isFinished = campaign?.status === 'completed';
  const scratchEnabled = !isFinished && (!!(campaign as any)?.scratch_cards_enabled || (scratchPrizes?.length || 0) > 0);
  const rouletteEnabled = !isFinished && (!!(campaign as any)?.roulette_enabled || (roulettePrizes?.length || 0) > 0);
  const { data: luckyHours } = useLuckyHours(campaignId);
  const { data: allWinners } = useWinners();
  const { data: ranking } = useCampaignRanking(campaignId, 10);
  const { data: userSpins } = useUserCampaignSpins(userId || "", campaignId);
  const { data: userScratches } = useUserCampaignScratches(userId || "", campaignId);
  const { data: ticketStats } = useCampaignTicketStats(campaignId);
  const { data: rouletteWinSpins } = useCampaignRouletteSpins(campaignId, 200);
  const { data: boxWinList } = useCampaignMysteryBoxWins(campaignId, 200);
  const { data: scratchWinList } = useCampaignScratchWins(campaignId, 200);

  // Realtime: when anyone wins a roulette/scratch/box prize, refresh availability
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`campaign-prizes-${campaignId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roulette_spins', filter: `campaign_id=eq.${campaignId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-roulette-spins', campaignId] });
        if (userId) queryClient.invalidateQueries({ queryKey: ['user-campaign-spins', userId, campaignId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scratch_card_scratches', filter: `campaign_id=eq.${campaignId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-scratch-wins', campaignId] });
        if (userId) queryClient.invalidateQueries({ queryKey: ['user-campaign-scratches', userId, campaignId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mystery_box_wins' }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-mystery-box-wins', campaignId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [campaignId, userId, queryClient]);

  const [showBoxes, setShowBoxes] = useState(false);
  const [showRaspas, setShowRaspas] = useState(false);
  const [showRoletas, setShowRoletas] = useState(false);

  const userSpinsAvailable = useMemo(() => (userSpins || []).filter((s: any) => !s.prize_label).length, [userSpins]);
  const userScratchesAvailable = useMemo(() => (userScratches || []).filter((s: any) => !s.prize_label).length, [userScratches]);

  const luckyNumbers: any[] = campaign.lucky_numbers_prizes || [];

  // Win lookups: prizes already taken in this campaign (from actual game tables)
  const rouletteWinsByLabel = useMemo(() => {
    const map = new Map<string, any[]>();
    (rouletteWinSpins || []).forEach((s: any) => {
      if (!s.prize_label || s.prize_label === 'Tente novamente') return;
      const arr = map.get(s.prize_label) || [];
      arr.push(s);
      map.set(s.prize_label, arr);
    });
    return map;
  }, [rouletteWinSpins]);
  const scratchWinsByLabel = useMemo(() => {
    const map = new Map<string, any[]>();
    (scratchWinList || []).forEach((s: any) => {
      if (!s.prize_label) return;
      const arr = map.get(s.prize_label) || [];
      arr.push(s);
      map.set(s.prize_label, arr);
    });
    return map;
  }, [scratchWinList]);
  const boxWinsByName = useMemo(() => {
    const map = new Map<string, any[]>();
    (boxWinList || []).forEach((w: any) => {
      const key = w.config_id || w.box_name || w.prize_title || '';
      const arr = map.get(key) || [];
      arr.push(w);
      map.set(key, arr);
    });
    return map;
  }, [boxWinList]);

  // Counters used while rendering rows (fresh each render, so closing a game modal doesn't mark won rows as available again)
  const rouletteUsage = new Map<string, number>();
  const scratchUsage = new Map<string, number>();
  const boxUsage = new Map<string, number>();

  const takeWin = (map: Map<string, any[]>, usage: Map<string, number>, key: string) => {
    const pool = map.get(key) || [];
    const used = usage.get(key) || 0;
    if (used >= pool.length) return null;
    usage.set(key, used + 1);
    return pool[used];
  };

  const totalRouletteWins = (rouletteWinSpins || []).filter((s: any) => s.prize_label && s.prize_label !== 'Tente novamente').length;
  const totalScratchWins = (scratchWinList || []).length;
  const totalBoxWins = (boxWinList || []).length;

  const recentWinners = useMemo(() => {
    const rows = [
      ...((rouletteWinSpins || [])
        .filter((s: any) => s.prize_label && s.prize_label !== 'Tente novamente')
        .map((s: any) => ({ name: s.winner_name || s.profiles?.name || 'Ganhador', prize: s.prize_label, type: 'Roleta', created_at: s.created_at }))),
      ...((scratchWinList || [])
        .map((s: any) => ({ name: s.winner_name || s.profiles?.name || 'Ganhador', prize: s.prize_label, type: 'Raspadinha', created_at: s.created_at }))),
      ...((boxWinList || [])
        .map((w: any) => ({ name: w.winner_name || w.profiles?.name || 'Ganhador', prize: w.prize_title || w.box_name || 'Caixa premiada', type: 'Caixa', created_at: w.created_at }))),
      ...((allWinners || [])
        .filter((w: any) => w.campaign_id === campaignId)
        .map((w: any) => ({ name: w.winner_name || 'Ganhador', prize: w.prize_description || w.ticket_number || 'Prêmio', type: 'Cota', created_at: w.draw_date || w.created_at }))),
    ];
    return rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 6);
  }, [rouletteWinSpins, scratchWinList, boxWinList, allWinners, campaignId]);

  const activeSections = useMemo(() => {
    const configured = sectionsOrder?.length ? sectionsOrder : DEFAULT_INLINE_SECTIONS;
    if (campaign.show_timer && !configured.includes("timer")) {
      const headerIndex = configured.indexOf("header");
      const next = [...configured];
      next.splice(headerIndex >= 0 ? headerIndex + 1 : 1, 0, "timer");
      return next;
    }
    return configured;
  }, [campaign.show_timer, sectionsOrder]);

  const sectionOrderIndex = useMemo(() => new Map(activeSections.map((id, index) => [id, index])), [activeSections]);

  const SectionSlot = useCallback<React.FC<{ id: string; children: React.ReactNode }>>(({ id, children }) => {
    const order = sectionOrderIndex.get(id);
    if (order === undefined) return null;
    if (children === null || children === undefined || children === false) return null;
    return <div style={{ order }}>{children}</div>;
  }, [sectionOrderIndex]);

  const progress = useMemo(() => {
    if (!campaign) return 0;
    return getCampaignDisplaySales(campaign).rawProgress;
  }, [campaign]);

  const displaySoldTickets = useMemo(() => getCampaignDisplaySales(campaign).displaySoldTickets, [campaign]);

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-3">
      {/* HERO */}
      <SectionSlot id="gallery">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        {campaign.image_url && (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="w-full h-auto object-contain block"
          />
        )}
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-purple-500 text-white border-none text-[9px] font-black uppercase tracking-widest px-2 h-5 shadow-lg">
            {Math.round(progress)}%
          </Badge>
        </div>
        {(campaign as any).image_overlay_enabled !== false && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 space-y-1.5">
              {progress > 50 && (
                <Badge className="bg-purple-500 text-white border-none text-[9px] font-black uppercase tracking-widest px-2 h-5 shadow-lg">
                  Últimos {Math.max(1, 100 - Math.round(progress))}%
                </Badge>
              )}
              {!sectionOrderIndex.has("header") && (
                <>
                  <p className="text-base font-black uppercase italic tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{campaign.title}</p>
                  {campaign.subtitle && <p className="text-[10px] text-white/90 font-bold uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{campaign.subtitle}</p>}
                </>
              )}
            </div>
          </>
        )}
      </div>
      </SectionSlot>

      {/* PROGRESS BAR */}
      <SectionSlot id="progress">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-3 w-full bg-secondary/50 relative">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-emerald-400 transition-all" style={{ width: `${progress}%` }} />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-foreground/80">{progress.toFixed(1).replace('.', ',')}%</span>
        </div>
      </div>
      </SectionSlot>

      <SectionSlot id="header">
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-black uppercase tracking-widest px-2 h-5">
              {campaign.status === "active" ? "Sorteio Ativo" : campaign.status}
            </Badge>
            {campaign.draw_date && (
              <Badge variant="outline" className="text-[9px] h-5 px-2 font-black uppercase border-border">
                {new Date(campaign.draw_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </Badge>
            )}
            {Number(campaign.ticket_price) === 0 && (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[9px] font-black uppercase tracking-widest px-2 h-5">GRÁTIS</Badge>
            )}
          </div>
          <div>
            <h1 className="text-lg font-black uppercase italic tracking-tight leading-tight text-foreground">{campaign.title}</h1>
            {campaign.subtitle && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1 leading-snug">{campaign.subtitle}</p>}
          </div>
        </div>
      </SectionSlot>

      <SectionSlot id="features">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Zap, title: "Rápido", desc: "PIX instantâneo" },
            { icon: Trophy, title: "Transparente", desc: "Ganhadores reais" },
            { icon: Ticket, title: "Seguro", desc: "Cotas validadas" },
            { icon: Smartphone, title: "Mobile", desc: "Acompanhe tudo" },
          ].map((item, index) => (
            <div key={index} className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
              <item.icon className="h-4 w-4 mx-auto text-primary" />
              <p className="text-[10px] font-black uppercase tracking-tight text-foreground">{item.title}</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground truncate">{item.desc}</p>
            </div>
          ))}
        </div>
      </SectionSlot>

      {/* QUICK ACTION BUTTONS */}
      <SectionSlot id="prizes">
      <div className="space-y-2">
        <QuickActionPrizes
          mainPrizes={(campaign as any).main_prizes || []}
          mysteryBoxes={mysteryBoxes || []}
          scratchPrizes={scratchPrizes || []}
          roulettePrizes={roulettePrizes || []}
          boxWinsByKey={boxWinsByName}
          scratchWinsByLabel={scratchWinsByLabel}
          rouletteWinsByLabel={rouletteWinsByLabel}
        />
      </div>
      </SectionSlot>

      <SectionSlot id="ranking">
        <div className="space-y-2">
          {campaign.ranking_enabled && <QuickActionRanking ranking={ranking} />}
          <QuickActionExtremes campaignId={campaignId} />
        </div>
      </SectionSlot>

      {/* PRICING */}
      <SectionSlot id="purchase">
      <div className="rounded-2xl border border-border bg-card p-3">
        <CampaignPricing campaign={campaign} onBuy={onBuy} isPurchasing={isPurchasing} />
      </div>
      </SectionSlot>

      {/* MEU ACESSO - Entitlements do usuário após compra */}
      <SectionSlot id="purchase">
      {userId && (userSpinsAvailable > 0 || userScratchesAvailable > 0) && (
        <SectionCard
          icon={<Ticket className="h-3.5 w-3.5 text-emerald-400" />}
          title="Meu acesso"
          tag="Disponível"
        >
          <SectionCaption>
            Você comprou cotas e ganhou estas chances extras. Toque em cada item abaixo para usar.
          </SectionCaption>
          {userScratchesAvailable > 0 && (
            <InlineRow
              tone="won"
              left={<span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-sky-300" /><span>Raspadinhas para usar</span></span>}
              right={<span className="text-emerald-400 font-black">{userScratchesAvailable}</span>}
            />
          )}
          {userSpinsAvailable > 0 && (
            <InlineRow
              tone="won"
              left={<span className="flex items-center gap-2"><RotateCw className="h-3.5 w-3.5 text-rose-300" /><span>Giros de roleta</span></span>}
              right={<span className="text-emerald-400 font-black">{userSpinsAvailable}</span>}
            />
          )}
        </SectionCard>
      )}
      </SectionSlot>

      {/* TÍTULOS PREMIADOS */}
      <SectionSlot id="prizes">
      {luckyNumbers.length > 0 && (
        <SectionCard
          icon={<Trophy className="h-3.5 w-3.5 text-amber-500" />}
          title="Títulos premiados"
          right={<Badge variant="outline" className="text-[9px] h-5 px-2 font-black bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            {luckyNumbers.filter(p => luckyNumbersStatus[p.number]).length}/{luckyNumbers.length}
          </Badge>}
        >
          {luckyNumbers.slice(0, 9).map((p: any, i: number) => {
            const won = !!luckyNumbersStatus[p.number];
            const winner = (allWinners || []).find(w => w.campaign_id === campaignId && w.ticket_number === p.number);
            return (
              <InlineRow
                key={i}
                tone={won ? "won" : "muted"}
                left={<span className="font-mono font-black text-foreground">{p.number}</span>}
                right={
                  won && winner ? (
                    <span className="flex items-center gap-1.5 text-emerald-500 font-black">
                      {winner.winner_name?.split(' ')[0]} <Crown className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="text-[11px]">{p.prize ? `R$${p.prize}` : "Disponível"}</span>
                  )
                }
              />
            );
          })}
          {luckyNumbers.length > 9 && (
            <button className="w-full text-[10px] font-black uppercase text-primary py-1.5">▼ Mostrar Mais</button>
          )}
        </SectionCard>
      )}
      </SectionSlot>

      {/* CAIXAS - COMBOS */}
      <SectionSlot id="prizes">
      {campaign.mystery_box_enabled && Array.isArray(campaign.prize_rules) && (campaign.prize_rules as any[]).filter((r: any) => r.type === 'mystery_box').length > 0 && (
        <SectionCard icon={<Gift className="h-3.5 w-3.5 text-orange-500" />} title="Caixas Surpresas" tag="Combos">
          <SectionCaption>
            Comprando a quantidade mínima de cotas abaixo, você ganha aberturas grátis de Caixa Surpresa para concorrer aos prêmios listados acima.
          </SectionCaption>
          {(campaign.prize_rules as any[]).filter((r: any) => r.type === 'mystery_box').map((rule: any, i: number) => (
            <ComboRow key={i} minTickets={rule.min_tickets} chances={rule.reward_quantity || rule.quantity || 1} icon={<Gift className="h-4 w-4" />} accent="orange" />
          ))}
        </SectionCard>
      )}
      </SectionSlot>

      {/* CAIXAS GANHADORES (clicáveis abrem MysteryBox) */}
      <SectionSlot id="box_footer">
      {!isFinished && (mysteryBoxes?.length || 0) > 0 && (
        <SectionCard
          icon={<Gift className="h-3.5 w-3.5 text-orange-500" />}
          title="Caixas Surpresas"
          tag="Ganhadores"
          right={<Badge variant="outline" className="text-[9px] h-5 px-2 font-black bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            {totalBoxWins}/{(mysteryBoxes?.length || 0)}
          </Badge>}
        >
          {(showBoxes ? mysteryBoxes : mysteryBoxes?.slice(0, 10))?.map((box, i) => {
            const win: any = takeWin(boxWinsByName, boxUsage, box.id) || takeWin(boxWinsByName, boxUsage, box.name);
            return (
              <Dialog key={box.id} onOpenChange={(o) => { if (!o && isGameInProgress) return; }}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "relative flex w-full items-center justify-between gap-2 rounded-lg border px-3 h-10 text-[11px] font-bold transition-all overflow-hidden",
                      win
                        ? "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                        : "bg-orange-500/10 border-orange-500/40 text-foreground hover:scale-[1.01] hover:shadow-md hover:shadow-orange-500/30 animate-pulse"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0 truncate relative z-10">
                      <Gift className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                      <span className="text-foreground truncate font-black">Caixa #{i + 1}</span>
                      <span className="text-muted-foreground truncate">{box.name}</span>
                    </span>
                    <span className="shrink-0 relative z-10">
                      {win ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-black uppercase text-[10px]">
                          <Crown className="h-3 w-3" /> {(win.winner_name || win.profiles?.name || 'Ganhador').split(' ')[0]}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-300 font-black uppercase text-[10px] tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping" /> Disponível
                        </span>
                      )}
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm p-0 w-[94vw] sm:w-full max-h-[92vh] h-[92vh] overflow-hidden bg-zinc-950 border border-white/10 rounded-2xl flex flex-col"
                  onInteractOutside={(e) => { if (isGameInProgress) e.preventDefault(); }}
                  onEscapeKeyDown={(e) => { if (isGameInProgress) e.preventDefault(); }}>
                  <DialogHeader className="px-3 pt-3 pb-2 border-b border-white/10">
                    <DialogTitle className="text-sm font-black uppercase italic tracking-tighter flex items-center gap-2">
                      <Gift className="h-3.5 w-3.5 text-orange-500" /> {box.name}
                    </DialogTitle>
                    <DialogDescription className="text-[10px] text-muted-foreground">
                      Custo: R$ {Number(box.cost).toFixed(2)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-2 flex-1 overflow-y-auto relative">
                    <MysteryBox boxes={[box]} campaignId={campaignId} isCompact />
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
          {(mysteryBoxes?.length || 0) > 10 && (
            <button onClick={() => setShowBoxes(s => !s)} className="w-full text-[10px] font-black uppercase text-primary py-1.5 flex items-center justify-center gap-1">
              <ChevronDown className={cn("h-3 w-3 transition", showBoxes && "rotate-180")} /> {showBoxes ? "Mostrar Menos" : "Mostrar Mais"}
            </button>
          )}
        </SectionCard>
      )}
      </SectionSlot>

      {/* RASPADINHAS - COMBOS */}
      <SectionSlot id="scratch_footer">
      {scratchEnabled && Array.isArray(campaign.scratch_card_rules) && (campaign.scratch_card_rules as any[]).length > 0 && (
        <SectionCard icon={<Sparkles className="h-3.5 w-3.5 text-sky-400" />} title="Raspadinhas" tag="Combos">
          <SectionCaption>
            A cada faixa de cotas compradas você libera raspadinhas grátis com chance de ganhar saldo, pontos ou cotas extras.
          </SectionCaption>
          {(campaign.scratch_card_rules as any[]).map((rule: any, i: number) => (
            <ComboRow key={i} minTickets={rule.min_tickets} chances={rule.quantity || rule.spins || 1} icon={<Sparkles className="h-4 w-4" />} accent="sky" />
          ))}
        </SectionCard>
      )}
      </SectionSlot>

      {/* RASPADINHAS GANHADORES */}
      <SectionSlot id="scratch_footer">
      {scratchEnabled && (
        <SectionCard
          icon={<Sparkles className="h-3.5 w-3.5 text-sky-400" />}
          title="Raspadinhas"
          tag="Ganhadores"
          right={<Badge variant="outline" className="text-[9px] h-5 px-2 font-black bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            {totalScratchWins}/{(scratchPrizes?.length || 0)}
          </Badge>}
        >
          {((scratchPrizes && scratchPrizes.length > 0) ? scratchPrizes : []).map((prize: any, i: number) => {
            const win: any = takeWin(scratchWinsByLabel, scratchUsage, prize.label);
            const winnerName = win?.winner_name || win?.profiles?.name || 'Ganhador';
            return (
              <Dialog key={prize.id || i} onOpenChange={(o) => { if (!o && isGameInProgress) return; }}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "relative flex w-full items-center justify-between gap-2 rounded-lg border px-3 h-10 text-[11px] font-bold transition-all overflow-hidden",
                      win
                        ? "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                        : "bg-sky-500/10 border-sky-500/40 text-foreground hover:scale-[1.01] hover:shadow-md hover:shadow-sky-500/30 animate-pulse"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0 truncate relative z-10">
                      <Sparkles className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                      <span className="text-foreground truncate font-black">Raspadinha #{i + 1}</span>
                      <span className="text-muted-foreground truncate">{prize.label}</span>
                    </span>
                    <span className="shrink-0 relative z-10">
                      {win ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-black uppercase text-[10px]">
                          <Crown className="h-3 w-3" /> {winnerName.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sky-300 font-black uppercase text-[10px] tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping" /> Disponível
                        </span>
                      )}
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md p-0 bg-transparent border-none w-[95vw] md:w-full max-h-[90vh] overflow-y-auto"
                  onInteractOutside={(e) => { if (isGameInProgress) e.preventDefault(); }}
                  onEscapeKeyDown={(e) => { if (isGameInProgress) e.preventDefault(); }}>
                  <DialogHeader className="sr-only">
                    <DialogTitle>Raspadinha</DialogTitle>
                    <DialogDescription>Raspe e descubra seu prêmio</DialogDescription>
                  </DialogHeader>
                  <ScratchCard
                    potentialPrizes={[...(roulettePrizes?.map(p => p.label) || []), "R$ 100 no PIX", "R$ 50 no PIX"]}
                    isSimulation={false}
                    cost={campaign?.scratch_card_cost || 0}
                    campaignId={campaignId}
                    availableScratches={userScratchesAvailable}
                    onStart={() => setIsGameInProgress(true)}
                    onComplete={() => setIsGameInProgress(false)}
                  />
                </DialogContent>
              </Dialog>
            );
          })}
        </SectionCard>
      )}
      </SectionSlot>

      {/* ROLETAS - COMBOS */}
      <SectionSlot id="roulette_footer">
      {rouletteEnabled && Array.isArray(campaign.roulette_rules) && (campaign.roulette_rules as any[]).length > 0 && (
        <SectionCard icon={<RotateCw className="h-3.5 w-3.5 text-rose-500" />} title="Roletas Instantâneas" tag="Combos">
          <SectionCaption>
            Compre a partir da quantidade indicada e ganhe giros grátis na roleta para concorrer aos prêmios instantâneos.
          </SectionCaption>
          {(campaign.roulette_rules as any[]).map((rule: any, i: number) => (
            <ComboRow key={i} minTickets={rule.min_tickets} chances={rule.spins || 1} icon={<RotateCw className="h-4 w-4" />} accent="rose" />
          ))}
        </SectionCard>
      )}
      </SectionSlot>

      {/* EVENTOS E PREMIAÇÕES */}
      <SectionSlot id="events">
      {(luckyHours?.length || 0) > 0 && (
        <div className="rounded-2xl border border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-950/40 via-violet-950/30 to-purple-950/40 backdrop-blur-sm overflow-hidden shadow-[0_0_20px_rgba(217,70,239,0.15)]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-fuchsia-500/30 bg-fuchsia-500/10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-fuchsia-500/20 animate-pulse">
                <Clock className="h-3.5 w-3.5 text-fuchsia-300" />
              </span>
              <span className="text-xs font-black uppercase tracking-tight text-fuchsia-200 truncate">Hora Premiada</span>
              <Badge className="text-[9px] h-5 px-2 font-black bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40 animate-pulse">AO VIVO</Badge>
            </div>
            <span className="text-[9px] font-bold uppercase text-fuchsia-300/70 tracking-wider">{luckyHours?.length || 0}</span>
          </div>
          <div className="p-2 space-y-1.5">
          {luckyHours?.map((draw) => {
            const time = new Date(draw.draw_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const isDone = draw.status === 'completed';
            return (
              <div
                key={draw.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 h-9 text-[11px] font-bold",
                  isDone
                    ? "bg-emerald-500/15 border-emerald-500/40 text-foreground"
                    : "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-100"
                )}
              >
                <span className="flex items-center gap-2 min-w-0 truncate">
                    {draw.draw_type === 'greater_smaller'
                      ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      : <Clock className="h-3.5 w-3.5 text-fuchsia-300 shrink-0 animate-pulse" />}
                    <span className="truncate">{draw.title}</span>
                </span>
                <span className="shrink-0">
                  {isDone && draw.winner_name ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-black">
                      {draw.winner_name.split(' ')[0]} <Crown className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-200">{time}</span>
                  )}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      )}
      </SectionSlot>

      {/* ROLETAS GANHADORES (clicáveis) */}
      <SectionSlot id="roulette_footer">
      {rouletteEnabled && (roulettePrizes?.length || 0) > 0 && (
        <SectionCard
          icon={<RotateCw className="h-3.5 w-3.5 text-rose-500" />}
          title="Roletas Instantâneas"
          tag="Ganhadores"
          right={<Badge variant="outline" className="text-[9px] h-5 px-2 font-black bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            {totalRouletteWins}/{roulettePrizes?.length || 0}
          </Badge>}
        >
          {(showRoletas ? roulettePrizes : roulettePrizes?.slice(0, 10))?.map((prize, i) => {
            const win: any = takeWin(rouletteWinsByLabel, rouletteUsage, prize.label);
            const winnerName = win?.winner_name || win?.profiles?.name || 'Ganhador';
            return (
              <Dialog key={prize.id || i} onOpenChange={(o) => { if (!o && isGameInProgress) return; }}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "relative flex w-full items-center justify-between gap-2 rounded-lg border px-3 h-10 text-[11px] font-bold transition-all overflow-hidden",
                      win
                        ? "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                        : "bg-rose-500/10 border-rose-500/40 text-foreground hover:scale-[1.01] hover:shadow-md hover:shadow-rose-500/30 animate-pulse"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0 truncate relative z-10">
                      <RotateCw className="h-3.5 w-3.5 text-rose-300 shrink-0" />
                      <span className="text-foreground truncate font-black">Roleta #{i + 1}</span>
                      <span className="text-muted-foreground truncate">{prize.label}</span>
                    </span>
                    <span className="shrink-0 relative z-10">
                      {win ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-black uppercase text-[10px]">
                          <Crown className="h-3 w-3" /> {winnerName.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-300 font-black uppercase text-[10px] tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" /> Disponível
                        </span>
                      )}
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl p-0 bg-transparent border-none w-[95vw] md:w-full max-h-[90vh] overflow-y-auto"
                  onInteractOutside={(e) => { if (isGameInProgress) e.preventDefault(); }}
                  onEscapeKeyDown={(e) => { if (isGameInProgress) e.preventDefault(); }}>
                  <DialogHeader className="sr-only">
                    <DialogTitle>Roleta da Sorte</DialogTitle>
                    <DialogDescription>Gire a roleta e ganhe prêmios</DialogDescription>
                  </DialogHeader>
                  <Roulette
                    prizes={roulettePrizes || []}
                    campaign={campaign}
                    availableSpins={userSpinsAvailable}
                    onSpinStart={() => setIsGameInProgress(true)}
                    onSpinComplete={() => setIsGameInProgress(false)}
                  />
                </DialogContent>
              </Dialog>
            );
          })}
          {(roulettePrizes?.length || 0) > 10 && (
            <button onClick={() => setShowRoletas(s => !s)} className="w-full text-[10px] font-black uppercase text-primary py-1.5 flex items-center justify-center gap-1">
              <ChevronDown className={cn("h-3 w-3 transition", showRoletas && "rotate-180")} /> {showRoletas ? "Mostrar Menos" : "Mostrar Mais"}
            </button>
          )}
        </SectionCard>
      )}
      </SectionSlot>

      {/* TEMPO RESTANTE */}
      <SectionSlot id="timer">
      {campaign.show_timer && (campaign.timer_end_date || campaign.draw_date) && (
        <SectionCard icon={<Clock className="h-3.5 w-3.5 text-primary" />} title="Tempo restante" tag="Sorteio">
          <div className="flex flex-col items-center justify-center py-4 w-full">
            <CountdownTimer targetDate={campaign.timer_end_date || campaign.draw_date!} className="scale-125 sm:scale-150 origin-center my-3" />
          </div>
        </SectionCard>
      )}
      </SectionSlot>

      {/* TRANSMISSÃO AO VIVO */}
      <SectionSlot id="live_stream">
      {campaign.live_stream_enabled && campaign.live_stream_url && (
        <SectionCard icon={<Video className="h-3.5 w-3.5 text-rose-500" />} title="Ao vivo" tag="Transmissão">
          <div className="-mx-2 -mb-2 [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:h-auto [&_video]:w-full [&_video]:aspect-video [&_video]:h-auto">
            <LiveStreamPlayer url={campaign.live_stream_url} enabled={campaign.live_stream_enabled} campaignTitle={campaign.title} />
          </div>
        </SectionCard>
      )}
      </SectionSlot>

      {/* SORTEIO AO VIVO */}
      <SectionSlot id="live_draw">
      <div className="-mx-0">
        <CampaignLiveDraw campaign={campaign} />
      </div>
      </SectionSlot>

      {/* COMO PARTICIPAR */}
      <SectionSlot id="steps">
      <SectionCard icon={<Sparkles className="h-3.5 w-3.5 text-primary" />} title="Como participar" tag="3 passos">
        {[
          { step: "01", title: "Escolha suas cotas", desc: "Selecione a quantidade ou escolha seus números da sorte.", icon: MousePointer2 },
          { step: "02", title: "Pague via PIX", desc: "Pagamento instantâneo e seguro. Cotas validadas na hora.", icon: Zap },
          { step: "03", title: "Aguarde o sorteio", desc: "Acompanhe tudo em tempo real pelo seu painel.", icon: Trophy },
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
            <span className="h-10 w-10 rounded-lg bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">{s.step}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-tight text-foreground leading-tight">{s.title}</p>
              <p className="text-xs text-muted-foreground leading-snug mt-1">{s.desc}</p>
            </div>
            <s.icon className="h-5 w-5 text-primary/70 shrink-0 mt-0.5" />
          </div>
        ))}
      </SectionCard>
      </SectionSlot>

      {/* DESCRIÇÃO E REGULAMENTO */}
      <SectionSlot id="description">
      {(campaign.description || campaign.regulations) && (
        <SectionCard icon={<Info className="h-3.5 w-3.5 text-primary" />} title="Descrição e regras">
          <InlineDescription description={campaign.description} regulations={campaign.regulations} />
        </SectionCard>
      )}
      </SectionSlot>

      <SectionSlot id="winners">
        {recentWinners.length > 0 && (
        <SectionCard icon={<Trophy className="h-3.5 w-3.5 text-amber-500" />} title="Histórico de ganhadores" tag="Campanha">
          {recentWinners.map((winner, index) => (
            <div key={`${winner.type}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 h-10 text-[11px]">
              <span className="flex items-center gap-2 min-w-0">
                <Crown className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="font-black text-foreground truncate">{winner.name}</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase truncate max-w-[130px]">{winner.type}: {winner.prize}</span>
            </div>
          ))}
        </SectionCard>
        )}
      </SectionSlot>

      <SectionSlot id="social_proof">
        <SectionCard icon={<Star className="h-3.5 w-3.5 text-amber-500" />} title="Prova social" tag="Verificado">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Compradores", value: ranking?.length || 0 },
              { label: "Prêmios", value: recentWinners.length },
              { label: "Cotas", value: displaySoldTickets },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-secondary/30 p-2 text-center">
                <p className="text-sm font-black text-primary leading-none">{Number(item.value).toLocaleString("pt-BR")}</p>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-tight text-muted-foreground truncate">{item.label}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </SectionSlot>

      {/* FAQ */}
      <SectionSlot id="faq">
      <SectionCard icon={<Info className="h-3.5 w-3.5 text-primary" />} title="Dúvidas frequentes" tag="FAQ">
        {[
          { q: "Como os ganhadores são escolhidos?", a: "Sorteio automatizado e transparente entre os bilhetes pagos.", icon: Trophy },
          { q: "Como sei se ganhei?", a: "Aparece no painel de ganhadores e entramos em contato via WhatsApp.", icon: Bell },
          { q: "Quais as formas de pagamento?", a: "PIX com compensação imediata.", icon: Zap },
          { q: "Posso comprar quantas cotas quiser?", a: "Sim, até o limite da campanha. Mais cotas = mais chances.", icon: Ticket },
        ].map((item, i) => (
          <FaqRow key={i} q={item.q} a={item.a} Icon={item.icon} />
        ))}
      </SectionCard>
      </SectionSlot>

    </div>
  );
};

/* ============ Quick action buttons (open modals) ============ */

const InlineDescription: React.FC<{ description?: string | null; regulations?: string | null }> = ({ description, regulations }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <p className={cn("text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap", !open && "line-clamp-3")}>
        {description}
      </p>
      {open && regulations && (
        <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
            <BookOpen className="h-3 w-3 text-primary" /> Regulamento
          </p>
          <p className="text-[10px] whitespace-pre-wrap text-muted-foreground leading-relaxed">{regulations}</p>
        </div>
      )}
      {(description || regulations) && (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full text-[10px] font-black uppercase tracking-widest text-primary py-1.5 flex items-center justify-center gap-1"
        >
          {open ? <>Recolher <ChevronDown className="h-3 w-3 rotate-180" /></> : <>Ler tudo <ChevronDown className="h-3 w-3" /></>}
        </button>
      )}
    </div>
  );
};

const FaqRow: React.FC<{ q: string; a: string; Icon: any }> = ({ q, a, Icon }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-black uppercase tracking-tight text-foreground flex-1">{q}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="px-3 pb-2 text-[10px] text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
};

const QuickActionPrizes: React.FC<{
  mainPrizes: { position: number; prize: string }[];
  mysteryBoxes: any[];
  scratchPrizes: any[];
  roulettePrizes: any[];
  boxWinsByKey?: Map<string, any[]>;
  scratchWinsByLabel?: Map<string, any[]>;
  rouletteWinsByLabel?: Map<string, any[]>;
}> = ({ mainPrizes, mysteryBoxes, scratchPrizes, roulettePrizes, boxWinsByKey, scratchWinsByLabel, rouletteWinsByLabel }) => {
  const winnerName = (win: any) => win?.winner_name || win?.profiles?.name || "Ganhador";
  const Section = ({ title, icon, items }: { title: string; icon: React.ReactNode; items: { label: string; value?: string; win?: any }[] }) =>
    items.length === 0 ? null : (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 px-1">
          {icon}
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</h4>
        </div>
        <div className="space-y-1">
          {items.map((it, i) => (
            <div key={i} className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 h-9 text-[11px]", it.win ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-secondary/40")}>
              <span className="font-bold text-foreground truncate">{it.label}</span>
              {it.win ? <span className="font-black text-emerald-400 shrink-0 truncate max-w-[120px]">{winnerName(it.win).split(' ')[0]}</span> : it.value && <span className="font-black text-emerald-400 shrink-0 animate-pulse">{it.value}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  const sortedMain = (mainPrizes || [])
    .filter((p) => p && (p.prize ?? "").toString().trim().length > 0)
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, 5);
  const boxItems = (mysteryBoxes || []).map((b: any) => ({ label: b.name, value: `R$ ${Number(b.cost || 0).toFixed(2)}`, win: boxWinsByKey?.get(b.id)?.[0] || boxWinsByKey?.get(b.name)?.[0] }));
  const scratchItems = (scratchPrizes || []).map((p: any) => ({ label: p.label, value: p.value ? `R$ ${p.value}` : p.prize_type, win: scratchWinsByLabel?.get(p.label)?.[0] }));
  const rouletteItems = (roulettePrizes || []).map((p: any) => ({ label: p.label, value: p.value ? (p.prize_type === 'balance' ? `R$ ${p.value}` : `${p.value}`) : p.prize_type, win: rouletteWinsByLabel?.get(p.label)?.[0] }));
  const total = sortedMain.length + boxItems.length + scratchItems.length + rouletteItems.length;
  const positionStyle = (pos: number) =>
    pos === 1 ? { bg: "bg-gradient-to-br from-amber-500/30 to-amber-700/20 border-amber-400/50", chip: "bg-amber-500 text-white", label: "O GRANDE PRÊMIO" }
    : pos === 2 ? { bg: "bg-gradient-to-br from-slate-400/25 to-slate-600/15 border-slate-300/40", chip: "bg-slate-300 text-slate-900", label: "2º LUGAR" }
    : pos === 3 ? { bg: "bg-gradient-to-br from-orange-700/30 to-orange-900/20 border-orange-500/40", chip: "bg-orange-600 text-white", label: "3º LUGAR" }
    : { bg: "bg-secondary/40 border-border", chip: "bg-secondary text-foreground", label: `${pos}º LUGAR` };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/20 text-foreground transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] overflow-hidden">
          <div className="h-10 px-3 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide">
            <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500 animate-pulse" /> Prêmios da Ação</span>
            <span className="text-[9px] font-black text-amber-400">{sortedMain.length > 0 ? `1º ao ${sortedMain.length}º` : "Ver"}</span>
          </div>
          {sortedMain.length > 0 && (
            <div className="px-3 pb-2 space-y-1">
              {sortedMain.map((p) => (
                <div key={p.position} className="flex items-center gap-2 text-[10px]">
                  <span className={cn("h-4 w-4 rounded flex items-center justify-center text-[8px] font-black shrink-0",
                    p.position === 1 ? "bg-amber-500 text-white" :
                    p.position === 2 ? "bg-slate-300 text-slate-900" :
                    p.position === 3 ? "bg-orange-600 text-white" : "bg-secondary text-foreground")}>{p.position}º</span>
                  <span className="font-bold truncate text-left text-foreground/90">{p.prize}</span>
                </div>
              ))}
            </div>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Prêmios desta Ação</DialogTitle>
          <DialogDescription>O prêmio principal vai para o número sorteado. Veja também 2º ao 5º lugar e os combos extras.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {total === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum prêmio cadastrado.</p>}
          {sortedMain.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400">Premiação Principal (Top 5)</h4>
              </div>
              <div className="space-y-2">
                {sortedMain.map((p) => {
                  const st = positionStyle(p.position);
                  return (
                    <div key={p.position} className={cn("flex items-center gap-3 rounded-xl border p-3", st.bg)}>
                      <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-sm font-black shrink-0", st.chip)}>
                        {p.position}º
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{st.label}</p>
                        <p className={cn("text-sm font-black uppercase italic tracking-tight truncate", p.position === 1 && "text-amber-300 animate-pulse")}>{p.prize}</p>
                      </div>
                      {p.position === 1 && <Trophy className="h-5 w-5 text-amber-400 shrink-0 animate-pulse" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <Section title="Caixas Surpresas" icon={<Gift className="h-3.5 w-3.5 text-orange-500" />} items={boxItems} />
          <Section title="Raspadinhas" icon={<Sparkles className="h-3.5 w-3.5 text-sky-400" />} items={scratchItems} />
          <Section title="Roleta Instantânea" icon={<RotateCw className="h-3.5 w-3.5 text-rose-500" />} items={rouletteItems} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const QuickActionRanking: React.FC<{ ranking?: any[] }> = ({ ranking }) => {
  const top5 = (ranking || []).slice(0, 5);
  return (
  <Dialog>
    <DialogTrigger asChild>
      <button className="w-full rounded-xl border border-border bg-card hover:bg-secondary/50 text-foreground transition-all overflow-hidden">
        <div className="h-10 px-3 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide">
          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Top Compradores</span>
          <span className="text-[9px] font-black text-primary">{top5.length > 0 ? `Top ${top5.length}` : "Ver"}</span>
        </div>
        {top5.length > 0 && (
          <div className="px-3 pb-2 space-y-1">
            {top5.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className={cn("h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0",
                  i === 0 ? "bg-amber-500/30 text-amber-400" :
                  i === 1 ? "bg-slate-400/30 text-slate-200" :
                  i === 2 ? "bg-orange-700/30 text-orange-300" : "bg-secondary text-muted-foreground")}>{i + 1}</span>
                <Avatar className="h-4 w-4"><AvatarImage src={r.avatar_url} /><AvatarFallback className="text-[8px]">{(r.user_name || "?")[0]}</AvatarFallback></Avatar>
                <span className="flex-1 font-bold truncate text-left text-foreground/90">{r.user_name}</span>
                <span className="font-black text-primary shrink-0">{r.total_tickets}</span>
              </div>
            ))}
          </div>
        )}
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Top Compradores</DialogTitle>
        <DialogDescription>Maiores compradores da campanha</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        {(ranking || []).map((r: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/40 border border-border">
            <span className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-black", i === 0 ? "bg-amber-500/20 text-amber-500" : i === 1 ? "bg-slate-400/20 text-slate-300" : i === 2 ? "bg-orange-700/20 text-orange-400" : "bg-secondary text-muted-foreground")}>
              {i + 1}º
            </span>
            <Avatar className="h-7 w-7"><AvatarImage src={r.avatar_url} /><AvatarFallback>{(r.user_name || "?")[0]}</AvatarFallback></Avatar>
            <span className="flex-1 text-xs font-black truncate">{r.user_name}</span>
            <span className="text-xs font-black text-primary">{r.total_tickets} cotas</span>
          </div>
        ))}
        {(!ranking || ranking.length === 0) && <p className="text-sm text-muted-foreground text-center py-6">Sem compradores ainda.</p>}
      </div>
    </DialogContent>
  </Dialog>
  );
};

const QuickActionExtremes: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const { data: stats } = useCampaignTicketStats(campaignId);
  const { data: recent } = useQuery({
    queryKey: ["campaign-recent-buyers", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("quantity, created_at, profiles!user_id(name, avatar_url)")
        .eq("campaign_id", campaignId)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });
  const highest = (stats as any)?.highestTickets?.[0];
  const lowest = (stats as any)?.lowestTickets?.[0];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full h-10 rounded-xl border border-border bg-card hover:bg-secondary/50 text-foreground text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all">
          <TrendingUp className="h-4 w-4 text-emerald-500" /> Maior e Menor Cota
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Maior e Menor Cota</DialogTitle>
          <DialogDescription>Posições atuais — ainda podem mudar até o sorteio</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
            <Crown className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-[10px] font-black uppercase text-muted-foreground">Maior Cota</p>
            <p className="text-lg font-black text-emerald-500">{highest?.number ?? "—"}</p>
            <p className="text-[10px] font-bold text-foreground truncate">{(highest as any)?.profiles?.name || ""}</p>
          </div>
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-center">
            <Award className="h-5 w-5 text-sky-500 mx-auto mb-1" />
            <p className="text-[10px] font-black uppercase text-muted-foreground">Menor Cota</p>
            <p className="text-lg font-black text-sky-500">{lowest?.number ?? "—"}</p>
            <p className="text-[10px] font-bold text-foreground truncate">{(lowest as any)?.profiles?.name || ""}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Últimos 5 compradores</h4>
          </div>
          {(recent || []).length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-3">Sem compradores recentes.</p>
          )}
          {(recent || []).map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 h-9 text-[11px]">
              <Avatar className="h-6 w-6"><AvatarImage src={r.profiles?.avatar_url} /><AvatarFallback>{(r.profiles?.name || "?")[0]}</AvatarFallback></Avatar>
              <span className="flex-1 font-bold text-foreground truncate">{r.profiles?.name || "Anônimo"}</span>
              <span className="font-black text-primary">{r.quantity} cotas</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignInlineView;

const MysteryBoxPrizesList: React.FC<{ boxId: string; boxName: string }> = ({ boxId, boxName }) => {
  const { data: prizes } = useMysteryBoxPrizes(boxId);
  return (
    <>
      <div className="px-2 pt-1 pb-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <PackageOpen className="h-3 w-3 text-orange-400" /> {boxName}
      </div>
      {(prizes || []).map((p) => (
        <InlineRow
          key={p.id}
          tone="primary"
          left={
            <span className="flex items-center gap-2">
              <Gift className="h-3.5 w-3.5 text-orange-300" />
              <span className="text-foreground">{p.title}</span>
            </span>
          }
          right={
            <span className="text-white/90 flex items-center gap-1">
              {p.prize_value ? `R$ ${p.prize_value}` : p.prize_type}
            </span>
          }
          icon={<Star className="h-3 w-3 text-amber-400" />}
        />
      ))}
      {(!prizes || prizes.length === 0) && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground italic">Sem prêmios cadastrados</div>
      )}
    </>
  );
};