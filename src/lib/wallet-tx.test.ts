import { describe, it, expect } from "vitest";
import { classifyWalletTx } from "./wallet-tx";

describe("classifyWalletTx (extrato de bônus)", () => {
  it("marks a bonus deposit row with the default label", () => {
    const r = classifyWalletTx({ amount: 15, type: "bonus", description: null });
    expect(r).toEqual({ isBonus: true, isCredit: true, label: "Bônus de depósito" });
  });

  it("keeps the server-provided bonus description when present", () => {
    const r = classifyWalletTx({
      amount: 40,
      type: "bonus",
      description: "Bônus de depósito (R$ 200)",
    });
    expect(r.isBonus).toBe(true);
    expect(r.label).toBe("Bônus de depósito (R$ 200)");
  });

  it("bonus type is case-insensitive", () => {
    expect(classifyWalletTx({ amount: 5, type: "BONUS", description: null }).isBonus).toBe(true);
  });

  it("regular deposit is a credit but not a bonus", () => {
    const r = classifyWalletTx({ amount: 100, type: "deposit", description: "Depósito via PIX" });
    expect(r).toEqual({ isBonus: false, isCredit: true, label: "Depósito via PIX" });
  });

  it("withdrawal is a debit (not credit, not bonus)", () => {
    const r = classifyWalletTx({ amount: -50, type: "withdraw", description: "Saque PIX" });
    expect(r.isCredit).toBe(false);
    expect(r.isBonus).toBe(false);
  });

  it("falls back to type then a generic label when description is missing", () => {
    expect(classifyWalletTx({ amount: 0, type: "purchase", description: null }).label).toBe("purchase");
    expect(classifyWalletTx({ amount: 0, type: null, description: null }).label).toBe("Transação");
  });
});