// Cliente Supabase EXTERNO (projeto próprio do cliente).
// Este arquivo substitui o cliente gerado automaticamente via alias no vite.config.ts.
// A URL e a publishable key são públicas por design (a proteção real é o RLS).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const SUPABASE_URL = "https://ethhksgzevonlxubjsjn.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wlzj0Z2UrG7vLgxW33cMfg_5NDxeoEJ";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;

// As Edge Functions continuam hospedadas no projeto Lovable (o Supabase externo
// não tem funções publicadas). Elas leem/escrevem no banco externo através dos
// secrets EXTERNAL_SUPABASE_URL / EXTERNAL_SUPABASE_SERVICE_ROLE_KEY.
export const FUNCTIONS_URL = "https://ofuytzpvazyxbszhkaeb.supabase.co/functions/v1";
try {
  (supabase as unknown as { functions: { url: string } }).functions.url = FUNCTIONS_URL;
} catch {
  // ignora se a versão do SDK mudar a estrutura interna
}
