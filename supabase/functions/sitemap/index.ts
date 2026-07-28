import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml",
};

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Resolve tenant by hostname (x-forwarded-host or Host header)
  const reqUrl = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const hostname = (reqUrl.searchParams.get("host") || forwardedHost).split(":")[0].toLowerCase();

  let tenantId: string | null = null;
  let baseUrl = `https://${hostname}`;

  if (hostname) {
    const { data: domainRow } = await supabase
      .from("tenant_domains")
      .select("tenant_id")
      .ilike("domain", hostname)
      .maybeSingle();
    if (domainRow) tenantId = domainRow.tenant_id;
  }
  if (!tenantId) {
    const { data: def } = await supabase.from("tenants").select("id").eq("slug", "default").maybeSingle();
    tenantId = def?.id ?? null;
  }
  if (tenantId) {
    const { data: primary } = await supabase
      .from("tenant_domains")
      .select("domain")
      .eq("tenant_id", tenantId)
      .eq("is_primary", true)
      .maybeSingle();
    if (primary?.domain) baseUrl = `https://${primary.domain}`;
  }

  let campaignsQuery = supabase
    .from("campaigns")
    .select("slug, updated_at, tenant_id")
    .eq("status", "active");
  if (tenantId) campaignsQuery = campaignsQuery.eq("tenant_id", tenantId);
  const { data: campaigns } = await campaignsQuery;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/ganhadores</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/resultado-federal</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/roleta-premiada</loc>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/raspadinha-da-sorte</loc>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/caixa-misteriosa-de-premios</loc>
    <priority>0.7</priority>
  </url>`;

  campaigns?.forEach((campaign) => {
    xml += `
  <url>
    <loc>${baseUrl}/rifa/${campaign.slug}</loc>
    <lastmod>${new Date(campaign.updated_at).toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>`;
  });

  xml += `
</urlset>`;

  return new Response(xml, { headers: corsHeaders });
});
