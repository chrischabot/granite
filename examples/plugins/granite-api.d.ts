/**
 * Granite plugin API — public type declarations.
 *
 * Drop this file alongside your plugin's `main.js` (e.g. as
 * `granite-api.d.ts`) so your editor can typecheck the API surface used by
 * `module.exports`. The runtime contract is checked at plugin load time;
 * these types are advisory.
 */

export type Modifier = "Mod" | "Ctrl" | "Cmd" | "Alt" | "Shift";

export interface Hotkey {
  readonly modifiers: ReadonlyArray<Modifier>;
  readonly key: string;
}

export interface Command {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
  readonly hotkeys?: ReadonlyArray<Hotkey>;
  readonly checkCallback?: (checking: boolean) => boolean;
  readonly callback: () => void | Promise<void>;
  readonly hidden?: boolean;
}

export interface CommandRegistry {
  register(command: Command): () => void;
  unregister(id: string): void;
  get(id: string): Command | undefined;
  list(): ReadonlyArray<Command>;
  run(id: string): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export interface NoticeOptions {
  readonly kind?: "info" | "success" | "warning" | "error";
  readonly timeoutMs?: number;
  readonly onActivate?: () => void;
}

export interface NoticeManager {
  show(message: string, options?: NoticeOptions): string;
  dismiss(id: string): void;
}

export interface VaultFile {
  readonly path: string;
  readonly size: number;
  readonly mtimeMs: number;
}

export interface PluginVaultInfo {
  readonly id: string;
  readonly name: string;
  readonly kind: "fsa" | "opfs";
}

export interface PluginVaultApi {
  readonly active: PluginVaultInfo;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  listMarkdown(): Promise<ReadonlyArray<VaultFile>>;
}

export interface PluginGraniteApi {
  readonly version: string;
  readonly activeThemePath: string | null;
}

export interface WorkspaceLeafState {
  readonly type:
    | "empty"
    | "markdown"
    | "file-explorer"
    | "settings"
    | "webviewer"
    | "graph"
    | "canvas"
    | "bases";
  readonly path?: string;
  readonly url?: string;
  readonly mode?: "source" | "live-preview" | "reading";
  readonly fragment?: string;
  readonly pinned?: boolean;
}

export interface WorkspaceStoreApi {
  openFile(
    path: string,
    opts?: { newTab?: boolean; mode?: "source" | "live-preview" | "reading"; fragment?: string },
  ): string;
  openWebviewer(url: string, opts?: { newTab?: boolean }): string;
  openGraph(opts?: { newTab?: boolean }): string;
  openCanvas(opts?: { newTab?: boolean; path?: string }): string;
  openBase(opts?: { newTab?: boolean; path?: string }): string;
  closeTab(leafId: string): void;
  newTab(): string;
  splitLeaf(leafId: string, direction?: "right" | "down"): string;
}

export interface PluginStatusBarItemHandle {
  setText(text: string): void;
  setTooltip(text: string | null): void;
  setOnClick(fn: (() => void) | null): void;
  remove(): void;
}

export interface PluginStatusBarApi {
  add(opts?: {
    text?: string;
    tooltip?: string;
    onClick?: () => void;
  }): PluginStatusBarItemHandle;
}

export type PluginEventName = "file-open" | "active-leaf-change" | "layout-change" | "file-rename";

export interface PluginEventMap {
  "file-open": { path: string };
  "active-leaf-change": { leafId: string | null; path: string | null };
  "layout-change": Record<string, never>;
  "file-rename": { from: string; to: string };
}

export interface PluginEventsApi {
  on<E extends PluginEventName>(event: E, listener: (data: PluginEventMap[E]) => void): () => void;
}

export interface PluginMetadataCacheApi {
  getFileCache(path: string): unknown | null;
  getBacklinks(path: string): Array<{ source: string; lines: number[] }>;
  getAllTags(): Array<{ name: string; count: number }>;
  getAllProperties(): Array<{
    name: string;
    count: number;
    samples: ReadonlyArray<unknown>;
  }>;
}

export interface PluginSettingsTabSpec {
  readonly name: string;
  readonly render: (container: HTMLElement) => void | (() => void);
}

export interface PluginApi {
  readonly commands: CommandRegistry;
  readonly workspace: WorkspaceStoreApi;
  readonly notice: NoticeManager;
  readonly vault: PluginVaultApi;
  readonly granite: PluginGraniteApi;
  readonly statusBar: PluginStatusBarApi;
  readonly events: PluginEventsApi;
  readonly metadataCache: PluginMetadataCacheApi;
  loadData<T = unknown>(): Promise<T | null>;
  saveData(data: unknown): Promise<void>;
  addSettingsTab(spec: PluginSettingsTabSpec): () => void;
  log(...args: unknown[]): void;
}

export interface PluginExports {
  onLoad?: (api: PluginApi) => void | Promise<void>;
  onUnload?: (api: PluginApi) => void | Promise<void>;
}

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: string;
  readonly main?: string;
  readonly manifestUrl?: string;
  readonly minAppVersion?: string;
}
