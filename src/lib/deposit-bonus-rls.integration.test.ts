import { describe, it, expect } from "vitest";
import { parseBonusTiers } from "./deposit-bonus";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const hasEnv = !!URL && !!KEY;
const d = hasEnv ? describe : describe.skip;

async function anonGet(path: string) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

d("RLS: deposit_bonus_tiers is publicly readable via anon key", () => {
  it("returns the tiers row for anon (used by DepositModal)", async () => {
    const r = await anonGet("site_settings?select=key,value&key=eq.deposit_bonus_tiers");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBe(1);
    const tiers = parseBonusTiers(r.body[0].value);
    expect(tiers.length).toBeGreaterThan(0);
    expect(tiers.every((t) => t.min >= 0 && t.bonus > 0)).toBe(true);
  });

  it("blocks anon reads on sensitive keys (not in whitelist)", async () => {
    const r = await anonGet(
      "site_settings?select=key,value&key=eq.mercadopago_access_token"
    );
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    // RLS whitelist excludes secret tokens -> anon must see zero rows.
    expect(r.body.length).toBe(0);
  });

  it("blocks anon writes on the bonus row (read-only for public)", async () => {
    const res = await fetch(
      `${URL}/rest/v1/site_settings?key=eq.deposit_bonus_tiers`,
      {
        method: "PATCH",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ value: "[]" }),
      }
    );
    const text = await res.text();
    // Expect either a 401/403 or an empty representation (0 rows updated).
    if (res.status === 200) {
      const rows = text ? JSON.parse(text) : [];
      expect(rows.length).toBe(0);
    } else {
      expect([401, 403, 404]).toContain(res.status);
    }
  });
});