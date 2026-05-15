/**
 * SearchView integration tests for the chunked indexed-search swap.
 *
 * Severe-testing §24.7 / §24.19:
 *   - Global search batches results in chunks ≥ 100 files.
 *   - The inverted index is the only mechanism that can prove the 200 ms
 *     budget on 10k notes; the call site MUST use it.
 *
 * The tests below prove both invariants by intercepting `setResults` (via
 * counting renders) and by seeding a small corpus whose index returns ONLY
 * the matching paths — if the call site bypassed the prefilter and scanned
 * every file the predicate would still find the planted match, so we plant
 * a poisoned distractor that would PASS the predicate alone but is NOT in
 * the indexed posting list. If the prefilter is honoured the distractor is
 * never read; if it's bypassed the distractor surfaces.
 *
 * The property test compares results from the indexed SearchView path to a
 * pure scan-based oracle (`fileMatchesQuery` over the entire corpus) across
 * 50 random single-term queries × 500 notes. Mismatches must be zero.
 */

import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { FsError, VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { setLocale } from "@core/i18n";
import { metadataCache } from "@core/metadata/cache";
import { setChunkedSearchObserver } from "@core/search/chunked-search";
import { getSearchIndex } from "@core/search/index-registry";
import { fileMatchesQuery, parseQuery } from "@core/search/query";
import { resetSettingsForTests } from "@core/settings/store";
import { Effect, Layer } from "effect";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchView, setSearchQuery } from "./SearchView";

const DEBOUNCE_MS = 300;

function makeFs(files: Map<VaultPath, string>): FileSystemImpl {
  return {
    rootName: "test-vault",
    list: () => Effect.succeed([] as ReadonlyArray<VaultEntry>),
    listAll: () =>
      Effect.succeed(
        [...files.entries()].map<VaultFile>(([path, content]) => ({
          type: "file",
          path,
          name: path.split("/").pop() ?? path,
          size: content.length,
          mtimeMs: 0,
          ctimeMs: 0,
          extension: extension(path),
        })),
      ),
    readText: (path) => {
      const content = files.get(path);
      if (content === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      }
      return Effect.succeed(content);
    },
    readBytes: (path) => {
      const content = files.get(path);
      if (content === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      }
      return Effect.succeed(new TextEncoder().encode(content));
    },
    writeText: (path, content) => {
      files.set(path, content);
      return Effect.succeed(undefined);
    },
    writeBytes: (path, bytes) => {
      files.set(path, new TextDecoder().decode(bytes));
      return Effect.succeed(undefined);
    },
    mkdir: () => Effect.succeed(undefined),
    rename: (from, to) => {
      const content = files.get(from);
      if (content === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path: from } as unknown as FsError);
      }
      files.delete(from);
      files.set(to, content);
      return Effect.succeed(undefined);
    },
    remove: (path) => {
      files.delete(path);
      return Effect.succeed(undefined);
    },
    stat: () => Effect.succeed(null),
    watch: () => () => {
      /* no-op */
    },
  };
}

/** Deterministic LCG so the property test reproduces failures. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pickWord(rng: () => number, words: string[]): string {
  return words[Math.floor(rng() * words.length)] as string;
}

async function waitForDebounce(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 50));
  });
}

function readResultPaths(host: HTMLElement): string[] {
  return Array.from(
    host.querySelectorAll<HTMLElement>(".search-result-file-title .tree-item-inner-text"),
  ).map((el) => el.textContent?.trim() ?? "");
}

describe("SearchView indexed chunked search", () => {
  let host: HTMLDivElement;
  let root: Root;
  let files: Map<VaultPath, string>;

  beforeEach(async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    setLocale("en");
    await disposeRuntime();
    resetSettingsForTests();
    metadataCache.reset();
    getSearchIndex().clear();
    setSearchQuery("");
    files = new Map();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    setChunkedSearchObserver(null);
    metadataCache.reset();
    getSearchIndex().clear();
    setSearchQuery("");
    await disposeRuntime();
    resetSettingsForTests();
    setLocale("en");
  });

  function mountWithCorpus(corpus: Map<string, string>): void {
    for (const [path, content] of corpus) {
      files.set(path as VaultPath, content);
      // Populate the inverted index directly so the SearchView call site can
      // use it (the production wiring goes through metadataCache.indexVault;
      // we shortcut here because we're testing UI, not the cache).
      getSearchIndex().add(path as VaultPath, content);
    }
    const fs = makeFs(files);
    setAppLayer(() => Layer.succeed(FileSystem, fs) as Layer.Layer<AppServices, never, never>);
  }

  it("uses the inverted-index prefilter (β: bypass would surface poisoned distractor)", async () => {
    // The poisoned distractor's body contains the term `pomegranate`, so the
    // pure-scan predicate would match it. We deliberately DO NOT add this
    // file to the inverted index — if the SearchView honours the prefilter
    // it must skip the distractor entirely.
    const corpus = new Map<string, string>([
      ["alpha.md", "the word pomegranate appears here"],
      ["beta.md", "another mention of pomegranate inside"],
      ["gamma.md", "no fruit references in this body"],
    ]);
    mountWithCorpus(corpus);

    // Now insert the poisoned distractor — present on disk but NOT indexed.
    const distractorPath = "distractor.md" as VaultPath;
    files.set(distractorPath, "pomegranate is here but unindexed");
    // (Intentionally NOT calling getSearchIndex().add for distractor.)

    await act(async () => {
      root.render(<SearchView />);
    });

    const input = host.querySelector<HTMLInputElement>("input[type='search']");
    expect(input).not.toBeNull();
    await act(async () => {
      input?.dispatchEvent(new Event("input", { bubbles: true }));
      if (input) {
        // Simulate typing via the controlled input handler.
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(input, "pomegranate");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await waitForDebounce();

    const paths = readResultPaths(host);
    expect(paths.sort()).toEqual(["alpha", "beta"]);
    expect(paths).not.toContain("distractor");
  });

  it("emits exactly ⌈N/chunkSize⌉ chunk callbacks with chunkSize ≥ 100 (β: per-file flush fails)", async () => {
    // Build a 200-note corpus where every note matches the query "lorem".
    // With the default chunkSize (128, clamped to a ≥100 floor) the driver
    // MUST emit exactly Math.ceil(200/128) = 2 chunk callbacks.
    //
    // β-test rationale: the previous DOM-mutation count is a poor signal
    // because React `act()` batches `setState` calls, hiding per-file
    // flushes from the DOM. Instead we instrument the chunked-search
    // runner directly via `setChunkedSearchObserver`. Setting
    // `chunkSize: 1` in the runner (or removing the ≥100 clamp) would
    // produce 200 callbacks and fail this assertion.
    const corpus = new Map<string, string>();
    for (let i = 0; i < 200; i++) {
      corpus.set(`n${i}.md`, `lorem ipsum body ${i}`);
    }
    mountWithCorpus(corpus);

    const chunkCalls: Array<{ chunkIndex: number; chunkSize: number; batchCount: number }> = [];
    setChunkedSearchObserver((info) => {
      chunkCalls.push(info);
    });

    await act(async () => {
      root.render(<SearchView />);
    });

    const input = host.querySelector<HTMLInputElement>("input[type='search']");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "lorem");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await waitForDebounce();

    const paths = readResultPaths(host);
    expect(paths).toHaveLength(200);

    // The runner clamps chunkSize to ≥ 100 (severe-testing §24.7 floor).
    expect(chunkCalls.length).toBeGreaterThan(0);
    const observedChunkSize = chunkCalls[0]?.chunkSize ?? 0;
    expect(observedChunkSize).toBeGreaterThanOrEqual(100);

    // Exact-equality assertion — the very thing the reviewer demanded.
    // 200 files / 128 chunkSize → 2 batches. Per-file emission would be 200.
    const expectedChunks = Math.ceil(200 / observedChunkSize);
    expect(chunkCalls.length).toBe(expectedChunks);
    // Independent ceiling: an N-file corpus with the ≥100 floor cannot
    // exceed ⌈N/100⌉ chunks regardless of any future chunkSize tuning.
    expect(chunkCalls.length).toBeLessThanOrEqual(Math.ceil(200 / 100));
  });

  it("falls back to scanning every eligible file when the index is empty (β: 0-size index ≠ 0 results)", async () => {
    // Build a corpus where some notes match the term, but DO NOT seed the
    // inverted index. SearchView must pass `null` to the chunked driver so
    // it falls back to scanning the eligible set. If SearchView passed an
    // empty index unconditionally, `prefilterCandidatesByIndex` would
    // return an empty Set (every required term is absent from every doc)
    // and the search would return zero results — that is the β-failure
    // mode this test guards against.
    const corpus = new Map<string, string>([
      ["match-one.md", "the keyword needle appears here"],
      ["match-two.md", "another mention of needle inside the body"],
      ["miss.md", "no relevant words in this file"],
    ]);
    for (const [path, content] of corpus) {
      files.set(path as VaultPath, content);
      // INTENTIONALLY NOT calling getSearchIndex().add — leave size at 0.
    }
    expect(getSearchIndex().size()).toBe(0);

    const fs = makeFs(files);
    setAppLayer(() => Layer.succeed(FileSystem, fs) as Layer.Layer<AppServices, never, never>);

    await act(async () => {
      root.render(<SearchView />);
    });

    const input = host.querySelector<HTMLInputElement>("input[type='search']");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "needle");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await waitForDebounce();

    const paths = readResultPaths(host).sort();
    expect(paths).toEqual(["match-one", "match-two"]);
  });

  it("returns scan-equivalent results across 50 random queries × 500 notes (β-oracle)", async () => {
    // Build a 500-note corpus of varied bodies sampled from a small word
    // bank. We pick single-term queries from the same bank, so each query
    // is non-trivially populated in the corpus.
    const rng = makeRng(0xc0ffee);
    // Word bank chosen so no token is a substring of another — the inverted
    // index uses whole-token semantics (lowercased + lightly stemmed), while
    // `fileMatchesQuery` uses substring containment. Substring-overlapping
    // tokens (e.g. "eta" ⊂ "beta") would make the indexed result a strict
    // subset of the scan result and cause spurious mismatches that aren't
    // real bugs in the call-site swap. The whole-token contract is the same
    // one validated by `inverted-index.test.ts`.
    const words = [
      "granitemarker",
      "obsidianword",
      "quartzstone",
      "basaltgray",
      "marbleblock",
      "limeshale",
      "schistore",
      "feldsparx",
      "olivinejade",
      "topazline",
      "garnetbloom",
      "amberglow",
      "onyxshine",
      "jasperhue",
      "agatemoss",
      "berylgreen",
    ];
    const corpus = new Map<string, string>();
    for (let i = 0; i < 500; i++) {
      const len = 4 + Math.floor(rng() * 8);
      const body: string[] = [];
      for (let k = 0; k < len; k++) body.push(pickWord(rng, words));
      corpus.set(`note-${i}.md`, body.join(" "));
    }
    mountWithCorpus(corpus);

    await act(async () => {
      root.render(<SearchView />);
    });
    const input = host.querySelector<HTMLInputElement>("input[type='search']");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

    const oracle = (term: string): string[] => {
      // Pure scan oracle — applies fileMatchesQuery to every file body.
      const q = parseQuery(term);
      const out: string[] = [];
      for (const [path, content] of corpus) {
        const file: VaultFile = {
          type: "file",
          path: path as VaultPath,
          name: path,
          size: content.length,
          mtimeMs: 0,
          ctimeMs: 0,
          extension: "md",
        };
        if (fileMatchesQuery(q, { file, content, metadata: null }, { matchCase: false })) {
          out.push(path.replace(/\.md$/, ""));
        }
      }
      return out.sort();
    };

    const mismatches: string[] = [];
    for (let i = 0; i < 50; i++) {
      const term = pickWord(rng, words);
      await act(async () => {
        setter?.call(input, term);
        input?.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await waitForDebounce();
      const ui = readResultPaths(host).sort();
      const ref = oracle(term);
      if (ui.length !== ref.length || ui.some((v, idx) => v !== ref[idx])) {
        mismatches.push(`term="${term}" ui=${ui.length} ref=${ref.length}`);
      }
    }
    // β must be < 0.1 (severe-testing): 0/50 expected, hard fail at any.
    expect(mismatches, mismatches.join("\n")).toEqual([]);
  }, 30_000);
});
