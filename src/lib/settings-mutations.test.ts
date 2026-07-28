import { describe, it, expect } from "vitest";
import {
  buildSettingsMutations,
  normalizeSettingValue,
  settingRowSchema,
  verifySiteSettingsSchema,
} from "./settings-mutations";

describe("buildSettingsMutations", () => {
  it("upserts new keys not present in initial (e.g. home_show_game_caixa)", () => {
    const result = buildSettingsMutations(
      [{ key: "home_show_game_caixa", value: "false" }],
      [],
    );
    expect(result).toEqual([
      { op: "upsert", key: "home_show_game_caixa", value: "false" },
    ]);
  });

  it("updates existing keys whose value changed", () => {
    const result = buildSettingsMutations(
      [{ key: "menu_federal_enabled", value: "false" }],
      [{ key: "menu_federal_enabled", value: "true" }],
    );
    expect(result).toEqual([
      { op: "update", key: "menu_federal_enabled", value: "false" },
    ]);
  });

  it("skips keys that did not change", () => {
    const result = buildSettingsMutations(
      [{ key: "site_name", value: "Rifas" }],
      [{ key: "site_name", value: "Rifas" }],
    );
    expect(result).toEqual([]);
  });

  it("never emits a `type` field (site_settings has no such column)", () => {
    const result = buildSettingsMutations(
      [
        { key: "new_key", value: "true" },
        { key: "existing_key", value: "false" },
      ],
      [{ key: "existing_key", value: "true" }],
    );
    for (const m of result) {
      expect(Object.keys(m).sort()).toEqual(["key", "op", "value"]);
    }
  });

  it("handles mixed inserts, updates and no-ops together", () => {
    const result = buildSettingsMutations(
      [
        { key: "a", value: "1" }, // update
        { key: "b", value: "2" }, // no-op
        { key: "c", value: "3" }, // upsert
      ],
      [
        { key: "a", value: "0" },
        { key: "b", value: "2" },
      ],
    );
    expect(result).toEqual([
      { op: "update", key: "a", value: "1" },
      { op: "upsert", key: "c", value: "3" },
    ]);
  });

  describe("edge cases", () => {
    it("coerces booleans and numbers to strings", () => {
      const result = buildSettingsMutations(
        [
          { key: "flag", value: false as any },
          { key: "count", value: 42 as any },
        ],
        [],
      );
      expect(result).toEqual([
        { op: "upsert", key: "flag", value: "false" },
        { op: "upsert", key: "count", value: "42" },
      ]);
    });

    it("skips rows with empty or malformed keys", () => {
      const result = buildSettingsMutations(
        [
          { key: "", value: "x" },
          { key: "   ", value: "x" },
          { key: "bad key!", value: "x" },
          { key: "ok_key", value: "x" },
        ],
        [],
      );
      expect(result).toEqual([{ op: "upsert", key: "ok_key", value: "x" }]);
    });

    it("skips rows whose value exceeds the 10k character limit", () => {
      const big = "a".repeat(10_001);
      const result = buildSettingsMutations([{ key: "huge", value: big }], []);
      expect(result).toEqual([]);
    });

    it("collapses duplicate keys with last-write-wins", () => {
      const result = buildSettingsMutations(
        [
          { key: "menu_federal_enabled", value: "true" },
          { key: "menu_federal_enabled", value: "false" },
        ],
        [{ key: "menu_federal_enabled", value: "true" }],
      );
      expect(result).toEqual([
        { op: "update", key: "menu_federal_enabled", value: "false" },
      ]);
    });

    it("treats null/undefined values as empty strings", () => {
      const result = buildSettingsMutations(
        [
          { key: "a", value: null as any },
          { key: "b", value: undefined as any },
        ],
        [{ key: "a", value: "" }],
      );
      expect(result).toEqual([{ op: "upsert", key: "b", value: "" }]);
    });

    it("serializes object values to JSON", () => {
      const result = buildSettingsMutations(
        [{ key: "obj", value: { a: 1 } as any }],
        [],
      );
      expect(result).toEqual([{ op: "upsert", key: "obj", value: '{"a":1}' }]);
    });
  });
});

describe("normalizeSettingValue", () => {
  it("returns strings unchanged", () => {
    expect(normalizeSettingValue("hello")).toBe("hello");
  });
  it("stringifies primitives", () => {
    expect(normalizeSettingValue(true)).toBe("true");
    expect(normalizeSettingValue(0)).toBe("0");
  });
  it("returns empty string for null/undefined", () => {
    expect(normalizeSettingValue(null)).toBe("");
    expect(normalizeSettingValue(undefined)).toBe("");
  });
});

describe("settingRowSchema", () => {
  it("accepts valid keys", () => {
    expect(
      settingRowSchema.safeParse({ key: "home_show_game_caixa", value: "false" })
        .success,
    ).toBe(true);
  });
  it("rejects keys with spaces or symbols", () => {
    expect(settingRowSchema.safeParse({ key: "bad key", value: "x" }).success).toBe(
      false,
    );
  });
  it("rejects empty keys", () => {
    expect(settingRowSchema.safeParse({ key: "", value: "x" }).success).toBe(false);
  });
});

describe("verifySiteSettingsSchema", () => {
  it("accepts a well-formed rows array (extra columns tolerated)", () => {
    const res = verifySiteSettingsSchema([
      { key: "home_show_game_caixa", value: "false", description: "x", updated_at: "2024-01-01" },
      { key: "menu_federal_enabled", value: null },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.rows).toHaveLength(2);
  });

  it("fails when payload is not an array", () => {
    const res = verifySiteSettingsSchema({ oops: true } as unknown);
    expect(res.ok).toBe(false);
    if (res.ok === false) expect(res.error).toMatch(/não é uma lista/);
  });

  it("fails when a required column (value) is missing", () => {
    const res = verifySiteSettingsSchema([{ key: "x" }]);
    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.error).toMatch(/Schema/);
      expect(res.issues.join(" ")).toMatch(/value/);
    }
  });

  it("fails when key is empty", () => {
    const res = verifySiteSettingsSchema([{ key: "", value: "x" }]);
    expect(res.ok).toBe(false);
  });
});