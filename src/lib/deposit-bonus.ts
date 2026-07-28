export type BonusTier = { min: number; bonus: number };

export function parseBonusTiers(raw: unknown): BonusTier[] {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((t: any) => ({ min: Number(t?.min), bonus: Number(t?.bonus) }))
      .filter((t) => Number.isFinite(t.min) && Number.isFinite(t.bonus) && t.bonus > 0 && t.min >= 0)
      .sort((a, b) => a.min - b.min);
  } catch {
    return [];
  }
}

export function getApplicableBonus(tiers: BonusTier[], amount: number): number {
  if (!Array.isArray(tiers) || !Number.isFinite(amount) || amount <= 0) return 0;
  const eligible = tiers.filter((t) => t.min <= amount);
  return eligible.length ? eligible[eligible.length - 1].bonus : 0;
}

export function getNextTier(tiers: BonusTier[], amount: number): BonusTier | undefined {
  if (!Array.isArray(tiers)) return undefined;
  return tiers.find((t) => t.min > amount);
}

export function getTopTier(tiers: BonusTier[]): BonusTier | undefined {
  if (!Array.isArray(tiers) || tiers.length === 0) return undefined;
  return [...tiers].sort((a, b) => b.min - a.min)[0];
}