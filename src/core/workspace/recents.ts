import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { Effect } from "effect";

const STORAGE_KEY = "granite.recents.v1";
const MAX_RECENTS = 32;

const subscribers = new Set<() => void>();
let cache: string[] | null = null;
let fsBound = false;
let unsubFs: (() => void) | null = null;

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function save(list: ReadonlyArray<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

function emit(): void {
  cache = null;
  for (const cb of subscribers) cb();
}

export function listRecents(): ReadonlyArray<string> {
  if (cache === null) cache = load();
  return cache;
}

export function addRecent(path: string): void {
  if (!path) return;
  const current = load();
  const next = [path, ...current.filter((p) => p !== path)].slice(0, MAX_RECENTS);
  save(next);
  emit();
}

export function removeRecent(path: string): void {
  const current = load();
  const next = current.filter((p) => p !== path);
  if (next.length === current.length) return;
  save(next);
  emit();
}

export function clearRecents(): void {
  save([]);
  emit();
}

/**
 * Rewrite a path in the recents list. Called when a file is renamed/moved so
 * the entry tracks its new location instead of dangling as a "ghost" pointing
 * at a path that no longer exists.
 */
export function renameRecent(oldPath: string, newPath: string): void {
  if (!oldPath || !newPath || oldPath === newPath) return;
  const current = load();
  // Drop the old path and any existing entry for the new path (dedupe), then
  // insert the new path where the old one used to be so the user doesn't lose
  // its position in the MRU list.
  const idx = current.indexOf(oldPath);
  if (idx === -1) return;
  const without = current.filter((p) => p !== oldPath && p !== newPath);
  without.splice(idx, 0, newPath);
  save(without.slice(0, MAX_RECENTS));
  emit();
}

export function subscribeRecents(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/**
 * Subscribe to filesystem events so the recents list stays in sync as files
 * are renamed/deleted underneath us. Must be called only when a vault is
 * active (otherwise the FileSystem Effect service isn't provided yet).
 */
export function bindRecentsToFs(): () => void {
  if (fsBound) return () => undefined;
  fsBound = true;
  void run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return fs.watch((event) => {
        if (event.type === "delete") {
          removeRecent(event.path);
        } else if (event.type === "rename") {
          renameRecent(event.oldPath, event.newPath);
        }
      });
    }),
  )
    .then((d) => {
      unsubFs = d;
    })
    .catch(() => {
      // No vault yet — the caller is expected to retry after a vault binds.
      fsBound = false;
    });
  return () => {
    unsubFs?.();
    unsubFs = null;
    fsBound = false;
  };
}
