// Cliente Supabase EXTERNO (projeto próprio do cliente).
// Este arquivo substitui o cliente gerado automaticamente via alias no vite.config.ts.
// A URL e a publishable key são públicas por design (a proteção real é RLS).

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const SUPABASE_URL = "https://knnpmkshdligatzkwfqh.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubnBta3NoZGxpZ2F0emt3ZnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDQ4OTQsImV4cCI6MjEwNDcyMDg5NH0.Pv7lZNzNfCeii2drawaQFP6Sn70GBGq-oRei5srEQGk";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;

// As Edge Functions agora rodam neste mesmo projeto Supabase (nao usamos mais o Lovable).
// O projeto injeta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY automaticamente nas funcoes.
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
try {
  (supabase as unknown as { functions: { url: string } }).functions.url = FUNCTIONS_URL;
} catch {
  // ignora se a versão do SDK mudar a estrutura interna
}
