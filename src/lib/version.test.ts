import { describe, it, expect } from "vitest";
import { APP_VERSION, CHANGELOG } from "./version";

describe("app version", () => {
  it("follows semver-ish x.y.z", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
  it("changelog entries reference known versions", () => {
    expect(Array.isArray(CHANGELOG)).toBe(true);
    expect(CHANGELOG.length).toBeGreaterThan(0);
    for (const entry of CHANGELOG) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(new Date(entry.date).toString()).not.toBe("Invalid Date");
    }
  });
  it("current APP_VERSION is present in changelog", () => {
    expect(CHANGELOG.some((e) => e.version === APP_VERSION)).toBe(true);
  });
});
