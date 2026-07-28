import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
    Calendar, ArrowLeft, Trophy, Share2, Loader2, CheckCircle2,
    Gift, Zap, MousePointer2, Sparkles, BookOpen, Star, Crown, Ticket, RotateCw, Gamepad2, Activity,
    ChevronDown, ChevronUp, Clock, Info, RefreshCw, Medal, TrendingUp, ShieldCheck, Smartphone, Bell, Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  useCampaign, useMysteryBoxConfigs, useRoulettePrizes, useWinners, useTickets,
  useCampaignRanking, useCampaignMysteryBoxWins, useCampaignRouletteSpins,
  useUserCampaignSpins, useCampaignLuckyWinners, useCampaignTicketStats,
  useUserTickets, useUserCampaignScratches, useLuckyHours, useCampaignScratchWins,
  useScratchCardPrizes
} from "@/hooks/useData";

import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RaffleGallery from "@/components/RaffleGallery";
import TicketGrid from "@/components/TicketGrid";
import GiftBoxGrid from "@/components/GiftBoxGrid";
import GiftResultsSection from "@/components/GiftResultsSection";
import PurchaseAnimation from "@/components/PurchaseAnimation";
import CampaignPricing from "@/components/CampaignPricing";
import Roulette from "@/components/Roulette";
import MysteryBox from "@/components/MysteryBox";
import CampaignPublicInfo from "@/components/CampaignPublicInfo";
import CountdownTimer from "@/components/CountdownTimer";
import LiveNotifications from "@/components/LiveNotifications";
import UserRanking from "@/components/UserRanking";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import ScratchCard from "@/components/ScratchCard";
import { QuickRegisterDialog } from "@/components/QuickRegisterDialog";
import { PaymentModal } from "@/components/PaymentModal";
import { SEO } from "@/components/SEO";
import CampaignLiveDraw from "@/components/CampaignLiveDraw";
import LiveStreamPlayer from "@/components/LiveStreamPlayer";
import CampaignInlineView from "@/components/CampaignInlineView";
import { useSiteSettings } from "@/hooks/useData";
import { getCampaignDisplaySales } from "@/lib/campaign-progress";



const CampaignDetail = () => {
  const queryClient = useQueryClient();
  const { data: siteSettings } = useSiteSettings();
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isPurchaseVisible, setIsPurchaseVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 400);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPurchaseVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const purchaseSection = document.getElementById('purchase-tabs');
    if (purchaseSection) observer.observe(purchaseSection);

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (purchaseSection) observer.unobserve(purchaseSection);
    };
  }, []);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: campaign, isLoading } = useCampaign(id || "");
  const campaignId = campaign?.id || "";
  const { data: userSpins } = useUserCampaignSpins(user?.id || "", campaignId);
  const { data: userScratches } = useUserCampaignScratches(user?.id || "", campaignId);
  
  const { data: mysteryBoxes } = useMysteryBoxConfigs(campaignId);
  const { data: roulettePrizes } = useRoulettePrizes(campaignId);
  const { data: scratchPrizes } = useScratchCardPrizes(campaignId);
  const isFinished = (campaign as any)?.status === 'completed';
  const scratchEnabled = !isFinished && (!!(campaign as any)?.scratch_cards_enabled || (scratchPrizes?.length || 0) > 0);
  const rouletteEnabled = !isFinished && (!!(campaign as any)?.roulette_enabled || (roulettePrizes?.length || 0) > 0);
  const { data: rouletteWins } = useCampaignRouletteSpins(campaignId, 200);
  const { data: scratchWins } = useCampaignScratchWins(campaignId, 200);
  const { data: boxWins } = useCampaignMysteryBoxWins(campaignId, 200);
  const { data: allWinners } = useWinners();
  const raffleWinners = allWinners?.filter(w => w.campaign_id === campaignId && w.winner_type === 'raffle') || [];
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const allLuckyNumbers = useMemo(() => {
    return campaign?.lucky_numbers_prizes || [];
  }, [campaign]);

  // We show all lucky numbers in the list as requested by the user
  const luckyNumbers = useMemo(() => {
    return allLuckyNumbers;
  }, [allLuckyNumbers]);

  const protectedNumbers = useMemo(() => {
    return allLuckyNumbers.filter((p: any) => p.protected).map((p: any) => p.number);
  }, [allLuckyNumbers]);

  const luckyNumbersList = useMemo(() => {
    return allLuckyNumbers.map((p: any) => p.number) || [];
  }, [allLuckyNumbers]);

  const canManualSelect = useMemo(() => {
    return campaign?.manual_numbers === true || campaign?.ticket_generation_type === 'manual';
  }, [campaign]);

  const { data: tickets } = useTickets(campaignId, canManualSelect && !!campaignId);
  const [luckyNumbersStatus, setLuckyNumbersStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!campaignId || !luckyNumbersList.length) return;
    
    const fetchLuckyStatus = async () => {
      const { data } = await supabase
        .from('tickets')
        .select('number, status')
        .eq('campaign_id', campaignId)
        .in('number', luckyNumbersList);
        
      if (data) {
        const statusMap: Record<string, boolean> = {};
        data.forEach(t => {
          if (t.status === 'confirmed' || t.status === 'paid' || t.status === 'reserved') {
            statusMap[t.number] = true;
          }
        });
        setLuckyNumbersStatus(statusMap);
      }
    };
    
    fetchLuckyStatus();
    const interval = setInterval(fetchLuckyStatus, 30000);
    return () => clearInterval(interval);
  }, [campaignId, luckyNumbersList]);

  const { data: campaignRanking } = useCampaignRanking(campaignId, 10);
  const { data: luckyWinners } = useCampaignLuckyWinners(campaignId);
  const { data: ticketStats } = useCampaignTicketStats(campaignId);
  const { data: userTickets } = useUserTickets(user?.id || "", campaignId);
  const { data: luckyHours } = useLuckyHours(campaignId);

  const nextLuckyHour = useMemo(() => {
    if (!luckyHours) return null;
    const now = new Date();
    return luckyHours.find(h => {
      const drawDate = new Date(h.draw_time);
      return h.status === 'scheduled' && h.draw_type === 'hourly' && drawDate > now;
    });
  }, [luckyHours]);

  const hourlyDraws = useMemo(() => {
    if (!luckyHours) return [];
    return luckyHours.filter(h => h.draw_type === 'hourly')
      .sort((a, b) => new Date(b.draw_time).getTime() - new Date(a.draw_time).getTime());
  }, [luckyHours]);

  const greaterSmallerDraws = useMemo(() => {
    if (!luckyHours) return [];
    return luckyHours.filter(h => h.draw_type === 'greater_smaller')
      .sort((a, b) => new Date(b.draw_time).getTime() - new Date(a.draw_time).getTime());
  }, [luckyHours]);

  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<number | string[] | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isGameInProgress, setIsGameInProgress] = useState(false);

  // Sync modal state with URL parameter for "Manter modal ao voltar"
  useEffect(() => {
    const orderId = searchParams.get('order');
    const upsell = searchParams.get('upsell');
    
    if (orderId && orderId !== currentOrderId) {
      setCurrentOrderId(orderId);
      setIsPaymentModalOpen(true);
    } else if (!orderId && isPaymentModalOpen) {
      setIsPaymentModalOpen(false);
    }

    if (upsell === 'true') {
      const element = document.getElementById('purchase-tabs');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [searchParams, isPaymentModalOpen, currentOrderId]);

  const soldTickets = useMemo(() => {
    return tickets?.filter(t => t.status === "confirmed" || t.status === "paid" || t.status === "reserved").map(t => t.number) || [];
  }, [tickets]);

  const availableInstantPrizes = useMemo(() => {
    return luckyNumbers.filter(p => !luckyNumbersStatus[p.number]).length;
  }, [luckyNumbers, luckyNumbersStatus]);

  const userSpinsAvailable = useMemo(() => {
    if (!userSpins) return 0;
    return userSpins.filter((s: any) => !s.prize_label).length;
  }, [userSpins]);

  const userScratchesAvailable = useMemo(() => {
    if (!userScratches) return 0;
    return userScratches.filter((s: any) => !s.prize_label).length;
  }, [userScratches]);

  const rouletteWinsByLabel = useMemo(() => {
    const map = new Map<string, any[]>();
    (rouletteWins || []).forEach((win: any) => {
      if (!win.prize_label || win.prize_label === "Tente novamente" || win.prize_type === "none") return;
      const list = map.get(win.prize_label) || [];
      list.push(win);
      map.set(win.prize_label, list);
    });
    return map;
  }, [rouletteWins]);

  const scratchWinsByLabel = useMemo(() => {
    const map = new Map<string, any[]>();
    (scratchWins || []).forEach((win: any) => {
      if (!win.prize_label) return;
      const list = map.get(win.prize_label) || [];
      list.push(win);
      map.set(win.prize_label, list);
    });
    return map;
  }, [scratchWins]);

  const getWinnerName = (win: any) => win?.winner_name || win?.profiles?.name || "Ganhador";
  const getWinnerAvatar = (win: any) => win?.avatar_url || win?.profiles?.avatar_url || "";

  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`campaign-detail-prizes-${campaignId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roulette_spins', filter: `campaign_id=eq.${campaignId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-roulette-spins', campaignId] });
        if (user?.id) queryClient.invalidateQueries({ queryKey: ['user-campaign-spins', user.id, campaignId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scratch_card_scratches', filter: `campaign_id=eq.${campaignId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-scratch-wins', campaignId] });
        if (user?.id) queryClient.invalidateQueries({ queryKey: ['user-campaign-scratches', user.id, campaignId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mystery_box_wins' }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-mystery-box-wins', campaignId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaignId, queryClient, user?.id]);

  const progressData = useMemo(() => {
    if (!campaign) return { bar: 0, text: "0", sold: 0 };
    const display = getCampaignDisplaySales(campaign);
    return { bar: display.progressBar, text: display.progressText, sold: display.displaySoldTickets };
  }, [campaign]);

  const progress = progressData.text;

  const handleToggleTicket = (number: string) => {
    setSelectedTickets(prev => 
      prev.includes(number) ? prev.filter(n => n !== number) : [...prev, number]
    );
  };

  const handlePaymentSuccess = useCallback(() => {
    // Just invalidate queries, don't navigate yet so user can see SuccessFlow
    queryClient.invalidateQueries({ queryKey: ["user-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["campaign", id || ""] });
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["tickets", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-ranking", campaignId] });
  }, [queryClient, id, campaignId]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsPaymentModalOpen(open);
    if (!open) {
      setSearchParams({}, { replace: true });
      setCurrentOrderId(null);
    }
  }, [setSearchParams]);

  const handleBuy = async (quantityOrNumbers: number | string[], isUpsell = false) => {
    if (!user) {
      setPendingPurchase(quantityOrNumbers);
      setIsQuickRegisterOpen(true);
      return;
    }
    
    setIsPurchasing(true);
    
    // Release any expired tickets before trying to reserve new ones
    await supabase.rpc('release_expired_tickets');
    
    try {
      const quantity = typeof quantityOrNumbers === 'number' ? quantityOrNumbers : quantityOrNumbers.length;
      const numbers = typeof quantityOrNumbers === 'number' ? null : quantityOrNumbers;
      
      // Get affiliate ID if present
      const refCode = localStorage.getItem("referred_by");
      let affiliateId = null;
      if (refCode) {
        const { data: affData } = await supabase
          .from("affiliates")
          .select("id")
          .eq("referral_code", refCode)
          .eq("is_active", true)
          .maybeSingle();
        if (affData) affiliateId = affData.id;
      }

      const { data: orderId, error } = await supabase.rpc('reserve_tickets', {
        p_campaign_id: campaignId,
        p_user_id: user.id,
        p_quantity: quantity,
        p_numbers: numbers,
        p_affiliate_id: affiliateId
      });

      if (error) throw error;

      setIsPurchasing(false);
      setCurrentOrderId(orderId);
      
      // Update URL to maintain modal state on navigation
      setSearchParams({ order: orderId }, { replace: true });
      
      // Open payment modal immediately as requested
      setIsPaymentModalOpen(true);
      // We only show the success animation for new purchases, not for upsells within the modal
      if (!isUpsell) {
        setShowSuccess(true);
      }

    } catch (error: any) {
      setIsPurchasing(false);
      toast.error(error.message || "Erro ao reservar números. Tente novamente.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container flex flex-col items-center justify-center py-20">
          <h1 className="font-display text-2xl font-bold">Campanha não encontrada</h1>
          <Link to="/"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isActive = campaign.status === "active";
  const drawDate = campaign.draw_date ? new Date(campaign.draw_date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) : "";

  const renderSection = (section: string) => {
    switch (section) {
      case 'gallery':
        return (
          <div key={section} className="w-full bg-black relative overflow-x-hidden shadow-2xl border border-border/10">
            <RaffleGallery 
              images={Array.from(new Set([
                campaign.image_url || "",
                ...(campaign.gallery_urls && Array.isArray(campaign.gallery_urls) ? campaign.gallery_urls : [])
              ])).filter(url => url !== "")} 
              videoUrl={campaign.video_url} 
            />
            
            {campaign.featured && (
              <div className="absolute top-4 right-4 z-10 animate-blink">
                <Badge className="bg-primary text-white font-black italic uppercase tracking-wider px-4 py-1.5 shadow-lg shadow-primary/40 border-none rounded-full flex items-center gap-2">
                  <Star className="h-4 w-4 fill-white" /> Destaque
                </Badge>
              </div>
            )}

            <Link to="/conta#tickets" className="absolute bottom-20 right-4 z-10">
              <Button size="sm" variant="secondary" className="bg-black/60 text-white backdrop-blur-md border-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider px-4 hover:bg-black/80 shadow-lg">
                <Ticket className="mr-2 h-3 w-3" /> Ver meus títulos
              </Button>
            </Link>
            
            <CampaignLiveDraw campaign={campaign} />
          </div>

        );
      
      case 'header':
        const drawDateFull = campaign.draw_date ? new Date(campaign.draw_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
        return (
          <div key={section} className="flex flex-col gap-6 mt-6 md:mt-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {campaign.status === "active" && (campaign.draw_date && new Date(campaign.draw_date) < new Date() ? (
                    <div className="flex flex-col gap-1">
                      <Badge className="rounded-full px-4 h-6 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white w-fit shadow-sm">
                        Aguardando Sorteio
                      </Badge>
                    </div>
                  ) : (
                    <Badge className="bg-primary text-black border-none text-[10px] font-black uppercase px-3 h-6 rounded-full shadow-sm">Sorteio Ativo</Badge>
                  ))}
                  {campaign.status === "paused" && (
                    <Badge className="rounded-full px-4 h-6 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white w-fit shadow-sm">Vendas Pausadas</Badge>
                  )}
                  {campaign.status === "audit" && (
                    <Badge className="rounded-full px-4 h-6 text-[10px] font-black uppercase tracking-wider bg-purple-500 text-white animate-pulse shadow-sm">Em Auditoria</Badge>
                  )}
                  {campaign.status === "completed" && (
                    <Badge className="rounded-full px-4 h-6 text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-sm">Concluído</Badge>
                  )}
                  {drawDateFull && (
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-primary/20 bg-primary/5 text-primary rounded-full px-3 h-6">
                      Sorteio: {drawDateFull}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter text-animate-gradient leading-[0.9] break-words overflow-hidden">
                  {campaign.title}
                </h1>
                {campaign.subtitle && (
                  <p className="text-sm md:text-lg text-muted-foreground font-medium max-w-3xl leading-relaxed">
                    {campaign.subtitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button 
                  className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary text-black hover:scale-105 transition-all shadow-xl shadow-primary/20 animate-button-flash"
                  onClick={() => document.getElementById('purchase-tabs')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  PARTICIPE AGORA <Zap className="ml-2 h-4 w-4 fill-current" />
                </Button>
                <Button 
                  variant="outline"
                  className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs border-primary/20 text-primary hover:bg-primary/5"
                  onClick={() => {
                    const element = document.getElementById('prizes');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  VER COTAS PREMIADAS <Trophy className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

          </div>
        );

      case 'winner_banner': {
        if (!isFinished && (campaign as any)?.status !== 'drawn' && (campaign as any)?.status !== 'finished') return null;
        const mainWinner = raffleWinners[0] || (campaign as any)?.winners?.[0];
        const winnerName = mainWinner?.winner_name || (campaign as any)?.winner_name;
        const winningNumber = mainWinner?.winning_number || (campaign as any)?.draw_number || (campaign as any)?.winning_number;
        if (!winnerName && !winningNumber) return null;
        return (
          <Dialog key={section}>
            <DialogTrigger asChild>
              <button type="button" className="w-full text-left bg-gradient-to-br from-blue-500/10 via-primary/5 to-emerald-500/10 rounded-3xl p-6 md:p-8 border-2 border-blue-500/30 shadow-xl hover:border-blue-500/60 hover:shadow-2xl transition-all cursor-pointer">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <Trophy className="h-8 w-8 md:h-10 md:w-10 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0 text-center md:text-left">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Ação Finalizada — Ganhador(a) Oficial</p>
                <h2 className="text-2xl md:text-4xl font-black uppercase italic tracking-tight text-foreground break-words">
                  {winnerName || "Aguardando validação"}
                </h2>
                {winningNumber && (
                  <p className="text-sm md:text-base font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Número Sorteado: <span className="text-primary font-black">#{winningNumber}</span>
                  </p>
                )}
                {(campaign as any)?.draw_date && (
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Sorteado em {new Date((campaign as any).draw_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-2 inline-flex items-center gap-1">
                  <Info className="h-3 w-3" /> Toque para ver detalhes
                </p>
              </div>
              <Badge className="bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                Resultado Oficial
              </Badge>
            </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 uppercase italic tracking-tight">
                  <Trophy className="h-5 w-5 text-blue-500" /> Detalhes do Ganhador
                </DialogTitle>
                <DialogDescription className="text-xs uppercase tracking-widest font-bold">
                  Resultado Oficial da Ação
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 border border-border">
                  <Avatar className="h-14 w-14 border-2 border-blue-500/30">
                    <AvatarImage src={(mainWinner as any)?.avatar_url || ""} />
                    <AvatarFallback className="font-bold bg-blue-500/10 text-blue-500">
                      {winnerName?.substring(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-base font-black uppercase break-words">{winnerName || "Aguardando validação"}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Vencedor Verificado</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {winningNumber && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 col-span-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Número Sorteado</p>
                      <p className="text-2xl font-black text-primary">#{winningNumber}</p>
                    </div>
                  )}
                  {(mainWinner as any)?.prize_description && (
                    <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 col-span-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Prêmio</p>
                      <p className="text-sm font-black text-yellow-600">{(mainWinner as any).prize_description}</p>
                    </div>
                  )}
                  {(campaign as any)?.draw_date && (
                    <div className="p-3 rounded-xl bg-secondary/40 border border-border col-span-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-bold text-foreground">
                        Sorteado em {new Date((campaign as any).draw_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {(mainWinner as any)?.video_url && (
                    <a
                      href={(mainWinner as any).video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 col-span-2 flex items-center gap-2 hover:bg-blue-500/10"
                    >
                      <Video className="h-4 w-4 text-blue-500" />
                      <p className="text-xs font-black uppercase tracking-widest text-blue-500">Assistir Vídeo da Entrega</p>
                    </a>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      }

      case 'timer':
        return campaign.show_timer && (campaign.timer_end_date || campaign.draw_date) && (
          <div key={section} className="flex flex-col items-center justify-center p-8 bg-card border-2 border-primary/20 rounded-[2.5rem] shadow-xl shadow-primary/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 relative z-10">Tempo restante para o sorteio</p>
            <CountdownTimer targetDate={campaign.timer_end_date || campaign.draw_date!} className="scale-125 md:scale-150 relative z-10" />
          </div>
        );

      case 'progress':
        return (
          <div key={section} className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-foreground italic">{progress}% <span className="text-muted-foreground not-italic font-bold">concluído</span></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{progressData.sold.toLocaleString("pt-BR")} vendidos</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${progressData.bar}%` }} 
                transition={{ duration: 1.5 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>
        );

      case 'purchase':
        return (
          <div key={section} className="grid gap-6 lg:grid-cols-3 min-w-0">
            <div className="lg:col-span-2 space-y-6 min-w-0">

              <div className="bg-card rounded-[2rem] shadow-sm border border-border overflow-hidden" id="purchase-tabs">
                <Tabs defaultValue={campaign?.ticket_generation_type === 'manual' ? "manual" : "auto"} className="w-full">
                  {canManualSelect && (
                    <div className="px-6 pt-6">
                      <TabsList className="grid w-full grid-cols-2 h-12 bg-secondary rounded-2xl p-1">
                        <TabsTrigger value="auto" className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                          <Zap className="h-4 w-4" /> Automático
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                          <MousePointer2 className="h-4 w-4" /> Manual
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  )}

                  <TabsContent value="auto" className="p-6">
                    <CampaignPricing campaign={campaign} onBuy={handleBuy} isPurchasing={isPurchasing} />
                  </TabsContent>

                  <TabsContent value="manual" className="p-6">
                    <div className="space-y-6">
                      <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-secondary/30 border border-border/50">
                        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Valor por Cota</p>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-foreground">
                            R$ {Number(campaign.ticket_price).toFixed(2).replace(".", ",")}
                          </span>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[8px] sm:text-[9px] font-black uppercase px-2 h-5 sm:h-6">
                            Promoção
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center font-bold uppercase tracking-widest">Escolha seus números da sorte abaixo</p>
                      {(campaign as any).gift_mode_enabled ? (
                        <GiftBoxGrid
                          totalTickets={campaign.total_tickets}
                          soldTickets={[...soldTickets, ...protectedNumbers]}
                          selectedTickets={selectedTickets}
                          onSelect={handleToggleTicket}
                          onClearAll={() => setSelectedTickets([])}
                        />
                      ) : (
                        <TicketGrid
                          totalTickets={campaign.total_tickets}
                          soldTickets={[...soldTickets, ...protectedNumbers]}
                          selectedTickets={selectedTickets}
                          onSelect={handleToggleTicket}
                          onClearAll={() => setSelectedTickets([])}
                          luckyNumbers={luckyNumbersList}
                        />
                      )}
                      <Button 
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-wide border-light-path border-[#22c55e]/30"
                        disabled={selectedTickets.length === 0 || isPurchasing || campaign.status !== "active"}
                        onClick={() => handleBuy(selectedTickets)}
                      >
                        {isPurchasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {(campaign as any).gift_mode_enabled ? "Reservar Caixas-Surpresa" : "Reservar Números"}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>



              {(rouletteEnabled || campaign.mystery_box_enabled || scratchEnabled) && (
                <div className="space-y-4">
                  {rouletteEnabled && campaign.roulette_rules && (campaign.roulette_rules as any[]).length > 0 && (
                    <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                          <RotateCw className="h-4 w-4 text-primary" /> Roletas Instantâneas
                        </h3>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Combos</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(campaign.roulette_rules as any[]).map((rule, i) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] group hover:scale-[1.02] transition-transform">
                            <span className="text-xs font-black text-foreground uppercase italic tracking-tight">A partir de {rule.min_tickets} títulos</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{rule.spins} chance(s) de contemplação</span>
                              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:rotate-12 transition-transform">
                                <RotateCw className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scratchEnabled && campaign.scratch_card_rules && (campaign.scratch_card_rules as any[]).length > 0 && (
                    <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-500" /> Raspadinhas
                        </h3>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Combos</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(campaign.scratch_card_rules as any[]).map((rule, i) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)] group hover:scale-[1.02] transition-transform">
                            <span className="text-xs font-black text-foreground uppercase italic tracking-tight">A partir de {rule.min_tickets} títulos</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{rule.quantity} chance(s) de contemplação</span>
                              <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 group-hover:rotate-12 transition-transform">
                                <Sparkles className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {campaign.mystery_box_enabled && campaign.prize_rules && (campaign.prize_rules as any[]).filter((r: any) => r.type === 'mystery_box').length > 0 && (
                    <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                          <Gift className="h-4 w-4 text-purple-500" /> Caixas Surpresas
                        </h3>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Combos</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(campaign.prize_rules as any[]).filter((r: any) => r.type === 'mystery_box').map((rule, i) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)] group hover:scale-[1.02] transition-transform">
                            <span className="text-xs font-black text-foreground uppercase italic tracking-tight">A partir de {rule.min_tickets} títulos</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{rule.reward_quantity} chance(s) de contemplação</span>
                              <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500 group-hover:rotate-12 transition-transform">
                                <Gift className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6 min-w-0">
              {(() => {
                const filledPrizes = (campaign.main_prizes || []).filter((p: any) => p?.prize && String(p.prize).trim() !== "");
                return (rouletteEnabled || campaign.mystery_box_enabled || scratchEnabled || filledPrizes.length > 0);
              })() && (
                <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-4">
                  <h3 className="text-sm font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-primary" /> Premiações dessa ação
                  </h3>
                  <div className="flex flex-col gap-4">
                    {campaign.main_prizes && campaign.main_prizes.filter((p:any) => p?.prize && String(p.prize).trim() !== "").length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prêmios Principais</p>
                        <div className="grid grid-cols-1 gap-2">
                          {campaign.main_prizes.filter((p:any) => p?.prize && String(p.prize).trim() !== "").sort((a, b) => a.position - b.position).map((p, idx) => {
                            const prizeWinner = raffleWinners.find(w => w.prize_index === p.position);
                            return (
                              <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                      {idx === 0 ? <Crown className="h-4 w-4 text-primary" /> : <Trophy className="h-4 w-4 text-primary" />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase text-foreground">{p.position}º Prêmio</span>
                                      <span className="text-xs font-bold text-primary italic">{p.prize}</span>
                                    </div>
                                  </div>
                                  <Badge className={cn("border-none text-[8px] font-black uppercase", prizeWinner ? "bg-emerald-500 text-white" : "bg-primary text-white")}>
                                    {prizeWinner ? "SORTEADO" : "SORTEIO"}
                                  </Badge>
                                </div>
                                
                                {prizeWinner && (
                                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-primary/10">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6 border border-primary/20">
                                        <AvatarImage src={prizeWinner.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${prizeWinner.winner_name}`} />
                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-black">{prizeWinner.winner_name.substring(0, 1)}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-foreground uppercase truncate max-w-[120px]">{prizeWinner.winner_name}</span>
                                        <span className="text-[7px] font-bold text-muted-foreground uppercase leading-none">Vencedor do prêmio</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] font-black text-primary font-mono tracking-tighter">#{prizeWinner.ticket_number}</p>
                                      <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Bilhete</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

 
                      {rouletteEnabled && roulettePrizes && roulettePrizes.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vantagens da Roleta</p>
                          <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth pb-1">
                            {roulettePrizes.map((p, idx) => {
                              const spinWin = rouletteWinsByLabel.get(p.label)?.[0];
                              const spinWinnerName = getWinnerName(spinWin);
                              return (
                                <Dialog key={idx} onOpenChange={(open) => { if (!open && isGameInProgress) return; }}>
                                  <DialogTrigger asChild>
                                    <button className={cn("flex flex-col p-3 rounded-xl border gap-1.5 shrink-0 w-[160px] snap-start text-left transition-all group", spinWin ? "bg-emerald-500/10 border-emerald-500/30" : "bg-primary/5 border-primary/10 hover:border-primary/40 hover:bg-primary/10")}>
                                      <div className="flex items-center justify-between gap-1">
                                        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                                          <RotateCw className="h-3 w-3" />
                                        </motion.div>
                                        <span className="text-[10px] font-black text-foreground uppercase tracking-tighter leading-tight truncate flex-1">{p.label}</span>
                                        <Badge className="bg-primary/20 text-primary border-none text-[7px] font-black uppercase px-1 h-3.5">ROLETA</Badge>
                                      </div>
                                  {spinWin ? (
                                    <div className="flex items-center gap-1.5 mt-1 bg-emerald-500/10 p-1 rounded-lg border border-emerald-500/20">
                                      <Avatar className="h-4.5 w-4.5 border border-emerald-500/20">
                                        <AvatarImage src={getWinnerAvatar(spinWin)} />
                                        <AvatarFallback className="text-[6px] bg-emerald-500/10 text-emerald-500 font-black">{spinWinnerName.substring(0, 1)}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[8px] font-black text-emerald-500 uppercase truncate leading-none">{spinWinnerName}</span>
                                        <span className="text-[6px] font-bold text-muted-foreground uppercase leading-none mt-0.5">SAIU PARA</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] font-black text-primary uppercase opacity-90 group-hover:opacity-100">Toque para Girar →</span>
                                  )}
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl p-0 bg-transparent border-none w-[95vw] md:w-full max-h-[90vh] overflow-y-auto no-scrollbar"
                                    onInteractOutside={(e) => { if (isGameInProgress) e.preventDefault(); }}
                                    onEscapeKeyDown={(e) => { if (isGameInProgress) e.preventDefault(); }}>
                                    <Roulette prizes={roulettePrizes} campaign={campaign} availableSpins={userSpinsAvailable}
                                      onSpinStart={() => setIsGameInProgress(true)} onSpinComplete={() => setIsGameInProgress(false)} />
                                  </DialogContent>
                                </Dialog>
                              );
                            })}
                          </div>
                        </div>
                      )}

                     <div className="flex flex-col gap-4">
                       {scratchEnabled && (
                         <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Raspadinhas</p>
                           <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth pb-1">
                              {(scratchPrizes || []).map((prize: any, idx) => {
                                 const label = prize.label;
                                 const scratchWin = scratchWinsByLabel.get(label)?.[0];
                                 const scratchWinnerName = getWinnerName(scratchWin);
                                return (
                                  <Dialog key={idx} onOpenChange={(open) => { if (!open && isGameInProgress) return; }}>
                                    <DialogTrigger asChild>
                                       <button className={cn("flex flex-col p-3 rounded-xl border gap-1.5 shrink-0 w-[160px] snap-start text-left transition-all group", scratchWin ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/40 hover:bg-amber-500/10")}>
                                        <div className="flex items-center justify-between gap-1">
                                          <motion.div animate={{ rotate: [-8, 8, -8] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} className="h-5 w-5 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0">
                                            <Sparkles className="h-3 w-3" />
                                          </motion.div>
                                          <span className="text-[10px] font-black text-foreground uppercase tracking-tighter leading-tight truncate flex-1">{label}</span>
                                          <Badge className="bg-amber-500/20 text-amber-500 border-none text-[7px] font-black uppercase px-1 h-3.5">RASPADINHA</Badge>
                                        </div>
                                    {scratchWin ? (
                                      <div className="flex items-center gap-1.5 mt-1 bg-emerald-500/10 p-1 rounded-lg border border-emerald-500/20">
                                        <Avatar className="h-4.5 w-4.5 border border-emerald-500/20">
                                          <AvatarImage src={getWinnerAvatar(scratchWin)} />
                                          <AvatarFallback className="text-[6px] bg-emerald-500/10 text-emerald-500 font-black">{scratchWinnerName.substring(0, 1)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[8px] font-black text-emerald-500 uppercase truncate leading-none">{scratchWinnerName}</span>
                                          <span className="text-[6px] font-bold text-muted-foreground uppercase leading-none mt-0.5">SAIU PARA</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-[8px] font-black text-amber-500 uppercase opacity-90 group-hover:opacity-100">Toque para Raspar →</span>
                                    )}
                                      </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md p-0 bg-transparent border-none w-[95vw] md:w-full max-h-[90vh] overflow-y-auto no-scrollbar"
                                      onInteractOutside={(e) => { if (isGameInProgress) e.preventDefault(); }}
                                      onEscapeKeyDown={(e) => { if (isGameInProgress) e.preventDefault(); }}>
                                      <ScratchCard
                                        potentialPrizes={[...(roulettePrizes?.map(p => p.label) || []), ...(luckyNumbers?.map((p: any) => p.prize) || []), "R$ 50,00 no PIX", "Giro Grátis na Roleta"]}
                                        isSimulation={false}
                                        cost={campaign?.scratch_card_cost || 0}
                                        campaignId={campaign?.id}
                                        availableScratches={userScratchesAvailable}
                                        onStart={() => setIsGameInProgress(true)}
                                        onComplete={() => setIsGameInProgress(false)}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                );
                             })}
                           </div>
                         </div>
                       )}

                       {(mysteryBoxes?.length || 0) > 0 && (
                         <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Caixas Misteriosas</p>
                           <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth pb-1">
                             {mysteryBoxes?.map((box, idx) => {
                                 const boxWin = (boxWins || []).find((w: any) => w.config_id === box.id || w.box_name === box.name);
                                 const boxWinnerName = getWinnerName(boxWin);
                                return (
                                  <Dialog key={idx} onOpenChange={(open) => { if (!open && isGameInProgress) return; }}>
                                    <DialogTrigger asChild>
                                       <button className={cn("flex flex-col p-3 rounded-xl border gap-1.5 shrink-0 w-[160px] snap-start text-left transition-all group", boxWin ? "bg-emerald-500/10 border-emerald-500/30" : "bg-purple-500/5 border-purple-500/10 hover:border-purple-500/40 hover:bg-purple-500/10")}>
                                        <div className="flex items-center justify-between gap-1">
                                          <motion.div animate={{ y: [0, -3, 0], rotate: [0, -6, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} className="h-5 w-5 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-500 shrink-0">
                                            <Gift className="h-3 w-3" />
                                          </motion.div>
                                          <span className="text-[10px] font-black text-foreground uppercase tracking-tighter leading-tight truncate flex-1">{box.name}</span>
                                          <Badge className="bg-purple-500/20 text-purple-500 border-none text-[7px] font-black uppercase px-1 h-3.5">CAIXA</Badge>
                                        </div>
                                    {boxWin ? (
                                      <div className="flex items-center gap-1.5 mt-1 bg-emerald-500/10 p-1 rounded-lg border border-emerald-500/20">
                                        <Avatar className="h-4.5 w-4.5 border border-emerald-500/20">
                                          <AvatarImage src={getWinnerAvatar(boxWin)} />
                                          <AvatarFallback className="text-[6px] bg-emerald-500/10 text-emerald-500 font-black">{boxWinnerName.substring(0, 1)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[8px] font-black text-emerald-500 uppercase truncate leading-none">{boxWinnerName}</span>
                                          <span className="text-[6px] font-bold text-muted-foreground uppercase leading-none mt-0.5">SAIU PARA</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-[8px] font-black text-purple-500 uppercase opacity-90 group-hover:opacity-100">Toque para Abrir →</span>
                                    )}
                                      </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl p-0 bg-transparent border-none w-[95vw] md:w-full max-h-[90vh] overflow-y-auto no-scrollbar"
                                      onInteractOutside={(e) => { if (isGameInProgress) e.preventDefault(); }}
                                      onEscapeKeyDown={(e) => { if (isGameInProgress) e.preventDefault(); }}>
                                      <MysteryBox boxes={[box]} campaignId={campaign?.id} />
                                    </DialogContent>
                                  </Dialog>
                                );
                             })}
                           </div>
                         </div>
                       )}
                    </div>

                    {(rouletteEnabled || (campaign.prize_rules && campaign.prize_rules.length > 0)) && (
                      <Dialog onOpenChange={(open) => {
                        if (!open && isGameInProgress) return;
                      }}>
                        <DialogTrigger asChild>
                          <button className="w-full mt-2 flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-180 transition-transform duration-500">
                                <RotateCw className="h-5 w-5" />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-tight text-foreground">
                                  {rouletteEnabled ? 'Gire a roleta e ganhe prêmios' : 'Prêmios de Engajamento'}
                                </p>
                                <p className="text-[10px] font-medium text-muted-foreground">
                                  {campaign.prize_rules && campaign.prize_rules.length > 0 
                                    ? 'Confira as regras de bônus' 
                                    : 'Tente sua sorte agora'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary text-white border-none text-[9px] font-black">{userSpinsAvailable}</Badge>
                              <ArrowLeft className="h-4 w-4 text-primary rotate-180" />
                            </div>
                          </button>
                        </DialogTrigger>
                        <DialogContent 
                          className="max-w-2xl p-0 bg-transparent border-none w-[95vw] md:w-full max-h-[90vh] overflow-y-auto no-scrollbar"
                          onInteractOutside={(e) => { if (isGameInProgress) e.preventDefault(); }}
                          onEscapeKeyDown={(e) => { if (isGameInProgress) e.preventDefault(); }}
                        >
                          <Roulette 
                            prizes={roulettePrizes} 
                            campaign={campaign} 
                            availableSpins={userSpinsAvailable}
                            onSpinStart={() => setIsGameInProgress(true)}
                            onSpinComplete={() => setIsGameInProgress(false)}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'live_stream':
        return (
          <LiveStreamPlayer 
            key={section}
            url={campaign.live_stream_url}
            enabled={campaign.live_stream_enabled}
            campaignTitle={campaign.title}
          />
        );

      case 'live_draw':
        return (
          <CampaignLiveDraw 
            key={section}
            campaign={campaign}
          />
        );

      case 'description':
        return (
          <div key={section} className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase italic tracking-tighter flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Descrição e Regras
              </h3>
            </div>
            
            <div className={cn(
              "text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap transition-all duration-500",
              !isDescriptionExpanded && "line-clamp-2 overflow-hidden"
            )}>
              {campaign.description}
              
              {isDescriptionExpanded && campaign.regulations && (
                <div className="mt-6 pt-6 border-t border-dashed border-border">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="h-3 w-3 text-primary" /> Regulamento e Regras
                  </h4>
                  <div className="text-xs whitespace-pre-wrap bg-secondary/30 p-4 rounded-xl border border-border">
                    {campaign.regulations}
                  </div>
                  
                  {(campaign.concurso || campaign.draw_number) && (
                    <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-wrap gap-x-8 gap-y-2">
                      {campaign.concurso && (
                        <div>
                          <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Sorteio Base</p>
                          <p className="text-xs font-bold text-primary italic uppercase tracking-tighter">Loteria Federal</p>
                        </div>
                      )}
                      {campaign.draw_number && (
                        <div>
                          <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Concurso Nº</p>
                          <p className="text-xs font-bold text-primary italic font-mono">#{campaign.draw_number}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>


            <Button 
              variant="outline" 
              size="sm" 
              className="w-full font-black uppercase tracking-widest text-[9px] gap-2 h-10 rounded-xl bg-secondary/50 hover:bg-secondary border-border transition-all"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            >
              {isDescriptionExpanded ? (
                <>RECOLHER DESCRIÇÃO <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>LER DESCRIÇÃO COMPLETA E REGRAS <ChevronDown className="h-3 w-3" /></>
              )}
            </Button>
          </div>
        );

      case 'prizes':
        const availablePrizes = luckyNumbers.filter(p => !luckyNumbersStatus[p.number]);
        const wonPrizes = luckyNumbers.filter(p => luckyNumbersStatus[p.number]);

        return luckyNumbers.length > 0 && (
          <div key={section} id="prizes" className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Trophy className="h-6 w-6 text-amber-500" />
                  </div>
                  Cotas Premiadas
                </h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest ml-1">Encontre estes números e ganhe na hora</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full bg-secondary/50 text-[10px] font-black h-8 px-4 border-primary/10">
                  {availablePrizes.length} DISPONÍVEIS
                </Badge>
                <Badge variant="outline" className="rounded-full bg-amber-500/5 text-amber-500 text-[10px] font-black h-8 px-4 border-amber-500/20">
                  {wonPrizes.length} PREMIADAS
                </Badge>
              </div>
            </div>
            
            <div className="space-y-10">
              {/* Disponíveis */}
              {availablePrizes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Cotas Disponíveis</h4>
                    <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availablePrizes.map((p: any, i: number) => (
                      <div 
                        key={i} 
                        className="group flex items-center justify-between p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-green-500/10 bg-green-500/5 hover:border-green-500/30 hover:bg-green-500/[0.08] transition-all duration-300 shadow-sm overflow-hidden"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden min-w-0">
                          <div className="px-3 sm:px-5 h-8 sm:h-10 shrink-0 rounded-full bg-green-500 text-white shadow-[0_5px_15px_rgba(34,197,94,0.3)] flex items-center justify-center font-black italic text-xs sm:text-sm group-hover:scale-105 transition-transform duration-500">
                            #{p.number}
                          </div>
                          <div className="flex flex-col overflow-hidden min-w-0">
                            <span className="text-[11px] sm:text-xs font-black uppercase tracking-tight text-foreground truncate max-w-full">
                              {p.prize}
                            </span>
                            <span className="text-[8px] sm:text-[10px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-1">
                              <span className="h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full bg-green-500 animate-pulse" />
                              LIVRE
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-green-500 text-white border-none text-[8px] sm:text-[9px] font-black px-2 sm:px-3 h-5 sm:h-6 rounded-full shadow-sm shrink-0">PARTICIPAR</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Premiadas (Ganhadores) */}
              {wonPrizes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Cotas Já Premiadas</h4>
                    <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                  </div>
                   <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth">
                     {wonPrizes.map((p: any, i: number) => {
                      const winner = luckyWinners?.find(w => w.number === p.number);
                      return (
                        <div 
                          key={i} 
                          className="group flex items-center justify-between p-4 rounded-3xl border border-amber-500/10 bg-amber-500/5 transition-all duration-300 shadow-sm overflow-hidden relative shrink-0 w-[280px] snap-start"
                        >
                          <div className="flex items-center gap-4 overflow-hidden relative z-10">
                            <div className="px-5 h-10 shrink-0 rounded-full bg-amber-500 text-white shadow-inner flex items-center justify-center font-black italic text-sm">
                              #{p.number}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-black uppercase tracking-tight text-muted-foreground truncate max-w-[150px]">
                                {p.prize}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <Avatar className="h-5 w-5 border-2 border-amber-500/20 shadow-sm">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.number}`} />
                                  <AvatarFallback className="text-[8px] bg-amber-500/10 text-amber-600 font-black">W</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter truncate max-w-[100px]">
                                    {(Array.isArray(winner?.profiles) ? winner?.profiles[0]?.name : winner?.profiles?.name) || "Ganhador"}
                                  </span>
                                  <span className="text-[8px] font-bold text-muted-foreground uppercase leading-none">LEVOU O PRÊMIO</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 relative z-10">
                            <Badge className="bg-amber-500/20 text-amber-600 border-none text-[8px] font-black px-2.5 h-6 rounded-full uppercase">Sorteada</Badge>
                            <Trophy className="h-4 w-4 text-amber-500/30 -rotate-12" />
                          </div>
                          
                          {/* Decorative background element */}
                          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full -mr-8 -mt-8" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'top_buyers':
        return (
          <div key={section} className="bg-card rounded-3xl p-8 border border-border shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-animate-gradient">Top Compradores</h2>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-secondary">Últimos 5</Badge>
            </div>
            
            <div className="space-y-3">
              {campaignRanking?.slice(0, 5).map((user: any, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">

                  <div className="flex items-center gap-4">
                    <div className="w-8 text-sm font-black italic text-muted-foreground group-hover:text-primary transition-colors">#{i + 1}</div>
                    <Avatar className="h-10 w-10 border-2 border-border group-hover:border-primary/30 transition-all">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback className="bg-secondary text-foreground font-black uppercase text-xs">
                        {user.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tighter text-foreground">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{user.total_tickets} cotas adquiridas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i === 0 && <Crown className="h-5 w-5 text-amber-500" />}
                    {i === 1 && <Medal className="h-5 w-5 text-zinc-400" />}
                    {i === 2 && <Medal className="h-5 w-5 text-amber-700" />}
                  </div>
                </div>
              ))}
              {(!campaignRanking || campaignRanking.length === 0) && (
                <p className="text-center text-muted-foreground text-xs italic py-4">Aguardando as primeiras compras...</p>
              )}
            </div>
            
            <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest mt-4">
              Quem comprar mais cotas também receberá prêmios exclusivos!
            </p>
          </div>
        );

      case 'ranking':
        const hasGreaterSmallerRule = Array.isArray(campaign.prize_rules)
          && (campaign.prize_rules as any[]).some((r: any) => r?.type === 'greater_smaller' && r?.active !== false);
        if (!campaign.ranking_enabled) return null;
        return (
          <div key={section} className="space-y-6">
            {hasGreaterSmallerRule && (
              <div className="bg-transparent border-none shadow-none">
                <UserRanking
                  title="Premiação por Números"
                  stats={ticketStats ? {
                    ...ticketStats,
                    userTickets,
                    activePrize: {
                      title: "Maior e Menor Bilhete",
                      prize_maior: "14,01",
                      prize_menor: "14,01",
                      end_date: campaign.draw_date || new Date().toISOString()
                    }
                  } : null}
                  users={[]}
                />
              </div>
            )}
            <div className="bg-card rounded-3xl p-8 border border-border shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-amber-500" />
                  </div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-animate-gradient">Maiores Compradores</h2>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-secondary">Top 10</Badge>
              </div>
              <div className="space-y-3">
                {campaignRanking?.slice(0, 10).map((user: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-sm font-black italic text-muted-foreground group-hover:text-primary transition-colors">#{i + 1}</div>
                      <Avatar className="h-10 w-10 border-2 border-border group-hover:border-primary/30 transition-all">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="bg-secondary text-foreground font-black uppercase text-xs">
                          {user.name?.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tighter text-foreground">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{user.total_tickets} cotas adquiridas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {i === 0 && <Crown className="h-5 w-5 text-amber-500" />}
                      {i === 1 && <Medal className="h-5 w-5 text-zinc-400" />}
                      {i === 2 && <Medal className="h-5 w-5 text-amber-700" />}
                    </div>
                  </div>
                ))}
                {(!campaignRanking || campaignRanking.length === 0) && (
                  <p className="text-center text-muted-foreground text-xs italic py-4">Aguardando as primeiras compras...</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'winners':
        return (
          <div key={section} className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm">
            <CampaignPublicInfo campaign={campaign} />
          </div>
        );

      case 'roulette_footer':
        return rouletteEnabled && roulettePrizes && roulettePrizes.length > 0 && (
          <div key={section} className="mt-12 mb-12 bg-card rounded-3xl p-8 border border-border shadow-sm space-y-8">
            <div className="flex flex-col items-center text-center">
              <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase tracking-widest mb-2">Simulador de Sorte</Badge>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Prêmios da <span className="text-animate-gradient">Roleta</span></h2>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-2 max-w-xs">Benefícios exclusivos para quem adquire cotas desta ação!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roulettePrizes.map((p, i) => {
                const spinWin = rouletteWinsByLabel.get(p.label)?.[0];
                const spinWinnerName = getWinnerName(spinWin);
                return (
                <div key={i} className={cn("flex items-center justify-between p-4 rounded-2xl border", spinWin ? "bg-emerald-500/10 border-emerald-500/30" : "bg-secondary/30 border-border/50")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <RotateCw className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase tracking-tight text-foreground">{p.label}</p>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", spinWin ? "text-emerald-500" : "text-muted-foreground")}>{spinWin ? `Saiu para ${spinWinnerName}` : "Disponível na Roleta"}</p>
                    </div>
                  </div>
                  <Badge className={cn("border-none text-[8px] font-black uppercase", spinWin ? "bg-emerald-500 text-white" : "bg-primary/20 text-primary")}>{spinWin ? "SORTEADO" : "BENEFÍCIO"}</Badge>
                </div>
              )})}
            </div>

          </div>
        );

      case 'scratch_footer':
        return scratchEnabled && (
          <div key={section} className="mt-12 mb-20">
             <div className="flex flex-col items-center text-center mb-8">
              <Badge className="bg-amber-500/20 text-amber-500 border-none text-[10px] font-black uppercase tracking-widest mb-2">Diversão Instantânea</Badge>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Raspadinha <span className="text-animate-gradient">Premiada</span></h2>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-2 max-w-xs">
                Tente ganhar prêmios reais raspando agora!
              </p>
            </div>
            {(scratchPrizes?.length || 0) > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {scratchPrizes?.map((prize: any, i: number) => {
                  const scratchWin = scratchWinsByLabel.get(prize.label)?.[0];
                  const scratchWinnerName = getWinnerName(scratchWin);
                  return (
                    <div key={prize.id || i} className={cn("flex items-center justify-between p-4 rounded-2xl border", scratchWin ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/5 border-amber-500/20")}>
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-tight text-foreground truncate">{prize.label}</p>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", scratchWin ? "text-emerald-500" : "text-muted-foreground")}>{scratchWin ? `Saiu para ${scratchWinnerName}` : "Disponível na Raspadinha"}</p>
                      </div>
                      <Badge className={cn("border-none text-[8px] font-black uppercase", scratchWin ? "bg-emerald-500 text-white" : "bg-amber-500/20 text-amber-500")}>{scratchWin ? "SORTEADA" : "PRÊMIO"}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <ScratchCard 
              potentialPrizes={[
                ...(roulettePrizes?.map(p => p.label) || []),
                ...(luckyNumbers?.map((p: any) => p.prize) || []),
                "R$ 50,00 no PIX",
                "Giro Grátis na Roleta"
              ]}
              isSimulation={false}
              cost={campaign?.scratch_card_cost || 0}
              campaignId={campaign?.id}
              availableScratches={userScratchesAvailable}
              onStart={() => setIsGameInProgress(true)}
              onComplete={() => setIsGameInProgress(false)}
            />
          </div>
        );

      case 'box_footer':
        return mysteryBoxes && mysteryBoxes.length > 0 && (
          <div key={section} className="mt-12 mb-12 bg-card rounded-3xl p-8 border border-border shadow-sm space-y-8">
            <div className="flex flex-col items-center text-center">
              <Badge className="bg-purple-500/20 text-purple-500 border-none text-[10px] font-black uppercase tracking-widest mb-2">Surpresas</Badge>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Caixas <span className="text-animate-gradient">Surpresas</span></h2>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-2 max-w-xs">Abra caixas misteriosas e descubra prêmios instantâneos!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mysteryBoxes.map((box: any, i: number) => {
                const boxWin = (boxWins || []).find((w: any) => w.config_id === box.id || w.box_name === box.name);
                const boxWinnerName = getWinnerName(boxWin);
                return (
                  <div key={box.id || i} className={cn("flex items-center justify-between p-4 rounded-2xl border", boxWin ? "bg-emerald-500/10 border-emerald-500/30" : "bg-purple-500/5 border-purple-500/20")}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-tight text-foreground truncate">{box.name}</p>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", boxWin ? "text-emerald-500" : "text-muted-foreground")}>{boxWin ? `Saiu para ${boxWinnerName}` : `Disponível por R$ ${Number(box.cost || 0).toFixed(2)}`}</p>
                      </div>
                    </div>
                    <Badge className={cn("border-none text-[8px] font-black uppercase", boxWin ? "bg-emerald-500 text-white" : "bg-purple-500/20 text-purple-500")}>{boxWin ? "ABERTA" : "CAIXA"}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'events':
        return luckyHours && luckyHours.length > 0 && (
          <div key={section} className="bg-card rounded-[2rem] p-6 md:p-8 border-2 border-primary/20 shadow-lg shadow-primary/5 space-y-6 md:space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <h2 className="text-sm font-black uppercase italic tracking-tighter text-animate-gradient">Eventos e Premiações</h2>
              </div>
              {nextLuckyHour && (
                <Badge className="bg-primary text-white text-[10px] font-black uppercase px-3 py-1 animate-pulse">
                  Próximo: {new Date(nextLuckyHour.draw_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )}
            </div>
            
            <Tabs defaultValue="hourly" className="w-full">
              <TabsList className="bg-secondary/50 rounded-xl mb-4 grid grid-cols-2">
                <TabsTrigger value="hourly" className="rounded-lg gap-2 text-[10px] font-black uppercase tracking-tighter py-2">
                  <Clock className="h-3 w-3" /> Hora Premiada
                </TabsTrigger>
                <TabsTrigger value="greater_smaller" className="rounded-lg gap-2 text-[10px] font-black uppercase tracking-tighter py-2">
                  <TrendingUp className="h-3 w-3" /> Maior/Menor Cota
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hourly">
                <div className="grid grid-cols-1 gap-3">
                  {hourlyDraws.length > 0 ? hourlyDraws.map((draw) => (
                    <div key={draw.id} className="p-4 rounded-2xl bg-secondary/30 border border-border flex items-center justify-between gap-4 transition-all hover:bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${draw.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-tight text-foreground truncate">{draw.title}</p>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                            {new Date(draw.draw_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {draw.prize_description}
                          </p>
                          {draw.status === 'completed' && draw.winner_name && (
                            <div className="mt-1 flex flex-col gap-0.5">
                              <p className="text-[9px] font-black text-emerald-500 uppercase truncate flex items-center gap-1">
                                <Trophy className="h-2 w-2" /> Ganhador: {draw.winner_name}
                              </p>
                              {draw.winning_number && (
                                <p className="text-[8px] font-bold text-muted-foreground uppercase italic">Cota Premiada: {draw.winning_number}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={draw.status === 'completed' ? 'default' : 'secondary'} className="text-[7px] font-black uppercase px-2 h-5 shrink-0">
                        {draw.status === 'completed' ? 'Sorteado' : 'Em breve'}
                      </Badge>
                    </div>
                  )) : (
                    <p className="text-[10px] text-muted-foreground italic text-center py-4 uppercase font-bold tracking-widest">Aguardando eventos...</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="greater_smaller">
                <div className="grid grid-cols-1 gap-3">
                  {greaterSmallerDraws.length > 0 ? greaterSmallerDraws.map((draw) => {
                    const drawTime = new Date(draw.draw_time);
                    const now = new Date();
                    const isComingSoon = draw.status === 'scheduled' && (drawTime.getTime() - now.getTime()) < 3600000 && drawTime > now;

                    return (
                      <div key={draw.id} className={cn(
                        "p-4 rounded-2xl bg-secondary/30 border flex items-center justify-between gap-4 transition-all hover:bg-secondary/50",
                        isComingSoon ? "border-primary animate-blink shadow-[0_0_15px_rgba(var(--primary),0.4)] bg-primary/5" : 
                        draw.status === 'completed' ? "border-emerald-500/30 bg-emerald-500/5 animate-pulse" : "border-border"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${draw.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-tight text-foreground truncate">{draw.title}</p>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                              {drawTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {draw.prize_description}
                            </p>
                            {draw.status === 'completed' && draw.winner_name && (
                              <p className="text-[9px] font-black text-emerald-500 uppercase mt-0.5 truncate">Vencedor: {draw.winner_name} (Nº {draw.winning_number})</p>
                            )}
                            {isComingSoon && (
                              <p className="text-[9px] font-black text-primary uppercase mt-0.5 animate-pulse">DEFINIÇÃO EM INSTANTES!</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={draw.status === 'completed' ? 'default' : 'secondary'} className={cn(
                          "text-[7px] font-black uppercase px-2 h-5 shrink-0",
                          isComingSoon && "bg-primary text-white"
                        )}>
                          {draw.status === 'completed' ? 'Definido' : (isComingSoon ? 'Definindo...' : 'Agendado')}
                        </Badge>
                      </div>
                    );
                  }) : (
                    <p className="text-[10px] text-muted-foreground italic text-center py-4 uppercase font-bold tracking-widest">Aguardando definição...</p>
                  )}

                </div>
              </TabsContent>
            </Tabs>
          </div>
        );

      case 'features':
        return (
          <div key={section} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: ShieldCheck, title: "Seguro", desc: "Pagamento Protegido", color: "text-emerald-500" },
              { icon: Zap, title: "Rápido", desc: "Sorteios Diários", color: "text-primary" },
              { icon: Trophy, title: "Transparente", desc: "Ganhadores Reais", color: "text-amber-500" },
              { icon: Smartphone, title: "Prático", desc: "Acesso via Celular", color: "text-blue-500" }
            ].map((feature, i) => (
              <div key={i} className="bg-card rounded-2xl p-4 border border-border/50 flex flex-col items-center text-center gap-2 group hover:border-primary/30 transition-all duration-300">
                <div className={cn("h-10 w-10 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300", feature.color)}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-foreground leading-none">{feature.title}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 leading-none">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'faq':
        return (
          <div key={section} className="bg-card rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-10 border border-border shadow-sm space-y-6 md:space-y-8 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Info className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg md:text-2xl font-black uppercase italic tracking-tighter text-animate-gradient truncate">Dúvidas Frequentes</h2>
                  <p className="text-[7px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">Tudo o que você precisa saber</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {[
                { 
                  q: "Como os ganhadores são escolhidos?", 
                  a: "Utilizamos um sistema de sorteio automatizado e transparente. Para a 'Hora Premiada', o sistema escolhe aleatoriamente entre os bilhetes pagos. Para 'Maior/Menor Cota', vence quem detiver o bilhete de maior ou menor numeração no horário marcado.",
                  icon: Trophy
                },
                { 
                  q: "Como sei se ganhei?", 
                  a: "Além de aparecer instantaneamente no painel de 'Ganhadores' e nas notificações ao vivo, nossa equipe entra em contato via WhatsApp e telefone cadastrado para validar a premiação.",
                  icon: Bell
                },
                { 
                  q: "Quais as formas de pagamento?", 
                  a: "Aceitamos PIX com compensação imediata. Assim que o pagamento é confirmado, seus números são validados automaticamente no sistema e você já está concorrendo.",
                  icon: Zap
                },
                { 
                  q: "Posso comprar quantas cotas?", 
                  a: "O limite depende de cada campanha, mas você pode comprar quantas desejar até atingir o limite máximo por usuário ou o esgotamento da ação. Quanto mais cotas, maiores as chances!",
                  icon: Ticket
                }
              ].map((item, i) => (
                <div key={i} className="p-4 md:p-6 rounded-3xl bg-secondary/20 border border-border/50 hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="h-8 w-8 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-tight text-foreground leading-tight">{item.q}</p>
                      <p className="text-[9px] md:text-[11px] font-medium text-muted-foreground leading-relaxed line-clamp-3">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4 md:pt-6 border-t border-border/50 flex flex-col items-center text-center gap-3 md:gap-4">
              <p className="text-[8px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest truncate">Ainda tem dúvidas? Fale com nosso suporte</p>
              <Button variant="outline" className="rounded-2xl px-6 md:px-8 h-10 md:h-12 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[9px] md:text-[10px] gap-2 w-full md:w-auto">
                <Smartphone className="h-4 w-4" /> Atendimento via WhatsApp
              </Button>
            </div>
          </div>
        );

      case 'social_proof':
        return (
          <div key={section} className="bg-card rounded-[2rem] p-8 border border-border shadow-sm space-y-8 overflow-hidden relative">
            <div className="flex flex-col items-center text-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-black uppercase tracking-widest">Confiança Total</Badge>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">Quem Ganha, <span className="text-animate-gradient">Acredita!</span></h2>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest max-w-md">Junte-se a milhares de participantes que já realizaram seus sonhos com nossas ações.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: "João Silva", prize: "R$ 5.000,00 no PIX", date: "Há 2 dias", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joao" },
                { name: "Maria Santos", prize: "iPhone 15 Pro Max", date: "Há 5 dias", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria" },
                { name: "Pedro Oliveira", prize: "Moto 0km", date: "Há 1 semana", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro" }
              ].map((winner, i) => (
                <div key={i} className="bg-secondary/30 rounded-3xl p-5 border border-border/50 flex items-center gap-4 group hover:bg-secondary/50 transition-all">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarImage src={winner.img} />
                    <AvatarFallback className="bg-primary/10 text-primary font-black">{winner.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-tight text-foreground truncate">{winner.name}</p>
                    <p className="text-[10px] font-bold text-primary uppercase italic truncate">{winner.prize}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Vencedor Verificado
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-8 pt-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sorteio Auditado</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Pagamento Instantâneo</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Ação 100% Legal</span>
              </div>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div key={section} className="bg-primary rounded-[2.5rem] p-8 md:p-12 text-center space-y-6 relative overflow-hidden group shadow-2xl shadow-primary/20">
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
            <motion.div 
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="relative z-10 space-y-4"
            >
              <h2 className="text-xl sm:text-2xl md:text-5xl font-black uppercase italic tracking-tighter text-black leading-none">
                Sua sorte está a um <br className="hidden md:block" /> <span className="underline decoration-black/30 underline-offset-8">PIX de distância!</span>
              </h2>
              <p className="text-[10px] md:text-lg font-bold text-black/70 uppercase tracking-widest max-w-2xl mx-auto leading-relaxed">
                Não deixe para amanhã o prêmio que você pode ganhar hoje. Escolha suas cotas e participe agora!
              </p>
            </motion.div>
            
            <div className="relative z-10 pt-4">
              <Button 
                size="lg"
                className="h-14 md:h-16 px-8 md:px-12 rounded-xl md:rounded-2xl bg-black text-primary hover:bg-black/90 hover:scale-105 transition-all shadow-2xl font-black uppercase tracking-widest text-[10px] md:text-sm gap-3 group"
                onClick={() => document.getElementById('purchase-tabs')?.scrollIntoView({ behavior: 'smooth' })}
              >
                QUERO PARTICIPAR AGORA <Zap className="h-4 w-4 md:h-5 md:w-5 fill-current group-hover:animate-bounce" />
              </Button>
              <p className="text-[8px] md:text-[10px] font-black text-black/50 uppercase tracking-[0.2em] mt-4 md:mt-6 flex items-center justify-center gap-2">
                <Clock className="h-3 w-3" /> RESTAM POUCAS COTAS DISPONÍVEIS!
              </p>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
          </div>
        );

      case 'steps':
        return (
          <div key={section} className="bg-card rounded-[2rem] p-6 md:p-8 border border-border shadow-sm space-y-6 md:space-y-8 overflow-hidden">
            <div className="flex flex-col items-center text-center gap-2">
              <Badge className="bg-primary/10 text-primary border-none text-[8px] md:text-[10px] font-black uppercase tracking-widest">Simples e Rápido</Badge>
              <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter">Veja como <span className="text-animate-gradient">Participar</span></h2>
              <p className="text-[9px] md:text-xs text-muted-foreground uppercase font-bold tracking-widest max-w-xs md:max-w-md">Siga os passos abaixo e comece a concorrer agora mesmo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 relative">
              {[
                { step: "01", title: "Escolha suas Cotas", desc: "Selecione a quantidade de números ou escolha seus números da sorte favoritos.", icon: MousePointer2 },
                { step: "02", title: "Faça o Pagamento", desc: "Pague via PIX com segurança. O processamento é instantâneo e automático.", icon: Zap },
                { step: "03", title: "Aguarde o Sorteio", desc: "Pronto! Agora é só torcer. Você pode acompanhar tudo aqui pelo painel.", icon: Trophy }
              ].map((item, i) => (
                <div key={i} className="relative flex flex-col items-center text-center gap-3 md:gap-4 p-5 md:p-6 rounded-3xl bg-secondary/20 border border-border/50 group hover:border-primary/30 transition-all duration-300 overflow-hidden">
                  <div className="absolute -top-2 -left-2 h-7 w-10 md:h-8 md:w-12 bg-primary text-black font-black italic flex items-center justify-center rounded-xl rotate-[-10deg] shadow-lg group-hover:rotate-0 transition-transform text-[10px] md:text-xs">
                    {item.step}
                  </div>
                  <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-background border border-border flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <item.icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div className="space-y-1 md:space-y-2 min-w-0">
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-tight text-foreground truncate">{item.title}</h3>
                    <p className="text-[10px] md:text-[11px] font-medium text-muted-foreground leading-relaxed line-clamp-2">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const baseSectionsOrder = campaign.sections_order || ["gallery", "features", "header", "timer", "live_stream", "steps", "progress", "purchase", "live_draw", "events", "prizes", "ranking", "winners", "description", "social_proof", "faq", "cta", "roulette_footer", "scratch_footer", "box_footer"];
  const sectionsOrder = (isFinished || (campaign as any)?.status === 'drawn' || (campaign as any)?.status === 'finished')
    ? ["winner_banner", ...baseSectionsOrder.filter((s: string) => s !== "winner_banner")]
    : baseSectionsOrder;

  const isInlineLayout = siteSettings?.layout_mode === 'inline';

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={campaign.title} 
        description={campaign.subtitle || campaign.description?.slice(0, 160) || ""} 
        image={campaign.image_url || ""}
        type="article"
      />
      <Header />
      <LiveNotifications />

      
      <div className="container px-4 md:px-6 pb-20 pt-[var(--header-height,100px)]">
        {isInlineLayout ? (
          <CampaignInlineView
            campaign={campaign}
            onBuy={(q) => handleBuy(q)}
            isPurchasing={isPurchasing}
            isGameInProgress={isGameInProgress}
            setIsGameInProgress={setIsGameInProgress}
            luckyNumbersStatus={luckyNumbersStatus}
            userId={user?.id}
            sectionsOrder={sectionsOrder}
          />
        ) : (
          <div className="flex flex-col gap-8 md:gap-12 mt-0">
            {sectionsOrder.map((section) => renderSection(section))}
            {(campaign as any).gift_mode_enabled && (
              <GiftResultsSection
                campaignId={campaign.id}
                revealed={!!(campaign as any).gift_results_revealed}
              />
            )}
          </div>
        )}
      </div>

      <PurchaseAnimation 
        isVisible={showSuccess} 
        onComplete={() => {
          setShowSuccess(false);
          setIsPaymentModalOpen(true);
        }} 

      />

      <QuickRegisterDialog 
        isOpen={isQuickRegisterOpen} 
        onOpenChange={setIsQuickRegisterOpen} 
        onSuccess={() => {
          if (pendingPurchase !== null) {
            // Give a bit of time for auth state to propagate
            setTimeout(() => {
              handleBuy(pendingPurchase);
              setPendingPurchase(null);
            }, 500);
          }
        }} 
      />
      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onOpenChange={handleOpenChange} 
        orderId={currentOrderId} 
        onPaymentSuccess={handlePaymentSuccess} 
        onBuyMore={(qty) => handleBuy(qty, true)}
      />

      <Footer />
      
    </div>
  );
};

export default CampaignDetail;
