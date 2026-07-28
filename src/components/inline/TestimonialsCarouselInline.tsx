import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const REVIEWS = [
  { id: 1, name: "Adriano Silva", text: "Em 15 dias já recuperei todo o investimento. Sistema impecável!", rating: 5 },
  { id: 2, name: "Juliana Ferreira", text: "Faturei R$ 12.000 na primeira ação. Suporte rápido.", rating: 5 },
  { id: 3, name: "Ricardo Mendes", text: "Engajamento dobrou com as raspadinhas e roletas.", rating: 5 },
  { id: 4, name: "Patrícia Souza", text: "Treinamento perfeito, automações do WhatsApp são ouro.", rating: 5 },
  { id: 5, name: "Bruno Oliveira", text: "Faturamento estabilizou em 5 dígitos por mês.", rating: 5 },
];

const TestimonialsCarouselInline = ({ count = 3 }: { count?: number }) => {
  const items = REVIEWS.slice(0, Math.max(1, count));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [Autoplay({ delay: 4500 })]);
  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="px-3 py-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-black uppercase tracking-[0.2em]">Depoimentos</h2>
        <div className="flex gap-1">
          <Button onClick={prev} size="icon" variant="outline" className="h-7 w-7 rounded-full"><ChevronLeft className="h-3 w-3" /></Button>
          <Button onClick={next} size="icon" variant="outline" className="h-7 w-7 rounded-full"><ChevronRight className="h-3 w-3" /></Button>
        </div>
      </div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {items.map((r) => (
            <div key={r.id} className="flex-[0_0_100%] min-w-0">
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-[12px] font-medium leading-relaxed text-foreground/90">"{r.text}"</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">— {r.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsCarouselInline;