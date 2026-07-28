 import React, { useCallback } from "react";
 import useEmblaCarousel from "embla-carousel-react";
 import Autoplay from "embla-carousel-autoplay";
 import { motion } from "framer-motion";
 import { ChevronLeft, ChevronRight, Zap, Trophy, Users } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Campaign } from "@/hooks/useData";
 import { Link } from "react-router-dom";
import CountdownTimer from "./CountdownTimer";
import { playSound, hapticFeedback } from "@/lib/sounds";
 
 interface RaffleCarouselProps {
   campaigns: Campaign[];
 }
 
 const RaffleCarousel = ({ campaigns }: RaffleCarouselProps) => {
   const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);
 
   const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
   const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
 
   return (
     <section className="relative overflow-hidden group">
       <div className="overflow-hidden" ref={emblaRef}>
         <div className="flex">
            {campaigns.map((campaign, index) => (
               <div key={campaign.id} className="relative min-w-full flex-[0_0_100%] h-[400px] md:h-[500px] lg:h-[550px]">
                {/* Background with scale effect */}
                <div className="absolute inset-0 overflow-hidden">
                  <motion.img 
                    src={campaign.image_url || "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1920&h=1080&auto=format&fit=crop"} 
                    className="h-full w-full object-cover" 
                    alt={campaign.title}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  />
                   <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent z-10" />
                   <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10" />
                   
                   {/* Glow/Particles Layer - Reduced opacity for light theme compatibility */}
                   <div className="absolute inset-0 z-20 pointer-events-none">
                     <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                     <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                   </div>
                 </div>
 
                 <div className="container relative z-30 h-full flex items-center pt-10 md:pt-0">
                  <div className="absolute inset-y-0 left-0 w-full md:w-[80%] bg-gradient-to-r from-black/80 via-black/40 to-transparent z-0 pointer-events-none" />
                  
                  <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-2xl space-y-4 relative z-10"
                  >

                    <div className="flex items-center gap-3">
                      <Badge className="bg-primary text-primary-foreground font-black italic px-2 py-0.5 text-[10px]">
                        🔥 DESTAQUE
                     </Badge>
                     {campaign.urgency_tag && (
                        <Badge variant="outline" className="border-primary/50 text-primary uppercase font-bold text-[9px] bg-secondary/50 backdrop-blur-sm">
                         {campaign.urgency_tag}
                       </Badge>
                     )}
                   </div>
 
                      <div className="space-y-2">
                       {campaign.draw_date && (
                         <motion.div
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: 0.3 }}
                         >
                             <CountdownTimer targetDate={campaign.draw_date} className="scale-100 origin-left drop-shadow-md" />
                          </motion.div>
                        )}
                          <h1 className="text-2xl md:text-4xl lg:text-6xl font-black uppercase italic leading-[0.9] tracking-tighter filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] text-foreground">
                         {campaign.title.split(' ')[0]} <br />
                         <span className="text-primary neon-text-primary">
                           {campaign.title.split(' ').slice(1).join(' ')}
                         </span>
                       </h1>
                     </div>
 
                     <p className="text-base md:text-xl text-foreground font-bold max-w-xl leading-snug filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                       {campaign.subtitle || (campaign.description ? campaign.description.slice(0, 150) + '...' : '')}
                     </p>

 
                     <div className="flex flex-wrap items-center gap-6 py-2">
                      <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valor do Prêmio</span>
                         <span className="text-xl font-black text-foreground">
                          R$ {((campaign as any).prize_value || 50000).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Números Disponíveis</span>
                         <span className="text-xl font-black text-foreground">
                          {(campaign.total_tickets - campaign.sold_tickets).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sorteio em</span>
                         <span className="text-xl font-black text-primary">
                          {campaign.draw_date ? new Date(campaign.draw_date).toLocaleDateString('pt-BR') : 'Em breve'}
                        </span>
                      </div>
                    </div>
 
                    <div className="flex items-center gap-4 pt-2">
                     <Link to={`/campaign/${campaign.id}`} onClick={() => { playSound('click'); hapticFeedback(); }}>
                       <motion.div
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                       >
                           <Button size="lg" className="h-14 rounded-2xl px-8 font-black uppercase italic tracking-widest gap-2 glow-primary text-base shadow-[0_0_25px_rgba(34,197,94,0.6)] border-light-path border-[#22c55e]/30">
                            QUERO MEU PRÊMIO <Zap className="h-5 w-5 fill-current" />
                          </Button>
                        </motion.div>
                      </Link>
                        <Button variant="outline" size="lg" className="h-14 rounded-2xl px-6 border-[#22c55e]/30 hover:bg-[#22c55e]/10 font-black uppercase italic tracking-widest text-foreground backdrop-blur-md border-light-path shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                        CONFERIR CHANCES
                      </Button>


                   </div>
                 </motion.div>
               </div>
             </div>
           ))}
         </div>
       </div>
 
       {/* Navigation Buttons */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute left-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-card/20 backdrop-blur-md border border-border opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => { scrollPrev(); playSound('click'); }}
        >
          <ChevronLeft className="h-8 w-8 text-foreground" />
       </Button>
       <Button 
         variant="ghost" 
         size="icon" 
          className="absolute right-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-card/20 backdrop-blur-md border border-border opacity-0 group-hover:opacity-100 transition-opacity"
         onClick={scrollNext}
       >
          <ChevronRight className="h-8 w-8 text-foreground" />
       </Button>
 

       {/* Progress Bar (Simulated for each slide) */}
       <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5 overflow-hidden z-20">
         <motion.div 
           animate={{ x: ["-100%", "0%"] }}
           transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
           className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"
         />
       </div>
     </section>
   );
 };
 
 export default RaffleCarousel;