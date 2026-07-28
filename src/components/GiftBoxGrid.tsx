import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Sparkles, Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  totalTickets: number;
  soldTickets: string[];
  selectedTickets: string[];
  onSelect: (n: string) => void;
  onClearAll?: () => void;
  maxSelection?: number;
}

/**
 * Gift-box grid used when a campaign has "Presente Premiado" enabled.
 * Numbers are hidden — users only see closed gift boxes and pick how
 * many they want. The actual numbers are revealed only after payment.
 */
export default function GiftBoxGrid({
  totalTickets,
  soldTickets,
  selectedTickets,
  onSelect,
  onClearAll,
}: Props) {
  const [page, setPage] = useState(0);
  const pageSize = 60;
  const padLen = String(Math.max(1, totalTickets - 1)).length;

  const start = page * pageSize;
  const end = Math.min(start + pageSize, totalTickets);

  const items = [] as { number: string; isSold: boolean; isSelected: boolean }[];
  for (let i = start; i < end; i++) {
    const numStr = i.toString().padStart(padLen, "0");
    items.push({
      number: numStr,
      isSold: soldTickets.includes(numStr),
      isSelected: selectedTickets.includes(numStr),
    });
  }

  const totalPages = Math.ceil(totalTickets / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Escolha suas caixas-surpresa
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-[10px] font-black uppercase text-muted-foreground">
            {page + 1} / {Math.max(1, totalPages)}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {items.map((it) => (
          <motion.button
            key={it.number}
            whileHover={!it.isSold ? { scale: 1.08 } : undefined}
            whileTap={!it.isSold ? { scale: 0.95 } : undefined}
            disabled={it.isSold}
            onClick={() => onSelect(it.number)}
            className={cn(
              "relative aspect-square rounded-xl flex items-center justify-center transition-all border-2",
              it.isSold && "bg-muted/60 border-muted-foreground/30 cursor-not-allowed opacity-50",
              !it.isSold && !it.isSelected && "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/20",
              it.isSelected && "bg-gradient-to-br from-primary to-primary/70 border-primary shadow-lg shadow-primary/40 scale-105",
            )}
          >
            {it.isSold ? (
              <Lock className="h-5 w-5 text-muted-foreground/70" />
            ) : (
              <Gift className={cn("h-6 w-6", it.isSelected ? "text-primary-foreground" : "text-primary")} />
            )}
            {it.isSelected && (
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white flex items-center justify-center text-[8px] font-black text-primary">
                ✓
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {selectedTickets.length > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5" /> {selectedTickets.length} caixa(s) selecionada(s)
            </p>
            {onClearAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 px-2 text-[9px] font-black uppercase text-destructive hover:bg-destructive/10 gap-1"
              >
                <Trash2 className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Os números só serão revelados após o pagamento. Boa sorte!
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedTickets.slice(0, 20).map((n) => (
              <Badge key={n} className="bg-primary/20 text-primary border border-primary/30 font-black">
                <Gift className="h-3 w-3 mr-1" /> ?
              </Badge>
            ))}
            {selectedTickets.length > 20 && (
              <Badge variant="outline" className="font-black">+{selectedTickets.length - 20}</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}