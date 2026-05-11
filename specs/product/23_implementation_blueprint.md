# 23 — Implementation blueprint

This is the recommended technology stack and build order for an implementing agent. It's a recommendation, not a constraint — pick whatever toolchain you can ship most quickly, but if you choose differently you must justify how you'll meet every constraint set in `24_acceptance_criteria.md`.

## 23.1 Recommended stack

| Layer | Recommendation | Why |
|------|----------------|-----|
| Native shell | **Tauri 2** (Rust core + system webview) or **Electron 30+** | A native window with a webview, system file APIs, OS clipboard, native menus, file watchers. Tauri produces smaller binaries; Electron has richer plugin compatibility (the original ecosystem assumes Electron-style Node integration). |
| UI framework | **Vanilla TypeScript + a minimal view layer** (e.g. lit-html or a tiny custom component primitive) | The original Obsidian builds with vanilla TS and a custom DOM layer — this is faster than React for very dense, frequently re-rendered editor UIs. If your team prefers React, use it but adopt strict memoization. |
| Editor | **CodeMirror 6** | The de-facto editor for this class of app. Modular, headless, with a rich extension API for Live Preview overlays. The original uses CodeMirror 6. |
| Markdown parsing | **markdown-it** + custom plugins for wikilink, embed, callout, block-id, highlight, comments, math (KaTeX or MathJax), Mermaid, Prism. | markdown-it's plugin model handles every Obsidian extension cleanly. |
| Math rendering | **KaTeX** (faster) or **MathJax** (broader feature coverage) | The original uses MathJax. KaTeX is recommended for sub-100 ms render. |
| Diagram rendering | **Mermaid 11+** | Direct port of the documented language. |
| Syntax highlighting (read mode) | **Prism** | Matches the original. |
| Local DB | **IndexedDB** via `idb` package | Metadata cache, sync state, file recovery snapshot index. |
| Filesystem watcher | Tauri/Electron native + **chokidar** fallback | OS-native APIs are the only way to scale to large vaults. |
| Graph rendering | **Pixi.js** (WebGL) or **D3-force + Canvas2D** | DOM-per-node will not scale past ~1000 nodes. |
| Canvas rendering | Custom Canvas2D / SVG hybrid | The connection layer is canvas-drawn; cards are DOM elements for editability. |
| Icons | **lucide** npm package | Match the original. |
| Fuzzy matcher | **Fzf-style algorithm** (e.g. `fzy`-port or in-house) | Acronym fuzziness ("scf" → "Save current file") is required. |
| YAML parsing | **js-yaml** (or equivalent) | Frontmatter and `.base` files. |
| Build | **esbuild** or **Vite** | esbuild is fastest; Vite gives DX niceties. |
| Test | **Vitest** for units; **Playwright** for end-to-end. | Cross-platform headless. |
| Internationalization | **i18next** | Match the original's translation contribution flow. |

## 23.2 Module decomposition

A suggested top-level package layout. Names map onto domain concepts in `02_core_concepts.md`.

```
app/
├── main/                       (Electron/Tauri main process)
│   ├── window/
│   ├── ipc/
│   ├── fs/                     filesystem watch + atomic writes
│   ├── crash/                  crash recovery
│   └── update/                 auto-update
│
├── core/                       (renderer-side, framework-agnostic)
│   ├── vault/                  Vault, FileList, AbstractFile, TFile, TFolder
│   ├── metadata-cache/         parse → cache → invalidate
│   ├── markdown/               markdown-it pipeline + custom plugins
│   ├── editor/                 CodeMirror integration + Live Preview overlays
│   ├── workspace/              tabs, leaves, splits, pop-out windows
│   ├── commands/               Command registry + palette logic
│   ├── hotkeys/                Default + custom hotkeys; key event dispatch
│   ├── search/                 Operator parser + executor + result renderer
│   ├── graph/                  Force simulation + filters/groups/forces
│   ├── canvas/                 JSON Canvas model + view
│   ├── bases/                  Bases parser, evaluator, view registry
│   ├── properties/             Type system + inline editor
│   ├── plugins/                Plugin loader, sandbox-by-policy, lifecycle
│   ├── themes/                 Theme + snippet loader
│   ├── i18n/
│   └── settings/               Persistence + reactive store
│
├── ui/                         (renderer DOM components)
│   ├── shell/                  Window frame, ribbon, sidebars, status bar
│   ├── tab/                    Tab strip + tab body host
│   ├── prompts/                Modal, SuggestModal, FuzzySuggestModal
│   ├── views/                  FileExplorer, Search, Bookmarks, Tags,
│   │                           Outline, Backlinks, OutgoingLinks,
│   │                           Properties (file + all), FootnotesView,
│   │                           GraphView, CanvasView, BaseView
│   ├── controls/               Toggle, Checkbox, Slider, Dropdown,
│   │                           TextInput, ColorInput, Button, IconButton
│   ├── menus/                  Context menus, native menu integration
│   └── notices/                Toast manager
│
├── plugins-core/               (built-in core plugins as discrete modules)
│   ├── file-explorer/
│   ├── search/                 (the sidebar UI; the operator engine lives in core/)
│   ├── quick-switcher/
│   ├── command-palette/
│   ├── slash-commands/
│   ├── graph-view/
│   ├── backlinks/
│   ├── outgoing-links/
│   ├── outline/
│   ├── tags-view/
│   ├── properties-view/
│   ├── footnotes-view/
│   ├── canvas/
│   ├── bases/
│   ├── daily-notes/
│   ├── templates/
│   ├── unique-note-creator/
│   ├── audio-recorder/
│   ├── file-recovery/
│   ├── format-converter/
│   ├── note-composer/
│   ├── page-preview/
│   ├── random-note/
│   ├── slides/
│   ├── web-viewer/
│   ├── word-count/
│   ├── workspaces/
│   └── bookmarks/
│
├── styles/
│   ├── tokens.css              (foundational variables)
│   ├── components/             (per-component variables + structural CSS)
│   ├── editor/                 (Markdown rendered styles)
│   └── default-theme/
│
└── api/
    ├── plugin-api.d.ts         (the published TS definitions)
    └── stable-api/             (the API entrypoint plugins import)
```

## 23.3 Module dependency direction

```
ui ──┐
     ├──► core
plugins-core ──┘

core ──► (no upward deps)
api ◄── plugins-core, ui (read-only views of core)
main ──► core (over IPC; no DOM)
styles ──► (independent; consumed by ui at runtime)
```

`core` must not import from `ui`. `plugins-core` must use only the public `api`. This rule is what allows the same plugin contract to power third-party plugins.

## 23.4 Phased build order

Each phase has acceptance gates — don't move to the next until the gate is met.

### Phase 0 — Skeleton (1 sprint)

- Native shell window opens (Tauri/Electron).
- A blank editor is visible (CodeMirror 6 mounted, no formatting).
- A vault picker prompt at first launch; the picked folder becomes the open vault.
- File-system watcher detects new/changed/deleted files and logs them.

**Gate:** open a folder, see a list of `.md` files in a debug panel.

### Phase 1 — Core editing (2 sprints)

- File explorer in a left sidebar (folder tree only, no icons yet).
- Click a file → opens in the editor as a tab.
- Editor saves on blur and on `Ctrl/Cmd+S`. Atomic writes.
- Markdown rendering pipeline (CommonMark + GFM only). Live Preview not yet — start in Source mode.
- Status bar with word count.
- Settings modal scaffold. At minimum: light/dark toggle, accent color, font size.
- Command palette and Quick switcher (operating over filename only at first).

**Gate:** create a note, type in it, save it, reopen the app, see the same content. Switch theme. Search-by-filename via Quick Switcher.

### Phase 2 — Linking & metadata (2 sprints)

- Wikilink parsing (`[[Note]]`, `[[Note#H]]`, `[[Note#^id]]`).
- Markdown-form internal links.
- Click to navigate.
- Metadata cache (frontmatter, headings, links, embeds, tags).
- Backlinks panel and Outgoing-links panel (right sidebar) — Linked mentions only.
- Outline panel.
- Properties view (inline editor for frontmatter).
- Tags syntax in body and YAML; Tags view (left sidebar).
- Aliases.

**Gate:** create a wiki of 50+ notes; backlinks for each note are correct; renaming a note updates wikilinks across the vault.

### Phase 3 — Live Preview & full Markdown (2 sprints)

- Live Preview mode (CodeMirror 6 decorations hiding/rendering syntax).
- Embed support (image, audio, video, PDF, note-section, block).
- Code blocks with Prism syntax highlighting.
- Math (KaTeX/MathJax).
- Mermaid diagrams.
- Footnotes; Footnotes view.
- Callouts (every default type, foldable, nested).
- Highlights, comments, strikethrough, task lists.
- Insert-link autocomplete popover.
- Page preview hover popovers.

**Gate:** open a real Obsidian vault export and render every page correctly.

### Phase 4 — Workspace plumbing (2 sprints)

- Tab groups: split right, split down, drag tabs, pin tabs, stacked tabs.
- Pop-out windows.
- Workspaces plugin (save/load layouts).
- Bookmarks plugin.
- Daily notes plugin.
- Templates plugin.
- Slash commands.
- Random note, Unique note creator, Audio recorder, Web viewer (basic).
- File recovery (interval snapshots).
- Format converter (legacy Markdown migrations).
- Note composer (merge / extract).

**Gate:** the user can lay out a multi-pane workflow, save it, restart, restore.

### Phase 5 — Search & graph (2 sprints)

- Full operator-language Search (every operator in `13_command_palette_search_quickswitcher.md`).
- Embed search results as `query` code blocks.
- Graph view (global) with filters, groups, forces, animation.
- Local graph (linked view) following the active tab.

**Gate:** a 5,000-note vault renders the graph at 60 fps; complex search query (regex + property filter + tag operator) runs under 200 ms.

### Phase 6 — Canvas & Bases (2 sprints)

- Canvas plugin: cards (text/file/link/group), edges with anchors and labels, pan/zoom, marquee select, group-as-container, snapping, color palette, JSON Canvas read/write.
- Bases plugin: parser, evaluator, table view, list view, cards view. Filter and sort UI. Formula evaluation. Summary aggregation. Embedding bases in notes.

**Gate:** open and edit a `.canvas` produced by the original Obsidian; round-trip a `.base` file.

### Phase 7 — Plugin & theme platform (2 sprints)

- Plugin loader: parse `manifest.json`, load `main.js`, instantiate `Plugin` class, run `onload`.
- Plugin API: every method listed in `22_plugins_themes_architecture.md` §22.4.
- Restricted mode toggle; community-plugin browser modal.
- Theme loader and theme browser modal.
- CSS snippets folder with hot-reload.
- Plugin self-critique checklist (linked from the docs).

**Gate:** install a popular community plugin (e.g. Templater, Dataview-equivalent) and verify it runs without modification.

### Phase 8 — Polish & a11y (1 sprint)

- Keyboard accessibility audit (every action reachable).
- Screen reader labels.
- High-contrast theme.
- Crash recovery on next launch (open last workspace; warn on unsynced changes).
- Performance audit on a 50,000-note vault.
- i18n harness with English + at least one RTL language for sanity.
- Auto-update on desktop.

**Gate:** all `24_acceptance_criteria.md` items pass.

## 23.5 Cross-cutting concerns

### Performance budget

- App startup with empty vault: < 1 s.
- App startup with 10k-note vault (cold): < 3 s.
- Quick Switcher result update on keystroke: < 16 ms.
- Search across 10k notes for a regex: < 500 ms.
- Graph render of 10k nodes: 60 fps when idle, > 30 fps while panning.
- File save round-trip: < 50 ms.

### Memory budget

- Idle with 10k-note vault: < 500 MB resident set.
- With 100 tabs open: < 1.2 GB resident set.

### Observability

- An internal command `Show debug info` dumps version, platform, vault size, plugin list, perf stats. Linkable into bug reports.
- A `Check startup time` profiling hook (Settings → General → Advanced).

### Crash safety

Atomic writes (see `20_file_storage.md` §20.14). On startup, scan for orphan `.tmp~` files in the vault and warn the user.

### Security

- Plugins disabled by default (Restricted mode).
- No outbound network calls from the core app except: update check, marketplace browse on user action, and (if enabled) the optional sync/publish services. Document and audit every endpoint.
- No telemetry by default. If telemetry is added later, it must be opt-in and surfaced clearly.

## 23.6 What an existing Obsidian vault should round-trip through the replica

To validate compatibility, the integration test suite must include a fixture vault containing:
- ≥ 200 notes with complex frontmatter.
- Notes using every Markdown extension (callouts, math, Mermaid, embeds, block IDs, footnotes, comments, tasks, properties).
- ≥ 5 `.canvas` files including text, file, link, and group nodes plus edges with labels.
- ≥ 3 `.base` files exercising filters, formulas, summaries, and multiple views.
- A `.obsidian` configuration folder with hotkeys, snippets, themes, plugins.

The replica must open the vault, render every note correctly, save them all back, and produce byte-identical (or canonically equivalent) output for unchanged files.

## 23.7 What to defer past v1

- Mobile apps.
- Sync service.
- Publish service.
- Web Clipper browser extension.
- Headless CLI client.

These can be added once the desktop replica is stable. Their architectural seams should be designed for from day one (vault abstraction, sync-friendly file watcher, etc.).