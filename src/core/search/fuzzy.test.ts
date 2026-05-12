import { describe, expect, it } from "vitest";
import { createFuzzyIndex, fuzzyRank, highlightMatches, rankFuzzyIndex } from "./fuzzy";

describe("fuzzyRank", () => {
  const items = ["Save current file", "Open quick switcher", "Insert template"];

  it("matches a literal substring", () => {
    const ranked = fuzzyRank(items, "open quick", (s) => s);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]?.item).toBe("Open quick switcher");
  });

  it("matches an acronym (subsequence)", () => {
    const ranked = fuzzyRank(items, "scf", (s) => s);
    expect(ranked.length).toBeGreaterThan(0);
    // First match should be "Save current file" — the acronym's source.
    expect(ranked[0]?.item).toBe("Save current file");
  });

  it("returns matched character indices", () => {
    const ranked = fuzzyRank(items, "open", (s) => s);
    const r = ranked[0];
    expect(r).toBeTruthy();
    expect(r?.indices.length).toBeGreaterThan(0);
  });

  it("can reuse a 10k-item index within the quick-switcher keystroke budget", () => {
    const items = Array.from({ length: 10_000 }, (_, i) => ({
      title: `Project Note ${i}${i % 10 === 0 ? " calendar" : ""}`,
    }));
    const index = createFuzzyIndex(items, (item) => item.title);
    rankFuzzyIndex(index, "calendar");

    const start = performance.now();
    const results = rankFuzzyIndex(index, "calendar");
    const elapsed = performance.now() - start;

    expect(results).toHaveLength(100);
    expect(results[0]?.item.title).toContain("calendar");
    expect(elapsed).toBeLessThan(16);
  });
});

describe("highlightMatches", () => {
  it("partitions text into matched/unmatched runs", () => {
    const segs = highlightMatches("hello", [0, 1]);
    expect(segs).toEqual([
      { text: "he", matched: true },
      { text: "llo", matched: false },
    ]);
  });

  it("handles no matches", () => {
    const segs = highlightMatches("abc", []);
    expect(segs).toEqual([{ text: "abc", matched: false }]);
  });
});
