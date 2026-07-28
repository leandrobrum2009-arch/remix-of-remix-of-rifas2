import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Trophy, Clock, Sparkles } from "lucide-react";

interface Row {
  id: string;
  ticket_number: string;
  prize_type: string | null;
  prize_title: string | null;
  prize_image_url: string | null;
  prize_value_cents: number | null;
  winner_name: string | null;
}

interface Props {
  campaignId: string;
  revealed: boolean;
}

export default function GiftResultsSection({ campaignId, revealed }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("campaign_gift_prizes_public")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("ticket_number", { ascending: true });
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, [campaignId, revealed]);

  if (loading) return null;
  if (rows.length === 0) return null;

  if (!revealed) {
    return (
      <Card className="p-8 rounded-3xl border-dashed border-pink-500/40 bg-gradient-to-br from-pink-500/5 to-purple-500/5 text-center space-y-3">
        <div className="h-14 w-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto">
          <Clock className="h-7 w-7 text-pink-500 animate-pulse" />
        </div>
        <h3 className="text-lg font-black uppercase italic tracking-tight">Resultado em breve</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Esta ação tem <span className="font-black text-pink-500">{rows.length} caixa(s) premiada(s)</span>. Os prêmios serão revelados aqui após o encerramento.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-3xl space-y-6 border-primary/20">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-black uppercase italic tracking-tight">Números Premiados</h3>
          <p className="text-xs text-muted-foreground">Confira os ganhadores desta campanha</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex gap-4 p-4 rounded-2xl border bg-gradient-to-br from-card to-secondary/30 shadow-sm"
          >
            {r.prize_image_url ? (
              <img
                src={r.prize_image_url}
                alt={r.prize_title ?? "Prêmio"}
                className="h-24 w-24 rounded-xl object-cover border shrink-0"
              />
            ) : (
              <div className="h-24 w-24 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Gift className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <Badge variant="outline" className="font-mono font-black text-primary">
                #{r.ticket_number}
              </Badge>
              <h4 className="text-sm font-black uppercase tracking-tight truncate">{r.prize_title}</h4>
              {r.prize_value_cents != null && (
                <p className="text-xs text-muted-foreground font-bold">
                  R$ {(r.prize_value_cents / 100).toFixed(2).replace(".", ",")}
                </p>
              )}
              <p className="text-xs font-bold flex items-center gap-1.5 pt-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                {r.winner_name ?? "Número não vendido"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}