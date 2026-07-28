import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Campaign } from "@/hooks/useData";

interface HeroModel4Props {
  campaigns: Campaign[];
  delay?: number;
  transitionType?: 'slide' | 'fade' | 'zoom';
}

const HeroModel4 = ({ campaigns, delay = 5000, transitionType = 'slide' }: HeroModel4Props) => {
  if (!campaigns || campaigns.length === 0) return null;
  const campaign = campaigns[0];

  return (
    <div className="relative w-full h-[600px] md:h-[700px] overflow-hidden bg-black">
      <div className="absolute inset-0">
        <img 
          src={campaign.image_url || ""} 
          alt={campaign.title} 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      <div className="container relative z-10 h-full flex flex-col justify-end pb-20 md:pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/20">
            <Star className="w-4 h-4 fill-primary" />
            <span className="text-xs font-black uppercase tracking-widest">Sorteio em Destaque</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none text-white">
            {campaign.title}
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-300 font-medium max-w-2xl">
            {campaign.subtitle}
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button 
              asChild
              size="lg"
              className="h-16 md:h-20 rounded-2xl px-8 md:px-12 gap-3 text-lg md:text-xl font-black uppercase italic tracking-tight glow-primary group"
            >
              <Link to={`/campanha/${campaign.slug || campaign.id}`}>
                PARTICIPAR AGORA <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroModel4;
