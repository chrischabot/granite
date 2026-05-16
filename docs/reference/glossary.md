# Glossary

Short definitions for the terms used across the Granite documentation and
codebase.

**Vault** — A folder of plain files that Granite reads and writes. One vault
is mounted at a time. The vault root is identified by either a real file
system handle (`fsa`) or an origin-private browser sandbox (`opfs`).

**Leaf** — A single document view inside a tab group. Every tab in Granite
is backed by a leaf with a typed state: empty, markdown, file-explorer,
canvas, graph, etc. (`src/core/workspace/types.ts`).

**Tab** — The visual handle for a leaf at the top of a tab group. Tabs and
leaves are 1:1.

**Tab group** — A horizontal strip (or stacked column) of tabs sharing one
visible content area. A workspace is one or more **columns** of tab groups
arranged left-to-right; each column stacks groups top-to-bottom.

**Ribbon** — A vertical strip of icon buttons attached to the workspace
shell. Plugins can mount icons here via the obsidian-shim Plugin base
(`addRibbonIcon`).

**Sidebar** — The left and right panels of the workspace shell. Each
sidebar hosts named "tabs" — `explorer`, `search`, `tags`, `outline`,
`bookmarks`, `graph`, etc. — addressed by id via `openSidebarView(side, id)`.

**Status bar** — The bottom strip of the workspace. Hosts indicator items
(word count, sync state) registered via `api.statusBar.add(opts)`.

**Command** — A named action with a stable id, an optional default hotkey,
and an optional `checkCallback` gate. Commands are how every keyboard
shortcut, palette entry, and ribbon button invokes work.

**Hotkey** — A `{ modifiers, key }` tuple bound to a command. `Mod`
resolves to **Cmd on macOS** and **Ctrl on Windows/Linux**.

**Notice** — A transient banner shown via `api.notice.show(message, opts)`.
Supports `info`, `success`, `warning`, `error`. Default timeout 4000 ms;
pass `timeoutMs: 0` for sticky.

**Frontmatter** — The YAML block delimited by `---` at the very top of a
markdown file. Keys become "Properties".

**Property** — A single key/value from a file's frontmatter, surfaced in
the Properties view and the Properties panel. Property *types* are
registered in `src/core/metadata/type-registry.ts`.

**Tag** — A `#tag` or `#tag/subtag` token in a note body or in
`tags:` frontmatter. Hierarchical via `/`.

**Wikilink** — `[[target]]` — a link resolved against vault paths and note
titles. `[[target#heading]]` jumps to a heading, `[[target#^block-id]]` to
a block reference.

**Embed** — `![[asset]]` — like a wikilink but renders the referenced
content inline (image, audio, video, PDF, or another note).

**Callout** — A blockquote with a `[!kind]` tag on its first line:
`> [!note] Title`. Renders as a coloured info box in reading view.

**Block ID** — A `^id` suffix on a line that lets other notes link to that
exact line via `[[note#^id]]`.

**Canvas** — A `.canvas` file holding a free-form 2D arrangement of text /
file / link / group nodes connected by edges. Schema: `src/core/canvas/schema.ts`.

**Base** — A `.base` file holding a saved query plus a view configuration
(table, list, cards, map). Schema: `src/core/bases/schema.ts`.

**Theme** — A `.css` file under `.granite/themes/`. One is "active" at a
time, recorded in `.granite/active-theme.json` and exposed via
`api.granite.activeThemePath`.

**Snippet** — A `.css` file under `.granite/snippets/` that is loaded on
top of the active theme when enabled. The list of enabled snippets is in
`.granite/snippets-enabled.json`.

**Restricted mode** — When `settings.pluginRestrictedMode` is `true`
(default), community plugins under `.granite/plugins/<id>/` refuse to load.
Core plugins registered in-process are unaffected. The user must toggle
restricted mode off in **Settings → Community plugins** before a community
plugin can run.

**Atomic write** — Granite's `FileSystem.writeText` / `writeBytes` always
writes to a temp sibling and renames over the target. A killed process
leaves the original file intact.

**OPFS** — Origin Private File System. A sandboxed browser-private storage
keyed by origin. Granite uses OPFS as the fallback adapter when the user
declines or cannot grant File System Access permissions.

**FSA** — File System Access API. The browser API that lets the user grant
Granite permission to read and write a real folder on disk.

**Live preview** — A markdown editing mode that hides format markers
(`**`, `==`, wikilink brackets) on lines without the cursor while still
allowing edits. Gated by `settings.livePreview`.

**Reading view** — A fully rendered markdown mode with no source-level
editing. Toggle with `Mod+E`.

**Quick switcher** — A modal opened with `Mod+O` that fuzzy-searches every
file in the vault and opens the chosen one in the active leaf.

**Command palette** — A modal opened with `Mod+P` that lists every visible
command and lets the user pick one by typing.

[← hotkeys](./hotkeys.md) · [Index](./README.md)
