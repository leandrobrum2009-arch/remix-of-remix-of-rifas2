import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import Fade from "embla-carousel-fade";
import { Zap, Trophy, TrendingUp, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Campaign, useCampaignStats } from "@/hooks/useData";
import { Link } from "react-router-dom";
import CountdownTimer from "../CountdownTimer";

interface HeroModel3Props {
  campaigns: Campaign[];
  delay?: number;
  transitionType?: 'slide' | 'fade';
}

const CampaignSlide = ({ campaign }: { campaign: Campaign }) => {
  const progress = Math.round((campaign.sold_tickets / campaign.total_tickets) * 100);
  const { data: stats } = useCampaignStats(campaign.id);
  
  // Real participants or a realistic estimate if no orders yet
  const displayParticipants = stats?.participantsCount || Math.floor(campaign.sold_tickets / 100) + 1;

  return (
    <div className="relative min-w-full flex-[0_0_100%] container">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center bg-card/30 backdrop-blur-xl border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-12 overflow-hidden relative group">
        {/* Visual side */}
        <div className="order-1 lg:order-2 relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
          <motion.img 
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.8 }}
            src={campaign.image_url || "/placeholder.svg"} 
            className="h-full w-full object-cover" 
            alt={campaign.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Floating Stats on Image */}
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60 italic">Progresso de Vendas</p>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 rounded-full bg-white/10 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${progress}%` }}
                    className="h-full bg-primary" 
                  />
                </div>
                <span className="text-sm font-black text-primary italic">{progress}%</span>
              </div>
            </div>
            <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-white font-bold gap-2">
               <Users className="h-3 w-3 text-primary" /> +{displayParticipants} participando
            </Badge>
          </div>
        </div>

        {/* Content side */}
        <div className="order-2 lg:order-1 space-y-8 relative z-10">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest italic">EDICÃO LIMITADA</Badge>
              <Badge variant="outline" className="border-primary/30 text-primary font-bold gap-1 text-[10px]">
                <ShieldCheck className="h-3 w-3" /> SORTEIO SEGURO
              </Badge>
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-6xl font-black uppercase italic leading-[1] md:leading-[1.1] tracking-tighter text-foreground md:pr-8 py-2">
              <span className="block mb-1">{campaign.title.split(' ')[0]}</span>
              <span className="text-primary neon-text-primary inline-block md:pr-8 pb-1">
                {campaign.title.split(' ').slice(1).join(' ')}
              </span>
            </h2>
            
            <p className="text-base text-muted-foreground font-bold max-w-lg leading-relaxed">
              {campaign.subtitle || 'Uma oportunidade única de conquistar o seu objetivo com um investimento mínimo.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valor do Prêmio</p>
                <p className="text-xl font-black text-foreground italic">R$ 50.000,00</p>
             </div>
             <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Custo por Cota</p>
                <p className="text-xl font-black text-primary italic text-primary neon-text-primary">R$ {campaign.ticket_price.toFixed(2)}</p>
             </div>
          </div>

          {campaign.draw_date && (
            <div className="space-y-3">
               <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Encerra em breve:</span>
               </div>
               <CountdownTimer targetDate={campaign.draw_date} className="scale-100 origin-left" />
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Link to={`/campanha/${campaign.slug || campaign.id}`} className="flex-1">
              <Button size="lg" className="w-full h-14 md:h-16 rounded-2xl font-black uppercase italic tracking-widest gap-2 glow-primary border-light-path border-light-always text-sm md:text-base border-[#22c55e]/30 relative z-10">
                COMPRAR AGORA <Zap className="h-5 w-5 fill-current" />
              </Button>
            </Link>
            <Button variant="outline" size="icon" className="h-14 w-14 md:h-16 md:w-16 rounded-2xl border-white/10 hover:bg-primary/10 group">
               <Trophy className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Decorative element */}
        <div className="absolute -right-32 -bottom-32 h-64 w-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-700" />
      </div>
    </div>
  );
};

const HeroModel3 = ({ campaigns, delay = 5000, transitionType = 'slide' }: HeroModel3Props) => {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, duration: 45 }, 
    transitionType === 'fade' ? [Autoplay({ delay }), Fade()] : [Autoplay({ delay })]
  );

  return (
    <section className="relative overflow-hidden py-12 bg-background" ref={emblaRef}>
      <div className="flex">
        {campaigns.map((campaign) => (
          <CampaignSlide key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </section>
  );
};

export default HeroModel3;