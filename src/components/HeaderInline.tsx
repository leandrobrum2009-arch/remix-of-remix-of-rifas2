import { Menu, X, LifeBuoy, Wallet, Bell, LogOut, Settings, Ticket, ArrowRight, User, Share2, Users, Palette } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeProfile } from "@/hooks/useRealtimeProfile";
import { useIsAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useData";
import { toast } from "sonner";
import { QuickRegisterDialog } from "./QuickRegisterDialog";

const ALL_NAV_LINKS = [
  { key: "campanhas", label: "Campanhas", href: "/campanhas" },
  { key: "ganhadores", label: "Ganhadores", href: "/ganhadores" },
  { key: "comunicados", label: "Comunicados", href: "/comunicados" },
  { key: "minha_conta", label: "Minha Conta", href: "/minha-conta" },
];

const HeaderInline = () => {
  const [open, setOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { profile } = useRealtimeProfile(user?.id);
  const { data: isAdmin } = useIsAdmin();
  const { data: siteSettings } = useSiteSettings();
  const navigate = useNavigate();

  const navLinks = ALL_NAV_LINKS.filter(
    (l) => String((siteSettings as any)?.[`menu_${l.key}_enabled`] ?? "true") !== "false"
  );

  useEffect(() => {
    document.documentElement.style.setProperty('--header-height', `64px`);
  }, []);

  const supportLink = siteSettings?.support_whatsapp
    ? `https://wa.me/${String(siteSettings.support_whatsapp).replace(/\D/g, '')}`
    : "/contato";

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: siteSettings?.site_name || "Ação", url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  return (
    <>
      <header className="fixed left-1/2 top-0 z-50 w-full max-w-[480px] -translate-x-1/2 bg-background/95 backdrop-blur-xl border-b border-border/60">
        <div className="relative mx-auto flex h-16 max-w-[480px] items-center justify-between gap-2 px-4">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-xl text-foreground hover:bg-secondary/60 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            {siteSettings?.site_logo_url ? (
              <img src={siteSettings.site_logo_url} alt={siteSettings?.site_name || "Logo"} className="h-9 w-auto max-w-[45vw] object-contain" />
            ) : (
              <span className="font-display text-base font-black uppercase tracking-tighter text-animate-gradient">
                {siteSettings?.site_name || "Ação"}
              </span>
            )}
          </Link>

          {user ? (
            <Link
              to="/minha-conta"
              aria-label="Minha conta"
              className="flex h-9 max-w-[32vw] sm:max-w-[140px] shrink-0 self-center items-center gap-1 rounded-full pl-2 pr-2.5 bg-primary/15 text-primary ring-1 ring-primary/30 font-black uppercase tracking-widest text-[9px] leading-none"
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate min-w-0">
                {(profile?.name || user.email || "").split(" ")[0] || (user.email || "").split("@")[0]}
              </span>
            </Link>
          ) : String((siteSettings as any)?.header_register_button_enabled ?? "true") !== "false" ? (
            <button
              onClick={() => navigate("/cadastrar")}
              aria-label="Cadastre-se grátis"
              className="flex h-9 shrink-0 self-center items-center gap-1 rounded-full px-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black uppercase tracking-widest text-[9px] leading-none shadow-md ring-2 ring-yellow-300/60 animate-pulse"
            >
              Cadastre-se
            </button>
          ) : (
          <a
            href={supportLink}
            target={supportLink.startsWith('http') ? "_blank" : undefined}
            rel="noreferrer"
            aria-label="Suporte"
            className="flex h-10 min-w-10 shrink-0 self-center items-center gap-1.5 rounded-xl px-2 text-foreground hover:bg-secondary/60 transition-colors"
          >
            <LifeBuoy className="h-5 w-5" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Suporte</span>
          </a>
          )}
        </div>
      </header>

      {/* Floating side widgets */}
      <div className="fixed top-28 z-40 flex flex-col gap-2.5 items-end right-[max(0.75rem,calc((100vw-480px)/2+0.75rem))]">
        <button
          onClick={handleShare}
          aria-label="Compartilhar"
          className="h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Share2 className="h-5 w-5" />
        </button>
        {siteSettings?.support_whatsapp && (
          <a
            href={`https://chat.whatsapp.com/${siteSettings.support_whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="h-10 rounded-full bg-emerald-500 text-white shadow-lg flex items-center gap-1.5 pl-2.5 pr-3 hover:scale-105 transition-transform"
          >
            <Users className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Grupo</span>
          </a>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed left-1/2 top-0 z-[60] h-dvh w-full max-w-[480px] -translate-x-1/2 bg-background/80 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed left-0 top-0 z-[61] h-full w-[82%] max-w-sm bg-card border-r border-border shadow-2xl flex flex-col"
              style={{ left: "max(0px, calc((100vw - 480px) / 2))" }}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                  {siteSettings?.site_logo_url ? (
                    <img src={siteSettings.site_logo_url} alt="Logo" className="h-8 w-auto" />
                  ) : (
                    <span className="font-display text-sm font-black uppercase tracking-tighter">{siteSettings?.site_name || "Ação"}</span>
                  )}
                </Link>
                <button onClick={() => setOpen(false)} className="h-9 w-9 rounded-lg hover:bg-secondary flex items-center justify-center">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {user && (
                <div className="px-4 py-3 border-b border-border bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black">
                      {(profile?.name || user.email || "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-tight truncate">{profile?.name || user.email}</p>
                      <div className="flex items-center gap-1 text-[10px] text-primary font-black mt-0.5">
                        <Wallet className="h-3 w-3" /> R$ {Number(profile?.balance || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    to={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-xs font-black uppercase tracking-widest text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {l.label}
                    <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="mt-2 flex items-center justify-between rounded-xl px-3 py-3 text-xs font-black uppercase tracking-widest text-primary border border-primary/30 bg-primary/5"
                  >
                    <span className="flex items-center gap-2"><Settings className="h-4 w-4" /> Painel</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </nav>

              <div className="border-t border-border p-3">
                {user ? (
                  <Button variant="ghost" className="w-full justify-center gap-2 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={async () => { await signOut(); setOpen(false); navigate("/"); }}>
                    <LogOut className="h-4 w-4" /> Sair
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/entrar" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest">Entrar</Button>
                    </Link>
                    <Link to="/cadastrar" onClick={() => setOpen(false)}>
                      <Button className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest">Cadastrar</Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <QuickRegisterDialog isOpen={registerOpen} onOpenChange={setRegisterOpen} onSuccess={() => navigate("/minha-conta")} />
    </>
  );
};

export default HeaderInline;
