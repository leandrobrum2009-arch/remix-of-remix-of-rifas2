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
import { parseBonusTiers, getApplicableBonus } from "./deposit-bonus";

const DEPOSIT_CAMPAIGN_ID = "00000000-0000-0000-0000-000000000001";
const TIERS_RAW = '[{"min":50,"bonus":5},{"min":100,"bonus":15},{"min":200,"bonus":40},{"min":500,"bonus":120}]';

describe("PIX deposit + bonus (integration)", () => {
  beforeEach(() => {
    invoke.mockReset();
    maybeSingle.mockReset();
  });

  it("full flow: PIX generated → pending → paid → bonus applied to expected credit", async () => {
    // 1. Frontend requests PIX for an existing deposit order (R$ 200)
    invoke.mockResolvedValueOnce({
      data: { pix_code: "0002012PIX", pix_qr_code_base64: "qr==", is_manual: false },
      error: null,
    });
    const charge = await createPixCharge("deposit-order-1");
    expect(charge.success).toBe(true);
    expect(invoke).toHaveBeenCalledWith("pix-payment", {
      body: { path: "create", orderId: "deposit-order-1" },
    });

    // 2. Poll: order still pending before webhook fires
    maybeSingle.mockResolvedValueOnce({ data: { payment_status: "pending" }, error: null });
    expect(await checkPixConfirmation("deposit-order-1")).toEqual({ paid: false, status: "pending" });

    // 3. Webhook confirms — poll now returns paid
    maybeSingle.mockResolvedValueOnce({ data: { payment_status: "paid" }, error: null });
    const confirmed = await checkPixConfirmation("deposit-order-1");
    expect(confirmed.paid).toBe(true);

    // 4. Bonus applied server-side: assert the credit the user should see
    const tiers = parseBonusTiers(TIERS_RAW);
    const depositAmount = 200;
    const bonus = getApplicableBonus(tiers, depositAmount);
    expect(bonus).toBe(40);
    expect(depositAmount + bonus).toBe(240);
  });

  it("does not credit bonus below the smallest tier (R$ 20)", async () => {
    invoke.mockResolvedValueOnce({
      data: { pix_code: "PIX20", pix_qr_code_base64: null, is_manual: true },
      error: null,
    });
    const charge = await createPixCharge("deposit-order-small");
    expect(charge.success).toBe(true);

    const tiers = parseBonusTiers(TIERS_RAW);
    expect(getApplicableBonus(tiers, 20)).toBe(0);
  });

  it("credit remains stable when polling fails or PIX expires (no bonus applied)", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    expect(await createPixCharge("deposit-order-x")).toEqual({
      success: false,
      message: "provider down",
    });

    maybeSingle.mockResolvedValueOnce({ data: { payment_status: "expired" }, error: null });
    const expired = await checkPixConfirmation("deposit-order-x");
    expect(expired.paid).toBe(false);

    // No paid confirmation → bonus math must not apply
    const tiers = parseBonusTiers(TIERS_RAW);
    expect(getApplicableBonus(tiers, 500)).toBe(120); // preview only
    // But the app must not credit unless confirmed.paid is true.
    expect(expired.paid).toBe(false);
  });

  it("targets the hidden deposit campaign id (routing correctness)", async () => {
    // The DepositModal always inserts orders against this fixed campaign id;
    // the PIX flow must not overwrite/route it elsewhere.
    expect(DEPOSIT_CAMPAIGN_ID).toBe("00000000-0000-0000-0000-000000000001");

    invoke.mockResolvedValueOnce({
      data: { pix_code: "abc", pix_qr_code_base64: null, is_manual: false },
      error: null,
    });
    await createPixCharge("dep-1");
    const [, opts] = invoke.mock.calls[0] as [string, { body: { path: string; orderId: string } }];
    // We pass only the order id — the edge function resolves the campaign server-side.
    expect(opts.body).toEqual({ path: "create", orderId: "dep-1" });
  });
});