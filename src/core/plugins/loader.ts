import { APP_VERSION } from "@core/app/version";
import { commandRegistry } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import type { VaultPath } from "@core/fs/types";
import { t } from "@core/i18n";
import { metadataCache } from "@core/metadata/cache";
import { noticeManager } from "@core/notices/notice";
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
interface PluginEntry {
  manifest: PluginManifest;
  enabled: boolean;
  loaded: boolean;
  cleanup?: (() => void | Promise<void>) | undefined;
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

async function loadPlugin(entry: PluginEntry): Promise<void> {
  if (entry.loaded) return;
  const main = entry.manifest.main ?? "main.js";
  let code: string;
  try {
    code = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(`${PLUGINS_DIR}/${entry.manifest.id}/${main}`);
      }),
    );
  } catch {
    noticeManager.show(t("plugin.loader.error.readMain", { name: entry.manifest.name, main }), {
      kind: "error",
    });
    return;
  }
  const api = makeApi(entry.manifest.id);
  const moduleObj: { exports: PluginExports } = { exports: {} };
  try {
    const fn = new Function("module", "exports", "api", `${code}\n;return module.exports;`);
    const exports = (fn(moduleObj, moduleObj.exports, api) as PluginExports) ?? moduleObj.exports;
    if (typeof exports.onLoad === "function") {
      await Promise.resolve(exports.onLoad(api));
    }
    entry.loaded = true;
    if (typeof exports.onUnload === "function") {
      const onUnload = exports.onUnload;
      entry.cleanup = () => Promise.resolve(onUnload(api));
    }
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
  removeAllStatusBarItemsForPlugin(entry.manifest.id);
  removeAllSettingsTabsForPlugin(entry.manifest.id);
  removeAllListenersForPlugin(entry.manifest.id);
}

async function refreshAll(): Promise<void> {
  if (!activeVaultId) return;
  const enabledSet = loadEnabledSet(activeVaultId);
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
      entry = { manifest, enabled: false, loaded: false };
      entries.set(id, entry);
    } else {
      entry.manifest = manifest;
    }
    const shouldBeEnabled = enabledSet.has(id);
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
