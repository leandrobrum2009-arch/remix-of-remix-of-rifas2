import { describe, it, expect } from "vitest";
import { maskCPF, maskPhone, validateCPF, validatePhone } from "./validations";

describe("maskCPF", () => {
  it("formats a full CPF", () => {
    expect(maskCPF("12345678901")).toBe("123.456.789-01");
  });
  it("formats partial input progressively", () => {
    expect(maskCPF("123")).toBe("123");
    expect(maskCPF("1234")).toBe("123.4");
    expect(maskCPF("1234567")).toBe("123.456.7");
  });
  it("caps at 11 digits", () => {
    expect(maskCPF("123456789012345")).toBe("123.456.789-01");
  });
  it("ignores non digits", () => {
    expect(maskCPF("abc123.456-78901")).toBe("123.456.789-01");
  });
});

describe("maskPhone", () => {
  it("formats mobile number", () => {
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
  });
  it("formats landline using the 5+4 mask (mobile-style)", () => {
    expect(maskPhone("1133334444")).toBe("(11) 33334-444");
  });
  it("caps at 11 digits", () => {
    expect(maskPhone("119876543210000")).toBe("(11) 98765-4321");
  });
});

describe("validateCPF", () => {
  it("accepts 11-digit CPF", () => {
    expect(validateCPF("123.456.789-01")).toBe(true);
  });
  it("rejects short input", () => {
    expect(validateCPF("1234567890")).toBe(false);
  });
  it("rejects repeated digits", () => {
    expect(validateCPF("11111111111")).toBe(false);
  });
});

describe("validatePhone", () => {
  it("accepts 10 and 11 digit phones", () => {
    expect(validatePhone("(11) 3333-4444")).toBe(true);
    expect(validatePhone("(11) 98765-4321")).toBe(true);
  });
  it("rejects too short or too long", () => {
    expect(validatePhone("123")).toBe(false);
    expect(validatePhone("123456789012")).toBe(false);
  });
});
