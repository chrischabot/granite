import { Effect } from "effect";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";
import type { VaultPath } from "@core/fs/types";

const THEMES_DIR = ".granite/themes";
const STORAGE_KEY = "granite.theme.active.v1";
const DISK_CONFIG_NAME = "active-theme";

export interface Theme {
  readonly path: VaultPath;
  readonly name: string;
}

const available = new Map<VaultPath, Theme>();
const subscribers = new Set<() => void>();
let activeVaultId: string | null = null;
let activeTheme: VaultPath | null = null;
let styleEl: HTMLStyleElement | null = null;
let unsubFs: (() => void) | null = null;
let listCache: Theme[] | null = null;

function emit(): void {
  listCache = null;
  for (const cb of subscribers) cb();
}

function loadActiveName(vaultId: string): VaultPath | null {
  try {
    return localStorage.getItem(`${STORAGE_KEY}:${vaultId}`) as VaultPath | null;
  } catch {
    return null;
  }
}

function saveActiveName(vaultId: string, value: VaultPath | null): void {
  try {
    if (value === null) localStorage.removeItem(`${STORAGE_KEY}:${vaultId}`);
    else localStorage.setItem(`${STORAGE_KEY}:${vaultId}`, value);
  } catch {
    /* ignore */
  }
  void writeConfigJson(DISK_CONFIG_NAME, value).catch(() => {});
}

async function hydrateActiveFromDisk(vaultId: string): Promise<void> {
  const onDisk = await readConfigJson<VaultPath | null>(DISK_CONFIG_NAME);
  if (onDisk === null || typeof onDisk === "string") {
    try {
      if (onDisk === null) localStorage.removeItem(`${STORAGE_KEY}:${vaultId}`);
      else localStorage.setItem(`${STORAGE_KEY}:${vaultId}`, onDisk);
    } catch {
      /* ignore */
    }
    activeTheme = onDisk;
    return;
  }
  const current = loadActiveName(vaultId);
  await writeConfigJson(DISK_CONFIG_NAME, current).catch(() => {});
}

function unmount(): void {
  if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }
}

async function mount(path: VaultPath): Promise<void> {
  try {
    const css = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(path);
      }),
    );
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-granite-theme", path);
      document.head.appendChild(styleEl);
    } else {
      styleEl.setAttribute("data-granite-theme", path);
    }
    styleEl.textContent = css;
  } catch {
    unmount();
  }
}

async function refreshAll(): Promise<void> {
  if (!activeVaultId) return;
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
  const cssFiles = files.filter((f) => f.path.startsWith(`${THEMES_DIR}/`));
  available.clear();
  for (const f of cssFiles) {
    const name = f.path.slice(THEMES_DIR.length + 1).replace(/\.css$/i, "");
    available.set(f.path, { path: f.path, name });
  }
  // If the active theme is gone, unmount.
  if (activeTheme && !available.has(activeTheme)) {
    activeTheme = null;
    saveActiveName(activeVaultId, null);
    unmount();
  } else if (activeTheme) {
    await mount(activeTheme);
  }
  emit();
}

export function bindThemes(vaultId: string): void {
  unbindThemes();
  activeVaultId = vaultId;
  activeTheme = loadActiveName(vaultId);
  void hydrateActiveFromDisk(vaultId).finally(() => {
    if (activeVaultId !== vaultId) return;
    void refreshAll();
  });
  let timer: ReturnType<typeof setTimeout> | null = null;
  void run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return fs.watch((event) => {
        if (!("path" in event)) return;
        const p = event.path;
        if (!p.startsWith(`${THEMES_DIR}/`)) return;
        if (extension(p) !== "css") return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void refreshAll(), 200);
      });
    }),
  ).then((d) => {
    unsubFs = d;
  });
}

export function unbindThemes(): void {
  unsubFs?.();
  unsubFs = null;
  unmount();
  available.clear();
  activeTheme = null;
  activeVaultId = null;
  emit();
}

export function listThemes(): Theme[] {
  if (listCache === null) {
    listCache = [...available.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  return listCache;
}

export function activeThemePath(): VaultPath | null {
  return activeTheme;
}

export async function setActiveTheme(path: VaultPath | null): Promise<void> {
  if (!activeVaultId) return;
  activeTheme = path;
  saveActiveName(activeVaultId, path);
  if (path === null) {
    unmount();
  } else {
    await mount(path);
  }
  emit();
}

export function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}