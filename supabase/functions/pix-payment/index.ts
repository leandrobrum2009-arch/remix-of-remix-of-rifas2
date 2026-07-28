import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { logWebhookEvent, markAsProcessed, markAsFailed } from "../_shared/webhook-handler.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const url = new URL(req.url)
    let body: any = {}
    if (req.method === "POST") {
      body = await req.json().catch(() => ({}))
    }

    const path = body.path || url.searchParams.get("path") || url.pathname.split("/").pop()

    // Fetch site settings to determine provider and credentials
    const { data: settingsData } = await supabaseClient.from("site_settings").select("key, value");
    const settings: Record<string, string> = {};
    settingsData?.forEach(s => { settings[s.key] = s.value; });

    const activeProvider = settings.active_payment_provider || "mercadopago";

    if (path === "create") {
      const orderId = body.orderId
      if (!orderId) throw new Error("ID do pedido não informado.")

      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .select("*, campaigns(title), profiles(name, email)")
        .eq("id", orderId)
        .single()

      if (orderError || !order) throw new Error("Pedido não encontrado")

      const amount = Number(order.total_amount)
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error(
          `Valor do pedido inválido (R$ ${order.total_amount}). Refaça a seleção de bilhetes e tente novamente.`
        )
      }

      // If already has PIX and is pending, return it
      if (order.pix_code && order.pix_qr_code_base64 && order.payment_status === 'pending') {
        return new Response(JSON.stringify({
          pix_code: order.pix_code,
          pix_qr_code_base64: order.pix_qr_code_base64,
          is_manual: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        })
      }

      if (activeProvider === 'manual') {
        const pixCode = settings.manual_payment_pix_key || "";
        const pixName = settings.manual_payment_pix_name || "";
        
        return new Response(JSON.stringify({
          pix_code: pixCode,
          pix_qr_code_base64: null,
          is_manual: true,
          pix_name: pixName
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        })
      }

      if (activeProvider === 'mercadopago') {
        const mpAccessToken = settings.mercadopago_access_token || Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")
        if (!mpAccessToken) throw new Error("Mercado Pago Access Token não configurado.")

        const response = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${mpAccessToken}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": orderId
          },
          body: JSON.stringify({
            transaction_amount: amount,
            description: `Rifa - ${order.campaigns?.title || 'Pedido'} - ${orderId.slice(0, 8)}`,
            payment_method_id: "pix",
            payer: {
              email: order.profiles?.email || "cliente@rifapro.com",
              first_name: (order.profiles?.name || "Cliente").split(" ")[0],
              last_name: (order.profiles?.name || "").split(" ").slice(1).join(" ") || "RifaPro"
            },
            external_reference: orderId,
            notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/pix-payment?path=webhook`
          })
        })

        const mpData = await response.json()
        
        // Handle specifically "locked" error (idempotency key match)
        if (response.status === 423) {
           console.log(`[PIX Create] Resource already locked (MP status 423) for order ${orderId}.`);
           
           // If order already has pix data in DB, return it
           if (order.pix_code) {
             return new Response(JSON.stringify({
               pix_code: order.pix_code,
               pix_qr_code_base64: order.pix_qr_code_base64
             }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
           }

           // Otherwise, try to fetch the payment from Mercado Pago to get the details
           const searchResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}`, {
             headers: { "Authorization": `Bearer ${mpAccessToken}` }
           });
           const searchData = await searchResponse.json();
           
           if (searchData.results && searchData.results.length > 0) {
             const payment = searchData.results[0];
             const pixCode = payment.point_of_interaction?.transaction_data?.qr_code;
             const pixQrBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;
             
             if (pixCode) {
               // Update DB with the found info
               await supabaseClient.from("orders").update({
                 pix_code: pixCode,
                 pix_qr_code_base64: pixQrBase64
               }).eq("id", orderId);

               return new Response(JSON.stringify({
                 pix_code: pixCode,
                 pix_qr_code_base64: pixQrBase64
               }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
             }
           }
        }

        if (!response.ok) {
          console.error("MP Error:", mpData);
          throw new Error(mpData.message || "Erro ao gerar PIX no Mercado Pago")
        }

        const pixCode = mpData.point_of_interaction.transaction_data.qr_code
        const pixQrBase64 = mpData.point_of_interaction.transaction_data.qr_code_base64

        await supabaseClient.from("orders").update({
          pix_code: pixCode,
          pix_qr_code_base64: pixQrBase64
        }).eq("id", orderId)

        return new Response(JSON.stringify({
          pix_code: pixCode,
          pix_qr_code_base64: pixQrBase64
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        })
      }

      if (activeProvider === 'pay2m') {
        const clientKey = settings.pay2m_client_key
        const clientSecret = settings.pay2m_client_secret
        
        if (!clientKey || !clientSecret) {
          throw new Error("Configurações da Pay2m (Client Key/Secret) não encontradas.")
        }

        // 1. Get Access Token
        const authBase64 = btoa(`${clientKey}:${clientSecret}`)
        const tokenRes = await fetch("https://portal.pay2m.com.br/api/auth/generate_token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authBase64}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ grant_type: "client_credentials" })
        })

        if (!tokenRes.ok) {
          const errData = await tokenRes.json().catch(() => ({}))
          console.error("Pay2m Auth Error:", errData)
          throw new Error("Falha na autenticação com Pay2m")
        }

        const { access_token } = await tokenRes.json()

        // 2. Create PIX QR Code
        const pixRes = await fetch("https://portal.pay2m.com.br/api/v1/pix/qrcode", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            value: amount,
            generator_name: (order.profiles?.name || "Cliente").slice(0, 100),
            external_reference: orderId,
            payer_message: `Rifa - ${order.campaigns?.title || 'Pedido'}`.slice(0, 100),
            expiration_time: 3600 // 1 hour
          })
        })

        if (!pixRes.ok) {
          const errData = await pixRes.json().catch(() => ({}))
          console.error("Pay2m PIX Error:", errData)
          throw new Error(errData.message || "Erro ao gerar PIX na Pay2m")
        }

        const pixData = await pixRes.json()
        const pixCode = pixData.content
        
        // Note: Pay2m doesn't seem to return base64 QR code directly in this endpoint.
        // We'll return it as null and the frontend QR code component should handle generating it from the pixCode.
        
        await supabaseClient.from("orders").update({
          pix_code: pixCode,
          payment_id: pixData.reference_code
        }).eq("id", orderId)

        return new Response(JSON.stringify({
          pix_code: pixCode,
          pix_qr_code_base64: null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        })
      }

      throw new Error(`Provedor de pagamento '${activeProvider}' não suportado.`)
    }

    if (path === "webhook") {
      // Handle Pay2m Webhook
      if (body.notification_type === "PIX:QRCODE" && body.message) {
        const msg = body.message
        const orderId = msg.external_reference
        const referenceCode = msg.reference_code
        const status = msg.status

        console.log(`[Pay2m Webhook] Order ${orderId}, Status: ${status}, Ref: ${referenceCode}`);

        if (status === "paid" && orderId) {
          await logWebhookEvent(supabaseClient, { 
            provider: 'pay2m', 
            eventId: referenceCode, 
            payload: body 
          });

          const { error: rpcError } = await supabaseClient.rpc("handle_order_payment", { 
            p_order_id: orderId,
            p_payment_id: referenceCode,
            p_payment_provider: 'pay2m'
          })

          if (!rpcError) {
             await markAsProcessed(supabaseClient, referenceCode, 'pay2m');
             return new Response(JSON.stringify({ success: true }), {
               headers: { ...corsHeaders, "Content-Type": "application/json" },
               status: 200,
             });
          } else {
             console.error("[Pay2m Webhook] RPC Error:", rpcError)
             await markAsFailed(supabaseClient, referenceCode, 'pay2m', rpcError.message);
             return new Response(JSON.stringify({ error: rpcError.message }), {
               headers: { ...corsHeaders, "Content-Type": "application/json" },
               status: 500,
             });
          }
        }
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Handle Mercado Pago Webhook
      const topic = body.topic || url.searchParams.get("topic") || body.type
      const id = body.resource?.split("/").pop() || body.data?.id || url.searchParams.get("id") || body.id

      console.log(`[PIX Webhook] Received: Topic=${topic}, ID=${id}`);

      if ((topic === "payment" || topic === "payment.updated") && id) {
        // Log for retry queue
        await logWebhookEvent(supabaseClient, { 
          provider: 'mercadopago_pix', 
          eventId: id, 
          payload: body 
        });

        // Check for idempotency
        const { data: existing } = await supabaseClient
          .from('webhook_events')
          .select('status')
          .match({ event_id: id, provider: 'mercadopago_pix' })
          .maybeSingle();
        
        if (existing?.status === 'processed') {
          console.log(`[PIX Webhook] Already processed payment ${id}. Skipping.`);
          return new Response(JSON.stringify({ received: true, already_processed: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        try {
          const mpAccessToken = settings.mercadopago_access_token || Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")
          const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: { "Authorization": `Bearer ${mpAccessToken}` }
          })
          const paymentData = await response.json()
          
          console.log(`[PIX Webhook] Payment ${id} status: ${paymentData.status}`);

          if (paymentData.status === "approved") {
            const orderId = paymentData.external_reference
            console.log(`[PIX Webhook] Approving order ${orderId} for payment ${id}`);
            
            const { error: rpcError } = await supabaseClient.rpc("handle_order_payment", { 
              p_order_id: orderId,
              p_payment_id: id,
              p_payment_provider: 'mercadopago_pix'
            })
            
            if (!rpcError) {
               await markAsProcessed(supabaseClient, id, 'mercadopago_pix');
            } else {
               console.error("[PIX Webhook] RPC Error:", rpcError)
               throw new Error(`RPC failed: ${rpcError.message}`);
            }
          } else {
            await supabaseClient.from('webhook_events').update({ status: 'pending', last_attempt_at: new Date().toISOString() }).match({ event_id: id, provider: 'mercadopago_pix' });
          }
        } catch (err: any) {
          console.error(`[PIX Webhook] Processing failed for ${id}:`, err.message);
          await markAsFailed(supabaseClient, id, 'mercadopago_pix', err.message);
          return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }
      }
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    return new Response("Not Found", { status: 404 })
  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }
})
