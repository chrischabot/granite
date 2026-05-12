import { describe, expect, it } from "vitest";
import { aggregateTagCounts } from "./cache";

describe("aggregateTagCounts", () => {
  it("counts tags case-insensitively while preserving first display casing", () => {
    const counts = aggregateTagCounts([
      [{ name: "Work" }, { name: "work" }, { name: "Home" }],
      [{ name: "work" }, { name: "HOME" }],
    ]);

    expect(counts).toEqual([
      { name: "Home", count: 2 },
      { name: "Work", count: 2 },
    ]);
  });

  it("counts a tag once per file even when repeated", () => {
    expect(aggregateTagCounts([[{ name: "Project" }, { name: "project" }]])).toEqual([
      { name: "Project", count: 1 },
    ]);
  });
});
