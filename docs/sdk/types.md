# Type reference

Every TypeScript type a plugin author is likely to touch, with its source
location and a member-by-member walkthrough. Mirrors the public
declarations in `examples/plugins/granite-api.d.ts` and the host types in
`src/core/plugins/types.ts`.

Drop `examples/plugins/granite-api.d.ts` next to your `main.js` to get
editor autocomplete:

```text
hello-granite/
  main.js
  manifest.json
  granite-api.d.ts
```

```js
/// <reference path="./granite-api.d.ts" />
```

## `PluginApi`

Source: `src/core/plugins/types.ts`.

```ts
export interface PluginApi {
  readonly commands: typeof commandRegistry;
  readonly workspace: typeof workspaceStore;
  readonly notice: typeof noticeManager;
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
```

This is the entire surface area a plugin sees. See
[Plugin API reference](../reference/plugin-api.md) for parameter-level docs.

## `PluginManifest`

```ts
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
```

Stored on disk as `manifest.json`. See [Manifest](./manifest.md).

## `PluginExports`

```ts
export interface PluginExports {
  onLoad?: (api: PluginApi) => void | Promise<void>;
  onUnload?: (api: PluginApi) => void | Promise<void>;
}
```

Style A `module.exports` shape. See [Lifecycle](./lifecycle.md).

## `PluginVaultApi`

```ts
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
```

| Member | Description |
|--------|-------------|
| `active` | Identity of the mounted vault. |
| `read(path)` | UTF-8 file read. Rejects on missing / non-decodable input. |
| `write(path, content)` | Atomic UTF-8 file write. Parent directories are created. |
| `listMarkdown()` | Recursively list every `.md` file with `size` and `mtimeMs`. |

## `PluginGraniteApi`

```ts
export interface PluginGraniteApi {
  readonly version: string;
  readonly activeThemePath: string | null;
}
```

`version` is `APP_VERSION` (`0.1.0-dev` in the current build).
`activeThemePath` is a vault-relative path to the active `.css` theme or
`null`.

## `PluginStatusBarApi`

```ts
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
```

`add(opts)` allocates one slot. The handle mutates the live entry. The
loader sweeps residual items via
`removeAllStatusBarItemsForPlugin(pluginId)` on unload (safety net), but
plugins should still call `handle.remove()`.

## `PluginEventsApi`

```ts
export type PluginEventName =
  | "file-open"
  | "active-leaf-change"
  | "layout-change"
  | "file-rename";

export interface PluginEventMap {
  "file-open": { path: string };
  "active-leaf-change": { leafId: string | null; path: string | null };
  "layout-change": Record<string, never>;
  "file-rename": { from: string; to: string };
}

export interface PluginEventsApi {
  on<E extends PluginEventName>(
    event: E,
    listener: (data: PluginEventMap[E]) => void,
  ): () => void;
}
```

See [Events reference](../reference/events.md).

## `PluginMetadataCacheApi`

```ts
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
```

`getFileCache` returns the parsed file metadata (frontmatter, headings,
links, embeds, tasks). Typed `unknown` because the cache shape may evolve;
narrow at the call-site.

## `PluginSettingsTabSpec`

```ts
export interface PluginSettingsTabSpec {
  readonly name: string;
  readonly render: (container: HTMLElement) => void | (() => void);
}
```

`render(container)` is called every time the tab becomes visible. The host
clears the container on cleanup. If you return a function, it runs on
cleanup too.

## `WorkspaceStoreApi` (subset exposed via `api.workspace`)

```ts
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
```

The runtime `workspaceStore` exposes additional methods (`focusTab`,
`cycleTab`, `setMode`, `goBack`, etc.) — see
[Plugin API → workspace](../reference/plugin-api.md#apiworkspace) for the
full surface.

## `Command` and `Hotkey`

```ts
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
```

See [Commands reference](../reference/commands.md).

## `CommandRegistry`

```ts
export interface CommandRegistry {
  register(command: Command): () => void;
  unregister(id: string): void;
  get(id: string): Command | undefined;
  list(): ReadonlyArray<Command>;
  run(id: string): Promise<void>;
  subscribe(listener: () => void): () => void;
}
```

`run(id)` throws `Error("Unknown command: <id>")` on miss.

## `Notice` and `NoticeManager`

```ts
export interface NoticeOptions {
  readonly kind?: "info" | "success" | "warning" | "error";
  readonly timeoutMs?: number;
  readonly onActivate?: () => void;
}

export interface NoticeManager {
  show(message: string, options?: NoticeOptions): string;
  dismiss(id: string): void;
}
```

The host-side `noticeManager` also exposes `list()` and `subscribe()` —
those are available via `api.notice` but are not part of the minimal
public typing.

## `LoadedPlugin`

```ts
export interface LoadedPlugin {
  readonly manifest: PluginManifest;
  readonly enabled: boolean;
  readonly cleanup?: () => void | Promise<void>;
}
```

Returned by `listPlugins()` in the loader. Plugins themselves do not see
this type; it's documented here for completeness.

## See also

- [Plugin API reference](../reference/plugin-api.md)
- `examples/plugins/granite-api.d.ts` for the canonical `.d.ts` file.

[← lifecycle](./lifecycle.md) · [Index](./README.md) · [cookbook →](./cookbook.md)
