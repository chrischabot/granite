# SDK overview

## What the SDK is

The Granite plugin SDK is a single TypeScript surface — `PluginApi` — that
the host hands to every plugin's lifecycle hooks. There is no separate
runtime to install; the SDK is "whatever Granite passes you when it calls
`onLoad(api)`".

The full surface is defined in `src/core/plugins/types.ts`. Public
declarations suitable for editor IntelliSense ship alongside every example
at `examples/plugins/granite-api.d.ts`. Copy that file into your plugin
directory and `/// <reference path="./granite-api.d.ts" />` from your
`main.js` (or use a `.d.ts`-aware editor) to get autocomplete.

## What a plugin is

A directory under `<vault>/.granite/plugins/<id>/` containing:

| File | Required | Purpose |
|------|----------|---------|
| `manifest.json` | yes | `PluginManifest`. The loader reads this first; without it the plugin is invisible. |
| `main.js` | yes (filename overridable via `manifest.main`) | CommonJS module. Assigns `module.exports` to either `{ onLoad, onUnload }` (Style A) or a class extending the obsidian-shim `Plugin` base (Style B). |
| `styles.css` | no | Optional CSS. When `module.exports` is a Style B class, the shim auto-injects this file via `<link>` while the plugin is loaded. |
| `data.json` | no | Written and read by `api.saveData()` / `api.loadData()`. |

`id` **must** match the directory name. The loader uses the directory name
as the plugin id when it builds `LoadedPlugin.manifest`.

## How plugins load

`src/core/plugins/loader.ts` runs as part of every vault bind:

1. `bindPlugins(vaultId, info)` is invoked when the vault mounts.
2. `bindWorkspaceEvents()` wires the workspace event bridge (idempotent).
3. `hydrateEnabledFromDisk(vaultId)` merges `.granite/plugins-enabled.json`
   into the localStorage mirror.
4. `refreshAll()` lists every directory under `.granite/plugins/`, reads
   each `manifest.json`, and for each id:
   - If enabled and not already loaded → call `loadPlugin(entry)`.
   - If not enabled and currently loaded → call `unloadPlugin(entry)`.
5. A `FileSystem.watch` is installed for `.granite/plugins/**`. Changes
   debounce 250 ms then re-run `refreshAll`.

`loadPlugin` reads `main.js`, builds the `PluginApi`, instantiates a
shimmed `obsidian` module (for Style B plugins), and evaluates the code in
a function scope that exposes `module`, `exports`, `api`, and `require`:

```js
const fn = new Function(
  "module",
  "exports",
  "api",
  "require",
  `${code}\n;return module.exports;`,
);
```

`require("obsidian")` returns the shim; any other id throws
`Cannot find module "<id>" in plugin sandbox`. There is no `process`, no
`Node fs`, no network access beyond `fetch`.

## Restricted mode

`settings.pluginRestrictedMode` defaults to `true`. When restricted mode is
on, `loadPlugin` short-circuits with a warning notice:

> Restricted mode is on. Enable community plugins in Settings → Community
> plugins to run "&lt;Plugin Name&gt;".

Only community plugins under `.granite/plugins/<id>/` go through this
check. Core plugins registered in-process at app startup are unaffected.

## What plugins can do

- Register commands (palette, hotkeys, callbacks).
- Read and write markdown files in the active vault.
- List every markdown file with size + mtime.
- Open / close / split / focus tabs and leaves.
- Show notices.
- Add a status bar item.
- Add a settings tab.
- Subscribe to `file-open`, `active-leaf-change`, `layout-change`,
  `file-rename`.
- Query the metadata cache (per-file cache, backlinks, tags, properties).
- Persist plugin-local JSON via `loadData` / `saveData`.

## What plugins cannot do

- Access node modules (`fs`, `child_process`, native bindings, …).
- Reach outside the vault root.
- Read raw bytes from the vault (`api.vault.read` is UTF-8 only).
- Mutate other plugins' state.
- Add new modifiers / new hotkey-trigger types.
- Replace built-in views (markdown editor, file explorer, graph, …).
- Hot-patch the SDK surface (the `PluginApi` object is frozen-shape).

If you need a capability that isn't here, open an issue — the host runs
plugin code with the same JS privileges as the app, so most additions are a
matter of API design rather than security.

## Lifecycle in one diagram

```text
vault mount
   │
   ├─ bindWorkspaceEvents()         (idempotent)
   ├─ hydrate plugins-enabled.json
   ├─ for each plugin in .granite/plugins/:
   │      readManifest → entry.manifest
   │      if enabled  → loadPlugin(entry)
   │
   ├─ FileSystem.watch(".granite/plugins/**")
   │       └─ on change (250 ms debounce) → refreshAll()
   │
   │   (during the session)
   │   user toggles plugin → setPluginEnabled(id, …)
   │   → loadPlugin / unloadPlugin
   │
vault unmount
   │
   ├─ FileSystem.watch disposer
   ├─ for each loaded plugin: unloadPlugin
   └─ activeVaultId = null
```

Each `loadPlugin` call goes through `serializeEntry(entry, op)` so two
concurrent loads can't both clobber `entry.cleanup`. Same for `unloadPlugin`.

## See also

- [Quickstart](./quickstart.md) for a working hello-world.
- [Plugin API reference](../reference/plugin-api.md) for every method.
- [Vault format](../reference/vault-format.md) for the on-disk layout.

[← SDK index](./README.md) · [Index](../README.md) · [quickstart →](./quickstart.md)
