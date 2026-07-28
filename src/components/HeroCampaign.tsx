import { motion } from "framer-motion";
import { Zap, Star, Trophy, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Campaign } from "@/hooks/useData";
import Particles from "./Particles";
import { useState, useEffect } from "react";

interface HeroCampaignProps {
  campaign: Campaign;
}

const HeroCampaign = ({ campaign }: HeroCampaignProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = campaign.draw_date ? new Date(campaign.draw_date).getTime() : Date.now() + 86400000 * 3;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;
      
      if (diff <= 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [campaign.draw_date]);

  const progress = Math.round((campaign.sold_tickets / campaign.total_tickets) * 100);

  return (
    <section className="relative min-h-[70vh] w-full flex items-center justify-center overflow-hidden">
      {/* Background with cinematic effects */}
      <div className="absolute inset-0 z-0">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
          src={campaign.image_url || "/placeholder.svg"}
          alt=""
          className="h-full w-full object-cover blur-[1px] opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div className="absolute inset-0 cinematic-vignette" />
        <Particles count={40} />
      </div>

      <div className="container relative z-10 py-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 max-w-4xl"
        >
          <div className="flex flex-col items-center gap-4">
            <Badge className="bg-primary px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] glow-primary animate-pulse italic">
              Sorteio Premium
            </Badge>
            <h1 className="font-display text-3xl md:text-6xl lg:text-7xl font-black uppercase italic tracking-tighter leading-none text-foreground">
              {campaign.title.split(' ')[0]} <span className="text-primary neon-text-primary">{campaign.title.split(' ').slice(1).join(' ')}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl">
              {campaign.subtitle}
            </p>
          </div>

          {/* Giant Countdown */}
          <div className="grid grid-cols-4 gap-4 md:gap-8 max-w-2xl mx-auto">
            {[
              { label: "Dias", value: timeLeft.days },
              { label: "Horas", value: timeLeft.hours },
              { label: "Minutos", value: timeLeft.minutes },
              { label: "Segundos", value: timeLeft.seconds },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <div className="relative h-16 w-14 md:h-24 md:w-20 rounded-2xl bg-secondary border border-border flex items-center justify-center overflow-hidden shadow-xl">
                  <span className="font-display text-2xl md:text-4xl font-black text-primary italic neon-text-primary">
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                </div>
                <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-6 pt-6">
            <div className="w-full max-w-md space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-muted-foreground">Progresso de Vendas</span>
                <span className="text-primary">{progress}% Vendido</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden border border-border p-[1px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(80,96%,60%)] shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to={`/campanha/${campaign.slug || campaign.id}`}>
                <Button size="lg" className="h-14 md:h-16 rounded-2xl px-6 md:px-10 gap-2 md:gap-3 text-base md:text-lg font-black uppercase italic tracking-tight glow-primary group">
                  <Zap className="h-5 w-5 md:h-6 md:w-6 fill-current group-hover:scale-125 transition-transform" />
                  Participar Agora
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-16 rounded-2xl px-8 border-border bg-card/50 hover:bg-card font-bold uppercase tracking-widest text-xs">
                Ver Prêmios <Star className="ml-2 h-4 w-4 text-primary" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Elements */}
      <div className="absolute bottom-6 left-10 hidden lg:flex items-center gap-4 p-4 rounded-2xl bg-card/80 backdrop-blur-md border border-border shadow-lg">
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Último Ganhador</p>
          <p className="text-xs font-bold text-foreground">João Silva - R$ 50.000,00</p>
        </div>
      </div>

      <div className="absolute bottom-6 right-10 hidden lg:flex items-center gap-4 p-4 rounded-2xl bg-card/80 backdrop-blur-md border border-border shadow-lg">
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tempo Restante</p>
          <p className="text-xs font-bold text-foreground">Edição Limitada</p>
        </div>
      </div>
    </section>
  );
};

export default HeroCampaign;
