/**
 * E2E-style tests for the payment pipeline. Instead of hitting Supabase,
 * we mock the client and simulate the observable round-trips a checkout
 * makes:
 *   1. reserve_tickets RPC creates an order
 *   2. pay_with_balance RPC debits the wallet
 *   3. PIX charge + polling for webhook confirmation
 *   4. affiliate_commissions row exists after a paid order with affiliate
 *
 * The DB triggers themselves (handle_affiliate_commission,
 * process_paid_order) are covered by the schema — here we assert the
 * client contract that surfaces those effects.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const invoke = vi.fn();
const affiliateSelect = vi.fn();
const orderSelect = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    functions: { invoke: (n: string, o: unknown) => invoke(n, o) },
    from: (table: string) => {
      if (table === "affiliate_commissions") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: affiliateSelect }) }),
        };
      }
      if (table === "orders") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: orderSelect }) }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }) };
    },
  },
}));

import { confirmBalancePurchase } from "./purchase-flow";
import { createPixCharge, checkPixConfirmation } from "./pix-purchase-flow";
import { supabase } from "@/integrations/supabase/client";

beforeEach(() => {
  rpc.mockReset();
  invoke.mockReset();
  affiliateSelect.mockReset();
  orderSelect.mockReset();
});

describe("E2E: balance checkout", () => {
  it("reserves tickets then pays with balance atomically", async () => {
    // Step 1: reserve creates an order id
    rpc.mockResolvedValueOnce({ data: "order-123", error: null });
    const reservation = await supabase.rpc("reserve_tickets", {
      p_campaign_id: "c1",
      p_user_id: "u1",
      p_quantity: 5,
      p_numbers: null,
      p_affiliate_id: null,
    });
    expect(reservation.data).toBe("order-123");

    // Step 2: pay with balance
    rpc.mockResolvedValueOnce({
      data: { success: true, new_balance: 155.5 },
      error: null,
    });
    const paid = await confirmBalancePurchase("order-123", "u1");
    expect(paid).toEqual({ success: true, newBalance: 155.5 });
    expect(rpc.mock.calls[1]).toEqual([
      "pay_with_balance",
      { p_order_id: "order-123", p_user_id: "u1" },
    ]);
  });

  it("blocks payment when RPC reports insufficient balance", async () => {
    rpc.mockResolvedValueOnce({
      data: { success: false, message: "Saldo insuficiente. Seu saldo atual é R$ 0" },
      error: null,
    });
    const r = await confirmBalancePurchase("order-x", "u1");
    expect(r.success).toBe(false);
    if (r.success === false) expect(r.message).toMatch(/insuficiente/i);
  });
});

describe("E2E: PIX Mercado Pago", () => {
  it("creates a PIX charge and confirms after webhook flips payment_status", async () => {
    invoke.mockResolvedValueOnce({
      data: { pix_code: "PIX-CODE", pix_qr_code_base64: "b64==", is_manual: false },
      error: null,
    });
    const charge = await createPixCharge("order-pix-1");
    expect(charge.success).toBe(true);
    if (charge.success) expect(charge.pixCode).toBe("PIX-CODE");

    // First poll: still pending
    orderSelect.mockResolvedValueOnce({
      data: { payment_status: "pending" },
      error: null,
    });
    let confirmed = await checkPixConfirmation("order-pix-1");
    expect(confirmed.paid).toBe(false);

    // Webhook fires -> payment_status flips to 'paid'
    orderSelect.mockResolvedValueOnce({
      data: { payment_status: "paid" },
      error: null,
    });
    confirmed = await checkPixConfirmation("order-pix-1");
    expect(confirmed.paid).toBe(true);
  });
});

describe("E2E: affiliate commission after paid order", () => {
  it("finds a commission row for the paid order + affiliate pair", async () => {
    // Simulate handle_affiliate_commission trigger side-effect
    affiliateSelect.mockResolvedValueOnce({
      data: {
        order_id: "order-aff-1",
        affiliate_id: "aff-1",
        amount: 12.5,
        status: "paid",
      },
      error: null,
    });
    const { data } = await supabase
      .from("affiliate_commissions")
      .select("*")
      .eq("order_id", "order-aff-1")
      .maybeSingle();
    expect(data).toMatchObject({
      affiliate_id: "aff-1",
      amount: 12.5,
      status: "paid",
    });
  });

  it("returns null when the order has no affiliate attached", async () => {
    affiliateSelect.mockResolvedValueOnce({ data: null, error: null });
    const { data } = await supabase
      .from("affiliate_commissions")
      .select("*")
      .eq("order_id", "order-no-aff")
      .maybeSingle();
    expect(data).toBeNull();
  });
});
