import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { VaultPath } from "@core/fs/types";
import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";
import { Effect } from "effect";

const SNIPPETS_DIR = ".granite/snippets";
const STORAGE_KEY = "granite.snippets.enabled.v1";
const DISK_CONFIG_NAME = "snippets-enabled";

export interface Snippet {
  readonly path: VaultPath;
  readonly name: string;
  readonly enabled: boolean;
}

interface SnippetEntry {
  path: VaultPath;
  name: string;
  enabled: boolean;
  styleEl: HTMLStyleElement | null;
}

const entries = new Map<VaultPath, SnippetEntry>();
const subscribers = new Set<() => void>();
let activeVaultId: string | null = null;
let unsubFs: (() => void) | null = null;
let listCache: Snippet[] | null = null;

function emit(): void {
  listCache = null;
  for (const cb of subscribers) cb();
}

function loadEnabledSet(vaultId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${vaultId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveEnabledSet(vaultId: string, set: Set<string>): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${vaultId}`, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
  void writeConfigJson(DISK_CONFIG_NAME, [...set]).catch(() => {});
}

async function hydrateEnabledFromDisk(vaultId: string): Promise<void> {
  const onDisk = await readConfigJson<string[]>(DISK_CONFIG_NAME);
  if (Array.isArray(onDisk)) {
    try {
      localStorage.setItem(`${STORAGE_KEY}:${vaultId}`, JSON.stringify(onDisk));
    } catch {
      /* ignore */
    }
    return;
  }
  const current = loadEnabledSet(vaultId);
  if (current.size > 0) {
    await writeConfigJson(DISK_CONFIG_NAME, [...current]).catch(() => {});
  }
}

function unmount(entry: SnippetEntry): void {
  if (entry.styleEl) {
    entry.styleEl.remove();
    entry.styleEl = null;
  }
}

async function mount(entry: SnippetEntry): Promise<void> {
  try {
    const css = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(entry.path);
      }),
    );
    if (!entry.enabled) return;
    if (!entry.styleEl) {
      entry.styleEl = document.createElement("style");
      entry.styleEl.setAttribute("data-granite-snippet", entry.path);
      document.head.appendChild(entry.styleEl);
    }
    entry.styleEl.textContent = css;
  } catch {
    unmount(entry);
  }
}

async function refreshAll(): Promise<void> {
  if (!activeVaultId) return;
  const enabledSet = loadEnabledSet(activeVaultId);
  // List `.granite/snippets/*.css`.
  let files: ReadonlyArray<{ path: VaultPath }> = [];
  try {
    files = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.listAll({ extensions: ["css"] });
      }),
    );
  } catch {
    return;
  }
  const cssFiles = files.filter((f) => f.path.startsWith(`${SNIPPETS_DIR}/`));
  const seen = new Set<VaultPath>();
  for (const f of cssFiles) {
    seen.add(f.path);
    const name = f.path.slice(SNIPPETS_DIR.length + 1);
    const enabled = enabledSet.has(f.path);
    let entry = entries.get(f.path);
    if (!entry) {
      entry = { path: f.path, name, enabled, styleEl: null };
      entries.set(f.path, entry);
    } else {
      entry.enabled = enabled;
      entry.name = name;
    }
    if (entry.enabled) {
      await mount(entry);
    } else {
      unmount(entry);
    }
  }
  // Remove gone files.
  for (const [p, e] of entries) {
    if (!seen.has(p)) {
      unmount(e);
      entries.delete(p);
    }
  }
  emit();
}

/** Bind the snippets loader to a vault. Tears down the previous binding. */
export function bindSnippets(vaultId: string): void {
  unbindSnippets();
  activeVaultId = vaultId;
  void hydrateEnabledFromDisk(vaultId).finally(() => {
    if (activeVaultId !== vaultId) return;
    void refreshAll();
  });
  // Watcher: react to changes inside .granite/snippets.
  let timer: ReturnType<typeof setTimeout> | null = null;
  void run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return fs.watch((event) => {
        if (!("path" in event)) return;
        const p = event.path;
        if (!p.startsWith(`${SNIPPETS_DIR}/`)) return;
        if (extension(p) !== "css") return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void refreshAll(), 200);
      });
    }),
  ).then((d) => {
    unsubFs = d;
  });
}

/** Drop the binding when a vault is closed. */
export function unbindSnippets(): void {
  unsubFs?.();
  unsubFs = null;
  for (const e of entries.values()) unmount(e);
  entries.clear();
  activeVaultId = null;
  emit();
}

export function listSnippets(): Snippet[] {
  if (listCache === null) {
    listCache = [...entries.values()].map((e) => ({
      path: e.path,
      name: e.name,
      enabled: e.enabled,
    }));
  }
  return listCache;
}

export function setEnabled(path: VaultPath, enabled: boolean): void {
  const entry = entries.get(path);
  if (!entry || !activeVaultId) return;
  entry.enabled = enabled;
  const set = loadEnabledSet(activeVaultId);
  if (enabled) set.add(path);
  else set.delete(path);
  saveEnabledSet(activeVaultId, set);
  if (enabled) void mount(entry);
  else unmount(entry);
  emit();
}

export function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}
