import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import { confirmBalancePurchase } from "./purchase-flow";

describe("confirmBalancePurchase", () => {
  beforeEach(() => rpc.mockReset());

  it("rejects when order or user missing", async () => {
    const r = await confirmBalancePurchase("", "u1");
    expect(r.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("debits balance on success and returns new balance", async () => {
    rpc.mockResolvedValueOnce({ data: { success: true, new_balance: 42 }, error: null });
    const r = await confirmBalancePurchase("order-1", "user-1");
    expect(rpc).toHaveBeenCalledWith("pay_with_balance", {
      p_order_id: "order-1",
      p_user_id: "user-1",
    });
    expect(r).toEqual({ success: true, newBalance: 42 });
  });

  it("surfaces insufficient balance error", async () => {
    rpc.mockResolvedValueOnce({
      data: { success: false, message: "Saldo insuficiente" },
      error: null,
    });
    const r = await confirmBalancePurchase("order-1", "user-1");
    expect(r).toEqual({ success: false, message: "Saldo insuficiente" });
  });

  it("requires an explicit call per purchase (never auto-repeats)", async () => {
    rpc.mockResolvedValue({ data: { success: true, new_balance: 10 }, error: null });
    await confirmBalancePurchase("order-1", "user-1");
    expect(rpc).toHaveBeenCalledTimes(1);
    // A second purchase must be triggered explicitly by another call.
    await confirmBalancePurchase("order-2", "user-1");
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[1][1]).toEqual({ p_order_id: "order-2", p_user_id: "user-1" });
  });

  it("propagates RPC error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "network" } });
    const r = await confirmBalancePurchase("order-1", "user-1");
    expect(r).toEqual({ success: false, message: "network" });
  });
});
