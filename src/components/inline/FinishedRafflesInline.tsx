import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { useCampaigns } from "@/hooks/useData";

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

const FinishedRafflesInline = ({ limit = 10 }: { limit?: number }) => {
  const { data: campaigns } = useCampaigns();
  const now = new Date();
  const ended = (campaigns || [])
    .filter((c: any) => {
      const isEnded = ["completed", "finished", "drawn"].includes(c.status);
      const isExpired = c.draw_date && new Date(c.draw_date) <= now;
      return isEnded || isExpired;
    })
    .sort((a: any, b: any) => {
      const da = a.draw_date ? new Date(a.draw_date).getTime() : new Date(a.created_at).getTime();
      const db = b.draw_date ? new Date(b.draw_date).getTime() : new Date(b.created_at).getTime();
      return db - da;
    })
    .slice(0, limit);

  if (ended.length === 0) return null;

  return (
    <section className="px-3 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Finalizadas</h2>
      </div>
      <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {ended.map((c: any) => {
          const winner = c.winners?.[0];
          const number = winner?.winning_number ?? c.winning_number ?? "—";
          const name = winner?.winner_name ?? c.winner_name ?? "Aguardando";
          return (
            <li key={c.id}>
              <Link
                to={`/campanha/${c.slug || c.id}`}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 text-[11px] font-bold hover:bg-primary/5 transition-colors"
              >
                <span className="font-mono text-muted-foreground">{formatDate(c.draw_date)}</span>
                <span className="truncate uppercase tracking-wide">{c.title}</span>
                <span className="flex items-center gap-2 text-primary">
                  <span className="font-mono">Nº {number}</span>
                  <span className="hidden xs:inline text-muted-foreground font-medium normal-case">• {name}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default FinishedRafflesInline;