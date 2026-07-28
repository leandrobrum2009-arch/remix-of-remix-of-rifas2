import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UserRanking from "@/components/UserRanking";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";
import { Trophy, Star, Zap, Crown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Ranking() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden transition-colors duration-500">
      <SEO
        title="Ranking de Participantes"
        description="Confira o ranking dos maiores compradores de cotas da plataforma e descubra quem está no topo do hall da fama dos sorteios."
      />
      {/* Abstract Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Header />
      
      <main className="container relative z-10 pt-32 pb-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-secondary/50 border border-border backdrop-blur-md mb-4">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Hall da Fama</span>
            </div>
            
            <h1 className="text-3xl md:text-8xl font-black uppercase italic leading-none tracking-tighter">
              Ranking <span className="text-primary neon-text-primary">Global</span>
            </h1>
            
            <p className="text-muted-foreground uppercase font-black tracking-[0.3em] text-[10px] md:text-xs max-w-xl mx-auto leading-relaxed">
              Os maiores jogadores e colecionadores de pontos da plataforma! <span className="text-foreground">Alcance o topo</span> e ganhe recompensas exclusivas.
            </p>
          </motion.div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Participantes', val: '12.4k', icon: Users, color: 'text-blue-400' },
              { label: 'Prêmios Entregues', val: 'R$ 850k', icon: Trophy, color: 'text-yellow-400' },
              { label: 'Pontos Totais', val: '2.5M', icon: Star, color: 'text-primary' },
              { label: 'Nível Máximo', val: '50 VIP', icon: Crown, color: 'text-purple-400' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-card border border-border rounded-3xl p-4 flex flex-col items-center text-center gap-2 group hover:bg-secondary/50 transition-all cursor-default"
              >
                <stat.icon className={cn("h-5 w-5 mb-1 opacity-50 group-hover:opacity-100 transition-opacity", stat.color)} />
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-black italic">{stat.val}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-[40px] p-6 md:p-10 backdrop-blur-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
               <Trophy className="h-64 w-64" />
            </div>
            <UserRanking />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
