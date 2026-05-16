# Web app structure

This page is the developer-side map of `src/App.tsx`, the shell, the views,
and the workspace store that ties them together. For the broader picture see
[Architecture overview](./architecture.md); for the file-level tour see
[Repository layout](./repo-layout.md).

## `App.tsx`

`src/App.tsx` is the only entry point. It composes:

1. `ErrorBoundary` — root error boundary, see [Reporting](./reporting.md).
2. `ThemeProvider` — toggles light/dark/high-contrast classes.
3. `VaultProvider` — exposes the active vault via React context.
4. **Binders** — small components that subscribe core services to React lifetime:
   - `MetadataCacheBinder` — primes `metadataCache` from the file watcher.
   - `NativeHistoryBinder` — wires browser history (`popstate`) to the
     workspace store's back/forward.
   - `RecentsFsBinder` — keeps recents in sync with `fs.watch`.
   - `CssClassesBinder` — adds platform/locale classes to `<html>`.
   - `LocaleDirectionBinder` — sets `dir` / `lang` from the active locale.
   - `A11yAnnouncer` — renders the `aria-live` polite region.
   - `WorkspaceA11yAnnouncements` — announces active-tab changes.
5. `CommandsBootstrap` — registers the default commands and gives each open-
   prompt callback to the registry.
6. **Shell** — `Titlebar` over `.app-container`, with `.horizontal-main-container`
   holding `Ribbon`, `LeftSidebar`, `Workspace`, `RightSidebar`. `StatusBar`
   sits beneath the shell.
7. **Modal prompts** — `CommandPalette`, `QuickSwitcher`, `VaultPicker`,
   `SettingsModal`, `HelpModal`, `InstallPluginModal`, `FileRecoveryModal`,
   `TemplatePicker`. Open state is held in `App` and toggled by command
   callbacks.
8. **Overlay hosts** — `NoticeContainer`, `TooltipHost`, `MenuHost`,
   `HoverPopoverHost`, `OverlayHost`. These are portal targets that any
   subtree can target without prop drilling.

There is no router. Tab/leaf state is the workspace store; the URL is only
used by `VaultContext` for the `?vault=…` switcher.

## Overlay system

Granite renders transient UI through global hosts mounted once in `App.tsx`.
Each host is paired with a small module that exposes an imperative API and an
observable store:

- `NoticeContainer` ↔ `noticeManager` (`src/core/notices/notice.ts`).
- `TooltipHost` ↔ tooltip controller (hover-driven).
- `MenuHost` ↔ menu controller — used by ribbon menus, file-explorer context
  menus, tab-strip menus.
- `HoverPopoverHost` ↔ link-hover preview pop-overs.
- `OverlayHost` ↔ general-purpose React portal target.

This decouples the trigger from the surface: the active tab can throw a
notice without owning a portal, the ribbon can open a menu anchored to a
button anywhere in the tree, and modals can stack on top of one another.

Notable overlay primitives, all under `src/ui/overlay/`:

- `Modal.tsx` — focus-trapping modal dialog. The settings, help, and vault
  pickers extend it.
- `Menu.tsx` — keyboard-navigable popup menu.
- `Tooltip.tsx` — lazy tooltip surface, respects reduced motion.
- `HoverPopover.tsx` — link-hover preview pop-over.
- `Prompt.tsx` + `inputPrompt.tsx` — programmatic single-input prompt used
  by plugins.

## Shell composition

```text
.app-container
├── Titlebar                            window chrome + active leaf title
└── .horizontal-main-container
    ├── Ribbon                          icon column on the leading edge
    ├── LeftSidebar                     file explorer, search, tags, bookmarks
    ├── Workspace                       the leaf/tab grid (Markdown, Reading,
    │                                   Canvas, Bases, Graph, Asset, Webviewer)
    └── RightSidebar                    backlinks, outgoing, outline, properties
StatusBar                               vault info, word count, status items
```

Files of interest:

- `src/ui/shell/Titlebar.tsx`
- `src/ui/shell/Ribbon.tsx`
- `src/ui/shell/LeftSidebar.tsx`
- `src/ui/shell/RightSidebar.tsx`
- `src/ui/shell/Workspace.tsx`
- `src/ui/shell/StatusBar.tsx`
- `src/ui/shell/VaultProfile.tsx` — the vault menu inside the titlebar.
- `src/ui/shell/sidebar-groups.ts` — sidebar tab grouping logic.

## Views

A "view" is what fills a leaf in the workspace. The router lives in
`Workspace.tsx`, which dispatches on `leaf.state.type`:

- `markdown` → `MarkdownView` (CodeMirror) or `ReadingView` (markdown-it),
  depending on `mode`.
- `canvas` → `CanvasView`.
- `bases` → `BasesView`.
- `graph` → `GraphView` (full + local graph in the sidebar).
- `asset` → `AssetView` (images, audio, video, PDF via pdfjs-dist).
- `webviewer` → `WebViewerView` (sandboxed iframe).
- `sidebar` → leaves embedded in `LeftSidebar` / `RightSidebar`.
- `empty` → the "no file open" placeholder.

`InlineTitle.tsx` renders the document title inline above Markdown content.

Sub-views live under `src/ui/views/` in their own folders
(`asset/`, `bases/`, `file-explorer/`, `sidebar/`).

## Theme provider and locale binder

`src/ui/theme/ThemeProvider.tsx` reads the user's theme choice from
`settingsStore` and toggles `theme-light` / `theme-dark` / `mod-high-contrast`
classes on `<html>`. Themes loaded from the vault are injected as additional
`<style>` tags by `src/core/themes/loader.ts`.

`src/ui/LocaleDirectionBinder.tsx` calls `subscribeI18n()` and sets the
matching `dir` and `lang` attributes on `<html>` whenever the locale or note
frontmatter changes. See [Internationalisation](./i18n.md).

## A11y announcer

`<A11yAnnouncer />` renders a single `<output class="sr-only" aria-live="polite">`
element bound to `a11yAnnouncer.getSnapshot()`. Any code can call
`a11yAnnouncer.announce("…")` to push a message to assistive tech —
notices announce themselves automatically, and `WorkspaceA11yAnnouncements`
reports active-tab changes.

## Workspace store

`src/core/workspace/store.ts` exposes the singleton `workspaceStore`. It
holds:

- `leaves: Map<LeafId, Leaf>` — every open leaf, keyed by id.
- `groups: Map<TabGroupId, TabGroup>` — each group is a list of leaves with
  an active id (a tab strip).
- `columns: ReadonlyArray<ReadonlyArray<TabGroupId>>` — splits arranged as
  columns of stacked groups.
- `activeGroupId` — the currently focused group.

React consumers subscribe via `useWorkspace()` (a `useSyncExternalStore`
wrapper). The store is also persisted to `.granite/workspace.json` by
`src/core/workspace/persist.ts`.

### Public methods

```ts
workspaceStore.getState(): WorkspaceState;
workspaceStore.subscribe(listener: () => void): () => void;

// Opening
workspaceStore.openFile(path, opts?): LeafId;          // Markdown, with mode/fragment
workspaceStore.openPath(path, opts?): LeafId;          // Dispatches by file extension
workspaceStore.openWebviewer(url, opts?): LeafId;
workspaceStore.openGraph(opts?): LeafId;
workspaceStore.openCanvas(opts?): LeafId;
workspaceStore.openBase(opts?): LeafId;
workspaceStore.openAsset({ path, kind, newTab? }): LeafId;
workspaceStore.openSidebarView(side, tabId, opts?): LeafId;
workspaceStore.newTab(): LeafId;

// Closing
workspaceStore.closeTab(leafId): void;
workspaceStore.closeOtherTabs(leafId): void;
workspaceStore.closeRightTabs(leafId): void;
workspaceStore.closeActiveTab(): void;
workspaceStore.closeGroup(groupId): void;

// Focus and layout
workspaceStore.focusTab(leafId): void;
workspaceStore.setMode(leafId, mode): void;            // "source" | "live" | "reading"
workspaceStore.setMarkdownFolds(leafId, folds): void;
workspaceStore.togglePinned(leafId): void;
workspaceStore.splitLeaf(leafId, direction?): TabGroupId;   // "right" | "down"
workspaceStore.toggleStacked(groupId): void;
```

Open methods follow the same dedupe-or-replace pattern:

1. If a leaf in the active group already matches (e.g. same `path` for
   Markdown, same `url` for Webviewer), focus it and return its id.
2. Otherwise, if the active leaf is "replaceable" (empty or unpinned same-kind),
   swap its state in place.
3. Otherwise, append a new leaf to the active group.

Pinned Markdown leaves are never replaced. Passing `{ newTab: true }` always
forces an append. `openFile` additionally pushes the destination into a
per-leaf navigation history (used by `goBack`, `goForward`, `canGoBack`,
`canGoForward`).

The store also exposes `cycleTab`, `goBack`, `goForward`, `canGoBack`,
`canGoForward`, `moveTab(leafId, targetGroupId, beforeLeafId)`, `reset()`,
and `hydrate(persistedState, …)`. See `src/core/workspace/store.ts` for the
exact signatures.

## Leaf state shape

```ts
type LeafState =
  | { type: "empty" }
  | { type: "markdown"; path: VaultPath; mode: MarkdownViewMode;
      cursorOffset?: number; folds?: Folds; fragment?: string; pinned?: boolean }
  | { type: "canvas"; path?: string }
  | { type: "bases"; path?: string }
  | { type: "graph" }
  | { type: "asset"; path: VaultPath; kind: NativeFileKind }
  | { type: "webviewer"; url: string }
  | { type: "sidebar"; side: "left" | "right"; id: string };
```

`MarkdownViewMode` is `"source" | "live" | "reading"`. `Folds` is the
persisted CodeMirror fold state, written back to disk so re-opening a long
note keeps the same collapsed sections.

## Key UI files (quick index)

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Root composition. |
| `src/main.tsx` | `createRoot` + global CSS imports. |
| `src/ui/A11yAnnouncer.tsx` | `aria-live` region + active-tab announcer. |
| `src/ui/CssClassesBinder.tsx` | Platform/locale `<html>` classes. |
| `src/ui/LocaleDirectionBinder.tsx` | RTL / lang binding. |
| `src/ui/commands/CommandsBootstrap.tsx` | Registers default commands. |
| `src/ui/overlay/ErrorBoundary.tsx` | Whole-app error UI. |
| `src/ui/overlay/Modal.tsx` | Focus-trapping modal primitive. |
| `src/ui/overlay/Menu.tsx` | Popup menu primitive. |
| `src/ui/overlay/NoticeContainer.tsx` | Renders `noticeManager` queue. |
| `src/ui/overlay/Tooltip.tsx` | Lazy tooltip surface. |
| `src/ui/overlay/HoverPopover.tsx` | Link-hover previews. |
| `src/ui/prompts/CommandPalette.tsx` | `Mod-P` palette. |
| `src/ui/prompts/QuickSwitcher.tsx` | `Mod-O` file switcher. |
| `src/ui/prompts/SettingsModal.tsx` | Settings UI. |
| `src/ui/prompts/VaultPicker.tsx` | Vault selection / creation. |
| `src/ui/prompts/HelpModal.tsx` | In-app docs viewer. |
| `src/ui/prompts/InstallPluginModal.tsx` | Community plugin browser. |
| `src/ui/prompts/FileRecoveryModal.tsx` | IndexedDB snapshot picker. |
| `src/ui/prompts/TemplatePicker.tsx` | Template insertion picker. |
| `src/ui/shell/*.tsx` | Titlebar, Ribbon, Sidebars, Workspace, StatusBar. |
| `src/ui/views/MarkdownView.tsx` | CodeMirror 6 source/live-preview editor. |
| `src/ui/views/ReadingView.tsx` | markdown-it reading-mode renderer. |
| `src/ui/views/CanvasView.tsx` | `.canvas` editor. |
| `src/ui/views/BasesView.tsx` | `.base` table/list/card/map. |
| `src/ui/views/GraphView.tsx` | Graph view (full + local). |
| `src/ui/views/AssetView.tsx` | Image/audio/video/PDF viewer. |
| `src/ui/views/WebViewerView.tsx` | Sandboxed iframe. |
| `src/ui/workspace/Leaf.tsx` | Renders a single leaf. |
| `src/ui/workspace/Tab.tsx` | Single tab. |
| `src/ui/workspace/TabStrip.tsx` | Tab strip per group. |
| `src/ui/theme/ThemeProvider.tsx` | Theme class binder. |
| `src/ui/vault/VaultContext.tsx` | Vault React context. |

---

[← build-and-deploy](./build-and-deploy.md) · [Index](../README.md) · [next →](./testing.md)
