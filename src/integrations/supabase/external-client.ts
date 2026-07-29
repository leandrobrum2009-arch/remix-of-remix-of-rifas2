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
