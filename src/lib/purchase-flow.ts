import { supabase } from "@/integrations/supabase/client";

export type PurchaseConfirmResult =
  | { success: true; newBalance: number }
  | { success: false; message: string };

/**
 * Confirms a manual purchase paid via wallet balance.
 * Never runs automatically — always call from an explicit user action.
 */
export async function confirmBalancePurchase(orderId: string, userId: string): Promise<PurchaseConfirmResult> {
  if (!orderId || !userId) {
    return { success: false, message: "Pedido ou usuário inválido" };
  }
  const { data, error } = await supabase.rpc("pay_with_balance", {
    p_order_id: orderId,
    p_user_id: userId,
  });
  if (error) return { success: false, message: error.message };
  const payload = data as { success: boolean; message?: string; new_balance?: number } | null;
  if (!payload || !payload.success) {
    return { success: false, message: payload?.message || "Falha ao confirmar pagamento" };
  }
  return { success: true, newBalance: Number(payload.new_balance || 0) };
}
