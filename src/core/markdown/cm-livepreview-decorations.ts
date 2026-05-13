import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { parseWikilink } from "@core/markdown/renderer";
import yaml from "js-yaml";

const BOLD_ITALIC_STAR_RE = /\*\*\*([^*\n]+)\*\*\*/g;
const BOLD_ITALIC_UNDERSCORE_RE = /___([^_\n]+)___/g;
const HIGHLIGHT_RE = /==([^=\n]+)==/g;
const STRIKE_RE = /~~([^~\n]+)~~/g;
const WIKILINK_RE = /(!?)\[\[([^\]\n]+)\]\]/g;
const MARKDOWN_LINK_RE = /(!?)\[([^\]\n]+)\]\(([^)\n]+)\)/g;
const COMMENT_RE = /%%([^%\n]+)%%/g;
const INLINE_MATH_RE = /(?<!\$)\$([^$\n]+)\$(?!\$)/g;
const CALLOUT_RE = /^(\s*>+\s*)\[!([^\]\n]+)\]([+-])?/;
const HEADING_RE = /^(\s{0,3})(#{1,6})(\s+)/;
const TASK_RE = /^(\s*(?:[-*+]|\d+[.)])\s+)\[[^\]\n]\](\s+)/;
const BLOCK_ID_RE = /(^|\s)\^([A-Za-z0-9-]+)\s*$/;
const HTML_BLOCK_OPEN_RE = /^\s*<([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?>\s*$/;
const HORIZONTAL_RULE_RE =
  /^\s{0,3}(?:-{3,}|\*{3,}|_{3,}|(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})\s*$/;

const replaceDeco = Decoration.replace({});

function forEachMatch(re: RegExp, line: string, visit: (match: RegExpExecArray) => void): void {
  re.lastIndex = 0;
  let match = re.exec(line);
  while (match) {
    visit(match);
    match = re.exec(line);
  }
}

function unescapedPipeIndexes(line: string): number[] {
  const indexes: number[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== "|") continue;
    let slashCount = 0;
    for (let j = i - 1; j >= 0 && line[j] === "\\"; j--) slashCount += 1;
    if (slashCount % 2 === 0) indexes.push(i);
  }
  return indexes;
}

function tableCells(line: string): string[] {
  const pipeIndexes = unescapedPipeIndexes(line);
  if (pipeIndexes.length === 0) return [];
  const cells: string[] = [];
  let start = 0;
  for (const pipeIndex of pipeIndexes) {
    cells.push(line.slice(start, pipeIndex));
    start = pipeIndex + 1;
  }
  cells.push(line.slice(start));
  if (cells[0]?.trim() === "") cells.shift();
  if (cells[cells.length - 1]?.trim() === "") cells.pop();
  return cells;
}

function isTableSeparatorLine(line: string): boolean {
  const cells = tableCells(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()));
}

function isTableRow(lines: ReadonlyArray<string>, lineIndex: number): boolean {
  const line = lines[lineIndex] ?? "";
  if (unescapedPipeIndexes(line).length === 0) return false;
  if (isTableSeparatorLine(line)) return true;
  const prev = lineIndex > 0 ? lines[lineIndex - 1] : undefined;
  const next = lineIndex < lines.length - 1 ? lines[lineIndex + 1] : undefined;
  return (
    (prev !== undefined && isTableSeparatorLine(prev)) ||
    (next !== undefined && isTableSeparatorLine(next))
  );
}

function isEscaped(line: string, index: number): boolean {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && line[i] === "\\"; i--) slashCount += 1;
  return slashCount % 2 === 1;
}

function isSingleAsteriskMarker(line: string, index: number): boolean {
  return (
    line[index] === "*" &&
    line[index - 1] !== "*" &&
    line[index + 1] !== "*" &&
    !isEscaped(line, index)
  );
}

function asteriskRunLengthAt(line: string, index: number): number {
  let len = 0;
  while (line[index + len] === "*") len += 1;
  return len;
}

function isDoubleAsteriskMarker(line: string, index: number): boolean {
  return (
    asteriskRunLengthAt(line, index) === 2 && line[index - 1] !== "*" && !isEscaped(line, index)
  );
}

function underscoreRunLengthAt(line: string, index: number): number {
  let len = 0;
  while (line[index + len] === "_") len += 1;
  return len;
}

function isDoubleUnderscoreMarker(line: string, index: number): boolean {
  return (
    underscoreRunLengthAt(line, index) === 2 && line[index - 1] !== "_" && !isEscaped(line, index)
  );
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function isSingleUnderscoreCandidate(line: string, index: number): boolean {
  return (
    line[index] === "_" &&
    line[index - 1] !== "_" &&
    line[index + 1] !== "_" &&
    !isEscaped(line, index)
  );
}

function codeSpanRanges(line: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] !== "`") {
      i += 1;
      continue;
    }
    const start = i;
    while (i < line.length && line[i] === "`") i += 1;
    const tickCount = i - start;
    let j = i;
    while (j < line.length) {
      const close = line.indexOf("`", j);
      if (close === -1) return ranges;
      let closeEnd = close;
      while (closeEnd < line.length && line[closeEnd] === "`") closeEnd += 1;
      if (closeEnd - close === tickCount) {
        ranges.push([start, closeEnd]);
        i = closeEnd;
        break;
      }
      j = closeEnd;
    }
  }
  return ranges;
}

function htmlElementRanges(line: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const re = /<([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?>.*?<\/\1>/g;
  forEachMatch(re, line, (m) => {
    ranges.push([m.index, m.index + m[0].length]);
  });
  return ranges;
}

function frontmatterEndLineIndex(lines: ReadonlyArray<string>): number | null {
  if ((lines[0] ?? "").trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if ((lines[i] ?? "").trim() !== "---") continue;
    try {
      const parsed = yaml.load(lines.slice(1, i).join("\n"));
      if (parsed === undefined || (typeof parsed === "object" && !Array.isArray(parsed))) return i;
    } catch {
      return null;
    }
    return null;
  }
  return null;
}

/**
 * Compute which character ranges should be hidden on each non-cursor line.
 * Exported pure function for test coverage. Positions are 0-based document
 * offsets, ascending.
 */
export function computeLivePreviewRanges(
  text: string,
  cursorLineIndex: number,
): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  const lines = text.split("\n");
  const frontmatterEnd = frontmatterEndLineIndex(lines);
  let offset = 0;
  let inFence = false;
  let fenceMarker = "";
  let inBlockComment = false;
  let inBlockMath = false;
  let inHtmlBlockTag: string | null = null;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx] ?? "";
    const lineStart = offset;
    const addReplace = (start: number, end: number) => {
      ranges.push({ from: lineStart + start, to: lineStart + end });
    };

    // Top-of-file frontmatter is metadata, not Markdown body. Keep it raw
    // until a dedicated properties widget owns the inactive rendering.
    if (frontmatterEnd !== null && lineIdx <= frontmatterEnd) {
      offset = lineStart + line.length + 1;
      continue;
    }

    // Track fenced code blocks. Lines starting with ``` or ~~~ flip the state.
    const fenceOpen = line.match(/^(\s{0,3})(```+|~~~+)/);
    if (fenceOpen) {
      const prefixLen = fenceOpen[1]?.length ?? 0;
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceOpen[2] ?? fenceOpen[0] ?? "";
        if (lineIdx !== cursorLineIndex) addReplace(prefixLen, line.length);
      } else if (line.slice(prefixLen).startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = "";
        if (lineIdx !== cursorLineIndex) addReplace(prefixLen, line.length);
      }
      offset = lineStart + line.length + 1;
      continue;
    }

    // Skip lines inside fences AND the cursor's own line (raw view).
    if (inFence || lineIdx === cursorLineIndex) {
      offset = lineStart + line.length + 1;
      continue;
    }

    if (inHtmlBlockTag) {
      if (line.includes(`</${inHtmlBlockTag}>`)) inHtmlBlockTag = null;
      offset = lineStart + line.length + 1;
      continue;
    }

    const htmlBlockOpen = line.match(HTML_BLOCK_OPEN_RE);
    if (htmlBlockOpen?.[1]) {
      inHtmlBlockTag = htmlBlockOpen[1];
      offset = lineStart + line.length + 1;
      continue;
    }

    const trimmed = line.trim();

    if (trimmed === "$$") {
      const start = line.indexOf("$$");
      addReplace(start, start + 2);
      inBlockMath = !inBlockMath;
      offset = lineStart + line.length + 1;
      continue;
    }

    if (trimmed === "%%") {
      const start = line.indexOf("%%");
      addReplace(start, start + 2);
      inBlockComment = !inBlockComment;
      offset = lineStart + line.length + 1;
      continue;
    }

    if (inBlockMath || inBlockComment) {
      if (inBlockComment) {
        const commentEnd = line.indexOf("%%");
        if (commentEnd !== -1) {
          addReplace(commentEnd, commentEnd + 2);
          inBlockComment = false;
        }
      }
      offset = lineStart + line.length + 1;
      continue;
    }

    // Inline-code spans on this line — record their (start, end) pairs so we
    // can skip formatting inside them.
    const ignoredInlineSpans = [...codeSpanRanges(line), ...htmlElementRanges(line)];
    const overlapsIgnoredInline = (start: number, end: number): boolean =>
      ignoredInlineSpans.some(([s, e]) => start < e && end > s);

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const prefixLen = headingMatch[1]?.length ?? 0;
      const markerLen = headingMatch[2]?.length ?? 0;
      const spaceLen = headingMatch[3]?.length ?? 0;
      addReplace(prefixLen, prefixLen + markerLen + spaceLen);
    }

    const taskMatch = line.match(TASK_RE);
    if (taskMatch) {
      const prefixLen = taskMatch[1]?.length ?? 0;
      addReplace(prefixLen, prefixLen + 3);
    }

    if (HORIZONTAL_RULE_RE.test(line)) {
      const firstContent = line.search(/\S/);
      if (firstContent !== -1) addReplace(firstContent, line.length);
      offset = lineStart + line.length + 1;
      continue;
    }

    const blockIdMatch = line.match(BLOCK_ID_RE);
    if (blockIdMatch?.index !== undefined) {
      addReplace(blockIdMatch.index, line.length);
    }

    // Callouts: > [!note]+ Title — hide the Obsidian type marker/fold sign,
    // keeping the blockquote marker and human title visible.
    const calloutMatch = line.match(CALLOUT_RE);
    if (calloutMatch) {
      const prefixLen = calloutMatch[1]?.length ?? 0;
      const markerLen = calloutMatch[0].length - prefixLen;
      addReplace(prefixLen, prefixLen + markerLen);
    }

    if (isTableRow(lines, lineIdx)) {
      if (isTableSeparatorLine(line)) {
        const firstContent = line.search(/\S/);
        if (firstContent !== -1) addReplace(firstContent, line.length);
        offset = lineStart + line.length + 1;
        continue;
      }
      for (const pipeIndex of unescapedPipeIndexes(line)) addReplace(pipeIndex, pipeIndex + 1);
    }

    const blockCommentStart = line.indexOf("%%");
    if (blockCommentStart !== -1 && line.indexOf("%%", blockCommentStart + 2) === -1) {
      addReplace(blockCommentStart, blockCommentStart + 2);
      inBlockComment = true;
      offset = lineStart + line.length + 1;
      continue;
    }

    // Bold+italic: ***text*** / ___text___ — hide the combined markers.
    forEachMatch(BOLD_ITALIC_STAR_RE, line, (m) => {
      const idx = m.index;
      const len = m[0].length;
      if (
        overlapsIgnoredInline(idx, idx + len) ||
        isEscaped(line, idx) ||
        isEscaped(line, idx + len - 3)
      ) {
        return;
      }
      addReplace(idx, idx + 3);
      addReplace(idx + len - 3, idx + len);
    });

    forEachMatch(BOLD_ITALIC_UNDERSCORE_RE, line, (m) => {
      const idx = m.index;
      const len = m[0].length;
      if (
        overlapsIgnoredInline(idx, idx + len) ||
        isEscaped(line, idx) ||
        isEscaped(line, idx + len - 3)
      ) {
        return;
      }
      addReplace(idx, idx + 3);
      addReplace(idx + len - 3, idx + len);
    });

    // Bold: **text** / __text__ — hide the opening and closing markers.
    // A delimiter scan is used for asterisk bold so nested italic like
    // `**strong *em* text**` still hides the outer bold markers.
    for (let start = 0; start < line.length; start++) {
      if (!isDoubleAsteriskMarker(line, start) || overlapsIgnoredInline(start, start + 2)) continue;
      for (let end = start + 2; end < line.length; end++) {
        if (!isDoubleAsteriskMarker(line, end) || overlapsIgnoredInline(end, end + 2)) continue;
        addReplace(start, start + 2);
        addReplace(end, end + 2);
        start = end + 1;
        break;
      }
    }

    for (let start = 0; start < line.length; start++) {
      if (!isDoubleUnderscoreMarker(line, start) || overlapsIgnoredInline(start, start + 2))
        continue;
      for (let end = start + 2; end < line.length; end++) {
        if (!isDoubleUnderscoreMarker(line, end) || overlapsIgnoredInline(end, end + 2)) continue;
        addReplace(start, start + 2);
        addReplace(end, end + 2);
        start = end + 1;
        break;
      }
    }

    // Asterisk italic: *word* — hide the single `*` markers without matching
    // the markers inside `**bold**`. A delimiter scan is used instead of a
    // content regex so nested bold like `*em **strong** text*` still hides the
    // outer italic markers.
    for (let start = 0; start < line.length; start++) {
      if (!isSingleAsteriskMarker(line, start) || overlapsIgnoredInline(start, start + 1)) continue;
      for (let end = start + 1; end < line.length; end++) {
        if (!isSingleAsteriskMarker(line, end) || overlapsIgnoredInline(end, end + 1)) continue;
        addReplace(start, start + 1);
        addReplace(end, end + 1);
        start = end;
        break;
      }
    }

    // Highlight: ==text== — hide the opening and closing `==` markers.
    forEachMatch(HIGHLIGHT_RE, line, (m) => {
      const idx = m.index;
      const len = m[0].length;
      if (
        overlapsIgnoredInline(idx, idx + len) ||
        isEscaped(line, idx) ||
        isEscaped(line, idx + len - 2)
      ) {
        return;
      }
      addReplace(idx, idx + 2);
      addReplace(idx + len - 2, idx + len);
    });

    // Strikethrough: ~~text~~ — hide the opening and closing `~~` markers.
    forEachMatch(STRIKE_RE, line, (m) => {
      const idx = m.index;
      const len = m[0].length;
      if (
        overlapsIgnoredInline(idx, idx + len) ||
        isEscaped(line, idx) ||
        isEscaped(line, idx + len - 2)
      ) {
        return;
      }
      addReplace(idx, idx + 2);
      addReplace(idx + len - 2, idx + len);
    });

    // Underscore italic: _word_ — hide single `_` markers at word
    // boundaries without matching underscores inside identifiers. A delimiter
    // scan preserves nested bold such as `_em __strong__ text_`.
    for (let start = 0; start < line.length; start++) {
      if (
        !isSingleUnderscoreCandidate(line, start) ||
        isWordChar(line[start - 1]) ||
        overlapsIgnoredInline(start, start + 1)
      ) {
        continue;
      }
      for (let end = start + 1; end < line.length; end++) {
        if (
          !isSingleUnderscoreCandidate(line, end) ||
          isWordChar(line[end + 1]) ||
          overlapsIgnoredInline(end, end + 1)
        ) {
          continue;
        }
        addReplace(start, start + 1);
        addReplace(end, end + 1);
        start = end;
        break;
      }
    }

    // Wikilinks: hide `[[`, `]]`, and (if alias) the `Target|` prefix.
    forEachMatch(WIKILINK_RE, line, (m) => {
      const isEmbed = m[1] === "!";
      const innerStr = m[2];
      if (!innerStr) return;
      const parts = parseWikilink(innerStr);
      if (!parts.target) return;
      const fullStart = m.index;
      const fullEnd = fullStart + m[0].length;
      if (overlapsIgnoredInline(fullStart, fullEnd)) return;
      const openLen = isEmbed ? 3 : 2;
      // Opening `[[` (preceded by optional `!`).
      addReplace(fullStart, fullStart + openLen);
      // Alias case: hide `Target|` so only the display remains.
      if (parts.display) {
        const pipeIdx = innerStr.indexOf("|");
        if (pipeIdx !== -1) {
          addReplace(fullStart + openLen, fullStart + openLen + pipeIdx + 1);
        }
      }
      // Closing `]]`.
      addReplace(fullEnd - 2, fullEnd);
    });

    // Markdown links and images: [label](path) / ![alt](path) — leave only
    // the label/alt text visible.
    forEachMatch(MARKDOWN_LINK_RE, line, (m) => {
      const isEmbed = m[1] === "!";
      const fullStart = m.index;
      const fullEnd = fullStart + m[0].length;
      if (overlapsIgnoredInline(fullStart, fullEnd)) return;
      const label = m[2];
      if (!label) return;
      const openLen = isEmbed ? 2 : 1;
      const labelStart = fullStart + openLen;
      const labelEnd = labelStart + label.length;
      addReplace(fullStart, labelStart);
      addReplace(labelEnd, fullEnd);
    });

    // Obsidian comments and inline math keep their content visible while
    // hiding the delimiter characters on non-cursor lines.
    forEachMatch(COMMENT_RE, line, (m) => {
      const idx = m.index;
      const len = m[0].length;
      if (overlapsIgnoredInline(idx, idx + len)) return;
      addReplace(idx, idx + 2);
      addReplace(idx + len - 2, idx + len);
    });

    forEachMatch(INLINE_MATH_RE, line, (m) => {
      const idx = m.index;
      const len = m[0].length;
      if (
        overlapsIgnoredInline(idx, idx + len) ||
        isEscaped(line, idx) ||
        isEscaped(line, idx + len - 1)
      ) {
        return;
      }
      addReplace(idx, idx + 1);
      addReplace(idx + len - 1, idx + len);
    });

    offset = lineStart + line.length + 1;
  }

  ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  return mergeOverlapping(ranges);
}

function mergeOverlapping(
  ranges: ReadonlyArray<{ from: number; to: number }>,
): Array<{ from: number; to: number }> {
  if (ranges.length === 0) return [];
  const first = ranges[0];
  if (!first) return [];
  const merged: Array<{ from: number; to: number }> = [{ from: first.from, to: first.to }];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    const curr = ranges[i];
    if (!last || !curr) continue;
    if (curr.from < last.to) {
      if (curr.to > last.to) last.to = curr.to;
    } else {
      merged.push({ from: curr.from, to: curr.to });
    }
  }
  return merged;
}

function buildDecorations(view: EditorView): DecorationSet {
  const text = view.state.doc.toString();
  const cursorPos = view.state.selection.main.head;
  const cursorLine = view.state.doc.lineAt(cursorPos);
  const cursorLineIndex = cursorLine.number - 1; // doc lines are 1-based; we use 0-based.
  const ranges = computeLivePreviewRanges(text, cursorLineIndex);
  const builder = new RangeSetBuilder<Decoration>();
  for (const r of ranges) builder.add(r.from, r.to, replaceDeco);
  return builder.finish();
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
