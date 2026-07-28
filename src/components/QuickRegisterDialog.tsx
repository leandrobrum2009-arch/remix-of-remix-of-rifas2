import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Zap, Phone, CheckCircle2, AlertCircle } from "lucide-react";
import { maskPhone, validatePhone } from "@/lib/validations";
import { cn } from "@/lib/utils";

interface QuickRegisterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const QuickRegisterDialog = ({ isOpen, onOpenChange, onSuccess }: QuickRegisterDialogProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signIn } = useAuth();

  useEffect(() => {
    setIsPhoneValid(validatePhone(phone));
  }, [phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const cleanPhone = phone.replace(/\D/g, "");
    if (!name || cleanPhone.length < 10) {
      toast.error("Por favor, preencha seu nome completo e um WhatsApp válido.");
      return;
    }

    setIsLoading(true);
    
    // Create a dummy email for auth using the phone number
    const dummyEmail = `${cleanPhone}@sistema.com.br`;
    const dummyPassword = cleanPhone; // Use phone as initial password

    try {
      // Try to sign up
      const { error: signUpError } = await signUp(dummyEmail, dummyPassword, name, undefined, phone);
      
      if (signUpError) {
        // If user already exists, try to sign in
        if (signUpError.message.includes("already registered") || signUpError.message.includes("User already exists")) {
          const { error: signInError } = await signIn(dummyEmail, dummyPassword);
          if (signInError) {
            toast.error("Este WhatsApp já está cadastrado. Por favor, tente entrar com sua senha ou recupere o acesso.");
            setIsLoading(false);
            return;
          }
          toast.success("Bem-vindo de volta!");
        } else {
          throw signUpError;
        }
      } else {
        toast.success("Cadastro realizado com sucesso!");
      }

      setIsLoading(false);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Quick registration error:", error);
      toast.error(error.message || "Erro ao realizar o cadastro rápido.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border rounded-3xl p-0 overflow-hidden">
        <div className="bg-primary/10 p-6 flex flex-col items-center text-center gap-2 border-b border-primary/10">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
            <Zap className="h-6 w-6 text-primary-foreground fill-current" />
          </div>
          <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground">
            Quase lá! <span className="text-primary">Identifique-se</span>
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Só precisamos desses dados para garantir seu prêmio
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu Nome Completo</Label>
            <Input
              id="quick-name"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl bg-secondary/50 border-border focus:border-primary/50 font-bold"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="quick-phone"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                className={cn(
                  "h-12 pl-12 rounded-xl bg-secondary/50 border-border focus:border-primary/50 font-bold transition-colors",
                  phone.length > 0 && (isPhoneValid ? "border-emerald-500/50" : "border-rose-500/50")
                )}
                required
                type="tel"
              />
              {phone.length > 0 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isPhoneValid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                  )}
                </div>
              )}
            </div>
            {phone.length > 0 && !isPhoneValid && (
              <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1 ml-1">Número de WhatsApp inválido</p>
            )}
            <p className="text-[10px] text-muted-foreground font-medium italic">* Usaremos este número para enviar seu comprovante.</p>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest gap-2 glow-primary border-none shadow-lg shadow-primary/20 mt-4"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}
            CONTINUAR PARA PAGAMENTO
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};