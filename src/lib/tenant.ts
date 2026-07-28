/**
 * Sync accessors for the current tenant id.
 *
 * TenantProvider is the source of truth (React Query + localStorage cache),
 * but many hooks/pages need the id synchronously inside a `queryFn`. We
 * mirror the resolved id onto `window.__TENANT_ID__` + `localStorage` so
 * non-hook code can read it without prop-drilling.
 *
 * Callers must tolerate a `null` return on the very first visit (before
 * the resolve-tenant edge function replies) — the affected queries just
 * skip the tenant filter that turn; RLS (Fase 7) is the hard boundary.
 */

const LS_KEY = "current_tenant_id";

declare global {
  interface Window {
    __TENANT_ID__?: string | null;
  }
}

export function getCurrentTenantId(): string | null {
  if (typeof window === "undefined") return null;
  if (window.__TENANT_ID__) return window.__TENANT_ID__;
  try {
    const cached = localStorage.getItem(LS_KEY);
    if (cached) {
      window.__TENANT_ID__ = cached;
      return cached;
    }
  } catch { /* ignore */ }
  return null;
}

export function setCurrentTenantId(id: string | null) {
  if (typeof window === "undefined") return;
  window.__TENANT_ID__ = id;
  try {
    if (id) localStorage.setItem(LS_KEY, id);
    else localStorage.removeItem(LS_KEY);
  } catch { /* ignore */ }
}