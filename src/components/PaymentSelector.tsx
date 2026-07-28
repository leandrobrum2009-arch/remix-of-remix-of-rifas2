import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, QrCode, Wallet, Landmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useData";

interface PaymentMethod {
  id: string;
  name: string;
  icon: any;
  description: string;
}

const METHODS: PaymentMethod[] = [
  { id: "pix", name: "PIX Real", icon: QrCode, description: "Aprovação imediata" },
  { id: "stripe", name: "Cartão de Crédito", icon: CreditCard, description: "Stripe - Até 12x" },
  { id: "manual", name: "PIX Manual", icon: Landmark, description: "Envie o comprovante" },
];

interface PaymentSelectorProps {
  onSelect: (id: string) => void;
}

const PaymentSelector = ({ onSelect }: PaymentSelectorProps) => {
  const { data: settings } = useSiteSettings();
  const [selected, setSelected] = useState<string>("pix");

  const activeProvider = settings?.active_payment_provider || "mercadopago";

  // Filter methods based on active provider
  const filteredMethods = METHODS.filter(m => {
    if (activeProvider === 'manual') return m.id === 'manual';
    if (activeProvider === 'mercadopago') return m.id === 'pix' || m.id === 'stripe';
    return true;
  });

  useEffect(() => {
    if (filteredMethods.length > 0) {
      const defaultMethod = filteredMethods[0].id;
      setSelected(defaultMethod);
      onSelect(defaultMethod);
    }
  }, [activeProvider, settings]);

  if (filteredMethods.length <= 1) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Forma de Pagamento</h3>
      <div className="grid gap-3">
        {filteredMethods.map((method) => (
          <motion.button
            key={method.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              setSelected(method.id);
              onSelect(method.id);
            }}
            className={cn(
              "relative flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all",
              selected === method.id
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border bg-card hover:border-primary/30"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
              selected === method.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              <method.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold">{method.name}</p>
              <p className="text-xs text-muted-foreground font-medium">{method.description}</p>
            </div>
            {selected === method.id && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default PaymentSelector;