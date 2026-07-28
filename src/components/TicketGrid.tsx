import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Info, Lock, Trophy, Search, Sparkles, Zap, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
 
 interface TicketGridProps {
   totalTickets: number;
   soldTickets: string[]; // Numbers already sold
   selectedTickets: string[];
   onSelect: (number: string) => void;
   onClearAll?: () => void;
   maxSelection?: number;
   luckyNumbers?: string[];
 }
 
 const TicketGrid = ({
   totalTickets,
   soldTickets,
   selectedTickets,
   onSelect,
   onClearAll,
   maxSelection = 100,
   luckyNumbers = []
 }: TicketGridProps) => {
   const [viewRange, setViewRange] = useState({ start: 0, end: 100 });
   const [searchQuery, setSearchQuery] = useState("");

   const tickets = useMemo(() => {
     const arr = [];
     const start = viewRange.start;
     const end = Math.min(viewRange.end, totalTickets);
     
     for (let i = start; i < end; i++) {
       const numStr = i.toString().padStart(totalTickets.toString().length, '0');
       arr.push({
         number: numStr,
         isSold: soldTickets.includes(numStr),
         isSelected: selectedTickets.includes(numStr),
         isLucky: luckyNumbers.includes(numStr)
       });
     }
     return arr;
   }, [viewRange, totalTickets, soldTickets, selectedTickets, luckyNumbers]);

   const handleSearch = (value: string) => {
     setSearchQuery(value);
     const num = parseInt(value);
     if (!isNaN(num) && num >= 0 && num < totalTickets) {
       const start = Math.floor(num / 100) * 100;
       setViewRange({ start, end: start + 100 });
     }
   };
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
           <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-secondary" /> Livre</div>
           <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-primary" /> Seu</div>
           <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-muted-foreground/30" /> Ocupado</div>
           <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> Sorte</div>
         </div>
         
          <div className="flex items-center gap-2">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                 type="number" 
                 placeholder="Número..." 
                 value={searchQuery}
                 className="w-24 h-8 pl-8 text-[10px] font-bold uppercase tracking-tight rounded-lg border-border/50 focus:ring-1 focus:ring-primary/30"
                 onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <select 
              className="bg-background border border-border/50 rounded-lg px-2 h-8 text-[10px] font-bold uppercase tracking-tight focus:ring-1 focus:ring-primary/30 outline-none cursor-pointer hover:bg-secondary/50 transition-colors"
              value={viewRange.start}
              onChange={(e) => {
                const start = parseInt(e.target.value);
                setViewRange({ start, end: start + 100 });
              }}
            >
              {Array.from({ length: Math.ceil(totalTickets / 100) }).map((_, i) => {
                const isVeryLarge = totalTickets > 10000;
                if (isVeryLarge && i % 10 !== 0 && i !== Math.ceil(totalTickets / 100) - 1) return null;
                
                return (
                  <option key={i} value={i * 100}>
                    {i * 100} - {Math.min((i + 1) * 100, totalTickets)}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="sm:hidden relative group w-full mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
             type="number" 
             placeholder="Buscar número da sorte..." 
             value={searchQuery}
             className="w-full h-10 pl-10 text-xs font-bold uppercase tracking-tight rounded-xl border-border/50 focus:ring-2 focus:ring-primary/20"
             onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
 
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {tickets.map((ticket) => (
              <button
                key={ticket.number}
                disabled={ticket.isSold}
                onClick={() => onSelect(ticket.number)}
                 className={cn(
                   "relative aspect-square flex flex-col items-center justify-center rounded-md md:rounded-lg text-[10px] font-bold transition-all",
                   !ticket.isSold && "hover:scale-110 hover:z-10 active:scale-95",
                  ticket.isSold 
                    ? "bg-muted-foreground/30 text-foreground/70 border border-muted-foreground/40 cursor-not-allowed line-through decoration-muted-foreground/60" 
                    : ticket.isSelected 
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] scale-110 z-10" 
                      : ticket.isLucky 
                        ? "bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)] border border-amber-300 animate-pulse"
                        : "bg-secondary/50 hover:bg-secondary border border-border/50 text-foreground"
                )}
              >
                {ticket.isSold ? (
                  <>
                    <span className="leading-none">{ticket.number}</span>
                    <Lock className="h-2.5 w-2.5 mt-0.5 opacity-70" />
                  </>
                ) : ticket.number}
               
                {ticket.isSelected && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Check className="h-2 w-2 text-primary" strokeWidth={4} />
                  </div>
                )}
              </button>
            ))}
        </div>
 
        {selectedTickets.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl md:rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Selecionados ({selectedTickets.length})
              </p>
              {onClearAll && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearAll}
                  className="h-6 px-2 text-[8px] font-black uppercase text-destructive hover:bg-destructive/10 gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Limpar
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar p-1">
              {selectedTickets.map(num => (
                <Badge key={num} variant="secondary" className="text-[10px] bg-white border border-primary/10 text-primary font-black px-2.5 h-6 rounded-lg shadow-sm">
                  #{num}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
     </div>
   );
 };
 
 export default TicketGrid;