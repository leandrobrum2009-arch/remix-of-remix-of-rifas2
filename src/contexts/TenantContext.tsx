import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setCurrentTenantId } from "@/lib/tenant";

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  plan: string | null;
}

export interface TenantContextValue {
  tenant: TenantInfo | null;
  settings: Record<string, string>;
  domains: Array<{ domain: string; is_primary: boolean }>;
  loading: boolean;
  error: Error | null;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  settings: {},
  domains: [],
  loading: true,
  error: null,
});

const CACHE_KEY = "cached_tenant_v1";

function readCache(hostname: string): TenantContextValue | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.hostname !== hostname) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeCache(hostname: string, data: TenantContextValue) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ hostname, data }));
  } catch { /* ignore */ }
}

const DEFAULT_TENANT_ID = "1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73";

/**
 * Resolve o tenant direto no banco (sem edge function).
 * 1) tenta casar o hostname em tenant_domains
 * 2) senao, usa o tenant padrao (ou o primeiro tenant ativo)
 */
async function fetchTenant(hostname: string): Promise<TenantContextValue> {
  let tenantId: string | null = null;

  if (hostname) {
    const { data: domainRow } = await supabase
      .from("tenant_domains")
      .select("tenant_id")
      .eq("domain", hostname)
      .maybeSingle();
    tenantId = domainRow?.tenant_id ?? null;
  }

  let tenantQuery = supabase
    .from("tenants")
    .select("id, slug, name, is_active, plan")
    .eq("is_active", true)
    .limit(1);

  tenantQuery = tenantId
    ? tenantQuery.eq("id", tenantId)
    : tenantQuery.eq("id", DEFAULT_TENANT_ID);

  let { data: tenant } = await tenantQuery.maybeSingle();

  if (!tenant) {
    const { data: fallback } = await supabase
      .from("tenants")
      .select("id, slug, name, is_active, plan")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    tenant = fallback ?? null;
  }

  if (!tenant) {
    return { tenant: null, settings: {}, domains: [], loading: false, error: null };
  }

  const [{ data: settingsRows }, { data: domainRows }] = await Promise.all([
    supabase
      .from("tenant_settings")
      .select("key, value")
      .eq("tenant_id", tenant.id),
    supabase
      .from("tenant_domains")
      .select("domain, is_primary")
      .eq("tenant_id", tenant.id),
  ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    if (row?.key) settings[row.key] = row.value ?? "";
  }

  return {
    tenant: tenant as TenantInfo,
    settings,
    domains: (domainRows ?? []) as Array<{ domain: string; is_primary: boolean }>,
    loading: false,
    error: null,
  };
}

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const cached = typeof window !== "undefined" ? readCache(hostname) : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["tenant", hostname],
    queryFn: async () => {
      const result = await fetchTenant(hostname);
      writeCache(hostname, result);
      setCurrentTenantId(result.tenant?.id ?? null);
      return result;
    },
    staleTime: 5 * 60 * 1000,
    initialData: cached ?? undefined,
  });

  // Keep the sync mirror fresh (e.g. when hydrating from the cache).
  if (data?.tenant?.id) setCurrentTenantId(data.tenant.id);

  const value: TenantContextValue = data ?? {
    tenant: null,
    settings: {},
    domains: [],
    loading: isLoading,
    error: (error as Error) ?? null,
  };

  return (
    <TenantContext.Provider value={{ ...value, loading: isLoading && !cached }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
export const useTenantId = () => useContext(TenantContext).tenant?.id ?? null;