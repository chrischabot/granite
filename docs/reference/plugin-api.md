# Plugin API reference

The `PluginApi` object is what Granite hands to every plugin's `onLoad` and
`onUnload` lifecycle hooks. It is the entire surface area available to a
community plugin — there is no `globalThis`-mounted helper, no implicit
imports, no node integration. If something is not on `PluginApi`, a plugin
cannot do it.

Source of truth: `src/core/plugins/types.ts`. Public consumer-facing
declarations: `examples/plugins/granite-api.d.ts`.

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

## Manifest and exports

### `PluginManifest`

Stored as `manifest.json` inside the plugin directory.

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

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Lowercase identifier; **must match the directory name** under `.granite/plugins/`. |
| `name` | yes | Display name shown in the Settings → Plugins list and update notices. |
| `version` | yes | Semver-ish version string. Used by the update checker. |
| `description` | no | One-line description shown alongside the plugin. |
| `author` | no | Author or organisation. |
| `main` | no | Entry-point JS filename relative to the plugin directory. Defaults to `main.js`. |
| `manifestUrl` | no | HTTPS URL to a stable `manifest.json` used by **Plugins → Check for updates**. |
| `minAppVersion` | no | Minimum required Granite `APP_VERSION`. Compared with [`compareVersions`](#update-check-semantics) at update-check time. |

### `PluginExports`

The shape of `module.exports` for a Granite-style plugin (Style A — the
obsidian-shim `Plugin` class is Style B and uses `onload` / `onunload`):

```ts
export interface PluginExports {
  onLoad?: (api: PluginApi) => void | Promise<void>;
  onUnload?: (api: PluginApi) => void | Promise<void>;
}
```

Both hooks receive the same `PluginApi` instance. `onLoad` may be `async`.
`onUnload` runs when the plugin is disabled, the vault is unmounted, or the
plugin's source files change on disk and the loader re-imports it.

## `api.commands`

`api.commands` is the global `commandRegistry` singleton. See
[Commands reference](./commands.md) for the full surface.

```ts
interface CommandRegistry {
  register(command: Command): () => void;
  unregister(id: string): void;
  get(id: string): Command | undefined;
  list(): ReadonlyArray<Command>;
  listAll(): ReadonlyArray<Command>;
  run(id: string): Promise<void>;
  subscribe(listener: () => void): () => void;
}
```

| Member | Returns | Notes |
|--------|---------|-------|
| `register(command)` | disposer `() => void` | Re-registering an existing `id` overwrites and logs `[granite] Command "<id>" already registered; overwriting.` Always capture the disposer. |
| `unregister(id)` | `void` | Silent no-op when `id` is unknown. |
| `get(id)` | `Command \| undefined` | Lookup without iterating. |
| `list()` | `ReadonlyArray<Command>` | Palette-visible commands. Filters out `hidden` commands and any whose `checkCallback(true)` returns false. |
| `listAll()` | `ReadonlyArray<Command>` | Every registered command, including `hidden` ones. Intended for audits. |
| `run(id)` | `Promise<void>` | **Throws** `Error("Unknown command: <id>")` when the id is unknown. Silent no-op when the command's `checkCallback(false)` returns false. |
| `subscribe(listener)` | disposer | Fires after every register/unregister. |

`Command` and `Hotkey` shapes are defined in
`src/core/commands/CommandRegistry.ts`:

```ts
export interface Hotkey {
  readonly modifiers: ReadonlyArray<"Mod" | "Ctrl" | "Cmd" | "Alt" | "Shift">;
  readonly key: string;
}

export interface Command {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
  readonly icon?: ReactNode;
  readonly hotkeys?: ReadonlyArray<Hotkey>;
  readonly checkCallback?: (checking: boolean) => boolean;
  readonly callback: () => void | Promise<void>;
  readonly hidden?: boolean;
}
```

`checkCallback` is called twice: once with `checking = true` to decide whether
the command should appear in the palette, and once with `checking = false`
right before `callback` runs. Return `false` to hide / skip.

Example:

```js
const dispose = api.commands.register({
  id: "my-plugin:say-hi",
  name: "Say hi",
  category: "My plugin",
  hotkeys: [{ modifiers: ["Mod"], key: "h" }],
  callback: () => api.notice.show("Hi!"),
});
// Later, on unload:
dispose();
```

## `api.workspace`

`api.workspace` is the `workspaceStore` singleton — the source of truth for
the layout of tabs, leaves, columns and tab groups. See `src/core/workspace/store.ts`.

```ts
workspace.getState(): WorkspaceState
workspace.subscribe(listener: () => void): () => void

workspace.openPath(path: VaultPath, opts?: { newTab?: boolean; fragment?: string }): LeafId
workspace.openFile(path: VaultPath, opts?: {
  newTab?: boolean;
  mode?: "source" | "live-preview" | "reading";
  fragment?: string;
}): LeafId
workspace.openWebviewer(url: string, opts?: { newTab?: boolean }): LeafId
workspace.openGraph(opts?: { newTab?: boolean }): LeafId
workspace.openCanvas(opts?: { newTab?: boolean; path?: string }): LeafId
workspace.openBase(opts?: { newTab?: boolean; path?: string }): LeafId
workspace.openAsset(opts: { newTab?: boolean; path: VaultPath; kind: NativeFileKind }): LeafId
workspace.openSidebarView(side: "left" | "right", tabId: string, opts?: { newTab?: boolean }): LeafId

workspace.newTab(): LeafId
workspace.closeTab(leafId: LeafId): void
workspace.closeActiveTab(): void
workspace.closeOtherTabs(leafId: LeafId): void
workspace.closeRightTabs(leafId: LeafId): void
workspace.focusTab(leafId: LeafId): void
workspace.cycleTab(direction: "next" | "previous"): void

workspace.splitLeaf(leafId: LeafId, direction?: "right" | "down"): TabGroupId
workspace.closeGroup(groupId: TabGroupId): void
workspace.toggleStacked(groupId: TabGroupId): void

workspace.setMode(leafId: LeafId, mode: "source" | "live-preview" | "reading"): void
workspace.setMarkdownFolds(leafId: LeafId, folds: ReadonlyArray<{ from: number; to: number }>): void
workspace.togglePinned(leafId: LeafId): void

workspace.canGoBack(leafId: LeafId): boolean
workspace.canGoForward(leafId: LeafId): boolean
workspace.goBack(leafId: LeafId): boolean
workspace.goForward(leafId: LeafId): boolean

workspace.moveTab(leafId: LeafId, targetGroupId: TabGroupId, beforeLeafId: LeafId | null): void
workspace.reset(): void
```

Key behaviours:

- `openFile` deduplicates: if a leaf in the active group already shows that
  path, the call refocuses that leaf and refreshes its `fragment` instead of
  opening a duplicate. Pass `{ newTab: true }` to force a new tab.
- The "active leaf" replacement rule fires when the active leaf is `empty` or
  `markdown` (and the markdown leaf is not pinned).
- `splitLeaf` returns the **new tab group** id, not the new leaf id.
- `goBack` / `goForward` consult per-leaf navigation history (push-on-open,
  push-on-fragment-change). They return `false` when no entry is available.
- `openWebviewer` / `openGraph` / `openCanvas` / `openBase` similarly dedupe
  against existing leaves matching the same target.

`WorkspaceState`:

```ts
export interface WorkspaceState {
  readonly leaves: ReadonlyMap<LeafId, Leaf>;
  readonly groups: ReadonlyMap<TabGroupId, TabGroup>;
  readonly columns: ReadonlyArray<ReadonlyArray<TabGroupId>>;
  readonly rootGroupIds: ReadonlyArray<TabGroupId>;
  readonly activeGroupId: TabGroupId | null;
}
```

`LeafState` is type-discriminated:

```ts
type LeafState =
  | { readonly type: "empty" }
  | { readonly type: "file-explorer" }
  | {
      readonly type: "markdown";
      readonly path: VaultPath;
      readonly mode: "source" | "live-preview" | "reading";
      readonly cursorOffset?: number;
      readonly folds?: ReadonlyArray<{ from: number; to: number }>;
      readonly pinned?: boolean;
      readonly fragment?: string;
    }
  | { readonly type: "settings" }
  | { readonly type: "webviewer"; readonly url: string }
  | { readonly type: "asset"; readonly path: VaultPath; readonly kind: NativeFileKind }
  | { readonly type: "graph" }
  | { readonly type: "canvas"; readonly path?: string }
  | { readonly type: "bases"; readonly path?: string }
  | { readonly type: "sidebar"; readonly side: "left" | "right"; readonly id: string };
```

## `api.notice`

`api.notice` is the `noticeManager` singleton. See `src/core/notices/notice.ts`.

```ts
interface NoticeManager {
  list(): ReadonlyArray<Notice>;
  show(message: string, options?: {
    kind?: "info" | "success" | "warning" | "error";
    timeoutMs?: number;
    onActivate?: () => void;
  }): string;
  dismiss(id: string): void;
  subscribe(listener: () => void): () => void;
}
```

`show(message, options)` returns the notice id. Defaults: `kind = "info"`,
`timeoutMs = 4000`. Pass `timeoutMs: 0` to make the notice sticky. When
`onActivate` is supplied, clicking the notice runs the handler instead of
dismissing — the caller is responsible for calling `dismiss(id)` when
appropriate.

The host also runs `a11yAnnouncer.announce("<Kind>: <message>")` on every
notice — there is no opt-out.

For ergonomic helpers Granite exports `notice`, `noticeSuccess`, and
`noticeError` from the same module, but plugins should use `api.notice` so
the host knows which plugin produced the notice.

## `api.vault`

```ts
interface PluginVaultApi {
  readonly active: PluginVaultInfo;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  listMarkdown(): Promise<ReadonlyArray<{ path: string; size: number; mtimeMs: number }>>;
}

interface PluginVaultInfo {
  readonly id: string;
  readonly name: string;
  readonly kind: "fsa" | "opfs";
}
```

| Member | Description |
|--------|-------------|
| `active` | Metadata for the currently mounted vault: stable id, display name, and adapter kind. `fsa` = File System Access API (a real folder on disk), `opfs` = Origin Private File System (browser-private sandbox). |
| `read(path)` | Read a UTF-8 file under the vault root. Rejects when the file is missing or cannot be decoded. |
| `write(path, content)` | Write a UTF-8 file under the vault root. Uses the FileSystem service's atomic write protocol (temp sibling + rename). Parent directories are created automatically. |
| `listMarkdown()` | Recursively list every `.md` file with its byte size and last-modified time in milliseconds. Hidden / excluded files follow `settings.excludedFiles`. |

`api.vault` cannot read raw bytes — for images, PDFs, or other binaries you
would need a future API. Plugins must not escape the vault root.

## `api.granite`

```ts
interface PluginGraniteApi {
  readonly version: string;
  readonly activeThemePath: string | null;
}
```

| Member | Source | Description |
|--------|--------|-------------|
| `version` | `APP_VERSION` in `src/core/app/version.ts` | Currently `"0.1.0-dev"`. Use to check `minAppVersion` compatibility from inside the plugin. |
| `activeThemePath` | `activeThemePath()` in `src/core/themes/loader.ts` | Vault-relative path to the currently selected `.css` theme, or `null` when no theme is selected. |

## `api.statusBar`

```ts
interface PluginStatusBarApi {
  add(opts?: {
    text?: string;
    tooltip?: string;
    onClick?: () => void;
  }): PluginStatusBarItemHandle;
}

interface PluginStatusBarItemHandle {
  setText(text: string): void;
  setTooltip(text: string | null): void;
  setOnClick(fn: (() => void) | null): void;
  remove(): void;
}
```

`statusBar.add(opts)` adds a single item attributed to the plugin. The handle
mutates the live registry entry — call `setText` whenever your model changes.
Always call `remove()` from `onUnload`, but note that the loader is a safety
net: any items left over when a plugin unloads are bulk-removed via
`removeAllStatusBarItemsForPlugin(id)` (see `src/core/plugins/host-registries.ts`).

## `api.events`

```ts
interface PluginEventsApi {
  on<E extends PluginEventName>(
    event: E,
    listener: (data: PluginEventMap[E]) => void,
  ): () => void;
}

type PluginEventName = "file-open" | "active-leaf-change" | "layout-change" | "file-rename";

interface PluginEventMap {
  "file-open": { path: string };
  "active-leaf-change": { leafId: string | null; path: string | null };
  "layout-change": Record<string, never>;
  "file-rename": { from: string; to: string };
}
```

`on(event, listener)` returns a disposer. Listener exceptions are caught and
logged with `console.error("[granite] plugin event listener \"<name>\" threw:")`,
so a single misbehaving listener will not stop others. See the
[Events reference](./events.md) for when each event fires.

The loader's `removeAllListenersForPlugin(id)` sweep on unload is a safety
net, but you should still capture and call the disposer.

## `api.metadataCache`

```ts
interface PluginMetadataCacheApi {
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

| Member | Description |
|--------|-------------|
| `getFileCache(path)` | Per-file parsed metadata (frontmatter, headings, links, embeds, tasks). Returns `null` when the file has no cache entry yet. The shape is intentionally typed `unknown` because internal cache structure may evolve — narrow it at the call-site. |
| `getBacklinks(path)` | All files that link to `path`, with the line numbers of each link. |
| `getAllTags()` | Every distinct tag in the vault with the number of files it appears in. |
| `getAllProperties()` | Every frontmatter property name, its count, and up to a handful of example values. |

The cache is built lazily as files load. Plugins that want fresh data right
after `onLoad` should call these accessors after the first `file-open` or
`active-leaf-change` fires.

## Plugin data

```ts
loadData<T = unknown>(): Promise<T | null>
saveData(data: unknown): Promise<void>
```

Both methods use `.granite/plugins/<id>/data.json` as the backing store. See
`src/core/plugins/data-store.ts`.

- `loadData()` reads, parses, and returns the JSON blob; returns `null` when
  the file is missing or unparseable.
- `saveData(data)` creates `.granite/plugins/<id>/` idempotently, then writes
  `data.json` atomically (temp sibling + rename).
- Use the generic to type-cast the return: `await api.loadData<MyState>()`.

## Settings tabs

```ts
addSettingsTab(spec: PluginSettingsTabSpec): () => void

interface PluginSettingsTabSpec {
  readonly name: string;
  readonly render: (container: HTMLElement) => undefined | (() => void);
}
```

The host appends a tab labelled `name` under **Plugin options** in the
Settings modal. `render(container)` is called every time the tab becomes
visible. The container is cleared on cleanup by the host; if `render` returns
a function, the host also runs it on cleanup. Imperative DOM is the
expected idiom — there is no built-in React renderer.

`addSettingsTab` returns a disposer. As with status bar items, the loader
will sweep residual tabs on plugin unload via
`removeAllSettingsTabsForPlugin(id)`.

## `api.log`

```ts
log(...args: unknown[]): void
```

`console.log` prefixed with `[plugin:<id>]`. Use freely — Granite does not
silence plugin logs.

## Update-check semantics

`api.granite.version` exposes the current `APP_VERSION`. When the user runs
**Plugins → Check for updates**, Granite walks every installed plugin with a
`manifest.url`, fetches the remote `manifest.json`, and compares versions
with `compareVersions(a, b)` from `src/core/plugins/update-check.ts`:

```ts
export function compareVersions(a: string, b: string): number;
```

The helper splits on `.`, `+`, and `-`, treats missing parts as 0, and
returns -1 / 0 / 1. A remote `minAppVersion` higher than the local
`APP_VERSION` flags the plugin as incompatible (warning notice, sticky).

## See also

- [SDK overview](../sdk/overview.md)
- [SDK quickstart](../sdk/quickstart.md)
- [SDK type reference](../sdk/types.md)
- [Commands reference](./commands.md)
- [Events reference](./events.md)

[← Index](./README.md) · [vault format →](./vault-format.md)
