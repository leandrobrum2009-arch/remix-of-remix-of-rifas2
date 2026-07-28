import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useActiveBanners } from "@/hooks/useData";

const BannersInline = () => {
  const { data: banners } = useActiveBanners();
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: (banners?.length || 0) > 1, align: "start" },
    [Autoplay({ delay: 4500, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!banners?.length) return null;

  return (
    <section className="px-3 pb-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Destaques</h2>
        {banners.length > 1 && (
          <div className="flex gap-1.5">
            <button onClick={scrollPrev} aria-label="Banner anterior" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={scrollNext} aria-label="Próximo banner" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => {
            const content = (
              <div className="relative w-full overflow-hidden aspect-[2/1]">
                <img src={banner.image_url} alt={banner.title} className="absolute inset-0 h-full w-full object-contain bg-card" loading="lazy" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-end gap-2 p-4">
                  <div className="max-w-[78%]">
                    <h3 className="line-clamp-2 text-base font-black uppercase italic leading-tight tracking-normal text-foreground">{banner.title}</h3>
                    {banner.subtitle && <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-snug text-muted-foreground">{banner.subtitle}</p>}
                  </div>
                  {banner.link_url && (
                    <Button size="sm" className="h-10 w-fit rounded-xl px-4 text-[10px] font-black uppercase tracking-widest">
                      Ver Oferta <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );

            return (
              <div key={banner.id} className="min-w-0 flex-[0_0_100%]">
                {banner.link_url?.startsWith("/") ? <Link to={banner.link_url}>{content}</Link> : banner.link_url ? <a href={banner.link_url} target="_blank" rel="noreferrer">{content}</a> : content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BannersInline;