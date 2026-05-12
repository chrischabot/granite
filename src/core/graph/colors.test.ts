import { describe, expect, it } from "vitest";
import { colorForString, folderColorForPath, tagColorForFile } from "./colors";

describe("colorForString", () => {
  it("is deterministic", () => {
    expect(colorForString("project")).toBe(colorForString("project"));
  });

  it("returns hsl(...) format", () => {
    expect(colorForString("foo")).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
  });

  it("differs across distinct strings", () => {
    const seen = new Set([
      colorForString("a"),
      colorForString("b"),
      colorForString("c"),
      colorForString("d"),
      colorForString("e"),
    ]);
    // We don't require every input to be unique, just that we get more than
    // one bucket — the hash is 360 wide so collisions are rare.
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("tagColorForFile", () => {
  it("returns null with no tags", () => {
    expect(tagColorForFile([])).toBeNull();
  });

  it("returns a stable color for the alphabetically-first tag", () => {
    const a = tagColorForFile(["zeta", "alpha", "mu"]);
    const b = tagColorForFile(["alpha"]);
    expect(a).toBe(b);
  });
});

describe("folderColorForPath", () => {
  it("uses the top-level folder", () => {
    const a = folderColorForPath("docs/notes/x.md");
    const b = folderColorForPath("docs/other.md");
    expect(a).toBe(b);
  });

  it("treats vault-root files as (root)", () => {
    expect(folderColorForPath("README.md")).toBe(folderColorForPath("LICENSE.md"));
  });
});
