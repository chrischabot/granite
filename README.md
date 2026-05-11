# Granite

Granite is a local-first, Markdown-native knowledge base that runs in the
browser and behaves like a serious desktop notes app. It opens a folder of
plain text files, indexes the links between them, renders the Markdown people
actually write, and tries very hard not to turn your notes into somebody
else's database.

The project began as an Obsidian-compatible web implementation, which is a
deceptively simple phrase hiding most of the work. The problem is not "render
Markdown in a pane." The problem is the hundred small promises around that
pane: wikilinks that keep working after a rename, frontmatter that remains
editable as text, Canvas files that round-trip, plugins that can extend the
app without owning it, and a vault that still makes sense when opened in any
ordinary editor.

Granite is a clean-room implementation. It is not affiliated with, sponsored
by, or endorsed by Dynalist Inc. "Obsidian" is a trademark of Dynalist Inc.

## What works

The useful version of this README is the one that distinguishes the working
surface from the ambition, because otherwise every note app eventually becomes
a screenshot of a sidebar and a paragraph about linked thinking. Granite
already has a real app shell and a real vault model:

- Vaults can be opened from disk with the File System Access API, with OPFS as
  an in-browser fallback for browsers that cannot pick folders.
- Notes are plain `.md` files. The metadata cache indexes links, tags,
  aliases, headings, blocks, frontmatter, backlinks, outgoing links, and
  unlinked mentions.
- The editor is built on CodeMirror 6, with reading view, source-oriented
  editing, lightweight live-preview decorations, wikilink completion, heading
  anchors, tag completion, slash commands, document search, and spellcheck.
- Markdown rendering supports the usual inconvenient bits: wikilinks, embeds,
  callouts, comments, highlights, task lists, footnotes, tables, KaTeX,
  Mermaid, Prism syntax highlighting, and embedded query/backlinks blocks.
- The workspace has tabs, split groups, stacked tabs, pinned tabs, tab
  dragging, dirty-state indicators, per-leaf navigation history, pop-out
  windows, persisted layouts, recents, and keyboard shortcuts.
- Search is vault-wide, operator-aware, and reusable from embedded `query`
  code blocks. Current operators include `tag:`, `path:`, `file:`, `line:`,
  quoted phrases, and negative terms.
- Graph view exists in both sidebar/local form and a central force-directed
  view. It is useful today, though the large-vault performance work is still
  unfinished.
- Canvas files use the JSON Canvas v1 shape and can be viewed and edited with
  pan, zoom, draggable cards, colors, edges, resizing, and debounced saves.
- Bases are implemented as a first table-oriented pass over `.base` files,
  using the same search syntax for filtering and frontmatter fields for
  columns.
- Themes, CSS snippets, editable hotkeys, settings persistence, notices,
  hover popovers, tooltips, a high-contrast variant, mobile breakpoints, and a
  production service worker are wired in.
- Community-style plugins load from `.granite/plugins/<id>/`, run behind
  Restricted mode, and receive a typed API for commands, workspace actions,
  notices, and vault reads/writes.

That is the good news. The more precise version is that Granite is still a
workbench, not a finished replacement for your daily vault. Some of the hard
edges are known and tracked in `todo.md`: full live-preview fidelity, the
complete properties editor, community plugin/theme browsing, graph filters,
large-vault performance budgets, the exhaustive accessibility pass, and the
last round of Obsidian compatibility checks.

## Running locally

Granite uses Bun as the package manager and script runner.

```bash
bun install
bun dev
```

The dev server starts on:

```text
http://localhost:8080
```

Useful commands:

```bash
bun run typecheck
bun run test
bun run build
```

For the disk-backed vault flow, use a Chromium-based browser. Safari and
Firefox do not currently expose the same folder-picking API, so Granite falls
back to an OPFS vault there. That fallback is useful for development and
demoing, but the point of the project is still boring local files on disk.

## Opening a vault

Start the dev server, open Granite, and choose **Manage vaults** from the left
ribbon.

- **Pick a folder** opens a real folder on your machine. This is the preferred
  path, because the notes remain ordinary files.
- **In-browser vault** creates an OPFS-backed vault. This is convenient, but it
  is intentionally a fallback rather than the main story.

Granite writes its own app state under `.granite/` inside the vault. Markdown,
Canvas, and Base files remain normal portable files; configuration should be
the only thing with Granite's name on it.

## Plugin development

Plugins live inside the vault:

```text
.granite/plugins/<plugin-id>/manifest.json
.granite/plugins/<plugin-id>/main.js
```

The loader expects a CommonJS-style module with `onLoad(api)` and optionally
`onUnload(api)`. The API intentionally starts small: register commands, open
workspace views, show notices, read and write vault files, list Markdown files,
and inspect the active Granite version/theme. That boundary is doing real
work. Plugins should be able to automate the vault without becoming a second
application bolted to the side of the first one.

See `examples/plugins/` for a word-count plugin, an auto-tagger, and
TypeScript declarations for plugin authors.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime and scripts | Bun 1.2.x |
| Dev server and bundler | Vite 5 |
| Language | TypeScript 7 native preview |
| Effect system | Effect 4 beta |
| UI | React 19 |
| Editor | CodeMirror 6 |
| Markdown | markdown-it plus local extensions |
| Math | KaTeX |
| Diagrams | Mermaid 11 |
| Syntax highlighting | Prism |
| Icons | Lucide |
| Storage | File System Access API, OPFS fallback, IndexedDB/local caches |

Two dependencies deserve the warning label: TypeScript 7 and Effect 4 are
pre-release. They are pinned in `package.json` because fast type-checking and
structured service boundaries are worth trying here, but this is exactly the
kind of choice that should stay easy to revisit if the bet stops paying rent.

## Repo map

```text
.
├── README.md
├── todo.md
├── done.md
├── specs/
│   ├── product/       product behavior, architecture, and acceptance notes
│   └── renderer/      CSS-level reproduction notes for individual surfaces
├── examples/plugins/  sample plugins and public plugin API declarations
├── public/            web manifest and production service worker
└── src/
    ├── App.tsx
    ├── core/          filesystem, metadata, workspace, commands, plugins
    ├── ui/            shell, views, prompts, controls, overlays
    └── styles/        tokens, shell, editor, markdown, views, settings
```

## Project status

The honest test for Granite is not whether the first vault opens. It is
whether a real vault can survive being moved between tools without semantic
damage. The current acceptance checklist lives in
`specs/product/24_acceptance_criteria.md`; shipped work is recorded in
`done.md`; the remaining backlog lives in `todo.md`.

In other words, this is an active compatibility and product-engineering
project, not a theme mockup. The visible shell matters, but the deeper work is
the quieter stuff: file writes, link rewrites, metadata invalidation,
plugin teardown, accessibility labels, and every other small place where note
apps traditionally discover that "local-first" was the easy part to say.

## License

MIT. See `LICENSE`.
