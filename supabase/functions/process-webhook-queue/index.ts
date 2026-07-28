import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

    // Fetch pending or failed events with less than 5 attempts
    const { data: events, error: fetchError } = await supabaseClient
      .from('webhook_events')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('attempts', 5)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) throw fetchError;

    const results = [];

    for (const event of (events || [])) {
      console.log(`[Queue] Processing ${event.provider} event ${event.event_id} (Attempt ${event.attempts + 1})`);
      
      try {
        // Trigger the original function as if it was a webhook
        // We'll call it internally via supabase.functions.invoke
        let functionName = '';
        if (event.provider === 'mercadopago') functionName = 'mercadopago-payment';
        else if (event.provider === 'mercadopago_pix') functionName = 'pix-payment';
        else if (event.provider === 'stripe') functionName = 'stripe-payment';

        if (functionName) {
          const { data, error } = await supabaseClient.functions.invoke(functionName, {
            body: { ...event.payload, path: 'webhook' },
            method: 'POST'
          });

          if (error) throw error;
          results.push({ id: event.id, status: 'success' });
        } else {
          throw new Error(`Unknown provider: ${event.provider}`);
        }
      } catch (err: any) {
        console.error(`[Queue] Error for event ${event.id}:`, err.message);
        results.push({ id: event.id, status: 'failed', error: err.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: any) {
    console.error("Queue Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
