import { Fzf } from "fzf";

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

export function fuzzyRank<T>(
  items: ReadonlyArray<T>,
  query: string,
  toText: (item: T) => string,
  options: FuzzyOptions = {},
): ReadonlyArray<FuzzyRanked<T>> {
  const opts = {
    selector: toText,
    casing: options.casing ?? "smart-case",
    limit: options.limit ?? 100,
    fuzzy: "v2" as const,
  };
  // The fzf options tuple is a discriminated union over `sort` that resists
  // inference; we cast through unknown to bypass the strict tuple signature.
  // biome-ignore lint/suspicious/noExplicitAny: justified above.
  const Ctor = Fzf as any;
  const fzf = new Ctor(items, opts) as { find: (q: string) => Array<{ item: T; score: number; positions: Set<number> }> };
  const results = fzf.find(query);
  return results.map((r) => ({
    item: r.item,
    score: r.score,
    indices: [...r.positions].sort((a, b) => a - b),
  }));
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