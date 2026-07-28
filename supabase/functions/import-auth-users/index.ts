import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import usersData from "./users.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UserRow = {
  id: string;
  email: string;
  phone: string | null;
  encrypted_password: string | null;
  email_confirmed_at: string | null;
  raw_user_meta_data: Record<string, unknown>;
  raw_app_meta_data: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Allow caller to pass their own users array; fall back to bundled export.
  let source: UserRow[] = usersData as UserRow[];
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (Array.isArray(body?.users)) source = body.users as UserRow[];
    } catch {
      // no body, use bundled
    }
  }

  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ id: string; email: string; error: string }> = [];

  for (const u of source) {
    try {
      // If user already exists (same id), skip creation to preserve it.
      const { data: existing } = await admin.auth.admin.getUserById(u.id);
      if (existing?.user) {
        skipped.push(u.email);
        continue;
      }

      // createUser doesn't accept id or password_hash directly; use REST admin API
      // which supports both.
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          id: u.id,
          email: u.email,
          phone: u.phone ?? undefined,
          password_hash: u.encrypted_password ?? undefined,
          email_confirm: !!u.email_confirmed_at,
          user_metadata: u.raw_user_meta_data ?? {},
          app_metadata: u.raw_app_meta_data ?? {},
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        errors.push({ id: u.id, email: u.email, error: payload?.msg || payload?.error || `HTTP ${res.status}` });
        continue;
      }
      created.push(u.email);
    } catch (e) {
      errors.push({ id: u.id, email: u.email, error: (e as Error).message });
    }
  }

  return new Response(
    JSON.stringify({
      total: source.length,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      details: { created, skipped, updated, errors },
    }),
    { status: errors.length ? 207 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});