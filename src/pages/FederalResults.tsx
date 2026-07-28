 import { useQuery } from "@tanstack/react-query";
 import { motion } from "framer-motion";
 import { Dices, Loader2, Calendar, Trophy, Info } from "lucide-react";
 import Header from "@/components/Header";
 import Footer from "@/components/Footer";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
import { SEO } from "@/components/SEO";

const FederalResults = () => {

   const { data: results, isLoading } = useQuery({
     queryKey: ["public-federal-results"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("federal_lottery_results")
         .select("*")
         .order("concurso", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
    return (
      <div className="min-h-screen bg-background">
        <SEO 
          title="Resultados da Federal" 
          description="Confira os últimos resultados da Loteria Federal utilizados para os sorteios da nossa plataforma."
          keywords="loteria federal, resultados caixa, sorteios oficiais"
        />
        <Header />

       <div className="container py-12 md:py-20 pt-[var(--header-height,100px)]">
         <div className="mb-10 text-center space-y-4">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }} 
             animate={{ opacity: 1, scale: 1 }}
             className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4"
           >
             <Dices className="h-8 w-8" />
           </motion.div>
           <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
             Resultados <span className="text-primary neon-text-primary">Federais</span>
           </h1>
           <p className="text-muted-foreground text-sm max-w-lg mx-auto uppercase font-bold tracking-widest">
             Confira os últimos sorteios oficiais da Loteria Federal usados em nossa plataforma
           </p>
         </div>
 
         {isLoading ? (
           <div className="flex justify-center py-20">
             <Loader2 className="h-10 w-10 animate-spin text-primary" />
           </div>
         ) : (
           <div className="grid gap-8 max-w-5xl mx-auto">
             {results?.map((result, i) => (
               <motion.div
                 key={result.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.1 }}
               >
                 <Card className="border-border/50 bg-card/40 backdrop-blur-xl overflow-hidden group hover:border-primary/30 transition-all">
                   <CardHeader className="bg-primary/5 flex flex-row items-center justify-between border-b border-border/50 py-4">
                     <div className="flex items-center gap-4">
                       <Badge className="bg-primary px-3 py-1 font-black italic tracking-tighter">
                         CONCURSO {result.concurso}
                       </Badge>
                       <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                         <Calendar className="h-4 w-4" />
                         {format(new Date(result.data_sorteio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                       </div>
                     </div>
                     <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                       <Trophy className="h-3 w-3" /> Resultado Oficial
                     </div>
                   </CardHeader>
                   <CardContent className="p-6 md:p-10">
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                       {(result.premios as any[]).map((p: any) => (
                         <div 
                           key={p.premio} 
                           className={`relative p-6 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all ${
                             p.premio === "1" 
                               ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/5 scale-105 z-10" 
                               : "bg-secondary/30 border-border/50"
                           }`}
                         >
                           <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${p.premio === "1" ? "text-primary" : "text-muted-foreground"}`}>
                             {p.premio}º Prêmio
                           </span>
                           <div className={`text-3xl font-black italic tracking-tighter ${p.premio === "1" ? "text-primary neon-text-primary" : "text-foreground"}`}>
                             {p.numero}
                           </div>
                           {p.premio === "1" && (
                             <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-[8px] uppercase font-black px-2 py-0">Principal</Badge>
                           )}
                         </div>
                       ))}
                     </div>
                   </CardContent>
                 </Card>
               </motion.div>
             ))}
           </div>
         )}
 
         <div className="mt-16 p-8 rounded-3xl border border-primary/20 bg-primary/5 max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
           <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
             <Info className="h-7 w-7" />
           </div>
           <div className="space-y-2">
             <h3 className="font-black uppercase italic tracking-tighter">Sobre os resultados</h3>
             <p className="text-xs text-muted-foreground font-medium leading-relaxed uppercase tracking-widest">
               Nossos sorteios são baseados nos resultados oficiais da Loteria Federal da Caixa Econômica. 
               A extração ocorre normalmente às quartas e sábados. Verifique sempre o regulamento de cada campanha.
             </p>
           </div>
         </div>
       </div>
       <Footer />
     </div>
   );
 };
 
 export default FederalResults;