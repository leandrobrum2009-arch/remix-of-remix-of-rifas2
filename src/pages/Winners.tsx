import { motion } from "framer-motion";
import { Trophy, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WinnerCard from "@/components/WinnerCard";
import { useWinners } from "@/hooks/useData";
import { SEO } from "@/components/SEO";

const Winners = () => {
  const { data: winners, isLoading } = useWinners();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Ganhadores"
        description="Confira os ganhadores das nossas ações premiadas, com fotos, prêmios entregues e a data de cada sorteio realizado."
      />
      <Header />
      <div className="h-[var(--header-height,100px)]" />
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2"
        >
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Ganhadores</h1>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {winners?.map((winner, i) => (
              <WinnerCard key={winner.id} winner={winner} index={i} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Winners;
