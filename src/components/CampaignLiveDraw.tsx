import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Youtube, Dices, Calendar, Trophy, ExternalLink, Play, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface CampaignLiveDrawProps {
  campaign: any;
}

const CampaignLiveDraw = ({ campaign }: CampaignLiveDrawProps) => {
  const { data: lotteryResult } = useQuery({
    queryKey: ["lottery-result", campaign?.concurso],
    queryFn: async () => {
      if (!campaign?.concurso) return null;
      const { data, error } = await supabase
        .from("federal_lottery_results")
        .select("*")
        .eq("concurso", campaign.concurso)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!campaign?.concurso,
  });

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : "";
  };

  const embedUrl = getYoutubeEmbedUrl(campaign?.live_stream_url);

  if (!lotteryResult && !campaign?.federal_lottery_draw && !campaign?.concurso) {
    return null;
  }

  return (
    <div className="w-full space-y-4 my-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
          <Play className="h-4 w-4 text-primary animate-pulse" /> Sorteio em Tempo Real
        </h3>
        {campaign.federal_lottery_draw && (
          <Badge variant="outline" className="border-primary/20 text-primary text-[10px] font-bold">
            BASEADO NA LOTERIA FEDERAL
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* YouTube Live Stream */}
        {embedUrl && (
          <Card className="lg:col-span-2 overflow-hidden border-primary/20 bg-black/40 backdrop-blur-md shadow-xl">
            <div className="aspect-video w-full relative">
              <iframe
                src={embedUrl}
                title="Sorteio ao Vivo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </Card>
        )}

        {/* Lottery Result or Info */}
        <Card className={`overflow-hidden border-primary/20 bg-card/60 backdrop-blur-md shadow-lg ${!embedUrl ? 'md:col-span-2 lg:col-span-3' : ''}`}>
          <CardContent className="p-6 flex flex-col h-full justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Concurso Federal</span>
                  <span className="text-xl font-black italic tracking-tighter text-primary">
                    {campaign?.concurso || "Aguardando"}
                  </span>
                </div>
                <Dices className="h-8 w-8 text-primary/40" />
              </div>

              {lotteryResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-primary">Número Sorteado (1º Prêmio)</span>
                    <span className="text-4xl font-black italic tracking-tighter text-primary neon-text-primary">
                      {(lotteryResult.premios as any[]).find(p => p.premio === "1")?.numero || "---"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {(lotteryResult.premios as any[]).filter(p => p.premio !== "1").slice(0, 4).map((p: any) => (
                      <div key={p.premio} className="p-2 rounded-xl bg-secondary/30 border border-border/50 flex flex-col items-center">
                        <span className="text-[7px] font-bold uppercase text-muted-foreground">{p.premio}º Prêmio</span>
                        <span className="text-sm font-black italic">{p.numero}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="p-3 rounded-full bg-primary/10 animate-pulse">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-foreground">Aguardando Extração</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      O resultado oficial será publicado assim que for disponibilizado pela Caixa.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5"
              asChild
            >
              <a href="https://loterias.caixa.gov.br/paginas/federal.aspx" target="_blank" rel="noopener noreferrer">
                SITE OFICIAL CAIXA <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status Alert */}
      {campaign.status === "active" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 overflow-hidden"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-[9px] font-bold uppercase tracking-widest leading-tight">
            Atenção: O sorteio ocorre automaticamente assim que o resultado oficial é confirmado. Fique ligado na live!
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default CampaignLiveDraw;
