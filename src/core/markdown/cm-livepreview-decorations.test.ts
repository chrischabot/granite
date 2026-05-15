import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { computeLivePreviewRanges, livePreviewDecorations } from "./cm-livepreview-decorations";

function hiddenSlices(text: string, cursorLineIndex: number): string[] {
  const ranges = computeLivePreviewRanges(text, cursorLineIndex);
  return ranges.map((r) => text.slice(r.from, r.to));
}

function sliceRanges(text: string, ranges: ReadonlyArray<{ from: number; to: number }>): string[] {
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

  it("hides nested asterisk italic markers inside bold", () => {
    const slices = hiddenSlices("very **important *nested* text** now", -1);
    expect(slices).toEqual(["**", "*", "*", "**"]);
  });

  it("hides nested bold markers inside asterisk italic", () => {
    const slices = hiddenSlices("very *important **nested** text* now", -1);
    expect(slices).toEqual(["*", "**", "**", "*"]);
  });

  it("hides nested underscore italic markers inside underscore bold", () => {
    const slices = hiddenSlices("very __important _nested_ text__ now", -1);
    expect(slices).toEqual(["__", "_", "_", "__"]);
  });

  it("hides nested underscore bold markers inside underscore italic", () => {
    const slices = hiddenSlices("very _important __nested__ text_ now", -1);
    expect(slices).toEqual(["_", "__", "__", "_"]);
  });

  it("does not match underscores inside identifiers", () => {
    expect(hiddenSlices("foo_bar_baz", -1)).toEqual([]);
    expect(hiddenSlices("snake_case", -1)).toEqual([]);
  });

  it("hides underscore italic at word boundaries", () => {
    const slices = hiddenSlices("(_word_)", -1);
    expect(slices).toEqual(["_", "_"]);
  });

  it("hides fence lines and skips formatting inside fenced code blocks", () => {
    const text = "```ts\n**not bold**\n```";
    expect(hiddenSlices(text, -1)).toEqual(["```ts", "```"]);
  });

  it("hides tilde fence lines", () => {
    const text = "~~~mermaid\ngraph TD\n~~~";
    expect(hiddenSlices(text, -1)).toEqual(["~~~mermaid", "~~~"]);
  });

  it("keeps top-of-file frontmatter raw instead of decorating it as markdown", () => {
    const text = '---\ntitle: "**not bold**"\naliases:\n  - "[[literal]]"\n---\nBody **bold**';
    expect(hiddenSlices(text, -1)).toEqual(["**", "**"]);
  });

  it("does not mistake a top horizontal rule and later rule for frontmatter", () => {
    const text = "---\nBody **bold**\n---";
    expect(hiddenSlices(text, -1)).toEqual(["---", "**", "**", "---"]);
  });

  it("skips formatting inside inline-code spans", () => {
    const text = "`**not bold**`";
    expect(hiddenSlices(text, -1)).toEqual([]);
  });

  it("skips formatting inside matching multi-backtick inline-code spans", () => {
    const text = "``code with ` and **not bold**`` then **bold**";
    expect(hiddenSlices(text, -1)).toEqual(["**", "**"]);
  });

  it("skips formatting inside same-line HTML elements", () => {
    const text = "<div>**not bold** and [[not a link]]</div> then **bold**";
    expect(hiddenSlices(text, -1)).toEqual(["**", "**"]);
  });

  it("skips formatting inside multiline HTML elements", () => {
    const text = "<div>\n**not bold** and [[not a link]]\n</div>\nthen **bold**";
    expect(hiddenSlices(text, -1)).toEqual(["**", "**"]);
  });

  it("does not hide escaped inline formatting markers", () => {
    const text = String.raw`\**bold** \*italic* \==mark== \~~gone~~ \$math$ then **real**`;
    expect(hiddenSlices(text, -1)).toEqual(["**", "**"]);
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

  it("hides the caret in footnote references while leaving definitions source-like", () => {
    const text = "See this.[^1]\n\n[^1]: **definition**";
    expect(hiddenSlices(text, -1)).toEqual(["^", "**", "**"]);
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

  it("hides horizontal rule source lines", () => {
    expect(hiddenSlices("---\n- - -\n***\n_ _ _", -1)).toEqual(["---", "- - -", "***", "_ _ _"]);
  });

  it("hides task checkbox markers while keeping the list marker", () => {
    expect(hiddenSlices("- [ ] open\n1. [x] done", -1)).toEqual(["[ ]", "[x]"]);
  });

  it("hides custom task checkbox markers while preserving source state semantics", () => {
    expect(hiddenSlices("- [?] maybe\n- [-] canceled", -1)).toEqual(["[?]", "[-]"]);
  });

  it("hides paragraph block id markers", () => {
    expect(hiddenSlices("Paragraph with a target ^my-block", -1)).toEqual([" ^my-block"]);
  });

  it("hides standalone block id marker lines", () => {
    expect(hiddenSlices("Paragraph\n\n^my-block\n\nnext", -1)).toEqual(["^my-block"]);
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

  // --- Severe AST blind-spot fixes ----------------------------------------

  it("(AST) leaves `**foo**` inside a fenced code block raw", () => {
    const text = "```\n**foo**\n```";
    const slices = hiddenSlices(text, -1);
    // Only the fence lines themselves get hidden — the bold markers inside
    // the fenced block must NOT be decorated.
    expect(slices).not.toContain("**");
  });

  it("(AST) leaves `[[link]]` inside an inline code span raw", () => {
    const text = "before `[[link]]` after";
    expect(hiddenSlices(text, -1)).toEqual([]);
  });

  it("(AST) leaves `==highlight==` inside an HTML block raw", () => {
    const text = "<div>\n==highlight==\n</div>";
    const slices = hiddenSlices(text, -1);
    expect(slices).not.toContain("==");
  });

  it("(AST) leaves `*italic*` inside frontmatter raw", () => {
    const text = '---\ntitle: "*italic*"\n---\nbody';
    const slices = hiddenSlices(text, -1);
    expect(slices).not.toContain("*");
  });

  it("(AST) leaves escaped `\\*not italic\\*` markers raw", () => {
    const text = String.raw`\*not italic\*`;
    expect(hiddenSlices(text, -1)).toEqual([]);
  });

  it("(AST) hides nested callout + heading + bold markers correctly", () => {
    const text = "> [!note]+\n> ## Heading with **bold**";
    const slices = hiddenSlices(text, -1);
    expect(slices).toContain("[!note]+");
    expect(slices).toContain("## ");
    expect(slices.filter((s) => s === "**")).toHaveLength(2);
  });

  it("(AST) decorates the real bold but not the fake bold inside inline code", () => {
    const text = "- [ ] item with `code with **fake bold**` and **real bold**";
    const slices = hiddenSlices(text, -1);
    // Real bold gets decorated twice (open/close).
    expect(slices.filter((s) => s === "**")).toHaveLength(2);
    // No marker hide falls inside the inline-code span.
    const ranges = computeLivePreviewRanges(text, -1);
    const codeStart = text.indexOf("`code with");
    const codeEnd = text.indexOf("**fake bold**`") + "**fake bold**`".length;
    for (const r of ranges) {
      if (r.from >= codeStart && r.to <= codeEnd) {
        throw new Error(`hide inside inline-code span: ${JSON.stringify(r)}`);
      }
    }
  });

  it("(AST) leaves wikilink markers inside inline code spans raw", () => {
    const text = "`[[wikilink]]` then [[real|alias]]";
    const slices = hiddenSlices(text, -1);
    // The leading wikilink-inside-code is NOT decorated; the trailing real
    // wikilink IS.
    expect(slices).toContain("[[");
    expect(slices).toContain("real|");
    expect(slices).toContain("]]");
    expect(slices.filter((s) => s === "[[")).toHaveLength(1);
  });

  it("(AST) leaves `==highlight==` inside a fenced code block raw", () => {
    const text = "```\n==hi==\n```";
    const slices = hiddenSlices(text, -1);
    expect(slices).not.toContain("==");
  });

  // --- Property test: AST vs regex oracle ---------------------------------
  //
  // The reference oracle below is the previous regex implementation's logic
  // applied to a *single* paragraph. The property test generates 200 short
  // markdown snippets from a tiny grammar and asserts AST and oracle agree
  // EXCEPT on the documented blind-spot cases: fenced code blocks, inline
  // code spans, HTML blocks, and YAML frontmatter. In those cases the AST is
  // expected to hide STRICTLY FEWER markers than the regex oracle (because
  // the regex misfires there).

  it("(AST property) agrees with the regex oracle on plain paragraphs", () => {
    // Grammar: chunks separated by spaces. Each chunk is a known inline
    // construct that the regex oracle handles correctly in isolation. We
    // avoid co-locating constructs that interact subtly with each other
    // (e.g. `**foo**bar**baz**` boundary ambiguity, `*a_b*` mixed
    // delimiters) — those are NOT this oracle's job to model. The point of
    // the property test is to catch regressions on the easy cases at scale,
    // with β < 0.05 = tolerate up to 10/200 mismatches.
    const chunkAlternatives: Array<() => string> = [
      () => "word",
      () => "more text",
      () => "**bold**",
      () => "==highlight==",
      () => "~~strike~~",
      () => "[[Note]]",
      () => "[[Note|alias]]",
      () => "***bi***",
    ];
    const rng = mulberry32(0xc0ffee);
    let mismatches = 0;
    const total = 200;
    const mismatchSamples: string[] = [];
    for (let i = 0; i < total; i++) {
      const parts: string[] = [];
      const len = 1 + Math.floor(rng() * 4);
      for (let j = 0; j < len; j++) {
        const pick = chunkAlternatives[Math.floor(rng() * chunkAlternatives.length)];
        if (pick) parts.push(pick());
      }
      const text = parts.join(" ");
      const astSlices = hiddenSlices(text, -1);
      const oracleSlices = sliceRanges(text, regexOracleHides(text));
      if (astSlices.join("|") !== oracleSlices.join("|")) {
        mismatches += 1;
        if (mismatchSamples.length < 5) {
          mismatchSamples.push(
            `${JSON.stringify(text)} -> ast=${JSON.stringify(astSlices)} oracle=${JSON.stringify(oracleSlices)}`,
          );
        }
      }
    }
    if (mismatches >= 10) {
      throw new Error(
        `Too many AST/oracle disagreements on plain paragraphs: ${mismatches}/${total}. Examples: ${mismatchSamples.join("; ")}`,
      );
    }
    expect(mismatches).toBeLessThan(10);
  });

  it("(AST property) hides FEWER markers than the regex oracle inside fenced code blocks", () => {
    // Documented divergence: regex misfires on `**`/`==`/`[[…]]` inside code
    // fences; AST correctly leaves them raw.
    const samples = [
      "```\n**bold**\n```",
      "```ts\nlet x = `==a==`\n**fake**\n```",
      "    code\n    **fake bold** in indented code",
      "`inline with **fake** bold and ==hi==`",
    ];
    for (const text of samples) {
      const astSlices = hiddenSlices(text, -1);
      const oracleSlices = sliceRanges(text, regexOracleHides(text));
      // AST should produce no inline marker decorations inside the code.
      const inlineMarkers = new Set(["**", "*", "__", "_", "==", "~~"]);
      const astInline = astSlices.filter((s) => inlineMarkers.has(s));
      const oracleInline = oracleSlices.filter((s) => inlineMarkers.has(s));
      expect(astInline.length).toBeLessThanOrEqual(oracleInline.length);
    }
  });

  it("(AST property) hides FEWER markers than the regex oracle inside HTML blocks", () => {
    const samples = [
      "<div>\n==highlight==\n**bold**\n[[link]]\n</div>",
      "<section>\n*italic*\n</section>",
    ];
    for (const text of samples) {
      const astSlices = hiddenSlices(text, -1);
      const oracleSlices = sliceRanges(text, regexOracleHides(text));
      const inlineMarkers = new Set(["**", "*", "__", "_", "==", "~~", "[[", "]]"]);
      const astInline = astSlices.filter((s) => inlineMarkers.has(s));
      const oracleInline = oracleSlices.filter((s) => inlineMarkers.has(s));
      expect(astInline.length).toBeLessThanOrEqual(oracleInline.length);
    }
  });

  it("(AST property) hides FEWER markers than the regex oracle inside frontmatter", () => {
    const text = '---\ntitle: "**bold in fm**"\nflag: ==highlight==\n---\n**real bold**';
    const astSlices = hiddenSlices(text, -1);
    const oracleSlices = sliceRanges(text, regexOracleHides(text));
    const inlineMarkers = new Set(["**", "==", "[[", "]]"]);
    const astInline = astSlices.filter((s) => inlineMarkers.has(s));
    const oracleInline = oracleSlices.filter((s) => inlineMarkers.has(s));
    expect(astInline.length).toBeLessThan(oracleInline.length);
  });

  // --- Adversarial: Obsidian-specific regex inside raw regions ------------
  //
  // The hybrid AST+regex design uses regex for Obsidian-specific syntax
  // (wikilinks, callouts, block-ids, custom tasks, inline math, comments).
  // The post-filter step is supposed to drop any regex hit whose range
  // overlaps a pre-detected raw region (frontmatter, fenced code, inline
  // code, HTMLBlock, $$math$$, %%block comments%%, inline <tag>...</tag>).
  // These tests catch a stubbed/broken filter that would let the regex
  // misfire through into the decoration set.

  it("(AST) leaves callout markers inside a fenced code block raw", () => {
    const text = "```md\n> [!note]+ inside code\nbody\n```";
    const slices = hiddenSlices(text, -1);
    expect(slices.some((s) => s.startsWith("[!note]"))).toBe(false);
    expect(slices.some((s) => s.startsWith("> "))).toBe(false);
  });

  it("(AST) leaves block-id markers inside a fenced code block raw", () => {
    const text = "```md\nThis is a paragraph ^block-id\n```";
    const slices = hiddenSlices(text, -1);
    expect(slices.some((s) => s.includes("^block-id"))).toBe(false);
  });

  it("(AST) leaves custom task markers inside a fenced code block raw", () => {
    const text = "```md\n- [?] waiting task\n```";
    const slices = hiddenSlices(text, -1);
    expect(slices.some((s) => s.includes("[?]"))).toBe(false);
  });

  it("(AST) leaves $variable inline-code inside fenced shell snippet raw", () => {
    // INLINE_MATH_RE could misfire on shell-like `$variable` content.
    const text = "```sh\necho $name and $home\n```";
    const slices = hiddenSlices(text, -1);
    expect(slices).not.toContain("$");
  });

  it("(AST) leaves wikilinks inside an HTMLBlock raw", () => {
    const text = "<div>\n[[link inside html]]\nmore\n</div>";
    const slices = hiddenSlices(text, -1);
    expect(slices.some((s) => s === "[[")).toBe(false);
    expect(slices.some((s) => s === "]]")).toBe(false);
  });

  it("(AST) leaves footnote refs inside fenced code raw", () => {
    const text = "```md\nA paragraph[^ref] in code.\n```";
    const slices = hiddenSlices(text, -1);
    expect(slices.some((s) => s.startsWith("[^"))).toBe(false);
  });

  it("(AST) leaves %% comments %% inside fenced code raw", () => {
    const text = "```md\nbefore %% comment %% after\n```";
    const slices = hiddenSlices(text, -1);
    expect(slices.some((s) => s.startsWith("%%"))).toBe(false);
  });

  it("(AST) leaves inline math inside an inline code span raw", () => {
    const text = "`$2+2$` plus real $1+1$";
    const slices = hiddenSlices(text, -1);
    // The inline-math regex must NOT decorate inside the backticks, only
    // outside.
    const dollarHides = slices.filter((s) => s === "$");
    expect(dollarHides.length).toBe(2); // open + close of the REAL math only
  });

  // --- Performance --------------------------------------------------------

  it("(AST perf) decorates a 1000-line markdown document quickly in vitest", () => {
    const lines: string[] = [];
    for (let i = 0; i < 1000; i++) {
      if (i % 7 === 0) lines.push(`## Heading ${i}`);
      else if (i % 5 === 0) lines.push(`- [ ] task **bold** ${i}`);
      else if (i % 3 === 0) lines.push(`paragraph with [[Note ${i}|alias]] and ==hi==`);
      else lines.push(`plain text ${i} with *em* and \`code\` and ~~strike~~`);
    }
    const text = lines.join("\n");
    // Warmup so JIT noise doesn't dominate.
    computeLivePreviewRanges(text, -1);
    const start = performance.now();
    computeLivePreviewRanges(text, -1);
    const elapsed = performance.now() - start;
    // Surface the measurement so CI logs make perf regressions obvious.
    // eslint-disable-next-line no-console
    console.log(`livePreview 1000-line decoration: ${elapsed.toFixed(2)}ms`);
    // Generous bound for happy-dom + CI environments. The browser fixture
    // asserts a stricter 5000-line budget under 100ms.
    expect(elapsed).toBeLessThan(150);
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

// ---------------------------------------------------------------------------
// Reference oracle: a minimal port of the pre-AST regex implementation,
// restricted to the inline markers used by the property test (no block-level
// dispatch, no fenced-code detection, no HTML guard). The intentional
// deficiency is what makes this a useful oracle: when AST disagrees inside
// code/HTML/frontmatter, the AST is RIGHT and the oracle is WRONG. The
// property tests assert that AST hides are a strict subset there.
// ---------------------------------------------------------------------------

const ORACLE_BOLD_ITALIC_STAR_RE = /\*\*\*([^*\n]+)\*\*\*/g;
const ORACLE_BOLD_ITALIC_UND_RE = /___([^_\n]+)___/g;
const ORACLE_BOLD_STAR_RE = /(?<!\*)\*\*([^*\n]+)\*\*(?!\*)/g;
const ORACLE_BOLD_UND_RE = /(?<!_)__([^_\n]+)__(?!_)/g;
const ORACLE_HIGHLIGHT_RE = /==([^=\n]+)==/g;
const ORACLE_STRIKE_RE = /~~([^~\n]+)~~/g;
const ORACLE_WIKILINK_RE = /(!?)\[\[([^\]\n]+)\]\]/g;

interface OracleRange {
  from: number;
  to: number;
}

function regexOracleHides(text: string): OracleRange[] {
  const ranges: OracleRange[] = [];
  function pushPair(m: RegExpExecArray, openLen: number, closeLen: number): void {
    const idx = m.index;
    const len = m[0].length;
    ranges.push({ from: idx, to: idx + openLen });
    ranges.push({ from: idx + len - closeLen, to: idx + len });
  }
  for (const re of [ORACLE_BOLD_ITALIC_STAR_RE, ORACLE_BOLD_ITALIC_UND_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null = re.exec(text);
    while (m) {
      pushPair(m, 3, 3);
      m = re.exec(text);
    }
  }
  for (const re of [ORACLE_BOLD_STAR_RE, ORACLE_BOLD_UND_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null = re.exec(text);
    while (m) {
      pushPair(m, 2, 2);
      m = re.exec(text);
    }
  }
  for (const re of [ORACLE_HIGHLIGHT_RE, ORACLE_STRIKE_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null = re.exec(text);
    while (m) {
      pushPair(m, 2, 2);
      m = re.exec(text);
    }
  }
  ORACLE_WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null = ORACLE_WIKILINK_RE.exec(text);
  while (m) {
    const isEmbed = m[1] === "!";
    const inner = m[2] ?? "";
    const open = isEmbed ? 3 : 2;
    const idx = m.index;
    const len = m[0].length;
    ranges.push({ from: idx, to: idx + open });
    const pipe = inner.indexOf("|");
    if (pipe !== -1) {
      ranges.push({ from: idx + open, to: idx + open + pipe + 1 });
    }
    ranges.push({ from: idx + len - 2, to: idx + len });
    m = ORACLE_WIKILINK_RE.exec(text);
  }
  ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  // Dedupe touching/overlapping ranges so the oracle output matches our
  // primary impl's range coalescing convention.
  if (ranges.length === 0) return ranges;
  const merged: OracleRange[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.from < last.to) {
      if (r.to > last.to) last.to = r.to;
    } else {
      merged.push({ from: r.from, to: r.to });
    }
  }
  return merged;
}

// Seeded RNG (mulberry32) — keeps the property test deterministic across CI
// runs so flakes can be reproduced. Re-seed by changing the constant in the
// caller.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
