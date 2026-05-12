import { describe, expect, it } from "vitest";
import { checkAllPluginUpdates, compareVersions } from "./update-check";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("returns -1 when a < b", () => {
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
    expect(compareVersions("1.0.0", "1.1.0")).toBe(-1);
    expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
  });

  it("returns +1 when a > b", () => {
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
    expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
  });

  it("handles pre-release suffix as separator", () => {
    expect(compareVersions("1.0.0-beta.1", "1.0.0-beta.2")).toBe(-1);
  });

  it("treats missing parts as 0", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0", "1.0.1")).toBe(-1);
  });
});

describe("checkAllPluginUpdates", () => {
  it("returns an empty array when listPlugins() yields no entries", async () => {
    // The live registry is empty in test isolation, so this exercises the
    // outer iteration / fetch-skip path.
    const results = await checkAllPluginUpdates({
      appVersion: "1.0.0",
      manifestUrlFor: () => null,
      fetchImpl: () => Promise.reject(new Error("should not be called")) as Promise<Response>,
    });
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(0);
  });
});
