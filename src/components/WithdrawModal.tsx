import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, ArrowDownLeft, Landmark } from "lucide-react";
import { useSiteSettings } from "@/hooks/useData";

interface WithdrawModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userBalance: number;
  onSuccess: () => void;
}

export const WithdrawModal = ({ isOpen, onOpenChange, userBalance, onSuccess }: WithdrawModalProps) => {
  const [amount, setAmount] = useState<string>("");
  const [pixKey, setPixKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { data: settings } = useSiteSettings();

  const minWithdrawal = parseFloat(settings?.min_withdrawal_amount || "50");

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Informe um valor válido para saque");
      return;
    }

    if (numAmount < minWithdrawal) {
      toast.error(`O valor mínimo para saque é R$ ${minWithdrawal.toFixed(2)}`);
      return;
    }

    if (numAmount > userBalance) {
      toast.error("Saldo insuficiente para realizar este saque");
      return;
    }

    if (!pixKey.trim()) {
      toast.error("Informe sua chave PIX para recebimento");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Create the withdrawal transaction
      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: numAmount,
          type: 'withdrawal',
          status: 'pending',
          pix_key: pixKey,
          description: 'Solicitação de Saque'
        });

      if (txError) throw txError;

      // 2. Deduct from user balance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ balance: userBalance - numAmount })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("Solicitação de saque enviada! O valor será processado em breve.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Withdraw error:', error);
      toast.error("Erro ao processar saque: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border rounded-3xl p-0 overflow-hidden">
        <div className="bg-emerald-500/10 p-6 flex flex-col items-center text-center gap-2 border-b border-emerald-500/10">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-2">
            <ArrowDownLeft className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground">
            Solicitar <span className="text-emerald-500">Saque</span>
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Transfira seu saldo para sua conta bancária via PIX
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saldo Disponível</p>
                <p className="text-lg font-black text-foreground">R$ {userBalance.toFixed(2)}</p>
             </div>
             <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Saque Mínimo</p>
                <p className="text-lg font-black text-emerald-600">R$ {minWithdrawal.toFixed(2)}</p>
             </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor do Saque (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-12 pl-12 rounded-xl bg-secondary/50 border-border focus:border-emerald-500/50 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sua Chave PIX</Label>
              <div className="relative">
                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CPF, E-mail ou Telefone"
                  className="h-12 pl-12 rounded-xl bg-secondary/50 border-border focus:border-primary/50 font-bold"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleWithdraw} 
            className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest gap-2 bg-emerald-500 hover:bg-emerald-600 text-white glow-emerald border-none shadow-lg shadow-emerald-500/20 mt-2"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowDownLeft className="h-5 w-5" />}
            EFETUAR SAQUE AGORA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
