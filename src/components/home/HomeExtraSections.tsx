import { HelpCircle, Rocket, ShieldCheck, Zap, Lock, BadgeCheck, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Props {
  settings: any;
}

const isOn = (val: any, def = "true") => String(val ?? def) !== "false";

const HomeExtraSections = ({ settings }: Props) => {
  const showHow = isOn(settings?.home_show_how_it_works);
  const showFaq = isOn(settings?.home_show_faq);
  const showTrust = isOn(settings?.home_show_trust_badges);
  const showCta = isOn(settings?.home_show_cta);

  if (!showHow && !showFaq && !showTrust && !showCta) return null;

  return (
    <>
      {showHow && (
        <section className="container py-16 md:py-20 border-t border-border">
          <div className="flex items-center gap-2 mb-8">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-black uppercase italic tracking-tighter">
              Como <span className="text-animate-gradient">Participar</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { n: "01", t: "Escolha sua ação", d: "Navegue pelas campanhas ativas e selecione a sua favorita." },
              { n: "02", t: "Compre suas cotas", d: "Pague rápido via PIX e receba seus bilhetes na hora." },
              { n: "03", t: "Concorra e ganhe", d: "Acompanhe o sorteio e ganhe prêmios instantâneos no caminho." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-4xl font-black text-primary/40">{s.n}</div>
                <h3 className="mt-2 text-base font-black uppercase tracking-tight">{s.t}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showTrust && (
        <section className="container py-12 md:py-16 border-t border-border">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[
              { i: ShieldCheck, t: "Pagamento Seguro", d: "Transações criptografadas" },
              { i: Lock, t: "Dados Protegidos", d: "Conformidade LGPD" },
              { i: BadgeCheck, t: "Sorteio Transparente", d: "Resultados auditáveis" },
              { i: Award, t: "Premiações Reais", d: "Histórico público" },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="flex flex-col items-center text-center gap-2 rounded-2xl border border-border bg-card p-4">
                <Icon className="h-6 w-6 text-primary" />
                <p className="text-[11px] font-black uppercase tracking-widest">{t}</p>
                <p className="text-[10px] text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showFaq && (
        <section className="container py-16 md:py-20 border-t border-border">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-black uppercase italic tracking-tighter">
              Perguntas <span className="text-animate-gradient">Frequentes</span>
            </h2>
          </div>
          <Accordion type="single" collapsible className="max-w-3xl">
            {[
              { q: "Como recebo meus bilhetes?", a: "Após a confirmação do pagamento, seus bilhetes são liberados automaticamente no seu painel." },
              { q: "Como funciona o sorteio?", a: "O sorteio é realizado pela Loteria Federal ou ao vivo conforme indicado na campanha." },
              { q: "Posso ganhar prêmios instantâneos?", a: "Sim! Roleta, raspadinhas e caixas surpresas podem ser liberadas conforme suas compras." },
              { q: "Como recebo meu prêmio?", a: "Entraremos em contato pelos dados do seu cadastro para combinar a entrega." },
            ].map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-bold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {showCta && (
        <section className="container py-16 md:py-20">
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-secondary/10 p-8 md:p-12 text-center">
            <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
            <h2 className="font-display text-2xl md:text-4xl font-black uppercase italic tracking-tighter">
              Pronto para <span className="text-animate-gradient">concorrer</span>?
            </h2>
            <p className="mt-2 text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-widest">
              Escolha uma campanha e garanta já suas cotas
            </p>
            <Link to="/" className="inline-block mt-6">
              <Button size="lg" className="h-14 rounded-2xl px-10 font-black uppercase tracking-widest text-xs glow-primary">
                Ver Campanhas Ativas
              </Button>
            </Link>
          </div>
        </section>
      )}
    </>
  );
};

export default HomeExtraSections;