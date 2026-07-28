import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Zap, Trophy, Loader2, Sparkles, Gamepad2, Gift, 
  TrendingUp, Award, Clock, Star, Users, Flame,
  ArrowRight, ShieldCheck, Heart, Link as LinkIcon, RotateCw, Activity,
  Search, Filter, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroModel1 from "@/components/hero/HeroModel1";
import HeroModel2 from "@/components/hero/HeroModel2";
import HeroModel3 from "@/components/hero/HeroModel3";
import HeroModel4 from "@/components/hero/HeroModel4";
import CampaignCard from "@/components/CampaignCard";
import WinnerCard from "@/components/WinnerCard";

import Roulette from "@/components/Roulette";
import CountdownTimer from "@/components/CountdownTimer";
import GoogleReviews from "@/components/GoogleReviews";
import { useCampaigns, useWinners, useSiteSettings } from "@/hooks/useData";
import { playSound, hapticFeedback } from "@/lib/sounds";
import Particles from "@/components/Particles";
import { useTheme } from "@/components/ThemeProvider";
import { SEO } from "@/components/SEO";
import HomeExtraSections from "@/components/home/HomeExtraSections";
import BannersInline from "@/components/inline/BannersInline";


const SectionHeading = ({ icon: Icon, title, subtitle, badge }: { icon: any, title: string, subtitle: string, badge?: string }) => (
  <div className="flex flex-col gap-2 mb-10">
    <div className="flex items-center gap-2">
      {badge && <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest">{badge}</Badge>}
    </div>
    <div className="flex items-center justify-between items-end">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">
            {title.split(' ')[0]} <span className="text-animate-gradient">{title.split(' ').slice(1).join(' ')}</span>
          </h2>
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">{subtitle}</p>
      </div>
    </div>
  </div>
);

const hexToHsl = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const Index = () => {
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading: loadingCampaigns, isError, error } = useCampaigns();
  const { data: winners, isLoading: loadingWinners } = useWinners();
  const { data: siteSettings } = useSiteSettings();
  const { data: isAdmin } = useIsAdmin();
  const { theme } = useTheme();
  const [heroStyle, setHeroStyle] = useState<number>(1); // Default style 1
  const [showEnded, setShowEnded] = useState(false);
  const endedRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
        }
      },
      { threshold: 0.1 }
    );

    if (endedRef.current) {
      observer.observe(endedRef.current);
    }

    return () => observer.disconnect();
  }, []);
  
  useEffect(() => {
    if (siteSettings) {
      if (siteSettings.home_hero_style) {
        setHeroStyle(parseInt(siteSettings.home_hero_style));
      }

      // Inject dynamic CSS variables for animations
      const root = document.documentElement;
      if (siteSettings.button_glow_speed) {
        root.style.setProperty('--button-glow-speed', `${siteSettings.button_glow_speed}s`);
      }
      if (siteSettings.title_shimmer_speed) {
        root.style.setProperty('--title-shimmer-speed', `${siteSettings.title_shimmer_speed}s`);
      }
      if (siteSettings.border_shimmer_opacity) {
        root.style.setProperty('--border-shimmer-opacity', siteSettings.border_shimmer_opacity);
      }
      if (siteSettings.button_hover_effect === 'false') {
        root.style.setProperty('--hover-scale', '1');
        root.style.setProperty('--hover-translate', '0');
      } else {
        root.style.setProperty('--hover-scale', '1.02');
        root.style.setProperty('--hover-translate', '-2px');
      }
      if (siteSettings.animation_easing) {
        root.style.setProperty('--animation-easing', siteSettings.animation_easing);
      }
      if (siteSettings.button_glow_intensity) {
        root.style.setProperty('--button-glow-intensity', siteSettings.button_glow_intensity);
      }
      if (siteSettings.primary_color) {
        root.style.setProperty('--primary', hexToHsl(siteSettings.primary_color));
      }

      if (siteSettings.title_shimmer_primary) {
        root.style.setProperty('--title-shimmer-primary', siteSettings.title_shimmer_primary);
      }

      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (isDark) {
        if (siteSettings.title_shimmer_secondary) {
          root.style.setProperty('--text-gradient-shimmer', siteSettings.title_shimmer_secondary);
        }
      } else {
        if (siteSettings.title_shimmer_secondary_light) {
          root.style.setProperty('--text-gradient-shimmer', siteSettings.title_shimmer_secondary_light);
        }
      }
    } else {
      const savedStyle = localStorage.getItem('home_hero_style');
      if (savedStyle) setHeroStyle(parseInt(savedStyle));
    }
  }, [siteSettings, theme]);

  const changeHeroStyle = (style: number) => {
    setHeroStyle(style);
    // Also save to localStorage for immediate visual feedback if needed, 
    // but the source of truth is now the database via site_settings
    localStorage.setItem('home_hero_style', style.toString());
    toast.success(`Estilo do slide alterado para Modelo ${style}!`);
  };

  const activeCampaigns = useMemo(() => {
    if (!campaigns) return [];
    const now = new Date();
    return campaigns
      .filter(c => {
        const isActiveStatus = c.status === "active";
        const isNotExpired = !c.draw_date || new Date(c.draw_date) > now;
        return isActiveStatus && isNotExpired;
      })
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [campaigns]);

  const featuredCampaigns = useMemo(() => {
    return activeCampaigns.filter(c => c.featured);
  }, [activeCampaigns]);

  const normalCampaigns = useMemo(() => {
    let filtered = activeCampaigns.filter(c => !c.featured);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(term) || 
        c.subtitle?.toLowerCase().includes(term)
      );
    }
    
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.ticket_price - b.ticket_price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.ticket_price - a.ticket_price);
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      default: // recent
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    return filtered;
  }, [activeCampaigns, searchTerm, sortBy]);


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const endedCampaigns = useMemo(() => {
    if (!campaigns) return [];
    const now = new Date();
    const allEnded = campaigns
      .filter(c => {
        const isEndedStatus = (c.status === "completed" || c.status === "finished" || c.status === "drawn");
        const isExpired = c.draw_date && new Date(c.draw_date) <= now;
        return isEndedStatus || isExpired;
      })
      .sort((a, b) => {
        if (a.draw_date && b.draw_date) {
          return new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime();
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    
    return showEnded ? allEnded : allEnded.slice(0, 4);
  }, [campaigns, showEnded]);

  const featuredCampaign = activeCampaigns[0];
  // Normal campaigns excludes featured ones to avoid duplication
  const normalCampaignsList = useMemo(() => {
    return normalCampaigns.filter(c => !featuredCampaigns.some(f => f.id === c.id));
  }, [normalCampaigns, featuredCampaigns]);

  const totalPages = Math.ceil(normalCampaignsList.length / itemsPerPage);
  
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return normalCampaignsList.slice(startIndex, startIndex + itemsPerPage);
  }, [normalCampaignsList, currentPage, itemsPerPage]);
  const endingSoon = activeCampaigns.filter(c => {
    const total = Number(c.total_tickets) || 1;
    const sold = Number(c.sold_tickets) || 0;
    return sold / total > 0.8;
  });

    return (
     <div className="min-h-screen bg-background relative overflow-hidden">
       <SEO 
         title={undefined} 
         description={siteSettings?.description} 
         keywords={siteSettings?.site_keywords} 
       />
       {/* Global Background Particles */}

       <div className="fixed inset-0 z-0 pointer-events-none">
         <Particles count={25} />
       </div>

       <Header />
        


       {loadingCampaigns ? (
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Carregando Oportunidades...</p>
        </div>
      ) : isError ? (
        <div className="flex h-[80vh] flex-col items-center justify-center gap-6 text-center px-6">
          <div className="h-20 w-20 rounded-full bg-rose-500/10 flex items-center justify-center">
            <Activity className="h-10 w-10 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Opa! Algo deu errado</h2>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest max-w-md">
              Não conseguimos carregar as ações no momento. Por favor, tente atualizar a página.
            </p>
            {isAdmin && <pre className="text-[10px] bg-secondary p-4 rounded-xl mt-4 max-w-full overflow-auto">{(error as any)?.message}</pre>}
          </div>
          <Button 
            className="h-14 rounded-2xl px-10 font-black uppercase italic tracking-widest glow-primary" 
            onClick={() => window.location.reload()}
          >
            TENTAR NOVAMENTE
          </Button>
        </div>
      ) : (
        <>
           {campaigns && campaigns.length > 0 && (
             <div className="relative group pt-[var(--header-height,100px)]">
                  {heroStyle === 1 && (
                   <HeroModel1 
                     campaigns={activeCampaigns.slice(0, 5)} 
                     delay={parseInt(siteSettings?.hero_transition_speed || '5000')}
                     transitionType={siteSettings?.hero_transition_type as any || 'slide'}
                   />
                 )}
                 {heroStyle === 2 && (
                   <HeroModel2 
                     campaigns={activeCampaigns.slice(0, 5)} 
                     delay={parseInt(siteSettings?.hero_transition_speed || '5000')}
                     transitionType={siteSettings?.hero_transition_type as any || 'slide'}
                   />
                 )}
                 {heroStyle === 3 && (
                   <HeroModel3 
                     campaigns={activeCampaigns.slice(0, 5)} 
                     delay={parseInt(siteSettings?.hero_transition_speed || '5000')}
                     transitionType={siteSettings?.hero_transition_type as any || 'slide'}
                   />
                 )}
                 {heroStyle === 4 && (
                   <HeroModel4 
                     campaigns={activeCampaigns.slice(0, 5)} 
                     delay={parseInt(siteSettings?.hero_transition_speed || '5000')}
                     transitionType={siteSettings?.hero_transition_type as any || 'slide'}
                   />
                  )}
              </div>
            )}

          {/* Gamification Navigation - Improved Spacing and Visuals */}
          {String(siteSettings?.home_show_games_combo ?? "true") === "true" && (
          <section className="container relative z-30 -mt-6 md:-mt-12 py-6 md:py-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-6">
                {[
                  { key: "roleta", icon: RotateCw, title: "Roleta Premiada", desc: "Gire e Ganhe", color: "from-emerald-500/40", href: "/roleta-premiada", badge: "NEW" },
                  { key: "raspadinha", icon: Sparkles, title: "Raspadinha", desc: "Raspe e Ganhe", color: "from-yellow-500/40", href: "/raspadinha-da-sorte" },
                  { key: "caixa", icon: Gift, title: "Caixa Misteriosa", desc: "Prêmios Secretos", color: "from-orange-500/40", href: "/caixa-misteriosa-de-premios", badge: "HOT" },
                  { key: "ranking", icon: Trophy, title: "Ranking Top", desc: "Maiores Ganhadores", color: "from-amber-500/40", href: "/ranking" },
                  { key: "afiliados", icon: Users, title: "Afiliados", desc: "Ganhe Comissões", color: "from-purple-500/40", href: "/afiliados" },
                ].filter((item) => String((siteSettings as any)?.[`home_show_game_${item.key}`] ?? "true") === "true").map((item, i) => (
                  <Link key={i} to={item.href} onClick={() => { playSound('click'); hapticFeedback(); }}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -12, scale: 1.05, boxShadow: "0 20px 40px -10px rgba(var(--primary-rgb), 0.3)" }}
                      onMouseEnter={() => playSound('hover')}
                      whileTap={{ scale: 0.95 }}
                       className={`group relative overflow-hidden h-full rounded-2xl border border-border bg-card p-4 md:p-6 shadow-xl cursor-pointer transition-all duration-500 hover:border-primary/50 border-light-path border-[#22c55e]/20 hover:border-[#22c55e]/50`}
                    >
                    <div className={`absolute -right-8 -top-8 h-32 w-32 bg-gradient-to-br ${item.color} to-transparent blur-3xl transition-opacity group-hover:opacity-100 opacity-20`} />
                    {item.badge && (
                      <Badge className="absolute top-4 right-4 bg-primary text-[8px] font-black italic animate-bounce px-2 py-0.5">
                        {item.badge}
                      </Badge>
                    )}
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-secondary border border-border flex items-center justify-center mb-4 md:mb-5 group-hover:bg-primary/20 group-hover:border-primary/50 transition-all border-light-path border-[#22c55e]/30">
                      <item.icon className="relative z-10 h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <h3 className="relative z-10 text-sm font-black uppercase tracking-widest text-foreground leading-none mb-2 group-hover:text-animate-gradient transition-all">{item.title}</h3>
                    <p className="relative z-10 text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{item.desc}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
          )}

           {/* Active Campaigns Sections */}
           <section className="container py-12 md:py-20 space-y-20">
             {/* Featured Campaigns */}
             {featuredCampaigns.length > 0 && (
               <div className="space-y-8">
                 <SectionHeading 
                   icon={Star} 
                   title="Campanhas em Destaque" 
                   subtitle="As melhores oportunidades selecionadas para você"
                   badge="VIP"
                 />
                 <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                   {featuredCampaigns.map((campaign, i) => (
                     <CampaignCard key={campaign.id} campaign={campaign} index={i} />
                   ))}
                 </div>
               </div>
             )}

             {/* Normal Active Campaigns */}
             <div className="space-y-8">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                 <SectionHeading 
                   icon={Zap} 
                   title="Sorteios Ativos" 
                   subtitle="Participe e concorra a prêmios incríveis"
                   badge="Ao Vivo"
                 />
                 
               </div>

               <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 min-h-[100px]">
                 {paginatedCampaigns.length > 0 ? (
                   paginatedCampaigns.map((campaign, i) => (
                     <CampaignCard key={campaign.id} campaign={campaign} index={i} />
                   ))
                  ) : searchTerm ? (
                    <div className="col-span-full py-20 px-6 rounded-3xl border border-dashed border-border bg-card/50 flex flex-col items-center text-center gap-6 animate-fade-in">
                      <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center shadow-inner">
                        <Search className="h-10 w-10 text-muted-foreground opacity-30" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter text-foreground">
                          Nenhum resultado encontrado
                        </h3>
                        <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest max-w-md mx-auto">
                          Tente buscar por outros termos ou limpe o filtro.
                        </p>
                        <Button
                          variant="link"
                          onClick={() => setSearchTerm("")}
                          className="text-primary font-black uppercase tracking-widest text-[10px]"
                        >
                          Limpar busca
                        </Button>
                      </div>
                    </div>
                   ) : null}
               </div>

               {/* Banners cadastrados no painel admin */}
               <div className="pt-4">
                 <BannersInline />
               </div>

               {/* Pagination UI */}
               {totalPages > 1 && (
                 <div className="flex justify-center items-center gap-2 pt-10">
                   <Button
                     variant="outline"
                     size="icon"
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={currentPage === 1}
                     className="h-10 w-10 rounded-xl border-border hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                   >
                     <ChevronLeft className="h-4 w-4" />
                   </Button>
                   
                   <div className="flex gap-2">
                     {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                       <Button
                         key={page}
                         variant={currentPage === page ? "default" : "outline"}
                         onClick={() => setCurrentPage(page)}
                         className={cn(
                           "h-10 w-10 rounded-xl font-black transition-all",
                           currentPage === page 
                             ? "glow-primary border-transparent" 
                             : "border-border hover:bg-primary/10 hover:text-primary"
                         )}
                       >
                         {page}
                       </Button>
                     ))}
                   </div>

                   <Button
                     variant="outline"
                     size="icon"
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={currentPage === totalPages}
                     className="h-10 w-10 rounded-xl border-border hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                   >
                     <ChevronRight className="h-4 w-4" />
                   </Button>
                 </div>
               )}
             </div>

           </section>



          {/* Ganhadores Cinematic Section - Hall da Fama */}
          {String(siteSettings?.home_show_hall_fame ?? 'true') !== 'false' && (
          <section className="container py-24 md:py-32 relative">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 bg-primary/10 blur-[100px] rounded-full" />
            
            <SectionHeading 
              icon={Trophy} 
              title="Hall da Fama" 
              subtitle="Conheça os mais novos sortudos da plataforma"
              badge="Inspire-se"
            />
            
            {loadingWinners ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
                <div className="grid gap-y-20 gap-x-8 sm:grid-cols-2 lg:grid-cols-4 pt-16">
                 {(() => {
                   const customJson = siteSettings?.home_hall_fame_json;
                   if (customJson && String(customJson).trim().length > 0) {
                     try {
                       const parsed = JSON.parse(customJson);
                       if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                     } catch (e) { console.warn("[HallDaFama] JSON inválido", e); }
                   }
                   return (winners && winners.length > 0 ? winners : [
                    { id: "1", winner_name: "José Ferreira", prize_description: "iPhone 15 Pro", ticket_number: "8293", campaigns: { title: "Ação de Verão" }, avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop", winner_type: "raffle", draw_date: new Date().toISOString() },
                    { id: "2", winner_name: "Maria Luiza", prize_description: "R$ 5.000,00 no PIX", ticket_number: "1029", campaigns: { title: "Super PIX" }, avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&auto=format&fit=crop", winner_type: "lucky_number", draw_date: new Date().toISOString() },
                    { id: "3", winner_name: "Carlos Manoel", prize_description: "R$ 100,00 de Saldo", ticket_number: "ROLETA", campaigns: { title: "Giro da Sorte" }, avatar_url: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=256&h=256&auto=format&fit=crop", winner_type: "roulette", draw_date: new Date().toISOString() },
                    { id: "4", winner_name: "Beatriz Souza", prize_description: "R$ 50,00 Instantâneo", ticket_number: "RASPA", campaigns: { title: "Raspadinha" }, avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&auto=format&fit=crop", winner_type: "scratchcard", draw_date: new Date().toISOString() }
                   ]);
                 })().slice(0, 8).map((winner: any, i: number) => (
                  <div key={winner.id} className="relative group">
                    {/* Speech Bubble / Balloon Effect */}
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        delay: i * 0.2,
                        duration: 0.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        repeatDelay: 5
                      }}
                      className="absolute -top-20 left-4 right-4 bg-primary text-primary-foreground p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-xl z-20 group-hover:scale-110 transition-transform"
                    >
                      {["EU GANHEI!", "ACREDITEI E FOI!", "DEU BOM!", "SÓ ALEGRIA!"][i % 4]}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-t-8 border-t-primary border-x-8 border-x-transparent" />
                    </motion.div>
                    
                    <WinnerCard winner={winner as any} index={i} />
                  </div>
                ))}
              </div>
            )}
          </section>
          )}

          {/* Ações Encerradas Section at the end - Optimized Loading */}
          <div ref={endedRef} className="scroll-mt-20">
            {campaigns && campaigns.some(c => (c.status === "completed" || c.status === "finished" || c.status === "drawn" || (c.draw_date && new Date(c.draw_date) <= new Date()))) && (
              <section className="container py-12 md:py-20 border-t border-border mt-12">
                <SectionHeading 
                  icon={Clock} 
                  title="Ações Finalizadas" 
                  subtitle="Confira os resultados dos sorteios anteriores"
                  badge="Encerradas"
                />
                
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {endedCampaigns.map((campaign, i) => (
                      <CampaignCard key={campaign.id} campaign={campaign} index={i} />
                    ))}
                  </AnimatePresence>
                </div>

                {!showEnded && campaigns.filter(c => (c.status === "completed" || c.status === "finished" || c.status === "drawn" || (c.draw_date && new Date(c.draw_date) <= new Date()))).length > 4 && (
                  <div className="flex justify-center mt-12">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => setShowEnded(true)}
                      className="h-14 rounded-2xl px-10 font-black uppercase tracking-widest text-xs gap-2 border-primary/20 hover:bg-primary/5"
                    >
                      Carregar Mais Finalizadas <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>

          {String(siteSettings?.home_show_testimonials ?? 'true') !== 'false' && (
            <GoogleReviews 
              customReviewsJson={siteSettings?.home_testimonials_json}
            />
          )}

          <HomeExtraSections settings={siteSettings} />
        </>
      )}

      <Footer />
    </div>
  );
};

export default Index;
