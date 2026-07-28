import { describe, it, expect } from "vitest";
import { getCampaignDisplaySales } from "./campaign-progress";

const base = {
  sold_tickets: 0,
  total_tickets: 100,
  fake_progress_enabled: false,
  fake_progress_percentage: 0,
  progress_text: "",
  sales_goal: 0,
  ticket_price: 10,
} as any;

describe("getCampaignDisplaySales", () => {
  it("uses real sold tickets when fake progress disabled", () => {
    const r = getCampaignDisplaySales({ ...base, sold_tickets: 25 });
    expect(r.displaySoldTickets).toBe(25);
    expect(r.roundedProgress).toBe(25);
  });

  it("adds fake percentage to real sold when enabled", () => {
    const r = getCampaignDisplaySales({
      ...base,
      sold_tickets: 5,
      fake_progress_enabled: true,
      fake_progress_percentage: 10,
    });
    // 10% of 100 = 10 fake + 5 real = 15
    expect(r.displaySoldTickets).toBe(15);
    expect(r.roundedProgress).toBe(15);
  });

  it("caps display at total tickets", () => {
    const r = getCampaignDisplaySales({
      ...base,
      sold_tickets: 80,
      fake_progress_enabled: true,
      fake_progress_percentage: 90,
    });
    expect(r.displaySoldTickets).toBe(100);
    expect(r.roundedProgress).toBe(100);
  });

  it("updates progress bar after a new purchase", () => {
    const before = getCampaignDisplaySales({ ...base, sold_tickets: 10 });
    const after = getCampaignDisplaySales({ ...base, sold_tickets: 20 });
    expect(after.displaySoldTickets).toBeGreaterThan(before.displaySoldTickets);
    expect(after.roundedProgress).toBeGreaterThan(before.roundedProgress);
  });

  it("keeps fake baseline stable and only real portion moves with sales", () => {
    const p1 = getCampaignDisplaySales({
      ...base,
      sold_tickets: 0,
      fake_progress_enabled: true,
      fake_progress_percentage: 30,
    });
    const p2 = getCampaignDisplaySales({
      ...base,
      sold_tickets: 5,
      fake_progress_enabled: true,
      fake_progress_percentage: 30,
    });
    expect(p1.displaySoldTickets).toBe(30);
    expect(p2.displaySoldTickets).toBe(35);
  });
});

describe("getCampaignDisplaySales — fake vs normal parity", () => {
  it("normal mode equals real sold/total exactly", () => {
    const r = getCampaignDisplaySales({ ...base, sold_tickets: 42, total_tickets: 200 });
    expect(r.displaySoldTickets).toBe(42);
    expect(r.rawProgress).toBeCloseTo(21, 5);
    expect(r.progressBar).toBeCloseTo(21, 5);
  });

  it("fake mode never reports LESS than normal mode for same real sales", () => {
    const real = getCampaignDisplaySales({ ...base, sold_tickets: 20 });
    const fake = getCampaignDisplaySales({
      ...base,
      sold_tickets: 20,
      fake_progress_enabled: true,
      fake_progress_percentage: 40,
    });
    expect(fake.displaySoldTickets).toBeGreaterThanOrEqual(real.displaySoldTickets);
    expect(fake.roundedProgress).toBeGreaterThanOrEqual(real.roundedProgress);
  });

  it("sales_goal drives progress only when fake is OFF", () => {
    const normalWithGoal = getCampaignDisplaySales({
      ...base,
      sold_tickets: 50, // 50 * 10 = 500 out of 1000 goal = 50%
      sales_goal: 1000,
    });
    expect(normalWithGoal.roundedProgress).toBe(50);

    // With fake on, sales_goal is ignored and % comes from tickets
    const fakeWithGoal = getCampaignDisplaySales({
      ...base,
      sold_tickets: 50,
      sales_goal: 1000,
      fake_progress_enabled: true,
      fake_progress_percentage: 20,
    });
    // 20% * 100 + 50 = 70 displayed / 100 total = 70%
    expect(fakeWithGoal.roundedProgress).toBe(70);
  });

  it("fake stays disabled when percentage is null/undefined even if flag is true", () => {
    const r = getCampaignDisplaySales({
      ...base,
      sold_tickets: 10,
      fake_progress_enabled: true,
      fake_progress_percentage: null,
    });
    expect(r.displaySoldTickets).toBe(10);
  });

  it("clamps invalid inputs (negative sold, zero total) safely", () => {
    const r = getCampaignDisplaySales({
      ...base,
      sold_tickets: -5,
      total_tickets: 0,
    });
    expect(r.displaySoldTickets).toBe(0);
    expect(r.roundedProgress).toBe(0);
    expect(r.progressBar).toBe(0);
  });

  it("progressBar shows minimum visible sliver (0.5) once any progress exists", () => {
    const zero = getCampaignDisplaySales({ ...base, sold_tickets: 0 });
    const tiny = getCampaignDisplaySales({ ...base, sold_tickets: 1, total_tickets: 10_000 });
    expect(zero.progressBar).toBe(0);
    expect(tiny.progressBar).toBeGreaterThanOrEqual(0.5);
  });

  it("custom progress_text overrides numeric label in both modes", () => {
    const normal = getCampaignDisplaySales({
      ...base,
      sold_tickets: 10,
      progress_text: "Quase esgotado!",
    });
    const fake = getCampaignDisplaySales({
      ...base,
      sold_tickets: 10,
      fake_progress_enabled: true,
      fake_progress_percentage: 50,
      progress_text: "Quase esgotado!",
    });
    expect(normal.progressText).toBe("Quase esgotado!");
    expect(fake.progressText).toBe("Quase esgotado!");
  });
});
