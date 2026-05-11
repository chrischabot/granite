import { describe, it, expect } from "vitest";
import {
  filterExcluded,
  isExcluded,
  parseExcludePatterns,
} from "./exclude";

describe("parseExcludePatterns", () => {
  it("splits on newlines and trims whitespace", () => {
    expect(parseExcludePatterns("a\n  b\n\n c \n")).toEqual(["a", "b", "c"]);
  });

  it("skips blank lines and # comments", () => {
    expect(parseExcludePatterns("a\n# comment\n\nb\n#another")).toEqual([
      "a",
      "b",
    ]);
  });

  it("handles null/empty input", () => {
    expect(parseExcludePatterns(null)).toEqual([]);
    expect(parseExcludePatterns("")).toEqual([]);
    expect(parseExcludePatterns(undefined)).toEqual([]);
  });
});

describe("isExcluded", () => {
  it("bare name matches any segment", () => {
    expect(isExcluded("archive/foo.md", ["archive"])).toBe(true);
    expect(isExcluded("notes/archive/foo.md", ["archive"])).toBe(true);
    expect(isExcluded("archives.md", ["archive"])).toBe(false);
  });

  it("`*` glob matches within a single segment", () => {
    expect(isExcluded("foo.tmp", ["*.tmp"])).toBe(true);
    expect(isExcluded("notes/foo.tmp", ["*.tmp"])).toBe(false);
    expect(isExcluded("notes/foo.tmp", ["**/*.tmp"])).toBe(true);
  });

  it("`**` glob crosses directories", () => {
    expect(isExcluded("a/b/c/d.md", ["a/**/d.md"])).toBe(true);
    expect(isExcluded("private/notes/secret.md", ["private/**"])).toBe(true);
    expect(isExcluded("public/secret.md", ["private/**"])).toBe(false);
  });

  it("specific path glob", () => {
    expect(isExcluded("drafts/private.md", ["drafts/private.md"])).toBe(true);
    expect(isExcluded("drafts/other.md", ["drafts/private.md"])).toBe(false);
  });

  it("returns false on empty patterns", () => {
    expect(isExcluded("anything", [])).toBe(false);
  });

  it("multiple patterns: any match suffices", () => {
    const patterns = ["archive", "*.tmp", "private/**"];
    expect(isExcluded("notes.md", patterns)).toBe(false);
    expect(isExcluded("archive/x.md", patterns)).toBe(true);
    expect(isExcluded("x.tmp", patterns)).toBe(true);
    expect(isExcluded("private/secret.md", patterns)).toBe(true);
  });

  it("`?` glob matches exactly one non-slash character", () => {
    expect(isExcluded("ab.md", ["a?.md"])).toBe(true);
    expect(isExcluded("abc.md", ["a?.md"])).toBe(false);
  });

  it("bare-name shorthand also catches dot-folders like `.granite`", () => {
    expect(isExcluded(".granite/plugins/foo/main.js", [".granite"])).toBe(true);
    expect(isExcluded(".granite", [".granite"])).toBe(true);
  });
});

describe("filterExcluded", () => {
  it("drops excluded items via the path selector", () => {
    const items = [{ p: "a.md" }, { p: "archive/b.md" }, { p: "c.md" }];
    const filtered = filterExcluded(items, ["archive"], (i) => i.p);
    expect(filtered.map((x) => x.p)).toEqual(["a.md", "c.md"]);
  });

  it("returns a fresh array even when nothing is excluded", () => {
    const items = [{ p: "a.md" }];
    const filtered = filterExcluded(items, [], (i) => i.p);
    expect(filtered).toEqual(items);
    expect(filtered).not.toBe(items);
  });
});