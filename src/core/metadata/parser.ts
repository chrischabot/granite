import yaml from "js-yaml";
import { parseWikilink } from "../markdown/renderer";

export interface HeadingInfo {
  /** 1-6 */
  readonly level: number;
  readonly text: string;
  /** Line number (0-based). */
  readonly line: number;
  /** Character offset of the heading line start. */
  readonly offset: number;
}

export interface InternalLinkInfo {
  /** Target file (no extension). */
  readonly target: string;
  readonly heading: string | null;
  readonly block: string | null;
  readonly display: string | null;
  /** Whether this is an embed (`![[…]]`) vs a plain link (`[[…]]`). */
  readonly embed: boolean;
  readonly line: number;
}

export interface TagInfo {
  readonly name: string;
  readonly line: number;
}

export interface BlockIdInfo {
  readonly id: string;
  readonly line: number;
}

export interface FootnoteInfo {
  readonly id: string;
  readonly definitionLine: number | null;
  readonly definitionBody: string;
  readonly references: ReadonlyArray<number>;
}

export interface ParsedMetadata {
  readonly frontmatter: Record<string, unknown>;
  readonly aliases: ReadonlyArray<string>;
  readonly cssClasses: ReadonlyArray<string>;
  readonly headings: ReadonlyArray<HeadingInfo>;
  readonly links: ReadonlyArray<InternalLinkInfo>;
  readonly tags: ReadonlyArray<TagInfo>;
  readonly blocks: ReadonlyArray<BlockIdInfo>;
  readonly footnotes: ReadonlyArray<FootnoteInfo>;
  /** True if the body is empty (no non-frontmatter content). */
  readonly isEmpty: boolean;
}

/** Strip frontmatter and return [frontmatter, body, body-line-offset]. */
function splitFrontmatter(src: string): { fm: string | null; body: string; bodyLine: number } {
  if (!src.startsWith("---\n") && !src.startsWith("---\r\n")) {
    return { fm: null, body: src, bodyLine: 0 };
  }
  const newline = src.startsWith("---\r\n") ? "\r\n" : "\n";
  const startLen = 3 + newline.length;
  const endMarker = `${newline}---${newline}`;
  const end = src.indexOf(endMarker, startLen);
  if (end === -1) return { fm: null, body: src, bodyLine: 0 };
  const fm = src.slice(startLen, end);
  const body = src.slice(end + endMarker.length);
  // count lines in fm + the two fence lines
  const bodyLine = fm.split(newline).length + 2;
  return { fm, body, bodyLine };
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string") return [v];
  return [];
}

const TAG_RE = /(^|\s|\(|\[)#([\p{L}\p{N}_/-]+)/gu;
const HEADING_RE = /^(#{1,6})[ \t]+(.+?)[ \t]*$/;
const BLOCK_ID_RE = /(?:^|\s)\^([a-zA-Z0-9-]+)\s*$/;
const WIKILINK_RE = /(!?)\[\[([^\]\n]+)\]\]/g;
const FOOTNOTE_DEF_RE = /^\[\^([^\]\n]+)\]:\s*(.*)$/;
const FOOTNOTE_REF_RE = /\[\^([^\]\n]+)\]/g;

export function parseMetadata(src: string): ParsedMetadata {
  const { fm, body, bodyLine } = splitFrontmatter(src);

  let frontmatter: Record<string, unknown> = {};
  if (fm !== null) {
    try {
      const parsed = yaml.load(fm);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        frontmatter = parsed as Record<string, unknown>;
      }
    } catch {
      /* parse error — leave frontmatter empty */
    }
  }

  const aliases = asStringArray(frontmatter["aliases"]);
  const cssClasses = asStringArray(frontmatter["cssclasses"]);
  const yamlTags = asStringArray(frontmatter["tags"]);

  const headings: HeadingInfo[] = [];
  const links: InternalLinkInfo[] = [];
  const tags: TagInfo[] = [];
  const blocks: BlockIdInfo[] = [];
  const footnoteMap = new Map<
    string,
    { definitionLine: number | null; definitionBody: string; references: number[] }
  >();

  // Walk body line-by-line; skip code fences so we don't pick up syntax inside.
  const lines = body.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = "";
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineIndex = bodyLine + i;

    // Track code fences.
    const fenceMatch = line.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1]!;
      } else if (line.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = "";
      }
      offset += line.length + 1;
      continue;
    }
    if (inFence) {
      offset += line.length + 1;
      continue;
    }

    // Heading.
    const hm = line.match(HEADING_RE);
    if (hm) {
      headings.push({
        level: hm[1]!.length,
        text: hm[2]!,
        line: lineIndex,
        offset,
      });
    }

    // Block ID at end of line.
    const bm = line.match(BLOCK_ID_RE);
    if (bm) {
      blocks.push({ id: bm[1]!, line: lineIndex });
    }

    // Footnote definition.
    const fnDef = line.match(FOOTNOTE_DEF_RE);
    let isFootnoteDefLine = false;
    if (fnDef) {
      isFootnoteDefLine = true;
      const id = fnDef[1]!.trim();
      const body = fnDef[2]!;
      const existing = footnoteMap.get(id);
      if (existing) {
        existing.definitionLine = lineIndex;
        existing.definitionBody = body;
      } else {
        footnoteMap.set(id, {
          definitionLine: lineIndex,
          definitionBody: body,
          references: [],
        });
      }
    }

    // Footnote references — skip the definition's own `[^id]:` token.
    if (!isFootnoteDefLine) {
      let fm: RegExpExecArray | null;
      FOOTNOTE_REF_RE.lastIndex = 0;
      while ((fm = FOOTNOTE_REF_RE.exec(line))) {
        // Skip refs inside inline code spans.
        const before = line.slice(0, fm.index);
        const ticks = (before.match(/`/g) ?? []).length;
        if (ticks % 2 === 1) continue;
        const id = fm[1]!.trim();
        const existing = footnoteMap.get(id);
        if (existing) existing.references.push(lineIndex);
        else
          footnoteMap.set(id, {
            definitionLine: null,
            definitionBody: "",
            references: [lineIndex],
          });
      }
    }

    // Wikilinks / embeds.
    let lm: RegExpExecArray | null;
    WIKILINK_RE.lastIndex = 0;
    while ((lm = WIKILINK_RE.exec(line))) {
      const isEmbed = lm[1] === "!";
      const inner = lm[2]!;
      // Skip if inside an inline code span. Crude: check for `…` around the match.
      // (Full markdown-it parsing is too expensive for the cache.)
      const before = line.slice(0, lm.index);
      const ticks = (before.match(/`/g) ?? []).length;
      if (ticks % 2 === 1) continue;
      const parts = parseWikilink(inner);
      links.push({
        target: parts.target,
        heading: parts.heading,
        block: parts.block,
        display: parts.display,
        embed: isEmbed,
        line: lineIndex,
      });
    }

    // Tags.
    let tm: RegExpExecArray | null;
    TAG_RE.lastIndex = 0;
    while ((tm = TAG_RE.exec(line))) {
      const name = tm[2]!;
      // Reject all-numeric.
      if (/^[0-9]+$/.test(name)) continue;
      tags.push({ name, line: lineIndex });
    }

    offset += line.length + 1;
  }

  // Tags from YAML.
  for (const t of yamlTags) {
    tags.push({ name: t, line: 0 });
  }

  const canonicalTags: TagInfo[] = [];
  const seenTags = new Set<string>();
  for (const tag of tags) {
    const key = tag.name.toLocaleLowerCase();
    if (seenTags.has(key)) continue;
    seenTags.add(key);
    canonicalTags.push(tag);
  }

  const footnotes: FootnoteInfo[] = [...footnoteMap.entries()]
    .map(([id, fn]) => ({
      id,
      definitionLine: fn.definitionLine,
      definitionBody: fn.definitionBody,
      references: fn.references,
    }))
    .sort((a, b) => {
      const aLine = a.definitionLine ?? a.references[0] ?? Number.POSITIVE_INFINITY;
      const bLine = b.definitionLine ?? b.references[0] ?? Number.POSITIVE_INFINITY;
      return aLine - bLine;
    });

  return {
    frontmatter,
    aliases,
    cssClasses,
    headings,
    links,
    tags: canonicalTags,
    blocks,
    footnotes,
    isEmpty: body.trim().length === 0,
  };
}
