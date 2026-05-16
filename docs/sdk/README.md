# Plugin SDK

Granite ships a small, opinionated plugin API: commands, the workspace
store, notices, a vault helper, a status-bar slot, four workspace events, a
metadata cache view, and per-plugin JSON storage. That's it — no node
integration, no privileged DOM access beyond what the host already mounts,
no implicit globals.

These pages walk you through building, shipping, and maintaining a Granite
community plugin. For the line-by-line type reference see the
[Plugin API reference](../reference/plugin-api.md).

## Pages

- [SDK overview](./overview.md) — what the SDK is and what plugins can do.
- [Quickstart](./quickstart.md) — write your first plugin end-to-end.
- [Manifest](./manifest.md) — every field in `manifest.json`.
- [Lifecycle](./lifecycle.md) — `onLoad`, `onUnload`, and how cleanup works.
- [Type reference](./types.md) — every TypeScript type you might touch.
- [Cookbook](./cookbook.md) — copy-pasteable patterns.
- [Publishing](./publishing.md) — package, host, and update your plugin.

## Two plugin shapes

Granite supports two `module.exports` shapes:

- **Style A — Granite-style:** `module.exports = { onLoad, onUnload }`.
  Both hooks receive a `PluginApi` instance. This is what the SDK pages
  document.
- **Style B — Obsidian-shape:** `module.exports = class extends Plugin { … }`.
  Granite's obsidian-shim recognises a class that extends the shim's
  `Plugin` base and calls `onload()` / `onunload()` on the instance. Style B
  is provided for Obsidian-plugin compatibility; new plugins should prefer
  Style A.

## Examples

Three end-to-end examples ship with the repo under `examples/plugins/`:

- `word-counter/` — registers one command, scans every markdown file,
  reports a total via a notice.
- `auto-tagger/` — reads + writes a markdown file, scans for capitalised
  phrases, merges them into the frontmatter `tags` list.
- `data-store/` — exercises every Phase 9 surface: `loadData/saveData`,
  status bar items, settings tabs, and the `file-open` event.

[← Reference index](../reference/README.md) · [Index](../README.md) · [overview →](./overview.md)
