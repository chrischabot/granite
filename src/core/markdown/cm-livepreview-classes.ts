import { type EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { SyntaxNodeRef } from "@lezer/common";
import { GFM, parser as baseMarkdownParser } from "@lezer/markdown";

/**
 * Companion to `cm-livepreview-decorations`.
 *
 * The marker-hide decorator only removes characters; it doesn't tag lines with
 * semantic classes, so the CSS hooks in `cm-livepreview.css` (`.cm-codeblock`,
 * `.cm-quote`, `.cm-inline-code`, `.cm-hashtag`, `.cm-link`, …) never fire.
 * Without those hooks, fenced code blocks have no background, inline code has
 * no pill, hashtags don't pillify, etc.
 *
 * This plugin walks the same Lezer AST plus a few regex passes and emits
 * Decoration.line/mark entries that add the missing class names. It's
 * intentionally additive: it never hides characters, so it doesn't interact
 * with the marker-hide decoration set or the cursor-line exemption.
 */

const treeParser = baseMarkdownParser.configure([GFM]);

const HASHTAG_RE = /(?:^|[\s({\[])(#[A-Za-z][\w/-]*)/g;
const WIKILINK_RE = /(!?)\[\[([^\]\n]+)\]\]/g;
const CALLOUT_RE = /^(\s*>+\s*)\[!([^\]\n]+)\]([+-])?/;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

const headingLines = [
  Decoration.line({ class: "HyperMD-header HyperMD-header-1 cm-heading cm-heading-1" }),
  Decoration.line({ class: "HyperMD-header HyperMD-header-2 cm-heading cm-heading-2" }),
  Decoration.line({ class: "HyperMD-header HyperMD-header-3 cm-heading cm-heading-3" }),
  Decoration.line({ class: "HyperMD-header HyperMD-header-4 cm-heading cm-heading-4" }),
  Decoration.line({ class: "HyperMD-header HyperMD-header-5 cm-heading cm-heading-5" }),
  Decoration.line({ class: "HyperMD-header HyperMD-header-6 cm-heading cm-heading-6" }),
] as const;

const codeblockLine = Decoration.line({ class: "HyperMD-codeblock cm-codeblock" });
const codeblockBegin = Decoration.line({
  class: "HyperMD-codeblock HyperMD-codeblock-begin cm-codeblock",
});
const codeblockEnd = Decoration.line({
  class: "HyperMD-codeblock HyperMD-codeblock-end cm-codeblock",
});
const tableLine = Decoration.line({ class: "HyperMD-table-row cm-table-row" });
const tableHeadLine = Decoration.line({
  class: "HyperMD-table-row HyperMD-table-row-0 cm-table-row cm-table-row-head",
});
const tableSepLine = Decoration.line({ class: "HyperMD-table-row cm-table-row cm-table-sep" });
const blockquoteLine = Decoration.line({ class: "HyperMD-quote cm-quote-line" });
const calloutLine = Decoration.line({ class: "HyperMD-callout cm-callout" });
const listLine = Decoration.line({ class: "HyperMD-list cm-list-line" });
const frontmatterLine = Decoration.line({ class: "cm-frontmatter" });
const frontmatterFenceLine = Decoration.line({ class: "cm-frontmatter cm-frontmatter-fence" });

const inlineCodeMark = Decoration.mark({ class: "cm-inline-code" });
const hashtagMark = Decoration.mark({ class: "cm-hashtag" });
const linkTextMark = Decoration.mark({ class: "cm-link" });
const blockIdMark = Decoration.mark({ class: "cm-block-id" });
const footnoteRefMark = Decoration.mark({ class: "cm-footnote-ref" });

interface LineDecoEntry {
  readonly pos: number;
  readonly deco: Decoration;
}

interface MarkDecoEntry {
  readonly from: number;
  readonly to: number;
  readonly deco: Decoration;
}

function frontmatterRange(text: string): { from: number; to: number } | null {
  if (!text.startsWith("---")) return null;
  const m = text.match(FRONTMATTER_RE);
  if (!m) return null;
  return { from: 0, to: m[0].length };
}

function classDecorationsForState(state: EditorState): DecorationSet {
  const text = state.doc.toString();
  const docLength = state.doc.length;
  const lineEntries: LineDecoEntry[] = [];
  const markEntries: MarkDecoEntry[] = [];

  const pushLine = (linePos: number, deco: Decoration): void => {
    if (linePos < 0 || linePos > docLength) return;
    lineEntries.push({ pos: linePos, deco });
  };
  const pushMark = (from: number, to: number, deco: Decoration): void => {
    if (from < 0 || to > docLength || from >= to) return;
    markEntries.push({ from, to, deco });
  };

  const fm = frontmatterRange(text);
  if (fm) {
    let pos = fm.from;
    while (pos < fm.to) {
      const line = state.doc.lineAt(pos);
      const isFence = line.text === "---";
      pushLine(line.from, isFence ? frontmatterFenceLine : frontmatterLine);
      pos = line.to + 1;
    }
  }

  // Walk the AST for block-level structure.
  const tree = treeParser.parse(text);
  tree.iterate({
    enter(node: SyntaxNodeRef): boolean | undefined {
      const name = node.type.name;
      const { from, to } = node;

      // Skip everything inside the frontmatter — the Lezer parser sees the
      // YAML body as random tokens and would emit spurious headings/lists.
      if (fm && from >= fm.from && to <= fm.to) return false;

      switch (name) {
        case "ATXHeading1":
        case "ATXHeading2":
        case "ATXHeading3":
        case "ATXHeading4":
        case "ATXHeading5":
        case "ATXHeading6":
        case "SetextHeading1":
        case "SetextHeading2": {
          const level =
            name === "ATXHeading1" || name === "SetextHeading1"
              ? 1
              : name === "ATXHeading2" || name === "SetextHeading2"
                ? 2
                : name === "ATXHeading3"
                  ? 3
                  : name === "ATXHeading4"
                    ? 4
                    : name === "ATXHeading5"
                      ? 5
                      : 6;
          const startLine = state.doc.lineAt(from);
          const endLine = state.doc.lineAt(Math.max(from, to - 1));
          for (let n = startLine.number; n <= endLine.number; n++) {
            const ln = state.doc.line(n);
            const deco = headingLines[level - 1] ?? headingLines[0];
            if (deco) pushLine(ln.from, deco);
          }
          return false;
        }
        case "FencedCode":
        case "CodeBlock": {
          const startLine = state.doc.lineAt(from);
          const endLine = state.doc.lineAt(Math.min(to, docLength) - 1 < 0 ? 0 : to - 1);
          for (let n = startLine.number; n <= endLine.number; n++) {
            const ln = state.doc.line(n);
            const deco =
              n === startLine.number
                ? codeblockBegin
                : n === endLine.number
                  ? codeblockEnd
                  : codeblockLine;
            pushLine(ln.from, deco);
          }
          return false;
        }
        case "InlineCode": {
          pushMark(from, to, inlineCodeMark);
          return false;
        }
        case "Blockquote": {
          // Determine if any line in this blockquote is a callout (`> [!type]`).
          const startLine = state.doc.lineAt(from);
          const endLine = state.doc.lineAt(Math.max(from, to - 1));
          let calloutMatched = false;
          for (let n = startLine.number; n <= endLine.number; n++) {
            const ln = state.doc.line(n);
            if (!calloutMatched && CALLOUT_RE.test(ln.text)) {
              calloutMatched = true;
            }
            pushLine(ln.from, calloutMatched ? calloutLine : blockquoteLine);
          }
          // Descend so inline marks inside the quote still get applied.
          return;
        }
        case "Table": {
          const startLine = state.doc.lineAt(from);
          const endLine = state.doc.lineAt(Math.max(from, to - 1));
          for (let n = startLine.number; n <= endLine.number; n++) {
            const ln = state.doc.line(n);
            const idx = n - startLine.number;
            const deco = idx === 0 ? tableHeadLine : idx === 1 ? tableSepLine : tableLine;
            pushLine(ln.from, deco);
          }
          return;
        }
        case "BulletList":
        case "OrderedList": {
          const startLine = state.doc.lineAt(from);
          const endLine = state.doc.lineAt(Math.max(from, to - 1));
          for (let n = startLine.number; n <= endLine.number; n++) {
            const ln = state.doc.line(n);
            pushLine(ln.from, listLine);
          }
          return;
        }
        case "Link": {
          // Highlight the visible link label as `.cm-link`. The label sits
          // between the first and second `LinkMark` children.
          const ln = node.node;
          let first: { from: number; to: number } | null = null;
          let second: { from: number; to: number } | null = null;
          for (let c = ln.firstChild; c; c = c.nextSibling) {
            if (c.type.name === "LinkMark") {
              if (!first) first = { from: c.from, to: c.to };
              else if (!second) second = { from: c.from, to: c.to };
            }
          }
          if (first && second && first.to < second.from) {
            pushMark(first.to, second.from, linkTextMark);
          }
          return false;
        }
        default:
          return;
      }
    },
  });

  // Regex passes for Obsidian-only syntax.
  HASHTAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null = HASHTAG_RE.exec(text);
  while (m) {
    const tag = m[1];
    if (tag) {
      const start = m.index + m[0].length - tag.length;
      pushMark(start, start + tag.length, hashtagMark);
    }
    m = HASHTAG_RE.exec(text);
  }

  WIKILINK_RE.lastIndex = 0;
  m = WIKILINK_RE.exec(text);
  while (m) {
    const isEmbed = m[1] === "!";
    const inner = m[2];
    if (inner && !isEmbed) {
      // Tag the visible body of the wikilink (after `[[`, before `]]`) as a
      // link so the accent color applies in source mode just like for `[md](url)`.
      const start = m.index + 2 + (isEmbed ? 1 : 0);
      pushMark(start, start + inner.length, linkTextMark);
    }
    m = WIKILINK_RE.exec(text);
  }

  // Footnote ref markers: tiny visual lift.
  const FOOTNOTE_RE = /\[\^([^\]\n]+)\](?!:)/g;
  m = FOOTNOTE_RE.exec(text);
  while (m) {
    pushMark(m.index, m.index + m[0].length, footnoteRefMark);
    m = FOOTNOTE_RE.exec(text);
  }

  // Block IDs at line end (e.g. `^abc123`).
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const match = line.text.match(/(\s)\^([A-Za-z0-9-]+)\s*$/);
    if (match && match.index !== undefined) {
      const start = line.from + match.index + 1;
      pushMark(start, line.to, blockIdMark);
    }
  }

  // Sort and build. Line decorations must come before mark decorations at the
  // same offset, and everything must be ascending by start position.
  lineEntries.sort((a, b) => a.pos - b.pos);
  markEntries.sort((a, b) => a.from - b.from || a.to - b.to);

  const all: { from: number; to: number; deco: Decoration; isLine: boolean }[] = [];
  for (const e of lineEntries) all.push({ from: e.pos, to: e.pos, deco: e.deco, isLine: true });
  for (const e of markEntries) all.push({ from: e.from, to: e.to, deco: e.deco, isLine: false });
  all.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    // Line decorations must precede mark decorations at the same offset.
    if (a.isLine !== b.isLine) return a.isLine ? -1 : 1;
    return a.to - b.to;
  });

  const builder = new RangeSetBuilder<Decoration>();
  for (const entry of all) builder.add(entry.from, entry.to, entry.deco);
  return builder.finish();
}

export const livePreviewClasses = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = classDecorationsForState(view.state);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = classDecorationsForState(update.state);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
