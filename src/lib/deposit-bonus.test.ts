import { describe, it, expect } from "vitest";
import { parseBonusTiers, getApplicableBonus, getNextTier, getTopTier } from "./deposit-bonus";

const RAW = '[{"min":50,"bonus":5},{"min":100,"bonus":15},{"min":200,"bonus":40},{"min":500,"bonus":120}]';

describe("parseBonusTiers", () => {
  it("parses JSON string and sorts ascending by min", () => {
    const tiers = parseBonusTiers(RAW);
    expect(tiers.map((t) => t.min)).toEqual([50, 100, 200, 500]);
  });

  it("accepts already-parsed arrays", () => {
    expect(parseBonusTiers([{ min: 10, bonus: 1 }])).toEqual([{ min: 10, bonus: 1 }]);
  });

  it("filters invalid, non-numeric or zero/negative bonus entries", () => {
    const dirty: any = [
      { min: "abc", bonus: 5 },
      { min: 100, bonus: 0 },
      { min: 200, bonus: -10 },
      { min: 300, bonus: 20 },
      null,
    ];
    expect(parseBonusTiers(dirty)).toEqual([{ min: 300, bonus: 20 }]);
  });

  it("returns empty on malformed JSON or non-array", () => {
    expect(parseBonusTiers("not-json")).toEqual([]);
    expect(parseBonusTiers(null)).toEqual([]);
    expect(parseBonusTiers("{}")).toEqual([]);
  });
});

describe("getApplicableBonus", () => {
  const tiers = parseBonusTiers(RAW);

  it.each([
    [20, 0],
    [49.99, 0],
    [50, 5],
    [99, 5],
    [100, 15],
    [199, 15],
    [200, 40],
    [499, 40],
    [500, 120],
    [10000, 120],
  ])("amount %f -> bonus %f", (amount, expected) => {
    expect(getApplicableBonus(tiers, amount)).toBe(expected);
  });

  it("returns 0 on invalid amounts or empty tiers", () => {
    expect(getApplicableBonus(tiers, 0)).toBe(0);
    expect(getApplicableBonus(tiers, -1)).toBe(0);
    expect(getApplicableBonus(tiers, NaN)).toBe(0);
    expect(getApplicableBonus([], 500)).toBe(0);
  });
});

describe("getNextTier / getTopTier", () => {
  const tiers = parseBonusTiers(RAW);

  it("returns the next tier above the current amount", () => {
    expect(getNextTier(tiers, 10)?.min).toBe(50);
    expect(getNextTier(tiers, 100)?.min).toBe(200);
    expect(getNextTier(tiers, 500)).toBeUndefined();
  });

  it("returns the highest tier as top", () => {
    expect(getTopTier(tiers)).toEqual({ min: 500, bonus: 120 });
    expect(getTopTier([])).toBeUndefined();
  });
});