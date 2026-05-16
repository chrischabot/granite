# Granite Plugin API

Plugins are JavaScript modules installed under `.granite/plugins/<plugin-id>/`.
The module exports lifecycle hooks and receives a `PluginApi` object.

```ts
export const onLoad = async (api: PluginApi) => {
  api.log("loaded");
};

export const onUnload = async (api: PluginApi) => {
  api.log("unloaded");
};
```

## Manifest

```json
{
  "id": "example-plugin",
  "name": "Example Plugin",
  "version": "1.0.0",
  "main": "main.js",
  "manifestUrl": "https://example.com/manifest.json",
  "minAppVersion": "0.0.0"
}
```

`id`, `name`, and `version` are required. `main` defaults to `main.js`.
`manifestUrl` enables update checks. `minAppVersion` disables incompatible
plugins gracefully.

## PluginApi

- `commands` exposes the command registry.
- `workspace` exposes workspace state and tab actions.
- `notice` shows user notices.
- `vault` provides active-vault file helpers.
- `granite` exposes host information.
- `statusBar` adds plugin-owned status items.
- `events` subscribes to workspace events.
- `metadataCache` reads parsed note metadata.
- `loadData()` reads this plugin's `.granite/plugins/<id>/data.json`.
- `saveData(data)` writes this plugin's data atomically.
- `addSettingsTab(spec)` adds a Settings modal tab under Plugin options.
- `log(...args)` writes a plugin-prefixed console message.

## Vault API

- `vault.active` describes the active vault.
- `vault.read(path)` reads UTF-8 text.
- `vault.write(path, content)` writes UTF-8 text.
- `vault.listMarkdown()` returns Markdown file paths, sizes, and modification
  times.

## Status Bar API

`statusBar.add({ text, tooltip, onClick })` returns a handle with:

- `setText(text)`
- `setTooltip(text | null)`
- `setOnClick(fn | null)`
- `remove()`

All status-bar items are removed when the plugin unloads.

## Events API

`events.on(event, listener)` returns a disposer. Supported events:

- `file-open`
- `active-leaf-change`
- `layout-change`
- `file-rename`

## Metadata Cache API

- `metadataCache.getFileCache(path)`
- `metadataCache.getBacklinks(path)`
- `metadataCache.getAllTags()`
- `metadataCache.getAllProperties()`

The metadata cache is read-only for plugins.

## Settings Tabs

`addSettingsTab({ name, render })` mounts a plugin settings panel. `render`
receives a container element and may return a cleanup function.

## Persistence Example

```ts
type Settings = { folder: string };

export async function onLoad(api: PluginApi) {
  const settings = (await api.loadData<Settings>()) ?? { folder: "Inbox" };
  await api.saveData(settings);
}
```
