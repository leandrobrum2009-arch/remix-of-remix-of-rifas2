import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizeHost(raw: string | null): string {
  if (!raw) return "";
  let h = raw.trim().toLowerCase();
  h = h.replace(/^https?:\/\//, "").split("/")[0];
  h = h.split(":")[0];
  return h;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let hostname = url.searchParams.get("hostname");
    if (!hostname && req.method === "POST") {
      try {
        const body = await req.json();
        hostname = body?.hostname ?? null;
      } catch (_) { /* ignore */ }
    }
    hostname = normalizeHost(hostname);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try to match domain (exact, case-insensitive)
    let tenantId: string | null = null;
    let matchedDomain: string | null = null;
    if (hostname) {
      const { data: domainRow } = await supabase
        .from("tenant_domains")
        .select("tenant_id, domain")
        .ilike("domain", hostname)
        .maybeSingle();
      if (domainRow) {
        tenantId = domainRow.tenant_id;
        matchedDomain = domainRow.domain;
      }
    }

    // Fallback to default tenant by slug
    if (!tenantId) {
      const { data: def } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", "default")
        .maybeSingle();
      tenantId = def?.id ?? null;
    }

    if (!tenantId) {
      return json({ error: "No tenant found" }, 404);
    }

    const [{ data: tenant }, { data: settingsRows }, { data: domains }] = await Promise.all([
      supabase.from("tenants").select("id, slug, name, is_active, plan").eq("id", tenantId).maybeSingle(),
      supabase.from("tenant_settings").select("key, value").eq("tenant_id", tenantId),
      supabase.from("tenant_domains").select("domain, is_primary").eq("tenant_id", tenantId),
    ]);

    const settings: Record<string, string> = {};
    for (const row of settingsRows ?? []) settings[row.key] = row.value ?? "";

    return json({
      tenant,
      settings,
      domains: domains ?? [],
      matched: { hostname, domain: matchedDomain },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});