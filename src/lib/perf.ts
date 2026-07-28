// Lightweight client-side performance monitor.
// Exposes window.__perf for quick inspection in the console.

type PerfEntry = {
  kind: "query" | "route" | "vital" | "longtask" | "render";
  name: string;
  durationMs: number;
  ts: number;
  meta?: Record<string, any>;
};

const MAX_ENTRIES = 500;
const SLOW_QUERY_MS = 800;
const SLOW_RENDER_MS = 50;

const entries: PerfEntry[] = [];

const record = (e: PerfEntry) => {
  entries.push(e);
  if (entries.length > MAX_ENTRIES) entries.shift();

  const slow =
    (e.kind === "query" && e.durationMs >= SLOW_QUERY_MS) ||
    (e.kind === "render" && e.durationMs >= SLOW_RENDER_MS) ||
    e.kind === "longtask";

  if (slow && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      `[perf] slow ${e.kind} "${e.name}" ${e.durationMs.toFixed(0)}ms`,
      e.meta ?? "",
    );
  }
};

export const logPerf = (
  kind: PerfEntry["kind"],
  name: string,
  durationMs: number,
  meta?: Record<string, any>,
) => record({ kind, name, durationMs, ts: Date.now(), meta });

export const getPerfEntries = () => [...entries];

export const getPerfSummary = () => {
  const byKind: Record<string, { count: number; avg: number; max: number }> = {};
  for (const e of entries) {
    const k = byKind[e.kind] ?? { count: 0, avg: 0, max: 0 };
    k.count += 1;
    k.avg += e.durationMs;
    k.max = Math.max(k.max, e.durationMs);
    byKind[e.kind] = k;
  }
  Object.values(byKind).forEach((k) => (k.avg = +(k.avg / k.count).toFixed(1)));
  return byKind;
};

let initialized = false;

export const initPerfMonitor = () => {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Web Vitals via PerformanceObserver (no extra dep).
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          logPerf("vital", "LCP", entry.startTime);
        } else if (entry.entryType === "first-input") {
          const fi = entry as PerformanceEventTiming;
          logPerf("vital", "FID", fi.processingStart - fi.startTime);
        } else if (entry.entryType === "longtask") {
          logPerf("longtask", "longtask", entry.duration, {
            startTime: entry.startTime,
          });
        } else if (entry.entryType === "navigation") {
          const nav = entry as PerformanceNavigationTiming;
          logPerf("vital", "TTFB", nav.responseStart);
          logPerf("vital", "DOMContentLoaded", nav.domContentLoadedEventEnd);
          logPerf("vital", "Load", nav.loadEventEnd);
        }
      }
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
    po.observe({ type: "first-input", buffered: true });
    po.observe({ type: "longtask", buffered: true });
    po.observe({ type: "navigation", buffered: true });
  } catch {
    /* unsupported browser */
  }

  // Expose helpers for the console.
  (window as any).__perf = {
    entries: getPerfEntries,
    summary: getPerfSummary,
    clear: () => entries.splice(0, entries.length),
  };
};