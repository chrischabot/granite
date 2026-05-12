import { describe, expect, it } from "vitest";
import { normalizeFoldRanges } from "./folds";

describe("normalizeFoldRanges", () => {
  it("keeps valid ranges in document order", () => {
    expect(
      normalizeFoldRanges(
        [
          { from: 12, to: 18 },
          { from: 2, to: 8 },
        ],
        20,
      ),
    ).toEqual([
      { from: 2, to: 8 },
      { from: 12, to: 18 },
    ]);
  });

  it("drops invalid or out-of-document ranges", () => {
    expect(
      normalizeFoldRanges(
        [
          { from: -1, to: 3 },
          { from: 3, to: 3 },
          { from: 9, to: 12 },
          { from: 2.5, to: 5 },
          { from: 1, to: 4 },
        ],
        10,
      ),
    ).toEqual([{ from: 1, to: 4 }]);
  });

  it("deduplicates identical ranges", () => {
    expect(
      normalizeFoldRanges(
        [
          { from: 1, to: 4 },
          { from: 1, to: 4 },
          { from: 2, to: 5 },
        ],
        10,
      ),
    ).toEqual([
      { from: 1, to: 4 },
      { from: 2, to: 5 },
    ]);
  });
});
