import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MysteryBoxComponent from "@/components/MysteryBox";
 import { useCampaigns, useMysteryBoxConfigs } from "@/hooks/useData";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function MysteryBoxPage() {
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const activeCampaign = campaigns?.find(c => c.mystery_box_enabled && c.status === "active");
   const { data: boxes, isLoading: loadingBoxes } = useMysteryBoxConfigs(activeCampaign?.id || "");

  const isLoading = loadingCampaigns || (!!activeCampaign && loadingBoxes);

   return (
     <div className="min-h-screen bg-background relative overflow-hidden">
       {/* Cinematic Motion Background */}
       <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-orange-500/10 blur-[180px] rounded-full animate-pulse" />
         <div className="absolute bottom-1/3 left-1/4 w-[600px] h-[600px] bg-primary/10 blur-[180px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
       </div>

       <Header />
       <main className="container relative z-10 pt-32 pb-20">
         <motion.div 
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-6xl mx-auto space-y-16"
         >
           <div className="text-center space-y-6">
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ duration: 0.6, type: "spring" }}
             >
               <h1 className="text-6xl md:text-9xl font-black uppercase italic leading-none tracking-tighter filter drop-shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]">
                 Caixa <span className="text-primary neon-text-primary">Misteriosa</span>
               </h1>
             </motion.div>
             <p className="text-muted-foreground uppercase font-black tracking-[0.4em] text-[10px] md:text-xs italic">
               O que está escondido? <span className="text-white">Descubra agora</span> a sua sorte
             </p>
           </div>
 
           {isLoading ? (
             <div className="flex justify-center py-32">
               <Loader2 className="h-16 w-16 animate-spin text-primary" />
             </div>
           ) : activeCampaign && boxes ? (
             <MysteryBoxComponent campaignId={activeCampaign.id} boxes={boxes} />
           ) : (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center py-40 border-2 border-dashed border-white/5 rounded-[50px] bg-white/[0.01] backdrop-blur-sm"
             >
               <p className="text-muted-foreground uppercase font-black tracking-widest text-lg italic opacity-50">
                 Arsenal em reposição <br />
                 <span className="text-[12px] mt-4 block">Novas caixas em breve</span>
               </p>
             </motion.div>
           )}
         </motion.div>
       </main>
       <Footer />
     </div>
   );
}
