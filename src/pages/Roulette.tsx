import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouletteComponent from "@/components/Roulette";
import { useCampaigns, useRoulettePrizes } from "@/hooks/useData";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Roulette() {
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const activeCampaign = campaigns?.find(c => c.roulette_enabled && c.status === "active");
  const { data: prizes, isLoading: loadingPrizes } = useRoulettePrizes(activeCampaign?.id || "");

  const isLoading = loadingCampaigns || (!!activeCampaign && loadingPrizes);

   return (
     <div className="min-h-screen bg-background relative overflow-hidden">
       {/* Premium Motion Background */}
       <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
       </div>

       <Header />
       <main className="container relative z-10 pt-32 pb-20">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-4xl mx-auto space-y-12"
         >
           <div className="text-center space-y-4">
             <motion.div
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ duration: 0.5, type: "spring" }}
             >
               <h1 className="text-5xl md:text-8xl font-black uppercase italic leading-none tracking-tighter filter drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
                 Roleta da <span className="text-primary neon-text-primary">Sorte</span>
               </h1>
             </motion.div>
             <p className="text-muted-foreground uppercase font-black tracking-[0.3em] text-[10px] md:text-xs">
               Sua chance de <span className="text-white">vencer instantaneamente</span> começa aqui
             </p>
           </div>
 
           {isLoading ? (
             <div className="flex justify-center py-20">
               <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
           ) : activeCampaign && prizes ? (
             <RouletteComponent campaign={activeCampaign} prizes={prizes} />
           ) : (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center py-32 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]"
             >
               <p className="text-muted-foreground uppercase font-black tracking-widest text-sm italic">
                 Nenhuma roleta disponível <br />
                 <span className="text-[10px] text-white/20 mt-2 block">Tente novamente em alguns instantes</span>
               </p>
             </motion.div>
           )}
         </motion.div>
       </main>
       <Footer />
     </div>
   );
}
