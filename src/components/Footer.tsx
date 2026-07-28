import { Ticket, Instagram, Youtube, MessageCircle, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useSiteSettings } from "@/hooks/useData";


const footerLinks = [
  { key: "inicio", label: "Início", href: "/" },
  { key: "campanhas", label: "Campanhas", href: "/campanhas" },
  { key: "ganhadores", label: "Ganhadores", href: "/ganhadores" },
  { key: "comunicados", label: "Comunicados", href: "/comunicados" },
  { key: "tickets", label: "Meus Títulos", href: "/minha-conta#tickets" },
  { key: "afiliados", label: "Afiliados", href: "/afiliados" },
  { key: "filantropia", label: "Filantropia", href: "/filantropia" },
  { key: "termos", label: "Termos de Uso", href: "/termos-de-uso" },
  { key: "suporte", label: "Suporte", href: "/contato" },
];

const Footer = () => {
  const { data: siteSettings } = useSiteSettings();
  const visibleLinks = footerLinks.filter(
    (l) => String((siteSettings as any)?.[`menu_${l.key}_enabled`] ?? "true") !== "false"
  );

  return (
    <footer className="relative border-t border-border bg-background pt-20 pb-10 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 h-64 w-[80%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container relative z-10">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Brand Info */}
          <div className="space-y-6">
            <a href="/" className="flex items-center gap-3">
              {siteSettings?.site_logo_url ? (
                <img 
                  src={siteSettings.site_logo_url} 
                  alt={siteSettings?.site_name || "Logo"} 
                  className="h-10 w-auto object-contain" 
                />
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
                    <Ticket className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-display text-2xl font-black italic uppercase tracking-tighter">
                    {siteSettings?.site_name ? (
                      <>
                        {siteSettings.site_name.split(' ')[0]}
                        <span className="text-primary neon-text-primary">{siteSettings.site_name.split(' ').slice(1).join(' ')}</span>
                      </>
                    ) : (
                      <span className="opacity-0">Plataforma</span>
                    )}
                  </span>
                </>
              )}
            </a>
            <p className="max-w-xs text-xs font-bold leading-relaxed text-foreground uppercase tracking-widest opacity-80">
              A maior e mais segura plataforma de ações online. Prêmios instantâneos e sorteios garantidos.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Instagram, label: "Instagram" },
                { Icon: Youtube, label: "YouTube" },
                { Icon: MessageCircle, label: "WhatsApp" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={`Acessar nosso ${label}`}
                  className="h-10 w-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary neon-text-primary">Navegação</h3>
            <div className="grid grid-cols-2 gap-4">
              {visibleLinks.slice(0, 6).map((link) => (
                <a key={link.href} href={link.href} className="text-[10px] font-black uppercase tracking-widest text-foreground hover:text-primary transition-colors opacity-80">{link.label}</a>
              ))}
            </div>
          </div>

          {/* Support Info */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary neon-text-primary">Suporte</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs">
                <div className="h-8 w-8 rounded-lg bg-secondary border border-border flex items-center justify-center"><Phone className="h-4 w-4 text-primary" /></div>
                <span className="font-black text-foreground">{siteSettings?.company_phone || siteSettings?.support_whatsapp || "0800 123 4567"}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="h-8 w-8 rounded-lg bg-secondary border border-border flex items-center justify-center"><Mail className="h-4 w-4 text-primary" /></div>
                <span className="font-black text-foreground truncate max-w-[150px]">{siteSettings?.company_email || "contato@empresa.com"}</span>
              </div>
            </div>
          </div>

          {/* Newsletter / App */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary neon-text-primary">Certificações</h3>
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl border border-border bg-secondary flex items-center gap-4 shadow-sm">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Pagamento Seguro</p>
                  <p className="text-[9px] text-foreground/70 font-bold">Processamento via SSL 256 bits</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" className="h-8 object-contain" alt="Disponível no Google Play" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" className="h-8 object-contain" alt="Baixar na App Store" />
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-10 bg-border" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
              © {new Date().getFullYear()} {siteSettings?.site_name || "Sua Empresa"}. Todos os direitos reservados.
            </p>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em]">
              <a href="https://ncbrasil.com.br/sistema-de-rifas" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                SISTEMA DE RIFAS
              </a>
            </p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
              NC Brasil
            </p>
          </div>
          <div className="flex gap-6">
            <a href="/termos-de-uso" className="text-[10px] font-black uppercase tracking-widest text-foreground hover:text-primary transition-colors">Termos de Uso</a>
            <a href="/contato" className="text-[10px] font-black uppercase tracking-widest text-foreground hover:text-primary transition-colors">Suporte</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
