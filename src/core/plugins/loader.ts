import { APP_VERSION } from "@core/app/version";
import { commandRegistry } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import type { VaultPath } from "@core/fs/types";
import { t } from "@core/i18n";
import { metadataCache } from "@core/metadata/cache";
import { noticeManager } from "@core/notices/notice";
import { settingsStore } from "@core/settings/store";
import { activeThemePath } from "@core/themes/loader";
import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";
import { loadPluginData, savePluginData } from "./data-store";
import { bindWorkspaceEvents, onPluginEvent, removeAllListenersForPlugin } from "./events";
import {
  addStatusBarItem,
  addSettingsTab as registryAddSettingsTab,
  removeAllSettingsTabsForPlugin,
  removeAllStatusBarItemsForPlugin,
} from "./host-registries";
import {
  type ObsidianModule,
  type PluginRegistrationTracker,
  Plugin as ShimPluginBase,
  attachShimVaultImpl,
  createObsidianShim,
} from "./obsidian-shim";
import type {
  LoadedPlugin,
  PluginApi,
  PluginEventMap,
  PluginEventName,
  PluginExports,
  PluginManifest,
  PluginVaultInfo,
} from "./types";

const PLUGINS_DIR = ".granite/plugins";
const STORAGE_KEY = "granite.plugins.enabled.v1";
const DISK_CONFIG_NAME = "plugins-enabled";

/** Ribbon container the obsidian-shim mounts plugin-supplied icons into.
 *  Hosted UI may relocate or restyle this element, but the loader treats it
 *  as owned by the shim (the loader removes children + the element itself
 *  on plugin unload). Tests can swap it via `_setRibbonContainerForTesting`. */
let ribbonRoot: HTMLElement | null = null;
function ensureRibbonRoot(): HTMLElement {
  if (ribbonRoot) return ribbonRoot;
  if (typeof document === "undefined") {
    return {
      appendChild: () => null,
      removeChild: () => null,
      querySelectorAll: () => [] as unknown as NodeListOf<Element>,
      children: [] as unknown as HTMLCollection,
    } as unknown as HTMLElement;
  }
  const existing = document.querySelector<HTMLElement>(".granite-plugin-ribbon");
  if (existing) {
    ribbonRoot = existing;
    return existing;
  }
  const el = document.createElement("div");
  el.className = "granite-plugin-ribbon";
  el.setAttribute("data-role", "plugin-ribbon");
  document.body.appendChild(el);
  ribbonRoot = el;
  return el;
}

export function _setRibbonContainerForTesting(el: HTMLElement | null): void {
  ribbonRoot = el;
}

interface PluginEntry {
  manifest: PluginManifest;
  enabled: boolean;
  loaded: boolean;
  cleanup?: (() => void | Promise<void>) | undefined;
  /** Serializes load/unload calls per entry. Two concurrent `loadPlugin`
   *  invocations would otherwise each create a fresh tracker and clobber
   *  `entry.cleanup`, orphaning the first load's disposers. */
  inflight: Promise<void> | null;
}

const entries = new Map<string, PluginEntry>();
const subscribers = new Set<() => void>();
let activeVaultId: string | null = null;
let activeVaultInfo: PluginVaultInfo | null = null;
let unsubFs: (() => void) | null = null;
let listCache: LoadedPlugin[] | null = null;

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

function makeApi(pluginId: string): PluginApi {
  const prefix = `[plugin:${pluginId}]`;
  if (!activeVaultInfo) {
    throw new Error(t("plugin.loader.error.noActiveVault"));
  }
  const vaultInfo = activeVaultInfo;
  return {
    commands: commandRegistry,
    workspace: workspaceStore,
    notice: noticeManager,
    vault: {
      active: vaultInfo,
      read: (path) =>
        run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.readText(path);
          }),
        ),
      write: (path, content) =>
        run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            yield* fs.writeText(path, content);
          }),
        ),
      listMarkdown: () =>
        run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            const all = yield* fs.listAll({ extensions: ["md"] });
            return all.map((f) => ({ path: f.path, size: f.size, mtimeMs: f.mtimeMs }));
          }),
        ),
    },
    granite: {
      version: APP_VERSION,
      activeThemePath: activeThemePath(),
    },
    statusBar: {
      add: (opts) => addStatusBarItem(pluginId, opts ?? {}),
    },
    events: {
      on: <E extends PluginEventName>(event: E, listener: (data: PluginEventMap[E]) => void) =>
        onPluginEvent(pluginId, event, listener),
    },
    metadataCache: {
      getFileCache: (p) => metadataCache.getMetadata(p as VaultPath),
      getBacklinks: (p) =>
        metadataCache.getBacklinks(p as VaultPath).map((b) => ({
          source: b.source,
          lines: [...b.lines],
        })),
      getAllTags: () => [...metadataCache.getAllTags()],
      getAllProperties: () =>
        metadataCache.getAllProperties().map((entry) => ({
          name: entry.name,
          count: entry.count,
          samples: [...entry.samples],
        })),
    },
    loadData: <T = unknown>() => loadPluginData<T>(pluginId),
    saveData: (data) => savePluginData(pluginId, data),
    addSettingsTab: (spec) => registryAddSettingsTab(pluginId, spec),
    log: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.log(prefix, ...args);
    },
  };
}

async function readManifest(id: string): Promise<PluginManifest | null> {
  try {
    const text = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(`${PLUGINS_DIR}/${id}/manifest.json`);
      }),
    );
    const parsed = JSON.parse(text) as Partial<PluginManifest>;
    if (!parsed || typeof parsed.name !== "string" || typeof parsed.version !== "string") {
      return null;
    }
    return {
      id,
      name: parsed.name,
      version: parsed.version,
      ...(parsed.description ? { description: parsed.description } : {}),
      ...(parsed.author ? { author: parsed.author } : {}),
      ...(parsed.main ? { main: parsed.main } : {}),
      ...(parsed.manifestUrl ? { manifestUrl: parsed.manifestUrl } : {}),
      ...(parsed.minAppVersion ? { minAppVersion: parsed.minAppVersion } : {}),
    };
  } catch {
    return null;
  }
}

/** Build a vault helper bundle the obsidian-shim's Vault class can call into.
 *  Kept inline here so the shim file doesn't need to import the Effect runtime
 *  (we want the shim to stay easily unit-testable). */
function attachShimVault(): void {
  attachShimVaultImpl({
    read: (path) =>
      run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          return yield* fs.readText(path as VaultPath);
        }),
      ),
    write: (path, content) =>
      run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          yield* fs.writeText(path as VaultPath, content);
        }),
      ),
    delete: (path) =>
      run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          yield* fs.remove(path as VaultPath);
        }),
      ),
    rename: (from, to) =>
      run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          yield* fs.rename(from as VaultPath, to as VaultPath);
        }),
      ),
    listMarkdownSync: () => markdownListCache,
    statSync: (path) => statCache.get(path) ?? null,
  });
}

// Synchronous caches the Obsidian-shim Vault uses (its API is sync). The loader
// refreshes them right before/after plugin loads — good enough for the read-
// only access patterns the reference plugins exercise.
let markdownListCache: ReadonlyArray<{ path: string; size: number; mtimeMs: number }> = [];
const statCache = new Map<
  string,
  { type: "file" | "directory"; size?: number; mtimeMs?: number }
>();

async function refreshShimVaultCaches(): Promise<void> {
  try {
    markdownListCache = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const all = yield* fs.listAll({ extensions: ["md"] });
        return all.map((f) => ({ path: f.path, size: f.size, mtimeMs: f.mtimeMs }));
      }),
    );
    statCache.clear();
    for (const entry of markdownListCache) {
      statCache.set(entry.path, { type: "file", size: entry.size, mtimeMs: entry.mtimeMs });
    }
  } catch {
    markdownListCache = [];
    statCache.clear();
  }
}

function makeRequireForPlugin(shim: ObsidianModule): (id: string) => unknown {
  return (id: string) => {
    if (id === "obsidian") return shim;
    throw new Error(`Cannot find module "${id}" in plugin sandbox`);
  };
}

function pickPluginClass(modExports: unknown): typeof ShimPluginBase | null {
  // Direct class export: `module.exports = class extends Plugin { … }`.
  if (typeof modExports === "function" && isPluginClass(modExports)) {
    return modExports as typeof ShimPluginBase;
  }
  // ESM-emulated default: `module.exports.default = class extends Plugin {}`.
  if (modExports && typeof modExports === "object") {
    const def = (modExports as { default?: unknown }).default;
    if (typeof def === "function" && isPluginClass(def)) return def as typeof ShimPluginBase;
  }
  return null;
}

function isPluginClass(fn: unknown): boolean {
  if (typeof fn !== "function") return false;
  // Walk the prototype chain. The shim's Plugin base is the marker.
  let proto: unknown = fn;
  let depth = 0;
  while (proto && depth < 32) {
    if (proto === ShimPluginBase) return true;
    proto = Object.getPrototypeOf(proto);
    depth += 1;
  }
  return false;
}

/** Run `op` after any in-flight load/unload for this entry has settled. */
async function serializeEntry(entry: PluginEntry, op: () => Promise<void>): Promise<void> {
  const prior = entry.inflight ?? Promise.resolve();
  const next = prior
    .catch(() => {
      /* swallow — the prior op already logged */
    })
    .then(op);
  entry.inflight = next;
  try {
    await next;
  } finally {
    if (entry.inflight === next) entry.inflight = null;
  }
}

async function loadPlugin(entry: PluginEntry): Promise<void> {
  return serializeEntry(entry, () => loadPluginInner(entry));
}

async function loadPluginInner(entry: PluginEntry): Promise<void> {
  if (entry.loaded) return;
  // Restricted mode (spec §24.17): refuse to instantiate untrusted community
  // plugins. Default-on for new vaults; existing vaults without the key also
  // default to `true` (see settings store normalization). Core/in-process
  // plugins don't go through this loader, so they're unaffected.
  if (settingsStore.getState().pluginRestrictedMode) {
    noticeManager.show(t("plugin.loader.error.restricted", { name: entry.manifest.name }), {
      kind: "warning",
    });
    return;
  }
  const main = entry.manifest.main ?? "main.js";
  let code: string;
  try {
    code = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(`${PLUGINS_DIR}/${entry.manifest.id}/${main}` as VaultPath);
      }),
    );
  } catch {
    noticeManager.show(t("plugin.loader.error.readMain", { name: entry.manifest.name, main }), {
      kind: "error",
    });
    return;
  }
  attachShimVault();
  await refreshShimVaultCaches();
  const api = makeApi(entry.manifest.id);
  const moduleObj: { exports: PluginExports | unknown } = { exports: {} };

  const disposers: Array<() => void | Promise<void>> = [];
  // `disposed` is a real lifecycle flag, not a constant. It flips to `true`
  // once the loader has drained the tracker on unload. A push after that
  // point can't reach a real disposer-run, so we log loudly and drop it.
  const trackerState = { disposed: false };
  const pluginIdForLog = entry.manifest.id;
  const tracker: PluginRegistrationTracker = {
    push: (d) => {
      if (trackerState.disposed) {
        // eslint-disable-next-line no-console
        console.warn(
          `[granite] Plugin "${pluginIdForLog}" pushed a disposer after unload — the registration will leak. Move registrations into onload(), not async callbacks that resolve after the host has disposed the plugin.`,
        );
        return;
      }
      disposers.push(d);
    },
    get disposed() {
      return trackerState.disposed;
    },
  };

  async function drainTrackedDisposers(): Promise<void> {
    while (disposers.length > 0) {
      const d = disposers.pop();
      if (!d) continue;
      try {
        await Promise.resolve(d());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[granite] Plugin "${pluginIdForLog}" disposer threw:`, err);
      }
    }
    trackerState.disposed = true;
  }
  const ribbonContainer = ensureRibbonRoot();
  const shim = createObsidianShim({
    pluginId: entry.manifest.id,
    manifest: entry.manifest,
    tracker,
    ribbonContainer,
  });
  const pluginRequire = makeRequireForPlugin(shim);

  try {
    const fn = new Function(
      "module",
      "exports",
      "api",
      "require",
      `${code}\n;return module.exports;`,
    );
    const exports = fn(moduleObj, moduleObj.exports, api, pluginRequire) ?? moduleObj.exports;

    // Style B: Obsidian-shape `module.exports = class extends Plugin`.
    const PluginClass = pickPluginClass(exports);
    if (PluginClass) {
      const instance = new (
        PluginClass as unknown as new () => InstanceType<typeof ShimPluginBase>
      )();
      const onload = (instance as { onload?: () => void | Promise<void> }).onload;
      if (typeof onload === "function") {
        await Promise.resolve(onload.call(instance));
      }
      entry.loaded = true;
      entry.cleanup = async () => {
        const onunload = (instance as { onunload?: () => void | Promise<void> }).onunload;
        if (typeof onunload === "function") {
          try {
            await Promise.resolve(onunload.call(instance));
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(
              `[granite] Plugin "${entry.manifest.id}" onunload threw — running tracked disposers anyway:`,
              err,
            );
          }
        }
        // Run every tracked registration's disposer in LIFO order. We swallow
        // and log any failures so one buggy disposer can't block the rest.
        await drainTrackedDisposers();
      };
      return;
    }

    // Style A: Granite-style `module.exports = { onLoad, onUnload }` (fallback).
    const granite = exports as PluginExports;
    if (typeof granite?.onLoad === "function") {
      await Promise.resolve(granite.onLoad(api));
    }
    entry.loaded = true;
    const graniteOnUnload = granite?.onUnload;
    entry.cleanup = async () => {
      if (typeof graniteOnUnload === "function") {
        try {
          await Promise.resolve(graniteOnUnload(api));
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[granite] Plugin "${entry.manifest.id}" onUnload threw:`, err);
        }
      }
      // Flip the tracker's `disposed` flag even for Granite-style plugins so
      // a late `push` is still rejected (and so the lifecycle invariant is
      // identical across both code paths).
      await drainTrackedDisposers();
    };
  } catch (err) {
    noticeManager.show(
      t("plugin.loader.error.load", {
        name: entry.manifest.name,
        message: err instanceof Error ? err.message : String(err),
      }),
      { kind: "error" },
    );
  }
}

async function unloadPlugin(entry: PluginEntry): Promise<void> {
  return serializeEntry(entry, () => unloadPluginInner(entry));
}

async function unloadPluginInner(entry: PluginEntry): Promise<void> {
  if (!entry.loaded) return;
  entry.loaded = false;
  if (entry.cleanup) {
    try {
      await Promise.resolve(entry.cleanup());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[granite] Plugin "${entry.manifest.id}" onUnload threw:`, err);
    }
    entry.cleanup = undefined;
  }
  // Safety net: blast any residual host registry entries / event listeners
  // even if the plugin forgot to call the disposers we returned to it.
  // This is load-bearing — the `misbehaving-shim` fixture in
  // `scripts/fixtures/community-plugins/` registers a status item and a
  // settings tab via the legacy `api.statusBar.add()` / `api.addSettingsTab()`
  // surface (which returns disposers but is NOT auto-tracked by the obsidian-
  // shim Plugin base). Without these sweeps the verifier's leak storm fails
  // on the very first `after-initial-disable` snapshot.
  removeAllStatusBarItemsForPlugin(entry.manifest.id);
  removeAllSettingsTabsForPlugin(entry.manifest.id);
  removeAllListenersForPlugin(entry.manifest.id);
}

async function refreshAll(): Promise<void> {
  if (!activeVaultId) return;
  let pluginIds: ReadonlyArray<string> = [];
  try {
    const pluginDirs = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.list(PLUGINS_DIR);
      }),
    );
    pluginIds = pluginDirs.filter((entry) => entry.type === "directory").map((entry) => entry.name);
  } catch {
    pluginIds = [];
  }
  const seen = new Set<string>();
  for (const id of pluginIds) {
    seen.add(id);
    const manifest = await readManifest(id);
    if (!manifest) continue;
    let entry = entries.get(id);
    if (!entry) {
      entry = { manifest, enabled: false, loaded: false, inflight: null };
      entries.set(id, entry);
    } else {
      entry.manifest = manifest;
    }
    // Re-read the enabled snapshot per iteration. `refreshAll` is async and
    // can interleave with `setPluginEnabled` calls; using a snapshot captured
    // at the top of the function would cause a stale `shouldBeEnabled` read
    // to *reverse* a fresh user toggle (e.g. the storm test enables a plugin
    // while refreshAll is mid-iteration, then refreshAll would unload it).
    const freshEnabledSet = activeVaultId ? loadEnabledSet(activeVaultId) : new Set<string>();
    const shouldBeEnabled = freshEnabledSet.has(id);
    if (shouldBeEnabled && !entry.loaded) {
      entry.enabled = true;
      await loadPlugin(entry);
    } else if (!shouldBeEnabled && entry.loaded) {
      entry.enabled = false;
      await unloadPlugin(entry);
    } else {
      entry.enabled = shouldBeEnabled;
    }
  }
  for (const [id, entry] of entries) {
    if (!seen.has(id)) {
      await unloadPlugin(entry);
      entries.delete(id);
    }
  }
  emit();
}

/** Begin the plugin lifecycle for a vault. Awaits prior unbind so loads
 *  don't race with unloads from the previous vault. */
export async function bindPlugins(vaultId: string, info: PluginVaultInfo): Promise<void> {
  await unbindPlugins();
  activeVaultId = vaultId;
  activeVaultInfo = info;
  // Bridge workspace state into the plugin event bus. Idempotent.
  bindWorkspaceEvents();
  await hydrateEnabledFromDisk(vaultId);
  if (activeVaultId !== vaultId) return;
  await refreshAll();
  let timer: ReturnType<typeof setTimeout> | null = null;
  void run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return fs.watch((event) => {
        if (!("path" in event)) return;
        if (!event.path.startsWith(`${PLUGINS_DIR}/`)) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void refreshAll(), 250);
      });
    }),
  ).then((d) => {
    // Guard against late resolution after unbind.
    if (activeVaultId === vaultId) unsubFs = d;
    else d();
  });
}

export async function unbindPlugins(): Promise<void> {
  unsubFs?.();
  unsubFs = null;
  for (const entry of entries.values()) {
    await unloadPlugin(entry);
  }
  entries.clear();
  activeVaultId = null;
  activeVaultInfo = null;
  emit();
}

export function listPlugins(): LoadedPlugin[] {
  if (listCache === null) {
    listCache = [...entries.values()].map((e) => ({
      manifest: e.manifest,
      enabled: e.enabled,
    }));
  }
  return listCache;
}

export async function setPluginEnabled(id: string, enabled: boolean): Promise<void> {
  const entry = entries.get(id);
  if (!entry || !activeVaultId) return;
  const set = loadEnabledSet(activeVaultId);
  if (enabled) set.add(id);
  else set.delete(id);
  saveEnabledSet(activeVaultId, set);
  entry.enabled = enabled;
  if (enabled) await loadPlugin(entry);
  else await unloadPlugin(entry);
  emit();
}

export function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}
