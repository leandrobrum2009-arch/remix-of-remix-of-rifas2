import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScratchCard from "@/components/ScratchCard";
import Particles from "@/components/Particles";
import { motion } from "framer-motion";
import { Gift, Sparkles, TrendingUp, Users, Award, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useScratchCardPrizes, useGlobalScratchCardScratches, useCampaigns } from "@/hooks/useData";

const ScratchCardPage = () => {
  const { data: campaigns } = useCampaigns();
  // For now, we use a global scratch card or find an active campaign that has it enabled
  // But since we don't have a 'scratch_card_enabled' boolean in campaigns yet, let's assume global
  const { data: prizes, isLoading: isLoadingPrizes } = useScratchCardPrizes();
  const { data: recentScratches, isLoading: isLoadingScratches } = useGlobalScratchCardScratches(5);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <Particles count={40} />
      </div>

      <Header />
      <div className="h-16 md:h-20" />

      <main className="container relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge className="bg-primary/20 text-primary border-none px-4 py-1 text-xs font-black uppercase tracking-widest mb-4">
                Prêmios Instantâneos
              </Badge>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase italic tracking-tighter leading-none mb-4">
                Raspadinha <span className="text-animate-gradient">Premiada</span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground uppercase font-bold tracking-[0.2em] max-w-2xl mx-auto italic">
                A emoção de ganhar prêmios reais na palma da sua mão. Escolha um cartão e raspe agora!
              </p>
            </motion.div>
          </div>

          {/* Game Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            {isLoadingPrizes ? (
              <div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : (
              <ScratchCard 
                cost={0} // Configurable later
                potentialPrizes={prizes?.map(p => p.label)}
              />
            )}
          </motion.div>

          {/* Stats/Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            {[
              { icon: TrendingUp, title: "Altas Chances", desc: "Prêmios distribuídos aleatoriamente" },
              { icon: Users, title: "+5k Jogadores", desc: "Milhares de pessoas jogando agora" },
              { icon: Award, title: "Prêmios Reais", desc: "Saldo instantâneo e prêmios VIP" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-6 text-center space-y-3 group hover:border-primary/50 transition-all border-light-path border-[#22c55e]/20 hover:border-[#22c55e]/50"
              >
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform border-light-path border-[#22c55e]/30">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{item.title}</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Recent Winners section */}
          <div className="bg-card/30 backdrop-blur-sm border border-border rounded-3xl p-8 space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                   </div>
                   <h2 className="text-xl font-black uppercase italic tracking-tighter text-animate-gradient">Últimos Ganhadores</h2>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-secondary">Tempo Real</Badge>
             </div>

             <div className="space-y-4">
                {isLoadingScratches ? (
                   <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : recentScratches?.filter(s => s.is_winner).map((scratch, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-4">
                         <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary p-[2px]">
                            <div className="h-full w-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                               {scratch.profiles?.avatar_url ? (
                                  <img src={scratch.profiles.avatar_url} alt="User" className="h-full w-full object-cover" />
                               ) : (
                                  <div className="h-full w-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                     {scratch.profiles?.name?.substring(0, 1)}
                                  </div>
                               )}
                            </div>
                         </div>
                         <div>
                            <p className="text-sm font-black text-foreground">{scratch.profiles?.name || "Usuário"}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Raspou e ganhou agora mesmo</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-black text-primary uppercase">{scratch.prize_label}</p>
                         <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">
                            {scratch.prize_type === 'balance' ? 'Saldo Instantâneo' : 'Prêmio Especial'}
                         </p>
                      </div>
                   </div>
                ))}
                {(!recentScratches || recentScratches.filter(s => s.is_winner).length === 0) && (
                   <p className="text-center text-muted-foreground text-xs italic py-4">Aguardando novos ganhadores...</p>
                )}
             </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ScratchCardPage;