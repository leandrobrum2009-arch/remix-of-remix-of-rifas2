import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (name: string, opts: unknown) => invoke(name, opts) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  },
}));

import { createPixCharge, checkPixConfirmation } from "./pix-purchase-flow";
import { getCampaignDisplaySales } from "./campaign-progress";

describe("createPixCharge", () => {
  beforeEach(() => invoke.mockReset());

  it("rejects empty order id without hitting network", async () => {
    const r = await createPixCharge("");
    expect(r.success).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("returns pix code from edge function", async () => {
    invoke.mockResolvedValueOnce({
      data: { pix_code: "0002012...", pix_qr_code_base64: "base64==", is_manual: false },
      error: null,
    });
    const r = await createPixCharge("order-1");
    expect(invoke).toHaveBeenCalledWith("pix-payment", { body: { path: "create", orderId: "order-1" } });
    expect(r).toEqual({ success: true, pixCode: "0002012...", qrBase64: "base64==", isManual: false });
  });

  it("does not confirm payment on create (manual confirmation required)", async () => {
    invoke.mockResolvedValueOnce({
      data: { pix_code: "abc", pix_qr_code_base64: null, is_manual: true },
      error: null,
    });
    const r = await createPixCharge("order-1");
    expect(r.success).toBe(true);
    // Only 1 call: creation. Confirmation must come from a separate webhook/poll.
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("surfaces edge function error", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    const r = await createPixCharge("order-1");
    expect(r).toEqual({ success: false, message: "provider down" });
  });
});

describe("checkPixConfirmation", () => {
  beforeEach(() => maybeSingle.mockReset());

  it("reports pending state before webhook", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { payment_status: "pending" }, error: null });
    const r = await checkPixConfirmation("order-1");
    expect(r).toEqual({ paid: false, status: "pending" });
  });

  it("reports paid after webhook confirmation", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { payment_status: "paid" }, error: null });
    const r = await checkPixConfirmation("order-1");
    expect(r.paid).toBe(true);
  });

  it("reports expired PIX (not paid) after timeout", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { payment_status: "expired" }, error: null });
    const r = await checkPixConfirmation("order-1");
    expect(r).toEqual({ paid: false, status: "expired" });
  });

  it("handles missing order (unknown status)", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const r = await checkPixConfirmation("order-1");
    expect(r).toEqual({ paid: false, status: "unknown" });
  });
});

describe("progress bar after PIX confirmation", () => {
  const base = {
    total_tickets: 200,
    fake_progress_enabled: false,
    fake_progress_percentage: 0,
    progress_text: "",
    sales_goal: 0,
    ticket_price: 5,
  } as const;

  it("advances when sold_tickets increases after webhook", () => {
    const before = getCampaignDisplaySales({ ...base, sold_tickets: 50 } as any);
    const after = getCampaignDisplaySales({ ...base, sold_tickets: 60 } as any);
    expect(after.displaySoldTickets - before.displaySoldTickets).toBe(10);
    expect(after.roundedProgress).toBeGreaterThan(before.roundedProgress);
  });

  it("keeps fake baseline and stacks real PIX sales on top", () => {
    const before = getCampaignDisplaySales({
      ...base,
      sold_tickets: 0,
      fake_progress_enabled: true,
      fake_progress_percentage: 20,
    } as any);
    const after = getCampaignDisplaySales({
      ...base,
      sold_tickets: 10,
      fake_progress_enabled: true,
      fake_progress_percentage: 20,
    } as any);
    expect(before.displaySoldTickets).toBe(40); // 20% of 200
    expect(after.displaySoldTickets).toBe(50);
  });
});
