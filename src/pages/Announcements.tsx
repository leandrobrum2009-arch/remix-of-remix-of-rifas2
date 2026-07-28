import { motion } from "framer-motion";
import { Megaphone, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAnnouncements } from "@/hooks/useData";

import { SEO } from "@/components/SEO";

const Announcements = () => {

  const { data: announcements, isLoading } = useAnnouncements();

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Comunicados" description="Fique por dentro de todas as novidades, atualizações e comunicados oficiais da nossa plataforma." />
      <Header />
      <div className="h-[var(--header-height,100px)]" />
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2"
        >
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Comunicados</h1>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {announcements?.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-border/50 bg-card p-5 card-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-display text-base font-bold">{item.title}</h2>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {new Date(item.published_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.content}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Announcements;
