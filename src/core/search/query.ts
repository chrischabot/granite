import type { ParsedMetadata } from "@core/metadata/parser";
import type { VaultFile, VaultPath } from "@core/fs/types";
import { stem } from "@core/fs/path";

export interface ParsedQuery {
  /** Free-text substrings that must appear anywhere in the file (case-insensitive). */
  readonly include: ReadonlyArray<string>;
  /** Free-text substrings that must NOT appear anywhere in the file. */
  readonly exclude: ReadonlyArray<string>;
  /** Tag names (without leading `#`). */
  readonly tags: ReadonlyArray<string>;
  /** Path substrings — file path must contain each. */
  readonly paths: ReadonlyArray<string>;
  /** File stem substrings. */
  readonly files: ReadonlyArray<string>;
  /** Line-level constraints — for each, at least one line in the file must contain the term. */
  readonly lineTerms: ReadonlyArray<string>;
}

const TOKEN_RE = /(?:[a-zA-Z]+:)?(?:"[^"]+"|\S+)/g;

/** Parse a structured search query. */
export function parseQuery(input: string): ParsedQuery {
  const include: string[] = [];
  const exclude: string[] = [];
  const tags: string[] = [];
  const paths: string[] = [];
  const files: string[] = [];
  const lineTerms: string[] = [];

  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(input))) {
    let token = m[0];
    if (!token) continue;
    let negate = false;
    if (token.startsWith("-")) {
      negate = true;
      token = token.slice(1);
    }
    const colonIdx = token.indexOf(":");
    let key = "";
    let value = token;
    if (colonIdx > 0 && /^[a-zA-Z]+$/.test(token.slice(0, colonIdx))) {
      key = token.slice(0, colonIdx).toLowerCase();
      value = token.slice(colonIdx + 1);
    }
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }
    if (!value) continue;
    switch (key) {
      case "tag":
        tags.push(value.replace(/^#/, ""));
        break;
      case "path":
        paths.push(value);
        break;
      case "file":
        files.push(value);
        break;
      case "line":
        lineTerms.push(value);
        break;
      default: {
        if (negate) exclude.push(value);
        else include.push(value);
      }
    }
  }

  return { include, exclude, tags, paths, files, lineTerms };
}

export interface QueryContext {
  readonly file: VaultFile;
  readonly content: string;
  readonly metadata: ParsedMetadata | null;
}

export interface MatchOptions {
  readonly matchCase?: boolean;
}

/** Test whether the given file passes the structured query. */
export function fileMatchesQuery(
  query: ParsedQuery,
  ctx: QueryContext,
  options: MatchOptions = {},
): boolean {
  const cased = !!options.matchCase;
  const haystack = cased ? ctx.content : ctx.content.toLowerCase();
  const path = cased ? ctx.file.path : ctx.file.path.toLowerCase();
  const fileStem = cased ? stem(ctx.file.path) : stem(ctx.file.path).toLowerCase();
  for (const term of query.include) {
    const needle = cased ? term : term.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  for (const term of query.exclude) {
    const needle = cased ? term : term.toLowerCase();
    if (haystack.includes(needle)) return false;
  }
  for (const p of query.paths) {
    const needle = cased ? p : p.toLowerCase();
    if (!path.includes(needle)) return false;
  }
  for (const f of query.files) {
    const needle = cased ? f : f.toLowerCase();
    if (!fileStem.includes(needle)) return false;
  }
  if (query.tags.length > 0) {
    const tagsRaw = ctx.metadata
      ? ctx.metadata.tags.map((t) => t.name)
      : extractInlineTagsFromText(ctx.content);
    const tagSet = new Set(cased ? tagsRaw : tagsRaw.map((t) => t.toLowerCase()));
    for (const wanted of query.tags) {
      const needle = cased ? wanted : wanted.toLowerCase();
      if (!tagSet.has(needle)) return false;
    }
  }
  if (query.lineTerms.length > 0) {
    const rawLines = ctx.content.split("\n");
    const lines = cased ? rawLines : rawLines.map((l) => l.toLowerCase());
    for (const term of query.lineTerms) {
      const needle = cased ? term : term.toLowerCase();
      if (!lines.some((line) => line.includes(needle))) return false;
    }
  }
  return true;
}

function extractInlineTagsFromText(text: string): string[] {
  const out: string[] = [];
  const re = /(^|\s|\(|\[)#([\p{L}\p{N}_/-]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const tag = m[2]!;
    if (!/^[0-9]+$/.test(tag)) out.push(tag);
  }
  return out;
}

/**
 * Find lines containing any include OR `line:` term. Returns up to `limit`
 * matches, each with the line number and the trimmed line preview.
 */
export function findLineMatches(
  content: string,
  query: ParsedQuery,
  limit = 5,
  options: MatchOptions = {},
): Array<{ line: number; preview: string }> {
  const cased = !!options.matchCase;
  const lines = content.split("\n");
  const out: Array<{ line: number; preview: string }> = [];
  const terms: string[] = [
    ...query.include.map((t) => (cased ? t : t.toLowerCase())),
    ...query.lineTerms.map((t) => (cased ? t : t.toLowerCase())),
  ];
  for (let i = 0; i < lines.length && out.length < limit; i++) {
    const line = lines[i] ?? "";
    const haystack = cased ? line : line.toLowerCase();
    if (terms.length === 0) {
      if (line.trim().length === 0) continue;
      if (out.length === 0) out.push({ line: i, preview: line.trim() });
      continue;
    }
    if (terms.some((t) => haystack.includes(t))) {
      out.push({ line: i, preview: line.trim() });
    }
  }
  return out;
}

export function isMarkdownPath(path: VaultPath): boolean {
  return path.toLowerCase().endsWith(".md");
}