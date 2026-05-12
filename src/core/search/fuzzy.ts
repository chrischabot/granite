export interface FuzzyMatch {
  readonly score: number;
  /** Character positions in the source string that matched. */
  readonly indices: ReadonlyArray<number>;
}

export interface FuzzyRanked<T> extends FuzzyMatch {
  readonly item: T;
}

export interface FuzzyOptions {
  readonly limit?: number;
  readonly casing?: "case-sensitive" | "case-insensitive" | "smart-case";
}

export interface FuzzyIndex<T> {
  readonly entries: ReadonlyArray<{
    readonly item: T;
    readonly text: string;
    readonly folded: string;
  }>;
  readonly limit: number;
  readonly casing: "case-sensitive" | "case-insensitive" | "smart-case";
}

export function createFuzzyIndex<T>(
  items: ReadonlyArray<T>,
  toText: (item: T) => string,
  options: FuzzyOptions = {},
): FuzzyIndex<T> {
  return {
    entries: items.map((item) => {
      const text = toText(item);
      return { item, text, folded: text.toLowerCase() };
    }),
    casing: options.casing ?? "smart-case",
    limit: options.limit ?? 100,
  };
}

function shouldMatchCase(query: string, casing: FuzzyIndex<unknown>["casing"]): boolean {
  if (casing === "case-sensitive") return true;
  if (casing === "case-insensitive") return false;
  return /[A-Z]/.test(query);
}

function scoreMatch(text: string, query: string): FuzzyMatch | null {
  const contiguous = text.indexOf(query);
  if (contiguous >= 0) {
    const indices = Array.from({ length: query.length }, (_, i) => contiguous + i);
    const wordBonus = contiguous === 0 || /[\s/_-]/.test(text[contiguous - 1] ?? "") ? 2_000 : 0;
    return {
      score: 10_000 + wordBonus - contiguous - Math.max(0, text.length - query.length) * 0.01,
      indices,
    };
  }

  const indices: number[] = [];
  let from = 0;
  let gaps = 0;
  for (const char of query) {
    const idx = text.indexOf(char, from);
    if (idx === -1) return null;
    const prev = indices[indices.length - 1];
    if (prev !== undefined) gaps += idx - prev - 1;
    indices.push(idx);
    from = idx + 1;
  }
  const first = indices[0] ?? 0;
  return {
    score: 5_000 - first * 2 - gaps * 8 - Math.max(0, text.length - query.length) * 0.01,
    indices,
  };
}

export function rankFuzzyIndex<T>(
  index: FuzzyIndex<T>,
  query: string,
): ReadonlyArray<FuzzyRanked<T>> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const cased = shouldMatchCase(trimmed, index.casing);
  const needle = cased ? trimmed : trimmed.toLowerCase();
  const out: FuzzyRanked<T>[] = [];

  for (const entry of index.entries) {
    const haystack = cased ? entry.text : entry.folded;
    const match = scoreMatch(haystack, needle);
    if (!match) continue;
    out.push({ item: entry.item, score: match.score, indices: match.indices });
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, index.limit);
}

export function fuzzyRank<T>(
  items: ReadonlyArray<T>,
  query: string,
  toText: (item: T) => string,
  options: FuzzyOptions = {},
): ReadonlyArray<FuzzyRanked<T>> {
  return rankFuzzyIndex(createFuzzyIndex(items, toText, options), query);
}

/** Render a string with the matched character positions wrapped in <mark>. */
export function highlightMatches(
  text: string,
  indices: ReadonlyArray<number> | null | undefined,
): Array<{ text: string; matched: boolean }> {
  if (!indices || indices.length === 0) return [{ text, matched: false }];
  const out: Array<{ text: string; matched: boolean }> = [];
  let i = 0;
  let matchIdx = 0;
  while (i < text.length) {
    const next = indices[matchIdx];
    if (next === i) {
      const start = i;
      while (matchIdx < indices.length && indices[matchIdx] === i) {
        i++;
        matchIdx++;
      }
      out.push({ text: text.slice(start, i), matched: true });
    } else {
      const stop = next ?? text.length;
      out.push({ text: text.slice(i, stop), matched: false });
      i = stop;
    }
  }
  return out;
}
