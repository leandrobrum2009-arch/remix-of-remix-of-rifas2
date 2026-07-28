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

async function fetchTenant(hostname: string): Promise<TenantContextValue> {
  const { data, error } = await supabase.functions.invoke("resolve-tenant", {
    body: { hostname },
  });
  if (error) throw error;
  return {
    tenant: data?.tenant ?? null,
    settings: data?.settings ?? {},
    domains: data?.domains ?? [],
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