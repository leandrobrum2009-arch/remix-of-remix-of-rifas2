import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, Wallet, Gift, Sparkles } from "lucide-react";

interface DepositModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (orderId: string) => void;
}

type BonusTier = { min: number; bonus: number };

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const DepositModal = ({ isOpen, onOpenChange, onSuccess }: DepositModalProps) => {
  const [amount, setAmount] = useState<string>("50");
  const [loading, setLoading] = useState(false);
  const [tiers, setTiers] = useState<BonusTier[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "deposit_bonus_tiers")
        .maybeSingle();
      try {
        const parsed = data?.value ? JSON.parse(data.value) : [];
        if (Array.isArray(parsed)) {
          const clean = parsed
            .map((t: any) => ({ min: Number(t.min), bonus: Number(t.bonus) }))
            .filter((t) => !isNaN(t.min) && !isNaN(t.bonus) && t.bonus > 0)
            .sort((a, b) => a.min - b.min);
          setTiers(clean);
        }
      } catch {
        setTiers([]);
      }
    })();
  }, [isOpen]);

  const numAmount = parseFloat(amount) || 0;
  const currentBonus = useMemo(() => {
    const eligible = tiers.filter((t) => t.min <= numAmount);
    return eligible.length ? eligible[eligible.length - 1].bonus : 0;
  }, [tiers, numAmount]);
  const nextTier = useMemo(
    () => tiers.find((t) => t.min > numAmount),
    [tiers, numAmount]
  );

  const handleDeposit = async () => {
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Informe um valor válido para depósito");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create a deposit order
      // Using the special campaign ID 00000000-0000-0000-0000-000000000001
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          campaign_id: '00000000-0000-0000-0000-000000000001',
          quantity: Math.floor(numAmount), // Since ticket_price is 1, quantity = amount
          total_amount: numAmount,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      toast.success("Pedido de depósito criado!");
      onSuccess(order.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast.error("Erro ao processar depósito: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border rounded-3xl p-0 overflow-hidden">
        <div className="bg-primary/10 p-6 flex flex-col items-center text-center gap-2 border-b border-primary/10">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground">
            Depositar <span className="text-primary">Saldo</span>
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Adicione créditos instantâneos à sua carteira via PIX
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {tiers.length > 0 && (
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-emerald-500">
                <Gift className="h-4 w-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Bônus por depósito</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tiers.map((t) => (
                  <button
                    key={t.min}
                    type="button"
                    onClick={() => setAmount(String(t.min))}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                      numAmount >= t.min
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        : "border-border text-muted-foreground hover:border-emerald-500/50"
                    }`}
                  >
                    R$ {t.min} → +R$ {t.bonus}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor do Depósito (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 50.00"
                className="h-14 pl-12 rounded-2xl bg-secondary/50 border-border focus:border-primary/50 font-black text-xl text-emerald-500"
              />
            </div>
            {currentBonus > 0 ? (
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-black text-emerald-500">
                <Sparkles className="h-3.5 w-3.5" />
                Você recebe {fmtBRL(numAmount + currentBonus)} (bônus de +{fmtBRL(currentBonus)})
              </div>
            ) : nextTier ? (
              <p className="text-[10px] text-muted-foreground font-medium text-center italic">
                Deposite +{fmtBRL(nextTier.min - numAmount)} e ganhe +{fmtBRL(nextTier.bonus)} de bônus!
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground font-medium text-center italic">Crédito liberado imediatamente após o pagamento.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["20", "50", "100"].map((val) => (
              <Button
                key={val}
                variant="outline"
                className={`h-12 rounded-xl font-bold ${amount === val ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                onClick={() => setAmount(val)}
              >
                R$ {val}
              </Button>
            ))}
          </div>

          <Button 
            onClick={handleDeposit} 
            className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest gap-2 glow-primary border-none shadow-lg shadow-primary/20 mt-2"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
            GERAR PIX AGORA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
