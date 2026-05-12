import { foldEffect, foldedRanges } from "@codemirror/language";
import type { EditorState, StateEffect } from "@codemirror/state";

export interface PersistedFoldRange {
  readonly from: number;
  readonly to: number;
}

export function normalizeFoldRanges(
  ranges: ReadonlyArray<PersistedFoldRange>,
  docLength = Number.POSITIVE_INFINITY,
): PersistedFoldRange[] {
  const out: PersistedFoldRange[] = [];
  for (const range of ranges) {
    if (!Number.isInteger(range.from) || !Number.isInteger(range.to)) continue;
    if (range.from < 0 || range.to <= range.from || range.to > docLength) continue;
    out.push({ from: range.from, to: range.to });
  }
  out.sort((a, b) => a.from - b.from || a.to - b.to);

  const deduped: PersistedFoldRange[] = [];
  for (const range of out) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.from === range.from && prev.to === range.to) continue;
    deduped.push(range);
  }
  return deduped;
}

export function collectFoldRanges(state: EditorState): PersistedFoldRange[] {
  const ranges: PersistedFoldRange[] = [];
  foldedRanges(state).between(0, state.doc.length, (from, to) => {
    ranges.push({ from, to });
  });
  return normalizeFoldRanges(ranges, state.doc.length);
}

export function foldEffectsForRanges(
  ranges: ReadonlyArray<PersistedFoldRange> | undefined,
  docLength: number,
): StateEffect<unknown>[] {
  return normalizeFoldRanges(ranges ?? [], docLength).map((range) => foldEffect.of(range));
}
