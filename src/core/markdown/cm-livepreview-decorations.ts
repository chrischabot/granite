import { type EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { parseWikilink } from "@core/markdown/renderer";
import type { SyntaxNodeRef } from "@lezer/common";
import { GFM, parser as baseMarkdownParser } from "@lezer/markdown";
import yaml from "js-yaml";

/**
 * Live Preview marker hiding.
 *
 * The implementation uses two layers:
 *
 * 1. The Lezer markdown AST (via `@lezer/markdown` `parser.configure([GFM])`).
 *    The AST is the authority for *block structure*: fenced/indented code
 *    blocks, inline code spans, HTML blocks, headings, lists, tables,
 *    blockquotes, emphasis runs, strikethrough, links, and images. Walking the
 *    tree lets us hide these markers without misfiring inside code blocks,
 *    HTML, or escaped sequences.
 *
 * 2. A regex pass for *Obsidian-specific* syntax that vanilla CommonMark/GFM
 *    has no concept of: YAML frontmatter, callouts (`> [!type]+`), wikilinks
 *    (`[[…]]`), embeds (`![[…]]`), highlights (`==…==`), Obsidian comments
 *    (`%%…%%`), inline math (`$…$`), block math (`$$ … $$`), footnote refs
 *    (`[^id]`), block IDs (`^id`), and Obsidian's custom task markers
 *    (`[?]`/`[-]`/etc.).
 *
 * Raw regions (code blocks, HTML, frontmatter, block math, block comments,
 * inline code spans, inline HTML elements) are computed first. The AST pass
 * and the regex pass both filter their outputs against the raw regions, so
 * markers inside protected ranges are *never* decorated.
 */

// Markdown parser configured with GFM extensions (matches the editor's
// `markdownLanguage` for the block constructs that matter to us).
const markdownTreeParser = baseMarkdownParser.configure([GFM]);

const replaceDeco = Decoration.replace({});

// --- Regex constants -------------------------------------------------------

const WIKILINK_RE = /(!?)\[\[([^\]\n]+)\]\]/g;
const HIGHLIGHT_RE = /==([^=\n]+)==/g;
const COMMENT_INLINE_RE = /%%([^%\n]+)%%/g;
const INLINE_MATH_RE = /(?<!\$)\$([^$\n]+)\$(?!\$)/g;
const FOOTNOTE_REF_RE = /\[\^([^\]\n]+)\](?!:)/g;
const BLOCK_ID_RE = /(^|\s)\^([A-Za-z0-9-]+)\s*$/;
const CALLOUT_RE = /^(\s*>+\s*)\[!([^\]\n]+)\]([+-])?/;
const CUSTOM_TASK_RE = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([^\]\n])\](\s+)/;
const INLINE_HTML_ELEMENT_RE = /<([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?>[^<]*?<\/\1>/g;

// --- Range helpers ---------------------------------------------------------

interface Range {
  from: number;
  to: number;
}

function rangesOverlap(ranges: ReadonlyArray<Range>, from: number, to: number): boolean {
  for (const r of ranges) {
    if (from < r.to && to > r.from) return true;
  }
  return false;
}

function rangesContain(ranges: ReadonlyArray<Range>, from: number, to: number): boolean {
  for (const r of ranges) {
    if (from >= r.from && to <= r.to) return true;
  }
  return false;
}

function mergeOverlapping(ranges: ReadonlyArray<Range>): Range[] {
  if (ranges.length === 0) return [];
  const sorted = ranges.slice().sort((a, b) => a.from - b.from || a.to - b.to);
  const first = sorted[0];
  if (!first) return [];
  const merged: Range[] = [{ from: first.from, to: first.to }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (!last || !curr) continue;
    if (curr.from < last.to) {
      if (curr.to > last.to) last.to = curr.to;
    } else {
      merged.push({ from: curr.from, to: curr.to });
    }
  }
  return merged;
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) slashCount += 1;
  return slashCount % 2 === 1;
}

// --- Document line index helpers -------------------------------------------

function buildLineStarts(text: string): number[] {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) starts.push(i + 1);
  }
  return starts;
}

function offsetLineIndex(offset: number, lineStartByIndex: ReadonlyArray<number>): number {
  let lo = 0;
  let hi = lineStartByIndex.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    const start = lineStartByIndex[mid] ?? 0;
    if (start <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function lineEndOfLine(
  lineIdx: number,
  lineStartByIndex: ReadonlyArray<number>,
  textLen: number,
): number {
  if (lineIdx + 1 < lineStartByIndex.length) {
    return (lineStartByIndex[lineIdx + 1] as number) - 1;
  }
  return textLen;
}

// --- Frontmatter -----------------------------------------------------------

/**
 * Returns the document range covered by a top-of-file YAML frontmatter block,
 * or null when the document does not open with one. Lezer's stock markdown
 * grammar does not parse frontmatter; we treat the whole block as raw so
 * inline markup inside metadata is left untouched.
 */
function frontmatterRange(text: string): Range | null {
  if (!text.startsWith("---")) return null;
  const firstNl = text.indexOf("\n");
  if (firstNl === -1) return null;
  if (text.slice(0, firstNl).replace(/\r$/, "").trim() !== "---") return null;
  let searchFrom = firstNl + 1;
  while (searchFrom < text.length) {
    const nextNl = text.indexOf("\n", searchFrom);
    const lineEnd = nextNl === -1 ? text.length : nextNl;
    const line = text.slice(searchFrom, lineEnd);
    if (line.replace(/\r$/, "").trim() === "---") {
      const body = text.slice(firstNl + 1, searchFrom);
      try {
        const parsed = yaml.load(body);
        if (parsed === undefined || (typeof parsed === "object" && !Array.isArray(parsed))) {
          return { from: 0, to: lineEnd };
        }
      } catch {
        return null;
      }
      return null;
    }
    if (nextNl === -1) break;
    searchFrom = nextNl + 1;
  }
  return null;
}

// --- Block-level Obsidian regions (math `$$`, comments `%%`) ---------------

interface ObsidianBlockScan {
  /** Ranges fully covering `$$ … $$` or `%%`-fenced blocks (raw inside). */
  blockRaw: Range[];
  /** Hide ranges for the surrounding `$$` / `%%` fence markers. */
  fenceHides: Range[];
}

function scanObsidianBlocks(
  text: string,
  cursorLineIndex: number,
  lineStartByIndex: ReadonlyArray<number>,
): ObsidianBlockScan {
  const blockRaw: Range[] = [];
  const fenceHides: Range[] = [];

  // `$$ … $$` block math. Only lines containing exactly `$$` toggle the block.
  scanFencedBlock(text, lineStartByIndex, cursorLineIndex, "$$", true, blockRaw, fenceHides);
  // `%% … %%` block comment. The block opens with a `%%` that has no matching
  // closing `%%` on the same line, and closes with the next line containing
  // `%%`.
  scanFencedBlock(text, lineStartByIndex, cursorLineIndex, "%%", false, blockRaw, fenceHides);

  return { blockRaw, fenceHides };
}

function scanFencedBlock(
  text: string,
  lineStartByIndex: ReadonlyArray<number>,
  cursorLineIndex: number,
  marker: string,
  requireWholeLine: boolean,
  blockRaw: Range[],
  fenceHides: Range[],
): void {
  const markerLen = marker.length;
  let inBlock = false;
  let blockStartOffset = -1;
  for (let lineIdx = 0; lineIdx < lineStartByIndex.length; lineIdx++) {
    const ls = lineStartByIndex[lineIdx];
    if (ls === undefined) continue;
    const le = lineEndOfLine(lineIdx, lineStartByIndex, text.length);
    const line = text.slice(ls, le);

    if (requireWholeLine) {
      if (line.trim() !== marker) continue;
      const idx = line.indexOf(marker);
      if (idx === -1) continue;
      if (!inBlock) {
        inBlock = true;
        blockStartOffset = ls + idx;
        if (lineIdx !== cursorLineIndex) {
          fenceHides.push({ from: ls + idx, to: ls + idx + markerLen });
        }
      } else {
        // close
        if (lineIdx !== cursorLineIndex) {
          fenceHides.push({ from: ls + idx, to: ls + idx + markerLen });
        }
        blockRaw.push({ from: blockStartOffset + markerLen, to: ls + idx });
        inBlock = false;
        blockStartOffset = -1;
      }
    } else {
      // Single-line `%%…%%` runs are NOT block-mode; they're handled by the
      // inline comment regex. We only enter block mode for an opening `%%`
      // that has no matching `%%` later on the same line.
      const first = line.indexOf(marker);
      if (first === -1) continue;
      if (!inBlock) {
        const second = line.indexOf(marker, first + markerLen);
        if (second !== -1) continue; // single-line — handled inline.
        inBlock = true;
        blockStartOffset = ls + first;
        if (lineIdx !== cursorLineIndex) {
          fenceHides.push({ from: ls + first, to: ls + first + markerLen });
        }
      } else {
        // close: the FIRST `%%` on the line closes the block.
        if (lineIdx !== cursorLineIndex) {
          fenceHides.push({ from: ls + first, to: ls + first + markerLen });
        }
        blockRaw.push({ from: blockStartOffset + markerLen, to: ls + first });
        inBlock = false;
        blockStartOffset = -1;
      }
    }
  }
  // If a block was opened but never closed, treat the rest of the document
  // as raw too — keeps unfinished `%%` from leaking decorations.
  if (inBlock && blockStartOffset >= 0) {
    blockRaw.push({ from: blockStartOffset + markerLen, to: text.length });
  }
}

// --- AST scan: code/HTML raw regions + standard marker hides ---------------

interface AstScan {
  rawRegions: Range[];
  /** Spans covered by Obsidian-specific constructs (wikilinks, embeds, custom
   *  task markers, callout `[!type]`, footnote refs) — used to suppress AST
   *  Link/Image chrome decorations there. */
  obsidianOverrides: Range[];
  hides: Range[];
}

function scanTree(
  text: string,
  cursorLineIndex: number,
  frontmatter: Range | null,
  blockRaw: ReadonlyArray<Range>,
  lineStartByIndex: ReadonlyArray<number>,
): AstScan {
  const rawRegions: Range[] = [];
  const obsidianOverrides: Range[] = [];
  const hides: Range[] = [];

  if (frontmatter) rawRegions.push({ from: frontmatter.from, to: frontmatter.to });
  for (const r of blockRaw) rawRegions.push({ from: r.from, to: r.to });

  collectObsidianOverrides(text, lineStartByIndex, obsidianOverrides);

  const isInsideRaw = (from: number, to: number): boolean => {
    if (frontmatter && from >= frontmatter.from && to <= frontmatter.to) return true;
    for (const r of blockRaw) {
      if (from >= r.from && to <= r.to) return true;
    }
    return false;
  };

  const lineOfPos = (pos: number): number => offsetLineIndex(pos, lineStartByIndex);
  const isOnCursorLine = (from: number, to: number): boolean => {
    const startLine = lineOfPos(from);
    const endLine = lineOfPos(Math.max(from, to - 1));
    return cursorLineIndex >= startLine && cursorLineIndex <= endLine;
  };

  const tree = markdownTreeParser.parse(text);
  tree.iterate({
    enter(node: SyntaxNodeRef): boolean | undefined {
      const name = node.type.name;
      const { from, to } = node;

      // Top-level Document — descend.
      if (name === "Document") return;

      // Anything completely inside a pre-detected raw region: ignore.
      if (isInsideRaw(from, to)) return false;

      switch (name) {
        case "FencedCode":
        case "CodeBlock": {
          rawRegions.push({ from, to });
          if (isOnCursorLine(from, to)) return false;
          if (name === "FencedCode") {
            // Hide the open fence line and the close fence line. The fence
            // marks are the first and last `CodeMark` children; the opener
            // optionally has a `CodeInfo` for the language tag.
            const linkNode = node.node;
            const marks: { from: number; to: number; name: string }[] = [];
            for (let c = linkNode.firstChild; c; c = c.nextSibling) {
              if (c.type.name === "CodeMark" || c.type.name === "CodeInfo") {
                marks.push({ from: c.from, to: c.to, name: c.type.name });
              }
            }
            const opener = marks.find((mk) => mk.name === "CodeMark");
            const codeInfo = marks.find((mk) => mk.name === "CodeInfo");
            const closer = marks
              .slice()
              .reverse()
              .find((mk) => mk.name === "CodeMark");
            if (opener && opener.from >= 0) {
              const openLine = lineOfPos(opener.from);
              if (openLine !== cursorLineIndex) {
                const end = codeInfo ? Math.max(opener.to, codeInfo.to) : opener.to;
                hides.push({ from: opener.from, to: end });
              }
            }
            if (closer && opener && closer.from !== opener.from) {
              const closeLine = lineOfPos(closer.from);
              if (closeLine !== cursorLineIndex) {
                hides.push({ from: closer.from, to: closer.to });
              }
            }
          }
          return false;
        }
        case "InlineCode": {
          rawRegions.push({ from, to });
          return false;
        }
        case "HTMLBlock": {
          // Lezer's HTMLBlock greedily includes anything after a `<tag>` until
          // the paragraph ends — including content that follows `</tag>` on
          // the same or later lines. Narrow the raw region to the actual
          // `<tag>…</tag>` span (or the whole block when no closer is found).
          const span = matchedHtmlSpan(text, from, to);
          if (span) {
            rawRegions.push({ from: span.from, to: span.to });
            // Re-parse the leftover text on either side of the span so that
            // markers like trailing `**bold**` still get decorated. The AST
            // walker has already returned `false` for descent here, so we
            // queue secondary parses below.
            reparseInline(text, from, span.from, cursorLineIndex, rawRegions, hides);
            reparseInline(text, span.to, to, cursorLineIndex, rawRegions, hides);
          } else {
            rawRegions.push({ from, to });
          }
          return false;
        }
        case "LinkReference": {
          // `[^foo]: definition…` — Lezer wraps the definition body in URL.
          // Per the existing test, footnote definition lines stay source-like
          // (the `^` is NOT hidden); we just re-parse the post-colon content
          // as inline so emphasis inside the definition still gets decorated.
          const slice = text.slice(from, to);
          const footnoteHead = slice.match(/^\[\^([^\]\n]+)\]:/);
          if (footnoteHead) {
            const colonPos = from + footnoteHead[0].length;
            reparseInline(text, colonPos, to, cursorLineIndex, rawRegions, hides);
            return false;
          }
          return false;
        }
        case "HorizontalRule": {
          if (!isOnCursorLine(from, to)) hides.push({ from, to });
          return false;
        }
        case "Blockquote": {
          // Hide the leading `>` (plus following space) on each line of a
          // blockquote when the cursor is not on that line. Descend so that
          // callout headers, inline marks, and nested children inside the
          // quote still get processed.
          const startLine = lineOfPos(from);
          const endLine = lineOfPos(Math.max(from, to - 1));
          for (let n = startLine; n <= endLine; n++) {
            if (n === cursorLineIndex) continue;
            const lineFrom = lineStartByIndex[n] ?? 0;
            const lineToNext = lineStartByIndex[n + 1];
            const lineEnd = lineToNext != null ? lineToNext - 1 /* trim newline */ : text.length;
            const lineText = text.slice(lineFrom, lineEnd);
            const m = /^\s*(?:>\s*)+/.exec(lineText);
            if (m && m[0].length > 0) {
              hides.push({ from: lineFrom, to: lineFrom + m[0].length });
            }
          }
          return;
        }
        case "ATXHeading1":
        case "ATXHeading2":
        case "ATXHeading3":
        case "ATXHeading4":
        case "ATXHeading5":
        case "ATXHeading6": {
          if (isOnCursorLine(from, to)) return;
          const child = node.node.firstChild;
          if (child && child.type.name === "HeaderMark") {
            let end = child.to;
            while (end < text.length && (text[end] === " " || text[end] === "\t")) end += 1;
            hides.push({ from: child.from, to: end });
          }
          return;
        }
        case "SetextHeading1":
        case "SetextHeading2": {
          // Setext headings end with an underline (`===` or `---`). Hide the
          // underline line via the trailing HeaderMark; let inline emphasis
          // in the title still decorate by descending.
          if (isOnCursorLine(from, to)) return;
          const headingNode = node.node;
          for (let c = headingNode.firstChild; c; c = c.nextSibling) {
            if (c.type.name === "HeaderMark") {
              hides.push({ from: c.from, to: c.to });
            }
          }
          return;
        }
        case "Emphasis":
        case "StrongEmphasis": {
          if (isOnCursorLine(from, to)) return;
          // Skip emphasis runs whose opening mark sits immediately after a
          // markdown Escape (`\*foo*`, `\__foo__`, etc.). Obsidian renders
          // these as literal text and the existing test suite expects no
          // hides for them.
          const prev = node.node.prevSibling;
          if (prev && prev.type.name === "Escape" && prev.to === from) {
            const escChar = text[prev.to - 1];
            const markChar = text[from];
            if (escChar !== undefined && escChar === markChar) {
              return false;
            }
          }
          if (name === "StrongEmphasis") return; // descend for inner emphasis.
          // Combined `***triple***` / `___triple___` runs: Lezer parses these
          // as Emphasis whose first child is a 1-char EmphasisMark touching a
          // nested StrongEmphasis with 2-char EmphasisMarks. Emit one merged
          // hide for each end so the visible decoration is a single `***`.
          const en = node.node;
          const first = en.firstChild;
          const last = en.lastChild;
          if (
            first &&
            last &&
            first.type.name === "EmphasisMark" &&
            last.type.name === "EmphasisMark"
          ) {
            const strong = first.nextSibling;
            if (strong && strong.type.name === "StrongEmphasis" && strong.from === first.to) {
              const strongFirst = strong.firstChild;
              const strongLast = strong.lastChild;
              if (
                strongFirst &&
                strongLast &&
                strongFirst.type.name === "EmphasisMark" &&
                strongLast.type.name === "EmphasisMark" &&
                last.from === strongLast.to
              ) {
                if (!isEscaped(text, first.from)) {
                  hides.push({ from: first.from, to: strongFirst.to });
                }
                if (!isEscaped(text, strongLast.from)) {
                  hides.push({ from: strongLast.from, to: last.to });
                }
                // Walk through any inner inline children (text only) by
                // descending — but the marks themselves are already covered.
                // Returning normally lets the iterator descend; the inner
                // EmphasisMark children will be re-emitted below by the
                // generic case. To prevent duplicate hides we skip descent.
                return false;
              }
            }
          }
          return; // standard nested emphasis — descend.
        }
        case "EmphasisMark":
        case "StrikethroughMark": {
          if (isOnCursorLine(from, to)) return false;
          // Lezer sometimes parses `\**bold**` as Escape `\*` followed by an
          // Emphasis `*bold*`; Obsidian's live preview keeps that opening `*`
          // raw because of the user-visible escape. Skip emphasis marks whose
          // preceding character is a backslash that has not itself been
          // escaped.
          if (isEscaped(text, from)) return false;
          hides.push({ from, to });
          return false;
        }
        case "Link":
        case "Image": {
          if (isOnCursorLine(from, to)) return;
          if (rangesOverlap(obsidianOverrides, from, to)) return false;
          // Standard markdown link/image: hide `[` (or `![`) and `](url)`.
          const linkNode = node.node;
          const linkMarks: { from: number; to: number }[] = [];
          for (let c = linkNode.firstChild; c; c = c.nextSibling) {
            if (c.type.name === "LinkMark") linkMarks.push({ from: c.from, to: c.to });
          }
          if (linkMarks.length >= 4) {
            const open = linkMarks[0];
            const labelClose = linkMarks[1];
            const urlClose = linkMarks[linkMarks.length - 1];
            if (open && labelClose && urlClose) {
              hides.push({ from: open.from, to: open.to });
              hides.push({ from: labelClose.from, to: urlClose.to });
            }
          }
          return;
        }
        case "Task": {
          if (isOnCursorLine(from, to)) return;
          const child = node.node.firstChild;
          if (child && child.type.name === "TaskMarker") {
            hides.push({ from: child.from, to: child.to });
          }
          return;
        }
        case "TableDelimiter": {
          if (isOnCursorLine(from, to)) return false;
          hides.push({ from, to });
          return false;
        }
        case "Escape": {
          // Don't hide — the existing test suite expects backslash-escaped
          // markers to leave the backslash visible (Obsidian behavior).
          return false;
        }
        default:
          return;
      }
    },
  });

  return { rawRegions, obsidianOverrides, hides };
}

/**
 * Find a matching `<tag>…</tag>` span inside a Lezer HTMLBlock. Returns the
 * tightest containing `<tag>…</tag>` if the block opens with a recognisable
 * HTML element, or null when no closer is found.
 */
function matchedHtmlSpan(text: string, from: number, to: number): Range | null {
  const slice = text.slice(from, to);
  const openMatch = slice.match(/^\s*<([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?>/);
  if (!openMatch) return null;
  const tag = openMatch[1];
  if (!tag) return null;
  const openStart = (slice.indexOf("<") >= 0 ? slice.indexOf("<") : 0) + from;
  // openStart is the position of the leading `<`.
  const close = `</${tag}>`;
  const closeIdx = slice.indexOf(close);
  if (closeIdx === -1) return null;
  return { from: openStart, to: from + closeIdx + close.length };
}

/**
 * Re-parse a substring of the document as inline markdown to recover hides
 * inside HTMLBlock leftovers (text before or after the matched HTML span).
 */
function reparseInline(
  text: string,
  from: number,
  to: number,
  cursorLineIndex: number,
  rawRegions: Range[],
  hides: Range[],
): void {
  if (to <= from) return;
  const sub = text.slice(from, to);
  if (sub.trim() === "") return;
  // Run the parser over the substring and translate offsets back to document
  // coordinates. This is a cheap second parse only triggered for HTMLBlock
  // leftovers, which are rare.
  const subTree = markdownTreeParser.parse(sub);
  const lineStartByIndex = buildLineStarts(text);
  const lineOfPos = (pos: number): number => offsetLineIndex(pos, lineStartByIndex);
  const isOnCursorLine = (start: number, end: number): boolean => {
    const startLine = lineOfPos(start);
    const endLine = lineOfPos(Math.max(start, end - 1));
    return cursorLineIndex >= startLine && cursorLineIndex <= endLine;
  };
  subTree.iterate({
    enter(node) {
      const start = from + node.from;
      const end = from + node.to;
      switch (node.type.name) {
        case "InlineCode":
        case "FencedCode":
        case "CodeBlock": {
          rawRegions.push({ from: start, to: end });
          return false;
        }
        case "EmphasisMark":
        case "StrikethroughMark": {
          if (!isOnCursorLine(start, end)) hides.push({ from: start, to: end });
          return false;
        }
        case "TableDelimiter": {
          if (!isOnCursorLine(start, end)) hides.push({ from: start, to: end });
          return false;
        }
        default:
          return;
      }
    },
  });
}

/**
 * Pre-scan for Obsidian-specific syntax that Lezer mis-parses as Link/Image
 * (wikilinks `[[…]]`, embeds `![[…]]`, footnote refs `[^id]`, callout
 * markers `[!type]+`, custom task markers `[?]` / `[-]`).
 *
 * The collected ranges are used to **suppress** AST Link/Image chrome
 * decorations inside them — the Obsidian regex pass handles those markers.
 */
function collectObsidianOverrides(
  text: string,
  lineStartByIndex: ReadonlyArray<number>,
  overrides: Range[],
): void {
  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null = WIKILINK_RE.exec(text);
  while (m) {
    // m.index already covers the optional `!` prefix because group 1 (`(!?)`)
    // is part of the match span, not a lookbehind. No ternary required.
    overrides.push({ from: m.index, to: m.index + m[0].length });
    m = WIKILINK_RE.exec(text);
  }
  FOOTNOTE_REF_RE.lastIndex = 0;
  m = FOOTNOTE_REF_RE.exec(text);
  while (m) {
    overrides.push({ from: m.index, to: m.index + m[0].length });
    m = FOOTNOTE_REF_RE.exec(text);
  }
  for (let lineIdx = 0; lineIdx < lineStartByIndex.length; lineIdx++) {
    const start = lineStartByIndex[lineIdx];
    if (start === undefined) continue;
    const end = lineEndOfLine(lineIdx, lineStartByIndex, text.length);
    const line = text.slice(start, end);
    const callMatch = line.match(CALLOUT_RE);
    if (callMatch) {
      const prefixLen = callMatch[1]?.length ?? 0;
      const markerLen = callMatch[0].length - prefixLen;
      overrides.push({ from: start + prefixLen, to: start + prefixLen + markerLen });
    }
    const taskMatch = line.match(CUSTOM_TASK_RE);
    if (taskMatch) {
      const prefixLen = taskMatch[1]?.length ?? 0;
      const markerChar = taskMatch[2] ?? "";
      if (markerChar !== " " && markerChar !== "x" && markerChar !== "X") {
        overrides.push({ from: start + prefixLen, to: start + prefixLen + 3 });
      }
    }
  }
}

// --- Obsidian regex pass ---------------------------------------------------

function collectObsidianHides(
  text: string,
  cursorLineIndex: number,
  rawRegions: ReadonlyArray<Range>,
  lineStartByIndex: ReadonlyArray<number>,
  hides: Range[],
): void {
  const inRaw = (from: number, to: number): boolean => rangesOverlap(rawRegions, from, to);

  for (let lineIdx = 0; lineIdx < lineStartByIndex.length; lineIdx++) {
    if (lineIdx === cursorLineIndex) continue;
    const lineStart = lineStartByIndex[lineIdx];
    if (lineStart === undefined) continue;
    const lineEndExcl = lineEndOfLine(lineIdx, lineStartByIndex, text.length);
    const line = text.slice(lineStart, lineEndExcl);
    if (inRaw(lineStart, lineEndExcl)) continue;

    const callMatch = line.match(CALLOUT_RE);
    if (callMatch) {
      const prefixLen = callMatch[1]?.length ?? 0;
      const markerLen = callMatch[0].length - prefixLen;
      hides.push({ from: lineStart + prefixLen, to: lineStart + prefixLen + markerLen });
    }

    const blockIdMatch = line.match(BLOCK_ID_RE);
    if (blockIdMatch?.index !== undefined) {
      hides.push({ from: lineStart + blockIdMatch.index, to: lineStart + line.length });
    }

    const taskMatch = line.match(CUSTOM_TASK_RE);
    if (taskMatch) {
      const prefixLen = taskMatch[1]?.length ?? 0;
      const markerChar = taskMatch[2] ?? "";
      if (markerChar !== " " && markerChar !== "x" && markerChar !== "X") {
        hides.push({ from: lineStart + prefixLen, to: lineStart + prefixLen + 3 });
      }
    }
  }

  const pushIfVisible = (from: number, to: number): void => {
    const startLine = offsetLineIndex(from, lineStartByIndex);
    const endLine = offsetLineIndex(to - 1, lineStartByIndex);
    if (cursorLineIndex >= startLine && cursorLineIndex <= endLine) return;
    if (inRaw(from, to)) return;
    hides.push({ from, to });
  };

  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null = WIKILINK_RE.exec(text);
  while (m) {
    const isEmbed = m[1] === "!";
    const innerStr = m[2];
    if (innerStr) {
      const parts = parseWikilink(innerStr);
      if (parts.target) {
        const fullStart = m.index;
        const fullEnd = fullStart + m[0].length;
        const openLen = isEmbed ? 3 : 2;
        pushIfVisible(fullStart, fullStart + openLen);
        if (parts.display) {
          const pipeIdx = innerStr.indexOf("|");
          if (pipeIdx !== -1) {
            pushIfVisible(fullStart + openLen, fullStart + openLen + pipeIdx + 1);
          }
        }
        pushIfVisible(fullEnd - 2, fullEnd);
      }
    }
    m = WIKILINK_RE.exec(text);
  }

  HIGHLIGHT_RE.lastIndex = 0;
  m = HIGHLIGHT_RE.exec(text);
  while (m) {
    const idx = m.index;
    const len = m[0].length;
    if (!isEscaped(text, idx) && !isEscaped(text, idx + len - 2)) {
      pushIfVisible(idx, idx + 2);
      pushIfVisible(idx + len - 2, idx + len);
    }
    m = HIGHLIGHT_RE.exec(text);
  }

  FOOTNOTE_REF_RE.lastIndex = 0;
  m = FOOTNOTE_REF_RE.exec(text);
  while (m) {
    const idx = m.index;
    if (!isEscaped(text, idx)) {
      const lineIdx = offsetLineIndex(idx, lineStartByIndex);
      const ls = lineStartByIndex[lineIdx] ?? 0;
      const lineSlice = text.slice(ls, idx);
      const afterMatch = text[idx + m[0].length];
      if (lineSlice.trim() !== "" || afterMatch !== ":") {
        pushIfVisible(idx + 1, idx + 2);
      }
    }
    m = FOOTNOTE_REF_RE.exec(text);
  }

  COMMENT_INLINE_RE.lastIndex = 0;
  m = COMMENT_INLINE_RE.exec(text);
  while (m) {
    const idx = m.index;
    const len = m[0].length;
    pushIfVisible(idx, idx + 2);
    pushIfVisible(idx + len - 2, idx + len);
    m = COMMENT_INLINE_RE.exec(text);
  }

  // Inline math, per non-cursor line, skipping raw regions. Lines containing
  // only `$$` are block fences and don't host inline math.
  //
  // The early bail must check FULL CONTAINMENT (the line is entirely inside
  // some raw region), not overlap — a line that mixes an inline code span
  // with real `$math$` outside it would lose its real math if we skipped on
  // overlap. The per-match `inRaw(idx, idx+len)` check below still filters
  // out math hits inside an inline code span on a mixed line.
  for (let lineIdx = 0; lineIdx < lineStartByIndex.length; lineIdx++) {
    if (lineIdx === cursorLineIndex) continue;
    const ls = lineStartByIndex[lineIdx];
    if (ls === undefined) continue;
    const le = lineEndOfLine(lineIdx, lineStartByIndex, text.length);
    const line = text.slice(ls, le);
    if (line.trim() === "$$") continue;
    if (rangesContain(rawRegions, ls, le)) continue;
    INLINE_MATH_RE.lastIndex = 0;
    let mm: RegExpExecArray | null = INLINE_MATH_RE.exec(line);
    while (mm) {
      const idx = mm.index;
      const len = mm[0].length;
      if (
        !isEscaped(line, idx) &&
        !isEscaped(line, idx + len - 1) &&
        !inRaw(ls + idx, ls + idx + len)
      ) {
        hides.push({ from: ls + idx, to: ls + idx + 1 });
        hides.push({ from: ls + idx + len - 1, to: ls + idx + len });
      }
      mm = INLINE_MATH_RE.exec(line);
    }
  }
}

/**
 * Detect inline `<tag>…</tag>` ranges in plain text. These are added to the
 * raw region list so wikilinks/etc. inside inline HTML are not decorated.
 */
function collectInlineHtmlRanges(
  text: string,
  rawRegions: ReadonlyArray<Range>,
  out: Range[],
): void {
  INLINE_HTML_ELEMENT_RE.lastIndex = 0;
  let m: RegExpExecArray | null = INLINE_HTML_ELEMENT_RE.exec(text);
  while (m) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (!rangesOverlap(rawRegions, start, end)) {
      out.push({ from: start, to: end });
    }
    m = INLINE_HTML_ELEMENT_RE.exec(text);
  }
}

/**
 * Compute which character ranges should be hidden on each non-cursor line.
 * Exported pure function for test coverage. Positions are 0-based document
 * offsets, ascending. `cursorLineIndex` is 0-based; pass -1 to decorate every
 * line.
 */
export function computeLivePreviewRanges(text: string, cursorLineIndex: number): Range[] {
  const lineStartByIndex = buildLineStarts(text);
  const frontmatter = frontmatterRange(text);
  const { blockRaw, fenceHides } = scanObsidianBlocks(text, cursorLineIndex, lineStartByIndex);
  const { rawRegions, hides } = scanTree(
    text,
    cursorLineIndex,
    frontmatter,
    blockRaw,
    lineStartByIndex,
  );
  const inlineHtml: Range[] = [];
  collectInlineHtmlRanges(text, rawRegions, inlineHtml);
  rawRegions.push(...inlineHtml);

  // Drop any AST-derived hide that falls inside an inline HTML element — the
  // existing test expects `<div>**not bold**</div>` to leave the bold markers
  // raw. (Inline HTML ranges weren't known when the AST walker ran.)
  const filteredHides = hides.filter((h) => !rangesContain(inlineHtml, h.from, h.to));

  filteredHides.push(...fenceHides);
  // Run the Obsidian regex pass with the full raw region set so wikilinks/etc.
  // inside HTML and code blocks are also skipped.
  collectObsidianHides(text, cursorLineIndex, rawRegions, lineStartByIndex, filteredHides);
  return mergeOverlapping(filteredHides);
}

// --- View plugin -----------------------------------------------------------

function decorationsForState(state: EditorState): DecorationSet {
  const text = state.doc.toString();
  const cursorPos = state.selection.main.head;
  const cursorLine = state.doc.lineAt(cursorPos);
  const cursorLineIndex = cursorLine.number - 1;
  const ranges = computeLivePreviewRanges(text, cursorLineIndex);
  const builder = new RangeSetBuilder<Decoration>();
  for (const r of ranges) builder.add(r.from, r.to, replaceDeco);
  return builder.finish();
}

function buildDecorations(view: EditorView): DecorationSet {
  return decorationsForState(view.state);
}

export const livePreviewDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
