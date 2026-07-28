import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, Copy, Clock, CheckCircle2, XCircle, ShieldCheck, Landmark, Upload, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import SuccessFlow from "./checkout/SuccessFlow";

interface PaymentModalProps {
  orderId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: () => void;
  onBuyMore?: (quantity: number) => void;
}


export const PaymentModal = ({ orderId, isOpen, onOpenChange, onPaymentSuccess, onBuyMore }: PaymentModalProps) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [status, setStatus] = useState<'pending' | 'paid' | 'expired'>('pending');
  const [isPayingWithBalance, setIsPayingWithBalance] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [pixError, setPixError] = useState<string | null>(null);
  const [lastProcessedOrderId, setLastProcessedOrderId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);


  const fetchOrder = useCallback(async (retryCount = 0) => {
    if (!orderId) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase.from('profiles').select('balance').eq('user_id', userData.user.id).single();
        if (profile) setUserBalance(Number(profile.balance));
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*, campaigns(*), tickets(*), profiles(name, phone)")
        .eq("id", orderId)
        .maybeSingle();
      
      if (error || !data) {
        if (retryCount < 5) {
          console.log(`Order not found, retrying... (${retryCount + 1})`);
          setTimeout(() => fetchOrder(retryCount + 1), 1000);
          return;
        }
        toast.error("Pedido não encontrado");
        onOpenChange(false);
        return;
      }
      
      setOrder(data);
      setLoading(false);

      if (data.payment_status === 'expired') {
        setStatus('expired');
        return;
      }

      if (data.payment_status === 'pending' && !data.pix_code) {
        setGeneratingPix(true);
        setPixError(null);
        try {
          const { data: pixData, error: pixError } = await supabase.functions.invoke('pix-payment', {
            body: { orderId, path: 'create' },
            method: 'POST'
          });

          if (pixError) {
            // Try to extract real error message from edge function response body
            let realMessage = pixError.message;
            try {
              const ctx: any = (pixError as any).context;
              if (ctx && typeof ctx.json === 'function') {
                const body = await ctx.json();
                if (body?.error) realMessage = body.error;
              } else if (ctx?.body) {
                const parsed = typeof ctx.body === 'string' ? JSON.parse(ctx.body) : ctx.body;
                if (parsed?.error) realMessage = parsed.error;
              }
            } catch {}
            throw new Error(realMessage);
          }

          if (pixData?.error) throw new Error(pixData.error);

          if (pixData) {
            setOrder((prev: any) => ({ 
              ...prev, 
              pix_code: pixData.pix_code, 
              pix_qr_code_base64: pixData.pix_qr_code_base64,
              is_manual: pixData.is_manual,
              pix_name: pixData.pix_name
            }));
          }
        } catch (err: any) {
          console.error('Error generating PIX:', err);
          setPixError(err.message || "Não foi possível gerar o código PIX. Tente novamente.");
        } finally {
          setGeneratingPix(false);
        }
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      if (retryCount < 5) {
        setTimeout(() => fetchOrder(retryCount + 1), 1000);
      } else {
        toast.error("Erro ao carregar pedido");
        onOpenChange(false);
      }
    }
  }, [orderId, onOpenChange]);

  useEffect(() => {
    if (isOpen && orderId) {
      // If orderId changed, reset status to pending
      if (orderId !== lastProcessedOrderId) {
        setLoading(true);
        setStatus('pending');
        setLastProcessedOrderId(orderId);
      }
      fetchOrder();


      const channel = supabase.channel(`payment-${orderId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders', 
          filter: `id=eq.${orderId}` 
        }, (payload) => {
          if (payload.new.payment_status === 'paid') {
            setStatus('paid');
            // Refresh order data to get tickets and updated status
            fetchOrder();
            onPaymentSuccess(); 
          }
          if (payload.new.payment_status === 'expired') {
            setStatus('expired');
            toast.error("Tempo esgotado! Gere um novo PIX para continuar.");
          }
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, orderId, fetchOrder, onPaymentSuccess, onOpenChange]);

  // Timer removed as per user request to avoid confusion during payment
  /*
  useEffect(() => {
    if (status !== 'pending' || !isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          supabase.rpc('release_expired_tickets').then(() => {
             toast.error("Tempo esgotado! Os números foram liberados.");
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, isOpen]);
  */

  const handleSimulatePayment = async () => {
    if (!orderId || !order || isPayingWithBalance) return;
    
    setIsPayingWithBalance(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // We call pay_with_balance as a way to "approve" the order instantly in development
      // This is a simulation for resgate (redemption) by tickets/balance
      const { data: response, error } = await supabase.rpc('pay_with_balance', {
        p_order_id: orderId,
        p_user_id: userData.user.id
      });

      if (error) throw error;
      const data = response as any;

      if (data.success || data.message?.toLowerCase().includes('pago')) {
        toast.success("Resgate simulado com sucesso!");
        setStatus('paid');
        fetchOrder();
        onPaymentSuccess();
      } else {
        toast.error(data.message || "Erro na simulação");
      }
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setIsPayingWithBalance(false);
    }
  };

  const copyPix = () => {
    if (order?.pix_code) {
      navigator.clipboard.writeText(order.pix_code);
      toast.success("Código PIX copiado!");
    }
  };

  const handlePayWithBalance = async () => {
    if (!orderId || !order || isPayingWithBalance) return;
    
    // Check if already paid to avoid duplicate attempts
    if (order.payment_status === 'paid') {
      setStatus('paid');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Usuário não autenticado");
      return;
    }

    setIsPayingWithBalance(true);
    try {
      const { data: response, error } = await supabase.rpc('pay_with_balance', {
        p_order_id: orderId,
        p_user_id: userData.user.id
      });

      if (error) throw error;

      const data = response as any;

      if (data.success) {
        toast.success(data.message || "Pagamento realizado com sucesso!");
        if (typeof data.new_balance === 'number') {
          setUserBalance(Number(data.new_balance));
        }
        setStatus('paid');
        // Update local order state immediately to avoid UI lag/skipping steps
        setOrder((prev: any) => ({ ...prev, payment_status: 'paid', paid_at: new Date().toISOString() }));
        // Re-fetch to get updated tickets and order info
        fetchOrder();
        onPaymentSuccess();
      } else {
        // If the error message indicates it's already paid, just move to success
        if (data.message?.toLowerCase().includes('pago') || data.message?.toLowerCase().includes('já foi processado')) {
          setStatus('paid');
          fetchOrder();
        } else {
          toast.error(data.message || "Erro ao processar pagamento");
        }
      }
    } catch (err: any) {
      console.error('Balance payment error:', err);
      toast.error(err.message || "Erro ao processar pagamento com saldo");
    } finally {
      setIsPayingWithBalance(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] h-[90vh] sm:h-auto max-h-[90vh] sm:max-h-[85vh] bg-card border-border rounded-3xl p-0 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {loading || generatingPix ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 p-12"
            >
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                {loading ? "Carregando pedido..." : "Gerando seu PIX..."}
              </p>
            </motion.div>
          ) : pixError ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6"
            >
              <div className="mx-auto h-20 w-20 rounded-full bg-rose-500/20 flex items-center justify-center border-2 border-rose-500/30">
                <XCircle className="h-10 w-10 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">ERRO NO PAGAMENTO</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{pixError}</p>
              </div>
              <div className="w-full space-y-3">
                <Button className="w-full h-12 rounded-xl" onClick={(e) => {
                  e.preventDefault();
                  setPixError(null);
                  fetchOrder();
                }}>TENTAR NOVAMENTE</Button>
                
                <Button variant="ghost" className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={async () => {
                   if (!orderId) return;
                   setLoading(true);
                   try {
                     const { data: response, error } = await supabase.rpc('reprocess_order_prizes', { p_order_id: orderId });
                     if (error) throw error;
                     const data = response as any;
                     if (data.success) {
                       toast.success(data.message);
                       fetchOrder();
                     } else {
                       toast.error(data.message);
                       setLoading(false);
                     }
                   } catch (err: any) {
                     toast.error("Erro ao sincronizar: " + err.message);
                     setLoading(false);
                   }
                }}>
                  Já paguei pelo PIX! Verificar agora
                </Button>
              </div>
            </motion.div>
          ) : status === 'paid' ? (
            <motion.div 
              key="paid"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex-1 overflow-y-auto no-scrollbar"
            >
              <div className="p-2 md:p-6">
                <SuccessFlow 
                  order={order} 
                  campaign={order.campaigns} 
                  onClose={() => onOpenChange(false)} 
                  onBuyMore={onBuyMore}
                />

              </div>
            </motion.div>
          ) : status === 'expired' ? (
            <motion.div 
              key="expired"
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6"
            >
              <div className="mx-auto h-20 w-20 rounded-full bg-rose-500/20 flex items-center justify-center border-2 border-rose-500/30">
                <XCircle className="h-10 w-10 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">TEMPO ESGOTADO</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">O prazo para pagar este PIX expirou e seus números foram devolvidos ao estoque.</p>
              </div>
              <div className="w-full rounded-2xl border border-border/60 bg-muted/40 p-4 text-left space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Como tentar novamente</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Feche esta janela.</li>
                  <li>Escolha novamente a quantidade de cotas.</li>
                  <li>Gere um novo PIX e finalize em até 15 minutos.</li>
                </ol>
              </div>
              <div className="w-full space-y-2">
                <Button
                  className="w-full h-12 rounded-xl"
                  disabled={regenerating || !onBuyMore}
                  onClick={() => {
                    if (regenerating) return;
                    setRegenerating(true);
                    const qty = order?.quantity || 1;
                    onOpenChange(false);
                    // Parent handleBuy creates ONE new order (reserve_tickets) and
                    // reopens the modal with the new orderId. Guard prevents dupes
                    // from rapid clicks; state resets when modal closes.
                    onBuyMore?.(qty);
                    setTimeout(() => setRegenerating(false), 1500);
                  }}
                >
                  {regenerating ? "GERANDO..." : "GERAR NOVO PIX"}
                </Button>
                <Button variant="ghost" className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="payment"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="bg-primary/10 p-6 flex flex-col items-center text-center gap-2 border-b border-primary/10 relative flex-shrink-0">
                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
                  <QrCode className="h-6 w-6 text-primary-foreground" />
                </div>
                <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground">
                  Finalize seu <span className="text-primary">Pagamento</span>
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Escaneie o QR Code ou copie o código PIX abaixo
                </DialogDescription>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                <div className="flex flex-col items-center gap-6">
                  {order?.pix_qr_code_base64 ? (
                    <div className="relative p-4 bg-white rounded-2xl shadow-xl ring-1 ring-black/5">
                      <img src={`data:image/png;base64,${order.pix_qr_code_base64}`} alt="QR Code PIX" className="h-44 w-44" />
                    </div>
                  ) : order?.is_manual ? (
                    <div className="relative p-12 bg-primary/5 rounded-3xl border-4 border-dashed border-primary/20 flex flex-col items-center gap-4 w-full">
                      <div className="flex flex-col items-center gap-2">
                        <Landmark className="h-16 w-16 text-primary" />
                        <p className="text-xs font-black uppercase tracking-widest text-primary">Pagamento Manual</p>
                      </div>
                      
                      <div className="w-full space-y-3">
                        <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Anexar Comprovante</span>
                            {order.proof_url && <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px]">ANEXADO</Badge>}
                          </div>
                          
                          <Label className="cursor-pointer group">
                            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border group-hover:border-primary/50 rounded-xl bg-secondary/20 transition-all">
                              {isPayingWithBalance ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              ) : (
                                <>
                                  <Upload className="h-6 w-6 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                  <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase">
                                    {order.proof_url ? "Alterar Arquivo" : "Clique para anexar"}
                                  </span>
                                </>
                              )}
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*,application/pdf" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                setIsPayingWithBalance(true);
                                try {
                                  const fileExt = file.name.split('.').pop();
                                  const filePath = `${order.id}/${crypto.randomUUID()}.${fileExt}`;
                                  
                                  const { error: uploadError } = await supabase.storage
                                    .from('payment-proofs')
                                    .upload(filePath, file);
                                  
                                  if (uploadError) throw uploadError;
                                  
                                  const { error: updateError } = await supabase
                                    .from('orders')
                                    .update({ proof_url: filePath })
                                    .eq('id', order.id);
                                  
                                  if (updateError) throw updateError;
                                  
                                  toast.success("Comprovante anexado!");
                                  setOrder((prev: any) => ({ ...prev, proof_url: filePath }));
                                } catch (err: any) {
                                  toast.error("Erro: " + err.message);
                                } finally {
                                  setIsPayingWithBalance(false);
                                }
                              }}
                            />
                          </Label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-52 w-52 rounded-2xl bg-secondary animate-pulse flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  <div className="text-center space-y-1 w-full bg-secondary/50 p-4 rounded-2xl border border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valor do Pedido</p>
                    <p className="text-3xl font-black text-primary">R$ {Number(order?.total_amount || 0).toFixed(2).replace('.', ',')}</p>
                  </div>

                  <div className="w-full space-y-3">
                    {userBalance >= Number(order?.total_amount) && order?.campaign_id !== '00000000-0000-0000-0000-000000000001' ? (
                      <div className="space-y-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Saldo Disponível</span>
                           <span className="text-sm font-black text-emerald-600">R$ {userBalance.toFixed(2)}</span>
                        </div>
                        <Button 
                          className="w-full h-14 rounded-2xl gap-2 font-black uppercase italic tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 border-none" 
                          onClick={handlePayWithBalance}
                          disabled={isPayingWithBalance}
                        >
                          {isPayingWithBalance ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                          ABATER DO SALDO AGORA
                        </Button>
                        <div className="flex items-center justify-center gap-4 py-2">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[8px] font-black text-muted-foreground uppercase">OU PAGUE COM PIX</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        <Button 
                          variant="outline"
                          className="w-full h-12 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest border-primary/20 text-primary" 
                          onClick={copyPix}
                        >
                          <Copy className="h-4 w-4" /> COPIAR CÓDIGO PIX
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button 
                          className="w-full h-14 rounded-2xl gap-2 font-black uppercase italic tracking-widest glow-primary shadow-lg shadow-primary/20 border-none" 
                          onClick={copyPix}
                        >
                          <Copy className="h-5 w-5" /> COPIAR CÓDIGO PIX
                        </Button>
                        
                        <Button 
                          variant="ghost"
                          className="w-full h-10 rounded-xl gap-2 font-black uppercase text-[9px] tracking-widest border border-dashed border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/5" 
                          onClick={handleSimulatePayment}
                          disabled={isPayingWithBalance}
                        >
                          <Zap className="h-3.5 w-3.5" /> SIMULAR RESGATE (TESTE)
                        </Button>
                        
                        {userBalance > 0 && (
                          <div className="p-3 rounded-xl bg-secondary/50 border border-border text-center">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">
                              Saldo insuficiente (R$ {userBalance.toFixed(2)})
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Transação 100% segura e criptografada
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-[10px] font-bold text-amber-600 text-center leading-relaxed">
                    PAGUE VIA PIX OU USE SEU SALDO PARA APROVAÇÃO IMEDIATA.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};