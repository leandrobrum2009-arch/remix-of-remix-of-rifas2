import { Link } from "react-router-dom";
import { Headphones, Mail, MapPin, Phone, ShieldCheck, Ticket, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FooterInlineProps {
  settings?: Record<string, string>;
}

const compactLinks = [
  { key: "ganhadores", label: "Ganhadores", href: "/ganhadores" },
  { key: "minha_conta", label: "Minha Conta", href: "/minha-conta" },
  { key: "termos", label: "Termos", href: "/termos-de-uso" },
];

const FooterInline = ({ settings }: FooterInlineProps) => {
  const supportLink = settings?.support_whatsapp
    ? `https://wa.me/${String(settings.support_whatsapp).replace(/\D/g, "")}`
    : "/contato";

  const companyName = settings?.company_name || settings?.site_name || "Plataforma de Ações";
  const document = settings?.company_cnpj;
  const phone = settings?.company_phone || settings?.support_whatsapp;
  const email = settings?.company_email;
  const address = settings?.company_address;

  const visibleLinks = compactLinks.filter(
    (l) => String((settings as any)?.[`menu_${l.key}_enabled`] ?? "true") !== "false"
  );

  return (
    <footer className="border-t border-border bg-background px-3 pb-6 pt-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          {settings?.site_logo_url ? (
            <img src={settings.site_logo_url} alt={settings?.site_name || "Logo"} className="h-10 w-auto max-w-[150px] object-contain" loading="lazy" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Ticket className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black uppercase tracking-widest text-foreground">{companyName}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Compra segura e atendimento oficial</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest">
            <a href={supportLink} target={supportLink.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              <Headphones className="h-4 w-4" /> Suporte
            </a>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest">
            <Link to="/minha-conta">
              <UserRound className="h-4 w-4" /> Conta
            </Link>
          </Button>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-border bg-background/50 p-3">
          {phone && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-foreground">
              <Phone className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{phone}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-foreground">
              <Mail className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{email}</span>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-2 text-[11px] font-bold leading-snug text-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{address}</span>
            </div>
          )}
          {document && <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNPJ: {document}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {visibleLinks.map((link) => (
            <Link key={link.href} to={link.href} className="rounded-xl border border-border bg-background/50 px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-foreground">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <p className="text-[10px] font-black uppercase leading-snug tracking-widest">Pagamento protegido e dados criptografados</p>
        </div>
      </div>

      <p className="mt-4 text-center text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        © {new Date().getFullYear()} {settings?.site_name || companyName}. Todos os direitos reservados.
      </p>
    </footer>
  );
};

export default FooterInline;
