
import React, { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Star, Quote, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const REVIEWS = [
  {
    id: 1,
    name: "Adriano Silva",
    date: "há 2 dias",
    rating: 5,
    text: "Recebi a plataforma em menos de 4 horas, suporte impecável da NC Brasil. Em apenas 15 dias já recuperei todo o investimento inicial. O sistema de PIX automático é o segredo do lucro!",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop",
    verified: true
  },
  {
    id: 2,
    name: "Juliana Ferreira",
    date: "há 1 semana",
    rating: 5,
    text: "A entrega foi super rápida e o treinamento incluso me ajudou a configurar tudo. Minha primeira ação foi um sucesso, faturei R$ 12.000,00 limpo. A estabilidade do sistema é impressionante.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&auto=format&fit=crop",
    verified: true
  },
  {
    id: 3,
    name: "Ricardo Mendes",
    date: "há 3 dias",
    rating: 5,
    text: "O que mais me impressionou foi a facilidade de uso. O retorno financeiro com as raspadinhas e roletas é absurdo, o engajamento dos clientes dobrou. Plataforma entregue exatamente como prometido.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&h=256&auto=format&fit=crop",
    verified: true
  },
  {
    id: 4,
    name: "Patrícia Souza",
    date: "há 5 dias",
    rating: 5,
    text: "Trabalho profissional e entrega dentro do prazo. A plataforma é uma máquina de fazer dinheiro se você souber usar o CRM e as automações de WhatsApp que eles ensinam no treinamento.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&auto=format&fit=crop",
    verified: true
  },
  {
    id: 5,
    name: "Bruno Oliveira",
    date: "há 1 mês",
    rating: 5,
    text: "Sempre tive medo de golpes em scripts baratos, mas a NC Brasil entregou uma solução de elite. Suporte 24h e atualizações constantes. Meu faturamento mensal estabilizou em 5 dígitos.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&h=256&auto=format&fit=crop",
    verified: true
  }
];

interface GoogleReviewsProps {
  customReviewsJson?: string | null;
}

const GoogleReviews = ({ customReviewsJson }: GoogleReviewsProps = {}) => {
  const reviewsToShow = React.useMemo(() => {
    if (customReviewsJson && customReviewsJson.trim().length > 0) {
      try {
        const parsed = JSON.parse(customReviewsJson);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn("[GoogleReviews] JSON inválido em home_testimonials_json", e);
      }
    }
    return REVIEWS;
  }, [customReviewsJson]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: "start",
    slidesToScroll: 1,
    breakpoints: {
      '(min-width: 768px)': { slidesToScroll: 2 },
      '(min-width: 1024px)': { slidesToScroll: 3 },
    }
  }, [Autoplay({ delay: 4000 })]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <section className="container py-24 md:py-32 relative overflow-hidden border-t border-border/50">
      <div className="flex flex-col items-center text-center gap-4 mb-12">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
          <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avaliações 4.9/5.0</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        </div>
        <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
          O que dizem os <span className="text-primary neon-text-primary">Organizadores</span>
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl uppercase tracking-widest font-medium">
          Confira o depoimento de quem já escalou suas vendas e profissionalizou seus sorteios com nossa plataforma
        </p>
      </div>

      <div className="relative">
        <div className="overflow-hidden px-4 py-8" ref={emblaRef}>
          <div className="flex gap-6">
            {reviewsToShow.map((review: any) => (
              <div key={review.id} className="flex-[0_0_100%] md:flex-[0_0_45%] lg:flex-[0_0_31%] min-w-0">
                <motion.div 
                  whileHover={{ y: -8 }}
                  className="h-full bg-card border border-border rounded-3xl p-8 flex flex-col gap-6 shadow-xl relative group transition-all duration-300 hover:border-primary/50"
                >
                  <Quote className="absolute top-6 right-8 h-12 w-12 text-primary/5 group-hover:text-primary/10 transition-colors" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="relative h-14 w-14 flex-shrink-0">
                      <img src={review.avatar} alt={review.name} className="h-full w-full rounded-full object-cover border-2 border-primary/20" />
                      {review.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5 border-2 border-card">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black uppercase italic tracking-tighter leading-none text-foreground">{review.name}</h4>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{review.date}</p>
                    </div>
                  </div>

                  <div className="flex gap-1 relative z-10">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    ))}
                  </div>

                  <p className="text-sm font-medium leading-relaxed text-muted-foreground relative z-10 flex-grow">
                    "{review.text}"
                  </p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full border-border bg-card hover:bg-secondary shadow-lg"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full border-border bg-card hover:bg-secondary shadow-lg"
            onClick={scrollNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviews;
