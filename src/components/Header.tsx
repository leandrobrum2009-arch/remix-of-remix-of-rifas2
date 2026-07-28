import { Menu, X, User, Ticket, LogOut, Bell, Wallet, Search, Zap, Activity, ArrowRight, Smartphone, Download, Settings } from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeProfile } from "@/hooks/useRealtimeProfile";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/hooks/useData";
import HeaderInline from "./HeaderInline";
import { QuickRegisterDialog } from "./QuickRegisterDialog";

const ALL_NAV_LINKS = [
  { key: "campanhas", label: "Campanhas", href: "/campanhas" },
  { key: "ganhadores", label: "Ganhadores", href: "/ganhadores" },
  { key: "comunicados", label: "Comunicados", href: "/comunicados" },
  { key: "suporte", label: "Suporte", href: "/contato" },
];

const LogoFallback = ({ siteName }: { siteName?: string }) => (
  <div className="flex items-center gap-2 logo-fallback">
    <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
      <Ticket className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
    </div>
    <span className={`font-display text-xs sm:text-sm md:text-lg font-black uppercase tracking-tighter text-foreground text-animate-gradient truncate`}>
      {siteName ? (
        <>
          {siteName.split(' ')[0]}
          <span className="text-primary">{siteName.split(' ').slice(1).join(' ')}</span>
        </>
      ) : (
        <span className="opacity-0">Plataforma</span>
      )}
    </span>
  </div>
);

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [logoError, setLogoError] = useState(false);
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { profile } = useRealtimeProfile(user?.id);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const { data: siteSettings } = useSiteSettings();
  const navigate = useNavigate();
  const headerRef = React.useRef<HTMLElement>(null);

  const navLinks = ALL_NAV_LINKS.filter(
    (l) => String((siteSettings as any)?.[`menu_${l.key}_enabled`] ?? "true") !== "false"
  );

  useEffect(() => {
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }
  }, [siteSettings, scrolled, mobileOpen]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (siteSettings?.app_download_link) {
      window.open(siteSettings.app_download_link, '_blank');
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      toast.info("Para baixar o app, use a opção 'Adicionar à tela de início' no menu do seu navegador.");
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      localStorage.setItem('referred_by', ref);
    }
    
    if (siteSettings?.site_logo_url) {
      localStorage.setItem('site_logo', siteSettings.site_logo_url);
    }
  }, [siteSettings]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      const fetchUnread = async () => {
        const { count } = await supabase.from("notifications").select("*", { count: 'exact', head: true }).eq("user_id", user.id).eq("is_read", false);
        setUnreadCount(count || 0);
      };
      fetchUnread();

      // Realtime subscription for notifications
      const channel = supabase.channel(`notifications-${user.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        }, (payload: any) => {
          setUnreadCount(prev => prev + 1);
          toast.info(payload.new.title, {
            description: payload.new.message,
            action: {
              label: "Ver",
              onClick: () => navigate("/conta#notificacoes")
            }
          });
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Global layout mode (defined in admin) — applies to ALL users, ALL pages.
  // Standard mode never renders the inline header, and vice-versa.
  if (siteSettings?.layout_mode === 'inline') {
    return <HeaderInline />;
  }

  return (
    <header ref={headerRef} className={`fixed top-0 z-50 w-full transition-all duration-500 ${scrolled ? 'border-b bg-background/80 backdrop-blur-xl shadow-lg' : 'bg-background/95 backdrop-blur-md'}`}>

      <div className="flex flex-col w-full">
        <div className={`transition-all duration-500 flex items-center ${scrolled ? 'h-16' : 'h-20 md:h-24'}`}>
          <div className="container flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 md:gap-8 min-w-0">
              <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                {siteSettings?.site_logo_url && siteSettings.site_logo_url.trim() !== "" && !logoError ? (
                  <img 
                    src={siteSettings.site_logo_url} 
                    alt={`${siteSettings?.site_name || "Plataforma de Ações"} - logotipo da página inicial`} 
                    className="h-[var(--logo-height-mobile,36px)] md:h-[var(--logo-height-desktop,44px)] w-auto object-contain site-logo-img" 
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <LogoFallback siteName={siteSettings?.site_name} />
                )}
              </Link>

              <nav className="hidden items-center gap-6 lg:flex h-full">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`text-[11px] font-bold uppercase tracking-wider transition-all hover:text-primary ${scrolled ? 'text-foreground' : 'text-foreground/90'}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {!user && String((siteSettings as any)?.header_register_button_enabled ?? "true") !== "false" && (
                <Button
                    onClick={() => navigate("/cadastrar")}
                    size="sm"
                    className="h-10 rounded-full font-black uppercase tracking-widest text-[10px] px-6 sm:px-8 glow-primary shadow-lg shadow-primary/20 border-light-path border-[#22c55e]/30"
                    aria-label="Cadastre-se grátis"
                  >
                    Cadastre-se <Zap className="ml-1 h-3 w-3 fill-current" />
                  </Button>
              )}
              {user ? (
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="hidden items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 md:flex border-light-path border-[#22c55e]/40"
                  >
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black italic text-animate-gradient">R$ {Number(profile?.balance || 0).toFixed(2)}</span>
                  </motion.div>
                  
                  <button
                    onClick={() => navigate("/minha-conta")}
                    aria-label={unreadCount > 0 ? `Abrir notificações (${unreadCount} não lidas)` : "Abrir notificações"}
                    className="relative rounded-full bg-secondary/50 p-2 text-foreground/90 hover:bg-secondary hover:text-primary transition-all border border-border shadow-sm"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-4 ring-background animate-pulse" />
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center">
                        <Button size="sm" variant="outline" className="h-10 rounded-full gap-2 border-primary/50 bg-primary/5 hover:bg-primary/10 font-black uppercase tracking-widest text-[10px] px-4 italic group inline-flex items-center leading-none">
                          <Settings className="h-4 w-4 shrink-0 text-primary group-hover:rotate-90 transition-transform duration-500" />
                          <span className="hidden sm:inline leading-none translate-y-[0.5px]">Painel</span>
                        </Button>
                      </Link>
                    )}
                    <Link to="/minha-conta">
                      <Button size="sm" variant="outline" className="h-10 rounded-full gap-2 border-border bg-card hover:bg-secondary font-black uppercase tracking-widest text-[10px] px-4 italic text-foreground shadow-sm inline-flex items-center leading-none">
                        <User className="h-4 w-4 shrink-0 text-primary" />
                        <span className="hidden lg:inline leading-none translate-y-[0.5px]">{profile?.name?.split(' ')[0] || user.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || "Perfil"}</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link to="/entrar">
                    <Button size="sm" variant="ghost" className="h-10 rounded-full font-black uppercase tracking-widest text-[10px] px-6">
                      Entrar
                    </Button>
                  </Link>
                </div>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
                aria-expanded={mobileOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 text-foreground lg:hidden border border-border shadow-sm"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Configurable Marquee Strip below the logo/nav */}
        {siteSettings?.home_marquee_enabled === 'true' && !scrolled && (
          <div className="relative z-40 w-full overflow-hidden bg-primary/20 backdrop-blur-md border-b border-primary/30 py-2 pointer-events-none">
            <motion.div 
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="flex whitespace-nowrap gap-12 items-center will-change-transform"
            >
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">
                  {siteSettings.home_marquee_text?.split(' • ').map((text: string, idx: number) => (
                    <React.Fragment key={idx}>
                      <span>{text}</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-card/95 backdrop-blur-xl shadow-2xl lg:hidden"
          >
            <nav className="container flex flex-col gap-1 py-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3.5 text-xs font-black uppercase tracking-widest text-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-[0.98]"
                >
                  {link.label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                </Link>
              ))}
              {user && (
                <Link
                  to="/conta#tickets"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3.5 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                >
                  Meus Títulos
                  <Ticket className="h-3.5 w-3.5 opacity-50" />
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3.5 text-xs font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/10 active:scale-[0.98] border border-primary/20 bg-primary/5 mt-2"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Painel Administrativo
                  </div>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {siteSettings?.enable_download_app === 'true' && (
                <button
                  onClick={() => {
                    handleInstallApp();
                    setMobileOpen(false);
                  }}
                  className="flex items-center justify-between rounded-xl px-4 py-3.5 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:bg-primary/10 active:scale-[0.98] border border-border mt-2"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Baixar Aplicativo
                  </div>
                  <Download className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-6">
                {user ? (
                  <Button size="lg" variant="ghost" className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] w-full justify-center gap-2 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" /> Sair da Conta
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/entrar" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button size="lg" variant="outline" className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] w-full border-border">Entrar</Button>
                    </Link>
                    <Link to="/cadastrar" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button size="lg" className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] w-full glow-primary">Cadastrar</Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      <QuickRegisterDialog isOpen={registerOpen} onOpenChange={setRegisterOpen} onSuccess={() => navigate("/minha-conta")} />
    </header>
  );
};

export default Header;
