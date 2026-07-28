import React, { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import Fade from "embla-carousel-fade";
import { ChevronLeft, ChevronRight, Zap, Trophy, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Campaign } from "@/hooks/useData";
import { Link } from "react-router-dom";
import CountdownTimer from "../CountdownTimer";
import { playSound, hapticFeedback } from "@/lib/sounds";

interface HeroModel1Props {
  campaigns: Campaign[];
  delay?: number;
  transitionType?: 'slide' | 'fade';
}

const HeroModel1 = ({ campaigns, delay = 5000, transitionType = 'slide' }: HeroModel1Props) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 40 }, 
    transitionType === 'fade' ? [Autoplay({ delay }), Fade()] : [Autoplay({ delay })]
  );

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <section className="relative overflow-hidden group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="relative min-w-full flex-[0_0_100%] aspect-video md:aspect-[21/9] lg:aspect-[25/9] min-h-[300px] md:min-h-[500px] lg:min-h-[600px]">
              <div className="absolute inset-0 overflow-hidden">
                <motion.img 
                  src={campaign.image_url || "/placeholder.svg"} 
                  className="h-full w-full object-cover will-change-transform" 
                  alt={campaign.title}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10" />
              </div>

              <div className="container relative z-30 h-full flex items-center">
                <motion.div 
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  className="max-w-2xl space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground font-black italic px-3 py-1">
                      🔥 DESTAQUE
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {campaign.draw_date && (
                      <CountdownTimer targetDate={campaign.draw_date} className="scale-110 origin-left" />
                    )}
                    <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-black uppercase italic leading-[1] sm:leading-[1.1] tracking-tighter text-foreground filter drop-shadow-2xl md:pr-8 py-2">
                      <span className="block mb-1 sm:mb-2">{campaign.title.split(' ')[0]}</span>
                      <span className="text-animate-gradient inline-block md:pr-8 pb-1">
                        {campaign.title.split(' ').slice(1).join(' ')}
                      </span>
                    </h2>
                    <p className="text-sm md:text-lg text-foreground/80 font-bold max-w-xl leading-relaxed">
                      {campaign.subtitle || campaign.description?.slice(0, 120)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <Link to={`/campanha/${campaign.slug || campaign.id}`}>
                      <Button size="lg" className="h-12 md:h-16 rounded-xl md:rounded-2xl px-6 md:px-10 font-black uppercase italic tracking-widest gap-2 glow-primary text-sm md:text-lg border-light-path border-light-always border-[#22c55e]/30 relative z-10">
                        PARTICIPAR AGORA <Zap className="h-6 w-6 fill-current" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Button 
        variant="ghost" size="icon" 
        aria-label="Slide anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/5 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={scrollPrev}
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>
      <Button 
        variant="ghost" size="icon" 
        aria-label="Próximo slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/5 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={scrollNext}
      >
        <ChevronRight className="h-8 w-8" />
      </Button>
    </section>
  );
};

export default HeroModel1;