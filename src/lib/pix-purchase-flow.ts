import { supabase } from "@/integrations/supabase/client";

export type PixCreateResult =
  | { success: true; pixCode: string; qrBase64: string | null; isManual: boolean }
  | { success: false; message: string };

/** Requests a PIX charge for an existing order. Always manual — never auto-confirms. */
export async function createPixCharge(orderId: string): Promise<PixCreateResult> {
  if (!orderId) return { success: false, message: "Pedido inválido" };
  const { data, error } = await supabase.functions.invoke("pix-payment", {
    body: { path: "create", orderId },
  });
  if (error) return { success: false, message: error.message };
  const payload = data as { pix_code?: string; pix_qr_code_base64?: string | null; is_manual?: boolean } | null;
  if (!payload?.pix_code) return { success: false, message: "PIX não gerado" };
  return {
    success: true,
    pixCode: payload.pix_code,
    qrBase64: payload.pix_qr_code_base64 ?? null,
    isManual: !!payload.is_manual,
  };
}

/** Polls order payment_status; returns true when marked as paid by the webhook. */
export async function checkPixConfirmation(orderId: string): Promise<{ paid: boolean; status: string }> {
  const { data, error } = await supabase
    .from("orders")
    .select("payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return { paid: false, status: "unknown" };
  return { paid: data.payment_status === "paid", status: String(data.payment_status || "") };
}
