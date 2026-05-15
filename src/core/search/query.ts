import { stem } from "@core/fs/path";
import type { VaultFile, VaultPath } from "@core/fs/types";
import type { ParsedMetadata } from "@core/metadata/parser";
import type { InvertedIndex } from "./inverted-index";

export type PropertyValueConstraint =
  | { kind: "null" }
  | { kind: "not-null" }
  | { kind: "equals"; value: string };

export interface PropertyConstraint {
  readonly key: string;
  /** `null` means "the property must exist with a non-null value". */
  readonly value: PropertyValueConstraint | null;
}

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
  /** /pattern/flags regexes that MUST match against the content. */
  readonly regexes: ReadonlyArray<RegExp>;
  /** Negated /pattern/flags regexes — MUST NOT match. */
  readonly negatedRegexes: ReadonlyArray<RegExp>;
  /** Frontmatter property constraints that MUST hold. */
  readonly props: ReadonlyArray<PropertyConstraint>;
  /** Negated frontmatter property constraints. */
  readonly negatedProps: ReadonlyArray<PropertyConstraint>;
}

/**
 * Top-level tokenizer. Matches, in priority order:
 *   1. Optional leading `-` for negation
 *   2. `/pattern/flags` regex literal
 *   3. `[key]` or `[key:value]` property operator
 *   4. `operator:"quoted phrase"` or `operator:bare`
 *   5. `"quoted phrase"` or `bare-term`
 */
const TOKEN_RE = /-?(?:\/(?:\\.|[^/\\])+\/[gimsuy]*|\[[^\]]+\]|(?:[a-zA-Z]+:)?(?:"[^"]+"|\S+))/g;

const REGEX_FLAGS_RE = /^[gimsuy]*$/;

function parseRegexToken(body: string): RegExp | null {
  if (!body.startsWith("/")) return null;
  // Find the matching closing slash (skipping escaped slashes).
  let end = -1;
  for (let i = 1; i < body.length; i++) {
    if (body[i] === "\\") {
      i++;
      continue;
    }
    if (body[i] === "/") {
      end = i;
      break;
    }
  }
  if (end === -1) return null;
  const pattern = body.slice(1, end);
  const flags = body.slice(end + 1);
  if (!REGEX_FLAGS_RE.test(flags)) return null;
  // Default to case-insensitive when the user omits the `i` flag entirely so
  // it matches the rest of the query's case-insensitive defaults.
  const effectiveFlags = flags.includes("i") || flags.length > 0 ? flags : "i";
  try {
    return new RegExp(pattern, effectiveFlags);
  } catch {
    return null;
  }
}

function parsePropertyToken(body: string): PropertyConstraint | null {
  if (!body.startsWith("[") || !body.endsWith("]")) return null;
  const inner = body.slice(1, -1).trim();
  if (!inner) return null;
  const colonIdx = inner.indexOf(":");
  if (colonIdx === -1) {
    return { key: inner.trim(), value: null };
  }
  const key = inner.slice(0, colonIdx).trim();
  if (!key) return null;
  let value = inner.slice(colonIdx + 1).trim();
  if (value === "null") {
    return { key, value: { kind: "null" } };
  }
  if (value === "!null" || value === "*") {
    return { key, value: { kind: "not-null" } };
  }
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    value = value.slice(1, -1);
  }
  return { key, value: { kind: "equals", value } };
}

/** Parse a structured search query. */
export function parseQuery(input: string): ParsedQuery {
  const include: string[] = [];
  const exclude: string[] = [];
  const tags: string[] = [];
  const paths: string[] = [];
  const files: string[] = [];
  const lineTerms: string[] = [];
  const regexes: RegExp[] = [];
  const negatedRegexes: RegExp[] = [];
  const props: PropertyConstraint[] = [];
  const negatedProps: PropertyConstraint[] = [];

  TOKEN_RE.lastIndex = 0;
  while (true) {
    const m = TOKEN_RE.exec(input);
    if (!m) break;
    let token = m[0];
    if (!token) continue;
    let negate = false;
    if (token.startsWith("-")) {
      negate = true;
      token = token.slice(1);
      if (!token) continue;
    }

    if (token.startsWith("/")) {
      const re = parseRegexToken(token);
      if (re) {
        if (negate) negatedRegexes.push(re);
        else regexes.push(re);
        continue;
      }
      // Malformed regex — fall through and treat as free term.
    }

    if (token.startsWith("[")) {
      const prop = parsePropertyToken(token);
      if (prop) {
        if (negate) negatedProps.push(prop);
        else props.push(prop);
        continue;
      }
      // Malformed property — fall through.
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

  return {
    include,
    exclude,
    tags,
    paths,
    files,
    lineTerms,
    regexes,
    negatedRegexes,
    props,
    negatedProps,
  };
}

export interface QueryContext {
  readonly file: VaultFile;
  readonly content: string;
  readonly metadata: ParsedMetadata | null;
}

export interface MatchOptions {
  readonly matchCase?: boolean;
}

function stringEquals(a: unknown, b: string, matchCase: boolean): boolean {
  const aStr = a == null ? "" : String(a);
  return matchCase ? aStr === b : aStr.toLowerCase() === b.toLowerCase();
}

function propMatches(
  constraint: PropertyConstraint,
  fm: Record<string, unknown>,
  matchCase: boolean,
): boolean {
  const has = Object.prototype.hasOwnProperty.call(fm, constraint.key);
  const value = has ? fm[constraint.key] : undefined;
  // Pure existence — bare `[name]` requires the key to exist with a non-null value.
  if (constraint.value === null) {
    return has && value !== null && value !== undefined;
  }
  switch (constraint.value.kind) {
    case "null":
      return !has || value === null || value === undefined;
    case "not-null":
      return has && value !== null && value !== undefined;
    case "equals": {
      const wanted = constraint.value.value;
      if (!has) return false;
      if (Array.isArray(value)) {
        return value.some((v) => stringEquals(v, wanted, matchCase));
      }
      return stringEquals(value, wanted, matchCase);
    }
  }
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
  if (query.regexes.length > 0 || query.negatedRegexes.length > 0) {
    for (const re of query.regexes) {
      // Reset lastIndex defensively in case the regex carries the `g` flag.
      re.lastIndex = 0;
      if (!re.test(ctx.content)) return false;
    }
    for (const re of query.negatedRegexes) {
      re.lastIndex = 0;
      if (re.test(ctx.content)) return false;
    }
  }
  if (query.props.length > 0 || query.negatedProps.length > 0) {
    const fm = ctx.metadata?.frontmatter ?? {};
    for (const c of query.props) {
      if (!propMatches(c, fm, cased)) return false;
    }
    for (const c of query.negatedProps) {
      if (propMatches(c, fm, cased)) return false;
    }
  }
  return true;
}

function extractInlineTagsFromText(text: string): string[] {
  const out: string[] = [];
  const re = /(^|\s|\(|\[)#([\p{L}\p{N}_/-]+)/gu;
  while (true) {
    const m = re.exec(text);
    if (!m) break;
    const tag = m[2];
    if (!tag) continue;
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

/**
 * Collect the free-text terms used to filter candidates against the inverted
 * index. We use `include` (mandatory free terms) and `lineTerms` (mandatory
 * per-line terms) — both require the substring to appear somewhere in the
 * document. `paths` / `files` / `tags` / `regexes` / properties are NOT used
 * by the index because they don't correspond to body text. `exclude` is also
 * skipped: the index narrows candidate sets, and a negative term doesn't
 * narrow — it widens. The full predicate still runs on the candidate set so
 * negative terms and other constraints are enforced there.
 */
export function indexCandidateTerms(query: ParsedQuery): ReadonlyArray<string> {
  const out: string[] = [];
  for (const t of query.include) out.push(t);
  for (const t of query.lineTerms) out.push(t);
  return out;
}

/**
 * Same semantics as `fileMatchesQuery`, but designed for batch evaluation
 * where the caller already has an inverted index. The caller is responsible
 * for pre-filtering with `prefilterCandidatesByIndex` and then calling
 * `fileMatchesQuery` per surviving candidate.
 *
 * Returns the candidate path set, or `null` if no index pre-filter was
 * possible (no free-text terms, or every term un-indexable) — in which case
 * the caller falls back to scanning every file.
 */
export function prefilterCandidatesByIndex(
  query: ParsedQuery,
  index: InvertedIndex,
): Set<VaultPath> | null {
  const terms = indexCandidateTerms(query);
  if (terms.length === 0) return null;
  return index.queryFullText(terms);
}

/**
 * Convenience: run the full predicate but skip files that the index has
 * already ruled out. Backward-compatible — if `index` is omitted the
 * behaviour is identical to `fileMatchesQuery`.
 */
export function fileMatchesQueryIndexed(
  query: ParsedQuery,
  ctx: QueryContext,
  options: MatchOptions = {},
  index?: InvertedIndex,
  prefiltered?: Set<VaultPath> | null,
): boolean {
  if (index) {
    const set = prefiltered ?? prefilterCandidatesByIndex(query, index);
    if (set !== null && !set.has(ctx.file.path)) return false;
  }
  return fileMatchesQuery(query, ctx, options);
}
