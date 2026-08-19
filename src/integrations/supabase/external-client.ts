// Cliente Supabase EXTERNO (projeto próprio do cliente).
// Este arquivo substitui o cliente gerado automaticamente via alias no vite.config.ts.
// A URL e a publishable key são públicas por design (a proteção real é RLS).

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const SUPABASE_URL = "https://czvcpyuhdhvyrzjacvrs.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_U2hWhshbcm-AgvZRrjb2sg_eINCcpZ0";

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
