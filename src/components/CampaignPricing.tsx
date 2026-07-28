import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Zap, Check, Loader2, Minus, Plus, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Campaign, PriceBundle } from "@/hooks/useData";
import { cn } from "@/lib/utils";

interface CampaignPricingProps {
  campaign: Campaign;
  onBuy: (quantity: number | string[]) => void;
  isPurchasing?: boolean;
}

const CampaignPricing = ({ campaign, onBuy, isPurchasing }: CampaignPricingProps) => {
  const [quantity, setQuantity] = useState<number>(0);
  const bundles = useMemo(() => {
    if (Array.isArray(campaign.price_bundles) && campaign.price_bundles.length > 0) {
      return campaign.price_bundles;
    }
    return [];
  }, [campaign.price_bundles]);

  const unitPrice = Number(campaign.ticket_price);

  const selectedBundle = useMemo(() => {
    return bundles.find(b => Number(b.quantity) === Number(quantity));
  }, [quantity, bundles]);

  const totalPrice = useMemo(() => {
    if (selectedBundle) return Number(selectedBundle.price);
    const qty = Number(quantity) || 0;
    return qty * unitPrice;
  }, [quantity, selectedBundle, unitPrice]);

  const handleManualChange = (val: string) => {
    const num = parseInt(val) || 0;
    setQuantity(Math.min(num, campaign.total_tickets - campaign.sold_tickets));
  };

  const increment = () => setQuantity(prev => Math.min(prev + 1, campaign.total_tickets - campaign.sold_tickets));
  const decrement = () => setQuantity(prev => Math.max(0, prev - 1));

  return (
    <div className="space-y-6">
      {/* Unit Price Header */}
      <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-secondary/30 border border-border/50">
        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Valor por Cota</p>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-foreground">
            R$ {unitPrice.toFixed(2).replace(".", ",")}
          </span>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[8px] sm:text-[9px] font-black uppercase px-2 h-5 sm:h-6">
            Promoção
          </Badge>
        </div>
      </div>

      {/* Discount Bundles Grid */}
      {bundles.length > 0 && (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {bundles.map((bundle) => {
          const isSelected = Number(quantity) === Number(bundle.quantity);
          const discountPercent = Math.round((1 - (bundle.price / (bundle.quantity * unitPrice))) * 100);
          
          return (
            <motion.button
              key={bundle.quantity}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setQuantity(bundle.quantity)}
              className={cn(
                "relative flex flex-col items-center justify-center text-center rounded-2xl border p-2 sm:p-4 min-w-0 transition-all duration-300 overflow-hidden",
                isSelected
                  ? "border-primary bg-primary shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] text-white scale-105 z-10"
                  : cn("border-primary/30 bg-card hover:border-primary/60 text-foreground shadow-sm", 
                       bundle.is_popular && "border-primary/50 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]")
              )}
            >
              {/* Light sweep effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-light-sweep pointer-events-none" />
              
              {bundle.is_popular && !isSelected && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-amber-500 text-white border-none text-[8px] font-black uppercase px-1.5 py-0.5">
                    POPULAR
                  </Badge>
                </div>
              )}
              
              {discountPercent > 0 && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "absolute top-1 left-1 text-[8px] font-black px-1.5 py-0 h-4 border-none",
                    isSelected ? "bg-white/20 text-white" : "bg-green-500/10 text-green-500"
                  )}
                >
                  -{discountPercent}%
                </Badge>
              )}

              <span className="text-lg sm:text-2xl font-black italic tracking-tighter mt-1 leading-none">+{bundle.quantity}</span>
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest opacity-70">Cotas</span>
              
              {bundle.label && (
                <span className={cn(
                  "mt-1 text-[7px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full",
                  isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                )}>
                  {bundle.label}
                </span>
              )}
              
              <div className={cn(
                "mt-2 text-[11px] sm:text-sm font-black italic whitespace-nowrap",
                isSelected ? "text-white" : "text-primary"
              )}>
                R$ {bundle.price.toFixed(2).replace(".", ",")}
              </div>

              {isSelected && (
                <div className="absolute bottom-1 right-1">
                  <Check className="h-3 w-3 text-white/50" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
      )}

      {/* Manual Selection and Summary */}
      <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-sm space-y-5 sm:space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3 w-3" /> Quantidade Personalizada
            </p>
            {quantity > 0 && (
              <button 
                onClick={() => setQuantity(0)} 
                className="text-[9px] font-black text-primary uppercase hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={decrement}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border-border hover:bg-secondary shrink-0"
            >
              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            
            <div className="relative flex-1 min-w-0">
              <Input 
                type="number" 
                value={quantity || ""} 
                onChange={(e) => handleManualChange(e.target.value)}
                className="h-10 sm:h-12 text-center font-black text-lg sm:text-xl rounded-xl border-border bg-secondary/20 focus-visible:ring-primary px-2"
                placeholder="Ex: 50"
              />
              <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase">Cotas</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={increment}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border-border hover:bg-secondary shrink-0"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        <div className="pt-6 border-t border-dashed border-border flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor Total</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-foreground">
                R$ {totalPrice.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selecionadas</p>
            <p className="text-xl font-black italic text-primary">{quantity || 0}</p>
          </div>
        </div>

        <Button
          size="lg"
          className={cn(
            "w-full h-12 sm:h-14 gap-2 sm:gap-3 text-sm sm:text-base font-black uppercase tracking-widest rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_10px_20px_rgba(var(--primary-rgb),0.2)] transition-all active:scale-[0.98] border-light-path",
            quantity > 0 && campaign.status === "active" && !isPurchasing && "animate-button-flash border-light-always"
          )}
          disabled={quantity === 0 || campaign.status !== "active" || isPurchasing}
          onClick={() => onBuy(quantity)}
        >
          {isPurchasing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              PROCESSANDO...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 fill-current" />
              QUERO PARTICIPAR
            </>
          )}
        </Button>
        
        <p className="text-[9px] text-center font-bold text-muted-foreground uppercase tracking-widest">
          🔒 Pagamento Seguro via PIX
        </p>
      </div>
    </div>
  );
};

export default CampaignPricing;