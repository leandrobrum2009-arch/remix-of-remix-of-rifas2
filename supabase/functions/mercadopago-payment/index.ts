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

    // Fetch site settings for credentials
    const { data: settingsData } = await supabaseClient.from("site_settings").select("key, value");
    const settings: Record<string, string> = {};
    settingsData?.forEach(s => { settings[s.key] = s.value; });

    const mpAccessToken = settings.mercadopago_access_token;
    if (!mpAccessToken) throw new Error("Mercado Pago Access Token não configurado.");

    if (path === "create") {
      const orderId = body.orderId
      if (!orderId) throw new Error("ID do pedido não informado.")

      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .select("*, campaigns(title), profiles(name, email)")
        .eq("id", orderId)
        .single()

      if (orderError || !order) throw new Error("Pedido não encontrado")

      const origin = req.headers.get("origin") || "https://suarifapro.com.br"
      const userEmail = order.profiles?.email || "cliente@rifapro.com"
      const userName = order.profiles?.name || "Cliente RifaPro"

      // Create Preference for checkout redirect
      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mpAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              title: order.campaigns.title,
              quantity: 1,
              unit_price: Number(order.total_amount),
              currency_id: "BRL"
            }
          ],
          payer: {
            name: userName,
            email: userEmail
          },
          external_reference: orderId,
          back_urls: {
            success: `${origin}/checkout/${orderId}?status=success`,
            failure: `${origin}/checkout/${orderId}?status=failure`,
            pending: `${origin}/checkout/${orderId}?status=pending`
          },
          auto_return: "approved",
          notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-payment?path=webhook`
        })
      })

      const mpData = await response.json()
      if (!response.ok) {
        console.error("MP Error:", mpData);
        throw new Error(mpData.message || "Erro ao gerar checkout no Mercado Pago")
      }

      return new Response(JSON.stringify({ init_point: mpData.init_point }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    if (path === "webhook") {
      const topic = body.topic || url.searchParams.get("topic") || body.type
      const id = body.resource?.split("/").pop() || body.data?.id || url.searchParams.get("id") || body.id

      console.log(`[MP Webhook] Received: Topic=${topic}, ID=${id}`);

      if ((topic === "payment" || topic === "payment.updated") && id) {
        // Log the event for the retry queue
        await logWebhookEvent(supabaseClient, { 
          provider: 'mercadopago', 
          eventId: id, 
          payload: body 
        });

        // Check for idempotency
        const { data: existing } = await supabaseClient
          .from('webhook_events')
          .select('status')
          .match({ event_id: id, provider: 'mercadopago' })
          .maybeSingle();
        
        if (existing?.status === 'processed') {
          console.log(`[MP Webhook] Already processed payment ${id}. Skipping.`);
          return new Response(JSON.stringify({ received: true, already_processed: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        try {
          const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: { "Authorization": `Bearer ${mpAccessToken}` }
          })
          const paymentData = await response.json()
          
          console.log(`[MP Webhook] Payment ${id} status: ${paymentData.status}`);

          if (paymentData.status === "approved") {
            const orderId = paymentData.external_reference
            console.log(`[MP Webhook] Approving order ${orderId} for payment ${id}`);
            
            // Call the RPC to handle confirmed payment (handles tickets, stats, etc.)
            const { error: rpcError } = await supabaseClient.rpc("handle_order_payment", { 
              p_order_id: orderId,
              p_payment_id: id,
              p_payment_provider: 'mercadopago'
            })
            
            if (!rpcError) {
              await markAsProcessed(supabaseClient, id, 'mercadopago');
            } else {
              console.error("[MP Webhook] RPC Error:", rpcError)
              // Fallback update
              const { error: updateError } = await supabaseClient
                .from('orders')
                .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
                .eq('id', orderId)
                .neq('payment_status', 'paid');
              
              if (!updateError) {
                await markAsProcessed(supabaseClient, id, 'mercadopago');
              } else {
                throw new Error(`RPC and Update failed: ${rpcError.message || updateError.message}`);
              }
            }
          } else {
             // Not approved yet
             await supabaseClient.from('webhook_events').update({ status: 'pending', last_attempt_at: new Date().toISOString() }).match({ event_id: id, provider: 'mercadopago' });
          }
        } catch (err: any) {
          console.error(`[MP Webhook] Processing failed for ${id}:`, err.message);
          await markAsFailed(supabaseClient, id, 'mercadopago', err.message);
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
      status: 400,
    })
  }
})
