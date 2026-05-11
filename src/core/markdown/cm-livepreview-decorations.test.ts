import { describe, it, expect } from "vitest";
import { computeLivePreviewRanges } from "./cm-livepreview-decorations";

function hiddenSlices(text: string, cursorLineIndex: number): string[] {
  const ranges = computeLivePreviewRanges(text, cursorLineIndex);
  return ranges.map((r) => text.slice(r.from, r.to));
}

describe("computeLivePreviewRanges", () => {
  it("hides ** around bold runs on non-cursor lines", () => {
    const text = "say **hello** there";
    const slices = hiddenSlices(text, -1);
    expect(slices).toEqual(["**", "**"]);
  });

  it("leaves the cursor's line raw", () => {
    const text = "first **a**\nsecond **b**";
    expect(hiddenSlices(text, 0)).toEqual(["**", "**"]); // only line 1 is decorated
    expect(hiddenSlices(text, 1)).toEqual(["**", "**"]); // only line 0 is decorated
  });

  it("hides == around highlight runs", () => {
    const slices = hiddenSlices("see ==important== now", -1);
    expect(slices).toEqual(["==", "=="]);
  });

  it("hides ~~ around strikethrough runs", () => {
    const slices = hiddenSlices("see ~~deleted~~ here", -1);
    expect(slices).toEqual(["~~", "~~"]);
  });

  it("hides _ around underscore-italic runs", () => {
    const slices = hiddenSlices("very _important_ text", -1);
    expect(slices).toEqual(["_", "_"]);
  });

  it("does not match underscores inside identifiers", () => {
    expect(hiddenSlices("foo_bar_baz", -1)).toEqual([]);
    expect(hiddenSlices("snake_case", -1)).toEqual([]);
  });

  it("hides underscore italic at word boundaries", () => {
    const slices = hiddenSlices("(_word_)", -1);
    expect(slices).toEqual(["_", "_"]);
  });

  it("skips formatting inside fenced code blocks", () => {
    const text = "```\n**not bold**\n```";
    expect(hiddenSlices(text, -1)).toEqual([]);
  });

  it("skips formatting inside inline-code spans", () => {
    const text = "`**not bold**`";
    expect(hiddenSlices(text, -1)).toEqual([]);
  });

  it("hides [[ and ]] for a plain wikilink", () => {
    const slices = hiddenSlices("see [[Note]] here", -1);
    expect(slices).toEqual(["[[", "]]"]);
  });

  it("hides Target| prefix for alias wikilinks", () => {
    const slices = hiddenSlices("see [[Note|alias]] here", -1);
    expect(slices).toEqual(["[[", "Note|", "]]"]);
  });

  it("hides the embed-prefix `![[` of an embed", () => {
    const slices = hiddenSlices("see ![[Image.png]] now", -1);
    expect(slices).toEqual(["![[", "]]"]);
  });

  it("returns ranges in ascending order", () => {
    const text = "**a** then [[Note|alias]] then **b**";
    const ranges = computeLivePreviewRanges(text, -1);
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i]!.from).toBeGreaterThanOrEqual(ranges[i - 1]!.from);
    }
  });

  it("respects multi-line documents — offsets account for newlines", () => {
    const text = "line one\n**bold** on line two";
    const ranges = computeLivePreviewRanges(text, -1);
    expect(ranges.length).toBe(2);
    expect(text.slice(ranges[0]!.from, ranges[0]!.to)).toBe("**");
    expect(text.slice(ranges[1]!.from, ranges[1]!.to)).toBe("**");
    expect(ranges[0]!.from).toBeGreaterThan(text.indexOf("\n"));
  });

  it("returns disjoint, non-overlapping ranges even for combined markup", () => {
    const text = "[[Target|alias]] mixed with **bold** here";
    const ranges = computeLivePreviewRanges(text, -1);
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i]!.from).toBeGreaterThanOrEqual(ranges[i - 1]!.to);
    }
  });
});