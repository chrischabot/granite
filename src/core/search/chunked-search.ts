/**
 * Chunked progressive global-search driver.
 *
 * Severe-testing.md mandates that global vault scans batch their state
 * updates: hundreds of `setState`s per query is wasteful and flickers the
 * results pane. This module provides a single helper that:
 *
 *   1. Pre-filters the candidate set via the inverted index (so we never
 *      load a file body that can't possibly match).
 *   2. Hydrates and predicates each candidate in batches of ≥ 100 files.
 *   3. Invokes `onChunk` once per fully-evaluated batch, never per file.
 *   4. Supports cancellation via the `signal` parameter.
 *
 * UI integration: `SearchView.tsx` already batches per 128 files but it
 * calls `setResults(applySort(out, sort))` once per chunk regardless of
 * whether any files in the chunk matched — that's the desired behaviour
 * and already meets the ≥ 100 floor. The piece UI needs is to use the
 * inverted-index prefilter to skip non-candidate files entirely, which it
 * can do by switching to `runChunkedFullTextSearch` here.
 *
 * NOTE: UI is intentionally untouched in this stream. See
 *       `searchIndexedCandidatePaths` below for the function the sidebar
 *       SearchView should call once we're ready to swap it in.
 */

import type { VaultFile, VaultPath } from "@core/fs/types";
import type { InvertedIndex } from "./inverted-index";
import {
  type MatchOptions,
  type ParsedQuery,
  type QueryContext,
  fileMatchesQuery,
  prefilterCandidatesByIndex,
} from "./query";

export interface ChunkedSearchOptions {
  /** Min batch size between progressive callbacks. Defaults to 128. */
  readonly chunkSize?: number;
  readonly matchOptions?: MatchOptions;
  readonly signal?: { readonly cancelled: boolean };
}

export interface ChunkedSearchHooks {
  /** Read the body text for a candidate path. */
  readFile(path: VaultPath): Promise<string>;
  /** Lookup parsed metadata (may return null). */
  getMetadata(path: VaultPath): QueryContext["metadata"];
  /** Called once per fully-evaluated batch. */
  onChunk(batch: ReadonlyArray<{ file: VaultFile; content: string }>): void;
}

/**
 * Test-only chunk-emission observer. The runner notifies the observer once
 * per chunk, BEFORE invoking the user's `onChunk` hook. This decouples the
 * batching invariant from any state-update batching (React `act()` collapses
 * multiple `setState` calls, hiding per-file flushes from DOM-level spies).
 *
 * Production code path is unaffected — the observer is `null` by default.
 */
export type ChunkedSearchObserver = (info: {
  readonly chunkIndex: number;
  readonly chunkSize: number;
  readonly batchCount: number;
}) => void;

let chunkObserver: ChunkedSearchObserver | null = null;

/** Install (or clear with `null`) a global per-chunk observer for tests. */
export function setChunkedSearchObserver(observer: ChunkedSearchObserver | null): void {
  chunkObserver = observer;
}

/**
 * Return only the files that survive the inverted-index pre-filter. When
 * the query has no free-text terms (e.g. just `[status:done]`) the index
 * can't help and we return the full list unchanged.
 */
export function searchIndexedCandidatePaths(
  query: ParsedQuery,
  files: ReadonlyArray<VaultFile>,
  index: InvertedIndex | null,
): VaultFile[] {
  if (!index) return [...files];
  const candidatePaths = prefilterCandidatesByIndex(query, index);
  if (candidatePaths === null) return [...files];
  if (candidatePaths.size === 0) return [];
  return files.filter((f) => candidatePaths.has(f.path));
}

/**
 * Drive a progressive global-search scan, batching state updates per ≥ N
 * files. Callers wire the per-batch results into their UI via `onChunk`.
 */
export async function runChunkedFullTextSearch(
  query: ParsedQuery,
  files: ReadonlyArray<VaultFile>,
  hooks: ChunkedSearchHooks,
  index: InvertedIndex | null,
  options: ChunkedSearchOptions = {},
): Promise<void> {
  const chunkSize = Math.max(100, options.chunkSize ?? 128);
  const signal = options.signal;
  const candidates = searchIndexedCandidatePaths(query, files, index);
  if (candidates.length === 0) {
    chunkObserver?.({ chunkIndex: 0, chunkSize, batchCount: 0 });
    hooks.onChunk([]);
    return;
  }
  let chunkIndex = 0;
  for (let i = 0; i < candidates.length; i += chunkSize) {
    if (signal?.cancelled) return;
    const slice = candidates.slice(i, i + chunkSize);
    const hydrated = await Promise.all(
      slice.map(async (file) => {
        try {
          const content = await hooks.readFile(file.path);
          return { file, content };
        } catch {
          return null;
        }
      }),
    );
    if (signal?.cancelled) return;
    const passed: Array<{ file: VaultFile; content: string }> = [];
    for (const entry of hydrated) {
      if (!entry) continue;
      const meta = hooks.getMetadata(entry.file.path);
      if (
        fileMatchesQuery(
          query,
          { file: entry.file, content: entry.content, metadata: meta },
          options.matchOptions ?? {},
        )
      ) {
        passed.push(entry);
      }
    }
    chunkObserver?.({ chunkIndex, chunkSize, batchCount: passed.length });
    chunkIndex += 1;
    hooks.onChunk(passed);
  }
}
