// Resolve as credenciais do banco usado pelas Edge Functions.
// Quando o app aponta para um projeto Supabase externo, defina os secrets
// EXTERNAL_SUPABASE_URL e EXTERNAL_SUPABASE_SERVICE_ROLE_KEY.
// Caso contrário, o banco do próprio projeto das funções é usado.
export const DB_URL =
  Deno.env.get("EXTERNAL_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";

export const DB_SERVICE_KEY =
  Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

/** URL pública das próprias Edge Functions (para webhooks). */
export const FUNCTIONS_BASE_URL = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1`;

/** Anon/publishable key do banco usado (externo quando configurado). */
export const DB_ANON_KEY =
  Deno.env.get("EXTERNAL_SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "";
