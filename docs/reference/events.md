# Events

The plugin event bus exposes four named workspace events. Plugins subscribe
via `api.events.on(name, listener)` and receive a disposer to call from
`onUnload`.

Source: `src/core/plugins/events.ts` (event bus) and
`src/core/plugins/types.ts` (type declarations).

```ts
type PluginEventName = "file-open" | "active-leaf-change" | "layout-change" | "file-rename";

interface PluginEventMap {
  "file-open": { path: string };
  "active-leaf-change": { leafId: string | null; path: string | null };
  "layout-change": Record<string, never>;
  "file-rename": { from: string; to: string };
}
```

The bus is wired to the workspace store by `bindWorkspaceEvents()`, which
runs the first time `bindPlugins(vaultId, info)` is called for a vault. The
bridge captures the workspace's initial snapshot so the *first* render does
not fire a spurious event.

## `file-open`

```ts
{ path: string }
```

Fires when the active leaf shows a different markdown file than it did at the
previous tick — including the first time a file is opened in any leaf, and
when the user clicks a wikilink that swaps the active leaf's path. It does
**not** fire when the active leaf is non-markdown (e.g. graph, canvas, empty).

The `path` is vault-relative (`Projects/Granite.md`, not absolute).

Common pitfalls:

- The event reflects the **active** leaf only. If the user opens a new file
  in a background tab via a context-menu action and the active leaf does not
  change, no `file-open` fires. Use `layout-change` to detect that case.
- `file-open` and `active-leaf-change` may both fire on the same workspace
  mutation. Subscribe to whichever matches your intent.

## `active-leaf-change`

```ts
{ leafId: string | null; path: string | null }
```

Fires whenever the **active leaf id** changes — clicking a tab, opening a
new file in a new tab, closing the current tab, focusing a different tab
group, etc. `leafId` is `null` only when no group has an active leaf
(unreachable in normal workspaces). `path` is the leaf's markdown path or
`null` for non-markdown leaves.

## `layout-change`

```ts
Record<string, never>
```

Fires whenever the layout signature changes: column / group structure, leaf
membership of a group, the active leaf within a group, or the stacked state
of a group. The payload carries no data — re-read
`api.workspace.getState()` if you need details.

Signature computation (from `snapshotLayoutKey()`):

```text
<column0>|<column1>;…;--;<groupId>:<leafIds>:<activeLeafId>:<stacked?>;…
```

The bridge debounces by comparing the new key against the previous one, so
the event only fires on structural changes — pure focus changes are caught
by `active-leaf-change`.

## `file-rename`

```ts
{ from: string; to: string }
```

Fires when the rename rewriter moves a vault file (via the file explorer's
rename UI, the rename command, or another move). Both `from` and `to` are
vault-relative.

`file-rename` is dispatched explicitly from `emitFileRename(from, to)` —
the move pipeline must call this after the actual filesystem rename
succeeds. It does **not** fire on bulk operations triggered by external
filesystem tools (use the file watcher for those).

## Cleanup

`on(event, listener)` returns a disposer. Capture it in `onLoad` and call
it in `onUnload`:

```js
let off;
module.exports = {
  onLoad(api) {
    off = api.events.on("file-open", ({ path }) => {
      api.log("opened", path);
    });
  },
  onUnload() {
    off?.();
    off = null;
  },
};
```

If a plugin forgets to call the disposer, the loader's safety net runs
`removeAllListenersForPlugin(pluginId)` on unload — every entry attributed
to that plugin id is dropped from every event bucket. The safety net is not
an excuse to skip cleanup; calling the disposer keeps invariants tight and
makes hot-reload predictable.

## Errors in listeners

Each listener invocation is wrapped in a `try` / `catch`. Exceptions are
logged with `console.error("[granite] plugin event listener \"<name>\" threw:", err)`
and do **not** prevent other listeners from running.

## Test reset

`_resetEventsForTesting()` in `src/core/plugins/events.ts` clears every
subscriber and detaches the workspace bridge. Used by `loader.test.ts` and
`events.test.ts` to isolate state between cases.

## See also

- [Plugin API → events](./plugin-api.md#apievents)
- [SDK cookbook → React to file-open and file-rename](../sdk/cookbook.md#react-to-file-open-and-file-rename)

[← commands](./commands.md) · [Index](./README.md) · [settings →](./settings.md)
