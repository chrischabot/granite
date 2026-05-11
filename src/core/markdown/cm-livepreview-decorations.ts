import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { parseWikilink } from "@core/markdown/renderer";

const BOLD_RE = /\*\*([^*\n]+)\*\*/g;
const HIGHLIGHT_RE = /==([^=\n]+)==/g;
const STRIKE_RE = /~~([^~\n]+)~~/g;
const UNDERSCORE_ITALIC_RE = /(?<![A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9_])/g;
const WIKILINK_RE = /(!?)\[\[([^\]\n]+)\]\]/g;

const replaceDeco = Decoration.replace({});

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
  let offset = 0;
  let inFence = false;
  let fenceMarker = "";

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx] ?? "";
    const lineStart = offset;

    // Track fenced code blocks. Lines starting with ``` or ~~~ flip the state.
    const fenceOpen = line.match(/^(```+|~~~+)/);
    if (fenceOpen) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceOpen[1]!;
      } else if (line.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = "";
      }
      offset = lineStart + line.length + 1;
      continue;
    }

    // Skip lines inside fences AND the cursor's own line (raw view).
    if (inFence || lineIdx === cursorLineIndex) {
      offset = lineStart + line.length + 1;
      continue;
    }

    const addReplace = (start: number, end: number) => {
      ranges.push({ from: lineStart + start, to: lineStart + end });
    };

    // Inline-code spans on this line — record their (start, end) pairs so we
    // can skip formatting inside them.
    const codeSpans: Array<[number, number]> = [];
    {
      let i = 0;
      while (i < line.length) {
        const open = line.indexOf("`", i);
        if (open === -1) break;
        const close = line.indexOf("`", open + 1);
        if (close === -1) break;
        codeSpans.push([open, close + 1]);
        i = close + 1;
      }
    }
    const overlapsCode = (start: number, end: number): boolean =>
      codeSpans.some(([s, e]) => start < e && end > s);

    // Bold: **text** — hide the opening and closing `**` markers.
    BOLD_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BOLD_RE.exec(line))) {
      const idx = m.index;
      const len = m[0].length;
      if (overlapsCode(idx, idx + len)) continue;
      addReplace(idx, idx + 2);
      addReplace(idx + len - 2, idx + len);
    }

    // Highlight: ==text== — hide the opening and closing `==` markers.
    HIGHLIGHT_RE.lastIndex = 0;
    while ((m = HIGHLIGHT_RE.exec(line))) {
      const idx = m.index;
      const len = m[0].length;
      if (overlapsCode(idx, idx + len)) continue;
      addReplace(idx, idx + 2);
      addReplace(idx + len - 2, idx + len);
    }

    // Strikethrough: ~~text~~ — hide the opening and closing `~~` markers.
    STRIKE_RE.lastIndex = 0;
    while ((m = STRIKE_RE.exec(line))) {
      const idx = m.index;
      const len = m[0].length;
      if (overlapsCode(idx, idx + len)) continue;
      addReplace(idx, idx + 2);
      addReplace(idx + len - 2, idx + len);
    }

    // Underscore italic: _word_ — hide the single `_` markers.
    UNDERSCORE_ITALIC_RE.lastIndex = 0;
    while ((m = UNDERSCORE_ITALIC_RE.exec(line))) {
      const idx = m.index;
      const len = m[0].length;
      if (overlapsCode(idx, idx + len)) continue;
      addReplace(idx, idx + 1);
      addReplace(idx + len - 1, idx + len);
    }

    // Wikilinks: hide `[[`, `]]`, and (if alias) the `Target|` prefix.
    WIKILINK_RE.lastIndex = 0;
    while ((m = WIKILINK_RE.exec(line))) {
      const isEmbed = m[1] === "!";
      const innerStr = m[2];
      if (!innerStr) continue;
      const parts = parseWikilink(innerStr);
      if (!parts.target) continue;
      const fullStart = m.index;
      const fullEnd = fullStart + m[0].length;
      if (overlapsCode(fullStart, fullEnd)) continue;
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
    }

    offset = lineStart + line.length + 1;
  }

  ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  return mergeOverlapping(ranges);
}

function mergeOverlapping(
  ranges: ReadonlyArray<{ from: number; to: number }>,
): Array<{ from: number; to: number }> {
  if (ranges.length === 0) return [];
  const merged: Array<{ from: number; to: number }> = [
    { from: ranges[0]!.from, to: ranges[0]!.to },
  ];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1]!;
    const curr = ranges[i]!;
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