# Lifecycle

Every Granite plugin has exactly two lifecycle hooks: `onLoad` and
`onUnload`. They run in a predictable order and the loader provides a
safety net so a misbehaving plugin cannot leak indefinitely.

Source: `loadPluginInner` and `unloadPluginInner` in
`src/core/plugins/loader.ts`.

## `onLoad(api)`

Runs when the plugin transitions from **disabled** to **enabled**, which
happens in three situations:

1. The vault mounts and `.granite/plugins-enabled.json` lists this plugin.
2. The user flips the toggle in **Settings → Plugins**
   (`setPluginEnabled(id, true)`).
3. Files inside `.granite/plugins/<id>/` change while the plugin is
   already enabled — the watcher debounces 250 ms then re-runs
   `refreshAll`, which unloads-then-loads the plugin to pick up the new
   code.

`onLoad` receives the `PluginApi` instance. It may be `async`; the loader
awaits the returned promise before marking the plugin as loaded.

```js
module.exports = {
  async onLoad(api) {
    const data = (await api.loadData()) ?? defaultState;
    api.log("loaded with", data);
  },
};
```

If `onLoad` throws, the loader shows an error notice
(`plugin.loader.error.load`) and the plugin stays unloaded. Tracked
disposers that ran before the throw are still drained on the next unload
sweep.

## `onUnload(api)`

Runs when the plugin transitions from **enabled** to **disabled**. Reasons:

1. The user toggles the plugin off.
2. The vault unmounts.
3. The plugin's source files change on disk (triggers an unload-then-load).

`onUnload` may be `async`. The loader awaits it, catches and logs any
thrown error, then runs the safety net.

```js
module.exports = {
  async onUnload(api) {
    api.log("unloading");
    await flushStateToDisk();
  },
};
```

## Disposers and cleanup

Three categories of host registrations need to be cleaned up on unload:

| What you registered | How to clean it up | Safety net |
|--------------------|--------------------|------------|
| `api.commands.register(cmd)` | Call the returned disposer. | — (the loader does not auto-clean commands; you must clean these up yourself.) |
| `api.statusBar.add(opts)` | Call `handle.remove()`. | `removeAllStatusBarItemsForPlugin(id)` on unload. |
| `api.addSettingsTab(spec)` | Call the returned disposer. | `removeAllSettingsTabsForPlugin(id)` on unload. |
| `api.events.on(name, fn)` | Call the returned disposer. | `removeAllListenersForPlugin(id)` on unload. |

The safety net exists because the misbehaving-shim fixture (used by the
plugin verifier) registers items through the legacy `statusBar.add` /
`addSettingsTab` surface, which is not auto-tracked by the obsidian-shim
`Plugin` base. Without the sweeps, a buggy plugin's items would leak after
unload.

**Commands are not part of the safety net** — if you forget to dispose
them, they keep accumulating in `commandRegistry`. Always capture and call
the disposer.

A common pattern is to push every disposer onto an array and drain it on
unload:

```js
const disposers = [];

module.exports = {
  onLoad(api) {
    disposers.push(api.commands.register({ /* … */ }));
    disposers.push(api.events.on("file-open", () => { /* … */ }));
    disposers.push(api.addSettingsTab({ /* … */ }));
  },
  onUnload() {
    for (const d of disposers.splice(0)) d();
  },
};
```

Or use `createCommandRegistrar()` from
`src/core/commands/CommandRegistry.ts` for the command-only subset.

## Style B (obsidian-shim) lifecycle

If `module.exports` is a class that extends the obsidian-shim's `Plugin`
base, the loader instantiates it and calls `instance.onload()` /
`instance.onunload()` instead of `onLoad` / `onUnload`. The shim also
tracks `addCommand`, `addRibbonIcon`, `registerEvent`, `registerDomEvent`,
`registerInterval`, and other Obsidian-style helpers through a
`PluginRegistrationTracker`. Tracked disposers are drained in LIFO order
after `onunload` returns, so plugins using Style B can skip explicit
disposer-array bookkeeping for any registration made via the tracker.

A tracker push after the loader has drained — i.e. after `onunload`
returned — is logged as:

> [granite] Plugin "&lt;id&gt;" pushed a disposer after unload — the
> registration will leak. Move registrations into onload(), not async
> callbacks that resolve after the host has disposed the plugin.

…and the disposer is dropped. Move all `register*` calls into `onload` (or
into synchronous descendants of it).

## Synchronous obsidian-shim Vault API

The obsidian-shim `Vault.read`, `Vault.getMarkdownFiles`, `Vault.getAbstractFileByPath`,
etc. are synchronous because the Obsidian API is. The loader keeps two
small caches behind these surfaces (`markdownListCache` and `statCache`)
and refreshes them once around every `loadPlugin` call. The caches are good
enough for read-only access patterns; writes still go through the real
async `FileSystem` service. If your plugin needs fresh data after `onload`,
prefer the async `api.vault.read` / `api.vault.listMarkdown` over the shim's
sync surface.

## Concurrency

Each plugin entry has an `inflight: Promise<void> | null` slot.
`serializeEntry(entry, op)` chains every `loadPlugin` / `unloadPlugin` call
on the previous promise, so:

- Two concurrent enable toggles never both run `loadPlugin` and overwrite
  each other's `entry.cleanup`.
- A disable followed immediately by an enable always sees the unload's
  disposers drained before the new load starts.

You do not need to do anything to participate in this — the lock is on the
loader side. But it does mean an `onUnload` that takes 5 seconds will hold
up the next enable for 5 seconds.

## See also

- [Plugin API → loadData / saveData](../reference/plugin-api.md#plugin-data)
- [SDK cookbook](./cookbook.md) for cleanup patterns.

[← manifest](./manifest.md) · [Index](./README.md) · [types →](./types.md)
