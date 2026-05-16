# Architecture overview

Granite is a local-first Markdown PKM. It runs as a single-page React app
served by Vite, talks to a vault folder through a pluggable `FileSystem`
Effect service, and stores app-owned state next to the vault under `.granite/`
plus a small set of browser-local stores (IndexedDB, localStorage).

This page is the high-level map. Each subsystem has its own page later in the
developer guide.

## Top-level diagram

```text
                            ┌────────────────────────────────────────┐
                            │             React UI (src/ui)          │
                            │                                        │
  user input ──────────────▶│  App.tsx → shell + views + overlays    │
                            │  prompts: palette, switcher, settings  │
                            │  ErrorBoundary, NoticeContainer,       │
                            │  TooltipHost, MenuHost, HoverPopover,  │
                            │  OverlayHost, A11yAnnouncer            │
                            └────────────────┬───────────────────────┘
                                             │
                                React hooks  │  command/notice/error
                                useSync...   │  registries (singletons)
                                             ▼
                            ┌────────────────────────────────────────┐
                            │           Core services (src/core)     │
                            │                                        │
                            │  commands/CommandRegistry              │
                            │  notices/notice (noticeManager)        │
                            │  errors/reporter                       │
                            │  workspace/store + persist + recents   │
                            │  metadata/cache + parser               │
                            │  search, graph, links, bases, canvas   │
                            │  settings/store + spellcheck           │
                            │  i18n (t, registerLocale, direction)   │
                            │  plugins/loader + host-registries      │
                            │  plugins-core/* (built-in plugins)     │
                            │  themes/loader, snippets/loader        │
                            │  vault/registry, granite-config        │
                            └────────────────┬───────────────────────┘
                                             │
                              Effect.gen { yield* FileSystem }
                                             ▼
                            ┌────────────────────────────────────────┐
                            │      FileSystem service (Effect 4)     │
                            │                                        │
                            │  list / listAll / readText / readBytes │
                            │  writeText (atomic) / writeBytes       │
                            │  mkdir / rename / remove / stat / watch│
                            │  moveToSystemTrash? (host-bridged)     │
                            └────────────────┬───────────────────────┘
                                             │
                ┌────────────────────────────┼─────────────────────────────┐
                ▼                            ▼                             ▼
       File System Access                  OPFS               window.graniteHost.fs
       (user-picked folder)        (sandboxed vaults)         (native bridge, optional)
                │                            │                             │
                ▼                            ▼                             ▼
              vault/                       vault/                        vault/
              ├── *.md                     ├── *.md                      ├── *.md
              ├── .granite/                ├── .granite/                 ├── .granite/
              └── attachments/             └── attachments/              └── attachments/
```

## Layers

### UI layer — `src/ui/`

React 19 surfaces. Everything is composed in `src/App.tsx`:

- `ErrorBoundary` wraps the whole tree and listens to `subscribeErrorReports`.
- `ThemeProvider` toggles light/dark/high-contrast classes on `<html>`.
- `VaultProvider` exposes the active vault via context.
- Binder components (`MetadataCacheBinder`, `NativeHistoryBinder`,
  `RecentsFsBinder`, `CssClassesBinder`, `LocaleDirectionBinder`,
  `A11yAnnouncer`, `WorkspaceA11yAnnouncements`) wire core services into React.
- `CommandsBootstrap` registers default commands and opens prompts.
- The shell (`Titlebar`, `Ribbon`, `LeftSidebar`, `Workspace`, `RightSidebar`,
  `StatusBar`) is laid out under `.app-container`.
- Modal prompts (`CommandPalette`, `QuickSwitcher`, `VaultPicker`,
  `SettingsModal`, `HelpModal`, `InstallPluginModal`, `FileRecoveryModal`,
  `TemplatePicker`) live as siblings.
- Overlay hosts (`NoticeContainer`, `TooltipHost`, `MenuHost`,
  `HoverPopoverHost`, `OverlayHost`) are portal targets for transient UI.

See [Web app structure](./web-app.md) for the detailed map.

### Core services — `src/core/`

Plain TypeScript modules. Most are framework-agnostic: they expose
`subscribe(listener)` + `getSnapshot()` pairs that React consumes with
`useSyncExternalStore`. Effect 4 is used inside the data path
(`Effect.gen { yield* FileSystem }`); the runtime is started once and shared.

Key singletons:

- `commandRegistry` — `src/core/commands/CommandRegistry.ts`.
- `noticeManager` — `src/core/notices/notice.ts`.
- Error reporter — `src/core/errors/reporter.ts`.
- `workspaceStore` — `src/core/workspace/store.ts`.
- `metadataCache` — `src/core/metadata/cache.ts`.
- `settingsStore` — `src/core/settings/store.ts`.
- `a11yAnnouncer` — `src/core/a11y/announcer.ts`.

### FileSystem adapter — `src/core/fs/`

`FileSystem` is an Effect 4 service (`Context.Service` class). The runtime
layer is built per-vault when a user picks a folder or opens an OPFS vault,
and is swapped in `VaultContext`. Writes are atomic (temp sibling + rename).
A watcher posts `FsEvent`s back to consumers (metadata cache, recents,
external-edit detector).

### Persistent state

Granite uses three storage tiers:

- **Vault disk**, under `.granite/`: `workspace.json`, `graph.json`,
  `settings.json` (mirror), `plugins-enabled.json` (mirror), installed
  plugins under `.granite/plugins/<id>/`.
- **localStorage**, browser-scoped:
  - `granite.settings.v1` — primary settings JSON.
  - `granite.plugins.enabled.v1:<vaultId>` — enabled plugin ids per vault.
  - `granite.file-recovery.v1` — recovery interval/retention overrides.
  - `granite.locale.v1` — active locale id.
- **IndexedDB**, browser-scoped:
  - DB `granite`, stores `vault-handles` and `vault-meta` — recent vault
    handles (File System Access) and metadata.
  - DB `granite-recovery`, store `snapshots` — periodic file-recovery
    snapshots, default 5-minute interval and 7-day retention.

The settings/plugins-enabled disk mirrors mean a vault can move between
browsers and keep its configuration.

## Plugin sandbox concept

Plugins are evaluated JavaScript modules loaded from
`.granite/plugins/<id>/main.js`. They are exposed to a `PluginApi` object
defined in `src/core/plugins/types.ts`; the loader at
`src/core/plugins/loader.ts` instantiates each plugin against that surface.
`host-registries.ts` exposes the slots a plugin can register against —
commands, ribbon items, status-bar items, settings tabs, view types, file
menu items.

Restricted mode is on by default for new vaults — community plugins must be
explicitly enabled. Granite does not provide an isolated origin or worker
sandbox; plugins run in the same realm as the app, so trust is by convention,
the way Obsidian-style plugin systems operate.

## What Granite is not

- **No server.** The only "servers" are Vite dev (`bun run dev`) and Vite
  preview (`bun run preview`). There is no Granite backend, no telemetry,
  no auth, no cloud sync.
- **No proprietary database.** Vaults are normal folders. App state under
  `.granite/` is plain JSON.
- **No mandatory native code.** Granite runs in a Chromium browser via the
  File System Access API and OPFS. A native host (Electron/Tauri shell) is
  optional and only adds extra capabilities like `window.graniteHost.fs.moveToSystemTrash`.

---

[← README](./README.md) · [Index](../README.md) · [next →](./repo-layout.md)
