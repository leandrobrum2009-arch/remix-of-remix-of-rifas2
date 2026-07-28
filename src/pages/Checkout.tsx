 import { useState, useEffect } from "react";
 import { useParams, Link, useNavigate } from "react-router-dom";
 import { motion } from "framer-motion";
   import { 
     ArrowLeft, CheckCircle2, Clock, Copy, 
      ExternalLink, ShieldCheck, Loader2, QrCode, CreditCard, Landmark, Upload
   } from "lucide-react";
import { Label } from "@/components/ui/label";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { toast } from "sonner";
 import Header from "@/components/Header";
 import Footer from "@/components/Footer";
import PaymentSelector from "@/components/PaymentSelector";
import SuccessFlow from "@/components/checkout/SuccessFlow";
 
 export default function Checkout() {
   const { orderId } = useParams<{ orderId: string }>();
   const navigate = useNavigate();
   const [order, setOrder] = useState<any>(null);
   const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [processingPayment, setProcessingPayment] = useState(false);

    const handleCardPayment = async () => {
      setProcessingPayment(true);
      try {
        const { data: settingsData } = await supabase.from("site_settings").select("key, value");
        const settings: Record<string, string> = {};
        settingsData?.forEach(s => { settings[s.key] = s.value; });

        const provider = settings.active_payment_provider || "mercadopago";

        if (provider === 'mercadopago') {
          const { data, error } = await supabase.functions.invoke('mercadopago-payment', {
            body: { orderId, path: 'create' },
          });
          if (error) {
            await supabase.from('payment_failures').insert({
              order_id: orderId,
              user_id: order.user_id,
              provider: 'mercadopago',
              error_message: error.message,
              metadata: { context: 'card-payment-create' }
            });
            throw error;
          }
          if (data?.init_point) {
            window.location.href = data.init_point;
          } else {
            const msg = "Erro ao gerar link de pagamento Mercado Pago";
            await supabase.from('payment_failures').insert({
              order_id: orderId,
              user_id: order.user_id,
              provider: 'mercadopago',
              error_message: msg
            });
            toast.error(msg);
          }
        } else {
          const { data, error } = await supabase.functions.invoke('stripe-payment', {
            body: { orderId, path: 'create' },
          });
          if (error) {
            await supabase.from('payment_failures').insert({
              order_id: orderId,
              user_id: order.user_id,
              provider: 'stripe',
              error_message: error.message,
              metadata: { context: 'card-payment-create' }
            });
            throw error;
          }
          if (data?.url) {
            window.location.href = data.url;
          } else {
            const msg = "Erro ao gerar link de pagamento Stripe";
            await supabase.from('payment_failures').insert({
              order_id: orderId,
              user_id: order.user_id,
              provider: 'stripe',
              error_message: msg
            });
            toast.error(msg);
          }
        }
      } catch (err: any) {
        console.error('Payment error:', err);
        toast.error("Erro ao processar pagamento com cartão");
      } finally {
        setProcessingPayment(false);
      }
    };

 
    const fetchOrder = async () => {
      if (!orderId) return;
      
      const { data, error } = await supabase
        .from("orders")
        .select("*, campaigns(*), tickets(*), profiles(name)")
        .eq("id", orderId)
        .maybeSingle();
      
      if (error || !data) {
        toast.error("Pedido não encontrado");
        navigate("/");
        return;
      }
      setOrder(data);
      setLoading(false);

      // If not paid and doesn't have pix code, generate it
      if (data.payment_status !== 'paid' && !data.pix_code) {
        try {
          const { data: pixData, error: pixError } = await supabase.functions.invoke('pix-payment', {
            body: { orderId, path: 'create' },
            method: 'POST'
          });
          
          if (!pixError && pixData) {
            setOrder(prev => ({ 
              ...prev, 
              pix_code: pixData.pix_code, 
              pix_qr_code_base64: pixData.pix_qr_code_base64 
            }));
          }
        } catch (err) {
          console.error('Error generating PIX:', err);
        }
      }
    };

    useEffect(() => {
      if (orderId) {
        fetchOrder();
 
       // Realtime check for payment
       const channel = supabase.channel(`order-${orderId}`)
         .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
           if (payload.new.payment_status === 'paid') {
             toast.success("Pagamento confirmado!");
             setOrder(payload.new);
           }
         })
         .subscribe();
       
       return () => { supabase.removeChannel(channel); };
     }
   }, [orderId, navigate]);
 
    const copyPix = () => {
      if (order?.pix_code) {
        navigator.clipboard.writeText(order.pix_code);
        toast.success("Código PIX copiado!");
      } else {
        toast.error("Código PIX não disponível");
      }
    };
 
   if (loading) return (
     <div className="min-h-screen bg-background">
       <Header />
       <div className="flex h-[60vh] items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
       <Footer />
     </div>
   );
 
   const isPaid = order.payment_status === 'paid';
 
   return (
     <div className="min-h-screen bg-background">
       <Header />
        <div className="container max-w-4xl py-6 md:py-10">
          <div className="mb-6 md:mb-8 flex items-center gap-3 md:gap-4">
            <Link to={`/campanha/${order.campaigns?.slug || order.campaign_id}`}>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 rounded-full"><ArrowLeft className="h-4 w-4 md:h-5 md:w-5" /></Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic truncate">Checkout</h1>
               <p className="text-[9px] md:text-xs text-muted-foreground uppercase font-bold tracking-widest truncate">Pedido #{order.id.slice(0, 8)}</p>
            </div>
          </div>
 
         <div className="grid gap-8 lg:grid-cols-3">
           <div className="lg:col-span-2 space-y-6">
              {isPaid ? (
                <SuccessFlow order={order} campaign={order.campaigns} />
              ) : (
               <>
                  {paymentMethod === 'pix' || paymentMethod === 'manual' ? (
                    <Card className="border-border/50">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-primary" /> {paymentMethod === 'manual' ? 'Pagamento Manual (PIX)' : 'Pagamento via PIX'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex flex-col items-center gap-6 p-6 rounded-2xl bg-secondary/30 border border-border/50">
                           {order.pix_qr_code_base64 ? (
                             <div className="relative p-4 bg-white rounded-xl shadow-lg">
                               <img src={`data:image/png;base64,${order.pix_qr_code_base64}`} alt="QR Code PIX" className="h-40 w-40" />
                             </div>
                            ) : paymentMethod === 'manual' ? (
                              <div className="relative p-8 bg-primary/10 rounded-2xl border-2 border-dashed border-primary/20 flex flex-col items-center gap-4 w-full">
                                <div className="flex flex-col items-center gap-2">
                                  <Landmark className="h-12 w-12 text-primary" />
                                  <p className="text-[10px] font-black uppercase tracking-tighter">Faça a transferência para a chave abaixo</p>
                                </div>
                                
                                <div className="w-full space-y-4">
                                  <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Anexar Comprovante</span>
                                      {order.proof_url && <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px]">ANEXADO</Badge>}
                                    </div>
                                    
                                    <Label className="cursor-pointer group">
                                      <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border group-hover:border-primary/50 rounded-xl bg-secondary/20 transition-all">
                                        {processingPayment ? (
                                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        ) : (
                                          <>
                                            <Upload className="h-6 w-6 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                              {order.proof_url ? "Alterar Comprovante" : "Clique para anexar comprovante"}
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
                                          
                                          setProcessingPayment(true);
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
                                            
                                            toast.success("Comprovante anexado com sucesso!");
                                            setOrder(prev => ({ ...prev, proof_url: filePath }));
                                          } catch (err: any) {
                                            toast.error("Erro ao anexar: " + err.message);
                                          } finally {
                                            setProcessingPayment(false);
                                          }
                                        }}
                                      />
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="relative p-4 bg-white rounded-xl shadow-lg">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PENDING_ORDER_${order.id}`} alt="QR Code PIX" className="h-40 w-40 opacity-20 grayscale" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                              </div>
                            )}
                          <div className="text-center space-y-1">
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Valor a pagar</p>
                            <p className="text-3xl font-black text-primary">R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</p>
                            {order.pix_name && (
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Favorecido: {order.pix_name}</p>
                            )}
                          </div>
                          <Button className="w-full h-12 rounded-xl gap-2 font-black uppercase" onClick={copyPix}>
                            <Copy className="h-4 w-4" /> Copiar Chave PIX
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                          <Clock className="h-5 w-5 animate-pulse" />
                          <p className="text-[10px] font-bold uppercase leading-tight">
                            {paymentMethod === 'manual' 
                              ? "Após pagar, envie o comprovante no WhatsApp de suporte para liberação." 
                              : "Aguardando confirmação automática... Não feche esta página após pagar."}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-border/50">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" /> Pagamento via Cartão
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6 p-8 text-center">
                        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                          <CreditCard className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold">Cartão de Crédito</h3>
                          <p className="text-sm text-muted-foreground">Você será redirecionado para o ambiente seguro do Stripe para finalizar o pagamento.</p>
                        </div>
                        <div className="text-center space-y-1 py-4">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</p>
                          <p className="text-3xl font-black text-primary">R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</p>
                        </div>
                         <Button 
                           className="w-full h-14 rounded-xl gap-2 font-black uppercase text-lg shadow-lg shadow-primary/20" 
                           onClick={handleCardPayment}
                           disabled={processingPayment}
                         >
                           {processingPayment ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                          Pagar Agora
                        </Button>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Sua transação é protegida por criptografia de ponta.</p>
                      </CardContent>
                    </Card>
                  )}
 
                 <PaymentSelector onSelect={setPaymentMethod} />
               </>
             )}
           </div>
 
           <div className="space-y-6">
             <Card className="border-border/50 bg-card/50 backdrop-blur-sm sticky top-24">
                <CardHeader className="pb-2 bg-secondary/50/50">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Resumo do Pedido</CardTitle>
                </CardHeader>
               <CardContent className="space-y-4">
                 <div className="space-y-1">
                   <p className="text-sm font-bold truncate">{order.campaigns?.title}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">{order.quantity} x R$ {Number(order.campaigns?.ticket_price).toFixed(2)}</p>
                 </div>
                 <Separator />
                 <div className="flex items-center justify-between">
                   <span className="text-sm font-bold">Total</span>
                   <span className="text-xl font-black text-primary">R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</span>
                 </div>
                 <div className="pt-2 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-black">
                     <ShieldCheck className="h-3 w-3 text-green-500" /> Transação 100% Segura
                   </div>
                     <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-black">
                      <CheckCircle2 className="h-3 w-3 text-primary" /> Aguardando seu pagamento
                    </div>
                 </div>
               </CardContent>
             </Card>
           </div>
         </div>
       </div>
       <Footer />
     </div>
   );
 }
 
 const Separator = () => <div className="h-px w-full bg-border/50" />;