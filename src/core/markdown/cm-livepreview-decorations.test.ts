import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { computeLivePreviewRanges, livePreviewDecorations } from "./cm-livepreview-decorations";

function hiddenSlices(text: string, cursorLineIndex: number): string[] {
  const ranges = computeLivePreviewRanges(text, cursorLineIndex);
  return ranges.map((r) => text.slice(r.from, r.to));
}

function rangeAt(
  ranges: ReadonlyArray<{ from: number; to: number }>,
  index: number,
): { from: number; to: number } {
  const range = ranges[index];
  expect(range).toBeDefined();
  if (!range) throw new Error(`Missing range ${index}`);
  return range;
}

describe("computeLivePreviewRanges", () => {
  it("hides ** around bold runs on non-cursor lines", () => {
    const text = "say **hello** there";
    const slices = hiddenSlices(text, -1);
    expect(slices).toEqual(["**", "**"]);
  });

  it("hides __ around underscore-bold runs on non-cursor lines", () => {
    const text = "say __hello__ there";
    const slices = hiddenSlices(text, -1);
    expect(slices).toEqual(["__", "__"]);
  });

  it("hides *** around bold-italic star runs", () => {
    const slices = hiddenSlices("say ***hello*** there", -1);
    expect(slices).toEqual(["***", "***"]);
  });

  it("hides ___ around bold-italic underscore runs", () => {
    const slices = hiddenSlices("say ___hello___ there", -1);
    expect(slices).toEqual(["___", "___"]);
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

  it("hides * around asterisk-italic runs", () => {
    const slices = hiddenSlices("very *important* text", -1);
    expect(slices).toEqual(["*", "*"]);
  });

  it("does not treat bold markers as asterisk italic", () => {
    const slices = hiddenSlices("very **important** text", -1);
    expect(slices).toEqual(["**", "**"]);
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

  it("hides markdown-link chrome and URL while keeping label text visible", () => {
    const slices = hiddenSlices("see [label](folder/note.md) now", -1);
    expect(slices).toEqual(["[", "](folder/note.md)"]);
  });

  it("hides markdown-image chrome and URL while keeping alt text visible", () => {
    const slices = hiddenSlices("see ![alt](image.png) now", -1);
    expect(slices).toEqual(["![", "](image.png)"]);
  });

  it("hides Obsidian comment delimiters", () => {
    const slices = hiddenSlices("keep %%private%% visible", -1);
    expect(slices).toEqual(["%%", "%%"]);
  });

  it("hides block comment delimiters without decorating inside the comment", () => {
    const text = "%%\n**private**\n%%\n**public**";
    expect(hiddenSlices(text, -1)).toEqual(["%%", "%%", "**", "**"]);
  });

  it("hides multiline comment delimiters when they share lines with content", () => {
    const text = "before %% hidden\n**private**\nend %% after\n**public**";
    expect(hiddenSlices(text, -1)).toEqual(["%%", "%%", "**", "**"]);
  });

  it("hides inline math delimiters", () => {
    const slices = hiddenSlices("Euler $e^{i\\pi}+1=0$ identity", -1);
    expect(slices).toEqual(["$", "$"]);
  });

  it("hides block math delimiters without decorating inside the math block", () => {
    const text = "$$\n**not markdown**\n$$\n**markdown**";
    expect(hiddenSlices(text, -1)).toEqual(["$$", "$$", "**", "**"]);
  });

  it("hides callout type and fold marker while keeping title text", () => {
    const slices = hiddenSlices("> [!warning]+ Careful", -1);
    expect(slices).toEqual(["[!warning]+"]);
  });

  it("hides heading markers on non-cursor lines", () => {
    expect(hiddenSlices("### Heading", -1)).toEqual(["### "]);
  });

  it("hides task checkbox markers while keeping the list marker", () => {
    expect(hiddenSlices("- [ ] open\n1. [x] done", -1)).toEqual(["[ ]", "[x]"]);
  });

  it("hides GFM table pipes and separator rows", () => {
    const text = "| A | B |\n| -- | :--: |\n| **x** | y \\| z |";
    expect(hiddenSlices(text, -1)).toEqual([
      "|",
      "|",
      "|",
      "| -- | :--: |",
      "|",
      "**",
      "**",
      "|",
      "|",
    ]);
  });

  it("leaves table markers raw on the cursor line", () => {
    const text = "| A | B |\n| -- | -- |\n| x | y |";
    expect(hiddenSlices(text, 1)).toEqual(["|", "|", "|", "|", "|", "|"]);
  });

  it("returns ranges in ascending order", () => {
    const text = "**a** then [[Note|alias]] then **b**";
    const ranges = computeLivePreviewRanges(text, -1);
    for (let i = 1; i < ranges.length; i++) {
      expect(rangeAt(ranges, i).from).toBeGreaterThanOrEqual(rangeAt(ranges, i - 1).from);
    }
  });

  it("respects multi-line documents — offsets account for newlines", () => {
    const text = "line one\n**bold** on line two";
    const ranges = computeLivePreviewRanges(text, -1);
    expect(ranges.length).toBe(2);
    const first = rangeAt(ranges, 0);
    const second = rangeAt(ranges, 1);
    expect(text.slice(first.from, first.to)).toBe("**");
    expect(text.slice(second.from, second.to)).toBe("**");
    expect(first.from).toBeGreaterThan(text.indexOf("\n"));
  });

  it("returns disjoint, non-overlapping ranges even for combined markup", () => {
    const text = "[[Target|alias]] mixed with **bold** here";
    const ranges = computeLivePreviewRanges(text, -1);
    for (let i = 1; i < ranges.length; i++) {
      expect(rangeAt(ranges, i).from).toBeGreaterThanOrEqual(rangeAt(ranges, i - 1).to);
    }
  });

  it("renders replacement decorations in CodeMirror while keeping the cursor line raw", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const doc =
      "cursor **raw**\nrender **hidden** and [[Target|alias]]\n| A | B |\n| -- | -- |\n| **x** | y |\n> [!warning]+ Careful";
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc,
        selection: { anchor: doc.indexOf("raw") },
        extensions: [livePreviewDecorations],
      }),
    });

    try {
      const text = view.dom.textContent ?? "";
      expect(text).toContain("cursor **raw**");
      expect(text).toContain("render hidden and alias");
      expect(text).toContain("Careful");
      expect(text).not.toContain("**hidden**");
      expect(text).not.toContain("[[Target|alias]]");
      expect(text).not.toContain("| -- | -- |");
      expect(text).not.toContain("[!warning]+");
    } finally {
      view.destroy();
      parent.remove();
    }
  });
});
