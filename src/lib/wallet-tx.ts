export type WalletTxLike = {
  amount: number | string | null;
  type?: string | null;
  description?: string | null;
};

export type WalletTxDisplay = {
  isBonus: boolean;
  isCredit: boolean;
  label: string;
};

/** Pure display logic used by the wallet extract row. */
export function classifyWalletTx(t: WalletTxLike): WalletTxDisplay {
  const amount = Number(t?.amount ?? 0);
  const isCredit = amount >= 0;
  const isBonus = (t?.type ?? "").toLowerCase() === "bonus";
  const label = isBonus
    ? (t?.description || "Bônus de depósito")
    : (t?.description || t?.type || "Transação");
  return { isBonus, isCredit, label };
}