import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-queue-secret",
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const QUEUE_SECRET = Deno.env.get("QUEUE_SECRET") ?? ""

    const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE)

    // ---- Authorization: cron shared secret OR authenticated admin/master ----
    let authorized = false

    const providedSecret = req.headers.get("x-queue-secret") ?? ""
    if (QUEUE_SECRET && providedSecret === QUEUE_SECRET) {
      authorized = true
    }

    if (!authorized) {
      const authHeader = req.headers.get("Authorization") ?? ""
      if (authHeader) {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: userData } = await userClient.auth.getUser()
        const callerId = userData?.user?.id
        if (callerId) {
          const { data: callerRoles } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", callerId)
          const roles = (callerRoles || []).map((r: any) => r.role)
          authorized = roles.some((r: string) =>
            ["master", "admin", "client_admin"].includes(r)
          )
        }
      }
    }

    if (!authorized) {
      return json({ error: "Unauthorized" }, 401)
    }


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
