import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import { extension, stem } from "@core/fs/path";
import type { VaultFile, VaultPath } from "@core/fs/types";
import { settingsStore } from "@core/settings/store";
import { Effect } from "effect";
import { type ParsedMetadata, parseMetadata } from "./parser";

interface CacheEntry {
  readonly path: VaultPath;
  readonly mtimeMs: number;
  readonly metadata: ParsedMetadata;
}

const entries = new Map<VaultPath, CacheEntry>();
const listeners = new Set<() => void>();
let vaultBound = false;
let inflight = false;
let unsubFs: (() => void) | null = null;
let unsubSettings: (() => void) | null = null;
let lastExcludeRaw = "";

export function aggregateTagCounts(
  tagLists: Iterable<ReadonlyArray<{ readonly name: string }>>,
): Array<{ name: string; count: number }> {
  const counts = new Map<string, { name: string; count: number }>();
  for (const tags of tagLists) {
    const seenInFile = new Set<string>();
    for (const tag of tags) {
      const key = tag.name.toLocaleLowerCase();
      if (seenInFile.has(key)) continue;
      seenInFile.add(key);
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { name: tag.name, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function currentPatterns(): string[] {
  return parseExcludePatterns(settingsStore.getState().excludedFiles);
}

function emit() {
  for (const cb of listeners) cb();
}

function pruneExcluded(): boolean {
  const patterns = currentPatterns();
  if (patterns.length === 0 && entries.size === 0) return false;
  let dropped = 0;
  for (const path of [...entries.keys()]) {
    if (isExcluded(path, patterns)) {
      entries.delete(path);
      dropped += 1;
    }
  }
  return dropped > 0;
}

async function refreshOne(path: VaultPath): Promise<void> {
  if (extension(path) !== "md") return;
  if (isExcluded(path, currentPatterns())) {
    if (entries.delete(path)) emit();
    return;
  }
  try {
    const result = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const stat = yield* fs.stat(path);
        if (!stat || stat.type !== "file") return null;
        const text = yield* fs.readText(path);
        return { stat, text };
      }),
    );
    if (!result) {
      entries.delete(path);
      return;
    }
    const meta = parseMetadata(result.text);
    entries.set(path, {
      path,
      mtimeMs: result.stat.type === "file" ? result.stat.mtimeMs : 0,
      metadata: meta,
    });
  } catch {
    /* ignore individual errors */
  }
}

function bindWatcher() {
  if (vaultBound || unsubFs) return;
  vaultBound = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pending = new Set<VaultPath>();
  const flush = async () => {
    timer = null;
    const paths = [...pending];
    pending.clear();
    for (const p of paths) {
      if (extension(p) === "md") await refreshOne(p);
    }
    emit();
  };
  void run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return fs.watch((event) => {
        if (event.type === "delete") {
          entries.delete(event.path);
          emit();
          return;
        }
        if ("path" in event) {
          pending.add(event.path);
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void flush(), 200);
        }
      });
    }),
  ).then((d) => {
    unsubFs = d;
  });
}

function ensureSettingsBinding() {
  if (unsubSettings) return;
  lastExcludeRaw = settingsStore.getState().excludedFiles;
  unsubSettings = settingsStore.subscribe(() => {
    const next = settingsStore.getState().excludedFiles;
    if (next === lastExcludeRaw) return;
    const prevPatterns = parseExcludePatterns(lastExcludeRaw);
    const nextPatterns = parseExcludePatterns(next);
    lastExcludeRaw = next;
    const nextSet = new Set(nextPatterns);
    const relaxed = prevPatterns.some((p) => !nextSet.has(p));
    if (pruneExcluded()) emit();
    if (relaxed) void metadataCache.indexVault();
  });
}

ensureSettingsBinding();

export const metadataCache = {
  reset(): void {
    entries.clear();
    unsubFs?.();
    unsubFs = null;
    vaultBound = false;
    emit();
  },

  async indexVault(): Promise<void> {
    if (inflight) return;
    inflight = true;
    try {
      const patterns = currentPatterns();
      const files = await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          return yield* fs.listAll({ extensions: ["md"] });
        }),
      );
      const eligible =
        patterns.length === 0 ? files : files.filter((f) => !isExcluded(f.path, patterns));
      const chunks: VaultFile[][] = [];
      const chunkSize = 32;
      for (let i = 0; i < eligible.length; i += chunkSize) {
        chunks.push(eligible.slice(i, i + chunkSize));
      }
      for (const chunk of chunks) {
        await Promise.all(chunk.map((f) => refreshOne(f.path)));
      }
      bindWatcher();
      emit();
    } catch {
      /* swallow — cache stays partial */
    } finally {
      inflight = false;
    }
  },

  getMetadata(path: VaultPath): ParsedMetadata | null {
    return entries.get(path)?.metadata ?? null;
  },

  async ensure(path: VaultPath): Promise<ParsedMetadata | null> {
    if (!entries.has(path)) {
      await refreshOne(path);
      emit();
    }
    return entries.get(path)?.metadata ?? null;
  },

  /**
   * Find files whose links resolve to `target`. Match on file basename (stem)
   * or full path (with or without `.md` suffix).
   */
  getBacklinks(target: VaultPath): Array<{ source: VaultPath; lines: number[] }> {
    const targetStem = stem(target);
    const targetNoExt = target.replace(/\.md$/i, "");
    const results: Array<{ source: VaultPath; lines: number[] }> = [];
    for (const entry of entries.values()) {
      const matched: number[] = [];
      for (const link of entry.metadata.links) {
        if (link.target === targetStem || link.target === target || link.target === targetNoExt) {
          matched.push(link.line);
        }
      }
      if (matched.length > 0) {
        results.push({ source: entry.path, lines: matched });
      }
    }
    return results;
  },

  getAllTags(): Array<{ name: string; count: number }> {
    return aggregateTagCounts([...entries.values()].map((entry) => entry.metadata.tags));
  },

  /** Aggregate distinct frontmatter property keys vault-wide. */
  getAllProperties(): Array<{
    name: string;
    count: number;
    samples: ReadonlyArray<unknown>;
  }> {
    const counts = new Map<string, number>();
    const samples = new Map<string, unknown[]>();
    for (const entry of entries.values()) {
      const fm = entry.metadata.frontmatter;
      for (const [key, value] of Object.entries(fm)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
        const list = samples.get(key) ?? [];
        if (list.length < 16) {
          const seenKeys = new Set(list.map((v) => JSON.stringify(v)));
          const k = JSON.stringify(value);
          if (!seenKeys.has(k)) list.push(value);
        }
        samples.set(key, list);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({
        name,
        count,
        samples: samples.get(name) ?? [],
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },

  /**
   * Build a flat list of switcher/wikilink entries from the cache: one per
   * file (display name = stem) plus one per alias (display name = alias text).
   */
  getAllSwitcherEntries(): Array<{
    path: VaultPath;
    displayName: string;
    alias: string | null;
  }> {
    const out: Array<{
      path: VaultPath;
      displayName: string;
      alias: string | null;
    }> = [];
    for (const entry of entries.values()) {
      out.push({
        path: entry.path,
        displayName: stem(entry.path),
        alias: null,
      });
      for (const a of entry.metadata.aliases) {
        if (!a.trim()) continue;
        out.push({ path: entry.path, displayName: a, alias: a });
      }
    }
    return out;
  },

  /** Build a flat list of every heading across the vault. */
  getAllHeadings(): Array<{
    path: VaultPath;
    text: string;
    level: number;
    line: number;
  }> {
    const out: Array<{ path: VaultPath; text: string; level: number; line: number }> = [];
    for (const entry of entries.values()) {
      for (const h of entry.metadata.headings) {
        out.push({ path: entry.path, text: h.text, level: h.level, line: h.line });
      }
    }
    return out;
  },

  /** Build a flat list of every block id (`^id`) across the vault. Used by
   *  the `[[^^query]]` autocomplete to do vault-wide block search. */
  getAllBlocks(): Array<{
    path: VaultPath;
    id: string;
    line: number;
  }> {
    const out: Array<{ path: VaultPath; id: string; line: number }> = [];
    for (const entry of entries.values()) {
      for (const b of entry.metadata.blocks) {
        out.push({ path: entry.path, id: b.id, line: b.line });
      }
    }
    return out;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
