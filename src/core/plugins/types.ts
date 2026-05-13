import type { commandRegistry } from "@core/commands/CommandRegistry";
import type { noticeManager } from "@core/notices/notice";
import type { workspaceStore } from "@core/workspace/store";

export interface PluginManifest {
  /** Lowercase identifier; matches the directory name. */
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: string;
  /** Path to the main JS file relative to the plugin directory. Defaults to `main.js`. */
  readonly main?: string;
  /** Optional URL pointing at a `manifest.json` to check for updates. */
  readonly manifestUrl?: string;
  /** Minimum Granite version required. A higher value flags the plugin as
   *  incompatible with the current host when the user runs the update check. */
  readonly minAppVersion?: string;
}

/** Object returned from a plugin's `module.exports`. Both lifecycle hooks
 *  receive the plugin API (same instance the loader passes in). */
export interface PluginExports {
  onLoad?: (api: PluginApi) => void | Promise<void>;
  onUnload?: (api: PluginApi) => void | Promise<void>;
}

/** Active-vault metadata exposed to plugins. */
export interface PluginVaultInfo {
  readonly id: string;
  readonly name: string;
  readonly kind: "fsa" | "opfs";
}

/** Vault file helpers. Read/write are scoped to the active vault. */
export interface PluginVaultApi {
  readonly active: PluginVaultInfo;
  /** Read a UTF-8 file from the vault. */
  read: (path: string) => Promise<string>;
  /** Write a UTF-8 file to the vault. */
  write: (path: string, content: string) => Promise<void>;
  /** List markdown files in the vault. */
  listMarkdown: () => Promise<ReadonlyArray<{ path: string; size: number; mtimeMs: number }>>;
}

/** Granite-specific helpers. */
export interface PluginGraniteApi {
  /** Granite version this build identifies as. */
  readonly version: string;
  /** Path of the active CSS theme (within the vault), or null when none is selected. */
  readonly activeThemePath: string | null;
}

/** Handle returned from `statusBar.add()` — mutates the live registry entry. */
export interface PluginStatusBarItemHandle {
  setText(text: string): void;
  setTooltip(text: string | null): void;
  setOnClick(fn: (() => void) | null): void;
  remove(): void;
}

export interface PluginStatusBarApi {
  /**
   * Add a status-bar item attributed to this plugin. The handle stays valid
   * until `remove()` is called (or the plugin is unloaded, at which point the
   * loader blasts any residual entries as a safety net).
   */
  add(opts?: { text?: string; tooltip?: string; onClick?: () => void }): PluginStatusBarItemHandle;
}

export type PluginEventName = "file-open" | "active-leaf-change" | "layout-change" | "file-rename";

export interface PluginEventMap {
  "file-open": { path: string };
  "active-leaf-change": { leafId: string | null; path: string | null };
  "layout-change": Record<string, never>;
  "file-rename": { from: string; to: string };
}

export interface PluginEventsApi {
  /**
   * Subscribe to a workspace event. The returned disposer is the preferred
   * cleanup channel; the loader also bulk-removes any residual subscriptions
   * on plugin unload.
   */
  on<E extends PluginEventName>(event: E, listener: (data: PluginEventMap[E]) => void): () => void;
}

export interface PluginMetadataCacheApi {
  getFileCache(path: string): unknown | null;
  getBacklinks(path: string): Array<{ source: string; lines: number[] }>;
  getAllTags(): Array<{ name: string; count: number }>;
  getAllProperties(): Array<{ name: string; count: number; samples: ReadonlyArray<unknown> }>;
}

export interface PluginSettingsTabSpec {
  readonly name: string;
  /**
   * Render the tab body into the supplied container. Optionally return a
   * cleanup function — called when the tab is removed or the modal closes.
   * The host also clears the container on cleanup, so plugins may ignore the
   * return value for simple imperative renders.
   */
  readonly render: (container: HTMLElement) => undefined | (() => void);
}

/** API surface exposed to plugins. Stable across plugin versions. */
export interface PluginApi {
  readonly commands: typeof commandRegistry;
  readonly workspace: typeof workspaceStore;
  readonly notice: typeof noticeManager;
  readonly vault: PluginVaultApi;
  readonly granite: PluginGraniteApi;
  readonly statusBar: PluginStatusBarApi;
  readonly events: PluginEventsApi;
  readonly metadataCache: PluginMetadataCacheApi;
  /** Read the plugin's persisted JSON blob, or null when nothing has been saved. */
  loadData<T = unknown>(): Promise<T | null>;
  /** Persist a JSON blob for this plugin (atomic write to `.granite/plugins/<id>/data.json`). */
  saveData(data: unknown): Promise<void>;
  /** Register a tab in the Settings modal under "Plugin options". */
  addSettingsTab(spec: PluginSettingsTabSpec): () => void;
  /** A small `console.log`-style logger, prefixed with the plugin id. */
  log(...args: unknown[]): void;
}

export interface LoadedPlugin {
  readonly manifest: PluginManifest;
  readonly enabled: boolean;
  /** When loaded, holds the cleanup callback gathered while the plugin ran. */
  readonly cleanup?: () => void | Promise<void>;
}
