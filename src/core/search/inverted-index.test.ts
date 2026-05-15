import { describe, expect, it } from "vitest";
import {
  analyze,
  createInvertedIndex,
  intersectSorted,
  stemToken,
  tokenize,
} from "./inverted-index";

// --- Deterministic PRNG (mulberry32) ---------------------------------------
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, xs: ReadonlyArray<T>): T {
  return xs[Math.floor(rng() * xs.length) % xs.length] as T;
}

// Adversarial token alphabet: ASCII, mixed case, digits, Greek, Hebrew, CJK,
// emoji (which the tokenizer must DROP), and punctuation separators.
const WORDS_ASCII = [
  "alpha",
  "beta",
  "Gamma",
  "DELTA",
  "epsilon",
  "running",
  "runs",
  "ran",
  "cats",
  "cat",
  "ponies",
  "pony",
  "happily",
  "happy",
  "faster",
  "fastest",
];
const WORDS_UNICODE = ["αβγ", "λόγος", "שלום", "תורה", "你好", "世界", "東京"];
const NUMBERS = ["42", "007", "100", "9001"];
const EMOJI = ["🔥", "✨", "🎉", "🚀"]; // must be ignored
const PUNCT = [" ", ".", ",", ";", "\n", "  ", "—", "(", ")", "/"];

function makeNote(rng: () => number, minTokens = 10, maxTokens = 500): string {
  const n = Math.floor(rng() * (maxTokens - minTokens + 1)) + minTokens;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng();
    let tok: string;
    if (r < 0.5) tok = pick(rng, WORDS_ASCII);
    else if (r < 0.75) tok = pick(rng, WORDS_UNICODE);
    else if (r < 0.85) tok = pick(rng, NUMBERS);
    else if (r < 0.92) tok = pick(rng, EMOJI);
    else tok = pick(rng, WORDS_ASCII).toUpperCase();
    out.push(tok);
    out.push(pick(rng, PUNCT));
  }
  return out.join("");
}

// Scan oracle. Returns paths whose content, after the same analyze pipeline,
// contains ALL query terms. This is the ground truth.
// `precomputedTokens` lets callers reuse the same token sets across many
// queries — analyse-on-every-query is O(corpus · query) and would dominate
// the property-test wall time.
function oracleQuery(
  corpus: ReadonlyArray<{ path: string; content: string }>,
  terms: ReadonlyArray<string>,
  precomputedTokens?: ReadonlyArray<Set<string>>,
): Set<string> {
  const out = new Set<string>();
  const stemmedTerms = terms.flatMap((t) => analyze(t));
  if (stemmedTerms.length === 0) {
    for (const c of corpus) out.add(c.path);
    return out;
  }
  for (let i = 0; i < corpus.length; i++) {
    const entry = corpus[i] as { path: string; content: string };
    const docTokens = (precomputedTokens?.[i] ?? new Set(analyze(entry.content))) as Set<string>;
    if (stemmedTerms.every((t) => docTokens.has(t))) out.add(entry.path);
  }
  return out;
}

describe("tokenize", () => {
  it("lowercases", () => {
    expect(tokenize("Hello World")).toEqual(["hello", "world"]);
  });

  it("splits on punctuation and whitespace", () => {
    expect(tokenize("a, b; c—d/e")).toEqual(["a", "b", "c", "d", "e"].filter((t) => t.length >= 2));
  });

  it("keeps Unicode letter runs together", () => {
    expect(tokenize("αβγ λόγος שלום 你好")).toEqual(["αβγ", "λόγος", "שלום", "你好"]);
  });

  it("drops tokens shorter than minLen", () => {
    expect(tokenize("I am ok", 2)).toEqual(["am", "ok"]);
    expect(tokenize("I am ok", 3)).toEqual([]);
  });

  it("drops emoji (Symbol/So is not a letter)", () => {
    expect(tokenize("hello 🔥 world ✨")).toEqual(["hello", "world"]);
  });

  it("includes digits and mixed alphanumeric", () => {
    expect(tokenize("note42 v3 9001")).toEqual(["note42", "v3", "9001"]);
  });
});

describe("stemToken", () => {
  it("strips simple plurals", () => {
    expect(stemToken("cats")).toBe("cat");
  });
  it("folds -ies → -y", () => {
    expect(stemToken("ponies")).toBe("pony");
  });
  it("strips -ing", () => {
    expect(stemToken("running")).toBe("runn");
  });
  it("leaves short words alone", () => {
    expect(stemToken("the")).toBe("the");
    expect(stemToken("cat")).toBe("cat");
  });
  it("is idempotent across one strip", () => {
    // After one pass the residual should not need another strip down to <3 chars.
    expect(stemToken(stemToken("cats"))).toBe("cat");
  });
});

describe("intersectSorted (galloping)", () => {
  it("returns empty on empty input", () => {
    expect(intersectSorted([])).toEqual([]);
  });
  it("returns empty if any list is empty", () => {
    expect(intersectSorted([[1, 2], []])).toEqual([]);
  });
  it("intersects two lists", () => {
    expect(
      intersectSorted([
        [1, 3, 5, 7, 9],
        [3, 4, 5, 9],
      ]),
    ).toEqual([3, 5, 9]);
  });
  it("intersects many lists, finishing early when shortest exhausts", () => {
    expect(intersectSorted([[5], [1, 2, 3, 4, 5, 6], [5, 7, 9]])).toEqual([5]);
  });
  it("handles highly skewed sizes", () => {
    const big = Array.from({ length: 10_000 }, (_, i) => i);
    const small = [123, 4567, 9999];
    expect(intersectSorted([big, small])).toEqual([123, 4567, 9999]);
  });
  it("returns nothing when there is no overlap", () => {
    expect(
      intersectSorted([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toEqual([]);
  });
});

describe("inverted index — basic CRUD", () => {
  it("add/query single term", () => {
    const ix = createInvertedIndex();
    ix.add("a.md", "hello world");
    ix.add("b.md", "goodbye world");
    expect(ix.queryFullText(["hello"])).toEqual(new Set(["a.md"]));
    expect(ix.queryFullText(["world"])).toEqual(new Set(["a.md", "b.md"]));
  });

  it("query intersection requires all terms", () => {
    const ix = createInvertedIndex();
    ix.add("a.md", "hello world");
    ix.add("b.md", "hello there");
    ix.add("c.md", "world peace");
    expect(ix.queryFullText(["hello", "world"])).toEqual(new Set(["a.md"]));
  });

  it("update replaces the document — old tokens no longer match", () => {
    const ix = createInvertedIndex();
    ix.add("a.md", "alpha beta");
    expect(ix.queryFullText(["alpha"])).toEqual(new Set(["a.md"]));
    ix.update("a.md", "gamma delta");
    expect(ix.queryFullText(["alpha"])).toEqual(new Set());
    expect(ix.queryFullText(["gamma"])).toEqual(new Set(["a.md"]));
  });

  it("remove drops the document from all postings", () => {
    const ix = createInvertedIndex();
    ix.add("a.md", "alpha beta");
    ix.add("b.md", "alpha gamma");
    ix.remove("a.md");
    expect(ix.queryFullText(["alpha"])).toEqual(new Set(["b.md"]));
    expect(ix.queryFullText(["beta"])).toEqual(new Set());
  });

  it("absent term → empty result, not entire corpus", () => {
    const ix = createInvertedIndex();
    ix.add("a.md", "alpha beta");
    expect(ix.queryFullText(["zzznotpresent"])).toEqual(new Set());
  });

  it("query with only un-indexable tokens (emoji) returns every doc", () => {
    const ix = createInvertedIndex();
    ix.add("a.md", "hello");
    ix.add("b.md", "world");
    expect(ix.queryFullText(["🔥"])).toEqual(new Set(["a.md", "b.md"]));
  });

  it("size and clear", () => {
    const ix = createInvertedIndex();
    ix.add("a.md", "x");
    ix.add("b.md", "y");
    expect(ix.size()).toBe(2);
    ix.clear();
    expect(ix.size()).toBe(0);
    expect(ix.queryFullText(["x"])).toEqual(new Set());
  });
});

// --- Property test against the scan oracle --------------------------------
describe("inverted index — property test vs scan oracle", () => {
  const NUM_NOTES = 1000;
  const NUM_QUERIES_PER_SEED = 200;
  const SEEDS = Array.from({ length: 50 }, (_, i) => 0xa5a5_0000 + i);

  it("matches the scan oracle across 50 seeds × 200 queries each", () => {
    let totalChecks = 0;
    let totalNonEmptyResults = 0;
    let totalEmptyResults = 0;

    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      const corpus: Array<{ path: string; content: string }> = [];
      for (let i = 0; i < NUM_NOTES; i++) {
        corpus.push({ path: `n${i}.md`, content: makeNote(rng) });
      }
      const ix = createInvertedIndex();
      for (const { path, content } of corpus) ix.add(path, content);
      // Precompute token sets for the oracle — analyse-per-query would be
      // O(notes · queries) of work and dominate test wall time.
      const precomputed = corpus.map((c) => new Set(analyze(c.content)));

      // Build a pool of "valid" tokens that actually appear in the corpus
      // plus some adversarial misses.
      const tokenPool = [
        ...WORDS_ASCII,
        ...WORDS_UNICODE,
        ...NUMBERS,
        "neverappearstoken",
        "zzznotinthecorpus",
        "🔥", // un-indexable
      ];

      for (let q = 0; q < NUM_QUERIES_PER_SEED; q++) {
        const numTerms = 1 + Math.floor(rng() * 4); // 1..4
        const terms: string[] = [];
        for (let t = 0; t < numTerms; t++) terms.push(pick(rng, tokenPool));
        const got = ix.queryFullText(terms) ?? new Set();
        const want = oracleQuery(corpus, terms, precomputed);
        if (got.size !== want.size || [...got].some((p) => !want.has(p))) {
          throw new Error(
            `MISMATCH seed=${seed} query=${JSON.stringify(terms)} got=${[...got]
              .sort()
              .slice(0, 5)
              .join(",")}... want=${[...want].sort().slice(0, 5).join(",")}...`,
          );
        }
        totalChecks++;
        if (got.size === 0) totalEmptyResults++;
        else totalNonEmptyResults++;
      }
    }
    expect(totalChecks).toBe(SEEDS.length * NUM_QUERIES_PER_SEED);
    // Make sure the corpus + query design exercises both empty and non-empty
    // paths, otherwise we'd be testing only half the surface.
    expect(totalNonEmptyResults).toBeGreaterThan(100);
    expect(totalEmptyResults).toBeGreaterThan(10);
  });

  it("cache invariants survive interleaved add/update/remove", () => {
    // Mutation fuzz: random ops then compare against oracle from final state.
    for (const seed of SEEDS.slice(0, 10)) {
      const rng = makeRng(seed ^ 0xdeadbeef);
      const ix = createInvertedIndex();
      const state = new Map<string, string>();
      const ops = 500;
      for (let i = 0; i < ops; i++) {
        const path = `n${Math.floor(rng() * 50)}.md`;
        const r = rng();
        if (r < 0.6) {
          const content = makeNote(rng, 5, 50);
          ix.update(path, content);
          state.set(path, content);
        } else if (r < 0.9 && state.has(path)) {
          ix.remove(path);
          state.delete(path);
        } else {
          const content = makeNote(rng, 5, 50);
          ix.add(path, content);
          state.set(path, content);
        }
      }
      const corpus = [...state.entries()].map(([path, content]) => ({ path, content }));
      for (let q = 0; q < 50; q++) {
        const terms = [pick(rng, WORDS_ASCII), pick(rng, [...WORDS_UNICODE, ...NUMBERS])];
        const got = ix.queryFullText(terms) ?? new Set();
        const want = oracleQuery(corpus, terms);
        if (got.size !== want.size || [...got].some((p) => !want.has(p))) {
          throw new Error(
            `MUTATION MISMATCH seed=${seed} query=${JSON.stringify(terms)} ` +
              `got=${got.size} want=${want.size}`,
          );
        }
      }
    }
  });
});

// --- Performance test -----------------------------------------------------
describe("inverted index — 10k-note performance", () => {
  it("p95 < 5 ms / p99 < 15 ms for single-term queries", () => {
    const NOTE_COUNT = 10_000;
    const rng = makeRng(0xface_b00c);
    const ix = createInvertedIndex();
    // Build a deterministic corpus seeded for reproducibility.
    const queries: string[] = [];
    for (let i = 0; i < NOTE_COUNT; i++) {
      ix.add(`Notes/Note ${i}.md`, makeNote(rng, 50, 200));
    }
    // Pick 50 distinct query terms from our vocabulary.
    const vocab = [...WORDS_ASCII, ...WORDS_UNICODE, ...NUMBERS];
    for (let i = 0; i < 50; i++) {
      queries.push(vocab[i % vocab.length] as string);
    }
    // Warm
    for (const q of queries.slice(0, 5)) ix.queryFullText([q]);
    const timings: number[] = [];
    for (const q of queries) {
      const start = performance.now();
      ix.queryFullText([q]);
      timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    const p50 = timings[Math.floor(timings.length * 0.5)] as number;
    const p95 = timings[Math.floor(timings.length * 0.95)] as number;
    const p99 = timings[Math.min(timings.length - 1, Math.floor(timings.length * 0.99))] as number;
    // Generous bounds — single-term lookup is a map fetch + small set copy.
    // We intentionally pick 5 ms / 15 ms so we have margin on slow CI.
    expect(p50).toBeLessThan(5);
    expect(p95).toBeLessThan(5);
    expect(p99).toBeLessThan(15);
  });
});
