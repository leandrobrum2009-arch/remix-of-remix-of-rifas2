import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Sparkles, Gift, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import CampaignCard from "@/components/CampaignCard";
import { useCampaigns, useSiteSettings } from "@/hooks/useData";
import BannersInline from "@/components/inline/BannersInline";
import FooterInline from "@/components/inline/FooterInline";
import FinishedRafflesInline from "@/components/inline/FinishedRafflesInline";
import TestimonialsCarouselInline from "@/components/inline/TestimonialsCarouselInline";
import { SEO } from "@/components/SEO";

const IndexInline = () => {
  const { data: campaigns } = useCampaigns();
  const { data: settings } = useSiteSettings();

  const now = new Date();
  const active = (campaigns || []).filter((c: any) => {
    const ended = ["completed", "finished", "drawn"].includes(c.status);
    const expired = c.draw_date && new Date(c.draw_date) <= now;
    return !ended && !expired;
  });

  const testimonialsCount = parseInt(String(settings?.inline_testimonials_count ?? "3"), 10) || 3;
  const showFinished = String(settings?.inline_show_finished_raffles ?? "true") === "true";
  const showGamesCombo = String(settings?.home_show_games_combo ?? "true") === "true";

  const games = [
    { key: "roleta", label: "Roleta", icon: RotateCw },
    { key: "raspadinha", label: "Raspadinha", icon: Sparkles },
    { key: "caixa", label: "Caixas", icon: Gift },
  ].filter((g) => String((settings as any)?.[`home_show_game_${g.key}`] ?? "true") === "true");

  const [campaignsRef] = useEmblaCarousel(
    { loop: active.length > 1, align: "start" },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );
  const [gamesEmblaRef, gamesApi] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: true },
    [Autoplay({ delay: 2500, stopOnInteraction: false })]
  );
  const gamesPrev = useCallback(() => gamesApi?.scrollPrev(), [gamesApi]);
  const gamesNext = useCallback(() => gamesApi?.scrollNext(), [gamesApi]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title={settings?.site_title || settings?.site_name || "Ações Online"} />
      <Header />

      <main className="pt-[calc(var(--header-height,64px)+0.75rem)]">
        {/* 1) Campanha(s) ativas em carrossel — logo abaixo do logotipo */}
        <section className="px-3 pt-2 pb-3">
          {active.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhuma ação ativa no momento.</p>
          ) : active.length === 1 ? (
            <CampaignCard campaign={active[0] as any} index={0} />
          ) : (
            <div className="overflow-hidden" ref={campaignsRef}>
              <div className="flex">
                {active.slice(0, 8).map((c: any, i: number) => (
                  <div key={c.id} className="min-w-0 flex-[0_0_100%] pr-2">
                    <CampaignCard campaign={c} index={i} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 2) Hero "Concorra a prêmios incríveis" */}
        <section className="px-3 pb-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-4">
            <h1 className="text-lg font-black uppercase italic tracking-tighter leading-tight">
              Concorra a <span className="text-primary">Prêmios Incríveis</span>
            </h1>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Compre cotas e ganhe prêmios instantâneos
            </p>
          </div>
        </section>

        {/* 3) Combo de jogos em carrossel (sem links) */}
        {showGamesCombo && games.length > 0 && (
        <section className="px-3 pb-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
              Jogos & Prêmios Instantâneos
            </h2>
            <div className="flex gap-1.5">
              <button onClick={gamesPrev} aria-label="Anterior" className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={gamesNext} aria-label="Próximo" className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="overflow-hidden" ref={gamesEmblaRef}>
            <div className="flex gap-2">
              {[...games, ...games].map((g, i) => (
                <div
                  key={i}
                  className="min-w-0 flex-[0_0_45%] flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-3 py-3"
                >
                  <g.icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-[0.15em]">{g.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        <BannersInline />

      {/* Finalizadas em lista */}
      {showFinished && <FinishedRafflesInline />}

      {/* Depoimentos carrossel */}
      <TestimonialsCarouselInline count={testimonialsCount} />
      </main>

      <FooterInline settings={settings} />
    </div>
  );
};

export default IndexInline;