# DONE

> Log of completed work. Items move here from `todo.md` when they ship. Newest entries on top.

---

## 2026-05-12 — GFM parser coverage

- **Autolink coverage** — renderer tests now prove bare URL, bare email, and
  angle-bracket autolinks render correctly without absorbing trailing
  punctuation.
- **GFM coverage** — added explicit tests for table alignment and
  strikethrough so the GFM acceptance item has direct regression coverage.
- **Task state fix** — custom task markers such as `[?]` and `[-]` now render
  as task-list checkboxes with the marker preserved in `data-task` /
  `data-checked`, matching the product syntax.
- **Renderer lint cleanup** — removed non-null assertions and tightened
  renderer rule guards in the touched markdown renderer path.

### Tests
- Extended `core/markdown/renderer.test.ts` from 27 to 32 cases.
- Validation: scoped `bunx biome check --write`, targeted renderer tests, and
  `bun run typecheck`, `bun run test` (438 tests / 44 files), and
  `bun run build` pass.

---

## 2026-05-12 — File recovery restore UI

- **Recovery modal** — the File recovery command now opens a modal for the
  active markdown note instead of relying on prompt/confirm dialogs.
- **Snapshot inspection** — the modal lists snapshots newest-first, supports a
  filename/time filter, previews the selected snapshot, and can toggle between
  raw snapshot text and a line-level change view against the current file.
- **Recovery actions** — users can copy a snapshot, restore it through the
  active vault `FileSystem`, or clear recovery snapshots after confirmation.

### Tests
- Added `core/plugins-core/file-recovery.test.ts` for snapshot filtering/order,
  restoring through the vault filesystem, and clearing recovery storage.
- Validation: scoped `bunx biome check --write`, targeted file-recovery tests,
  `bun run typecheck`, `bun run test` (433 tests / 44 files), and
  `bun run build` pass.

---

## 2026-05-12 — Settings persisted to `.granite/`

- **Disk-backed user settings** — vault activation now binds Settings to
  `.granite/settings.json`, hydrating disk settings before workspace restore.
- **Default persistence** — opening a vault with no settings file writes the
  full default settings document into `.granite/`.
- **Legacy migration** — existing `granite.settings.v1` localStorage settings
  are used only when disk settings are missing, then written to `.granite/`;
  disk settings win when both exist.
- **Live updates** — Settings changes still update subscribers immediately and
  now also write the active vault's `.granite/settings.json`.

### Tests
- Added `core/settings/store.test.ts` for default disk writes, disk precedence,
  localStorage migration, and update persistence.
- Validation: scoped `bunx biome check --write`, scoped settings/config tests,
  `bun run typecheck`, `bun run test` (430 tests / 43 files), and
  `bun run build` pass.

---

## 2026-05-12 — Hotkey physical-key normalization

- **US-layout normalization** — hotkey capture and dispatch now normalize
  `KeyboardEvent.code` for physical letter, digit, and punctuation keys to
  US-layout labels before matching stored hotkeys.
- **Physical-key dispatch** — bindings fire from the intended physical key
  position even when `KeyboardEvent.key` reports a different character on a
  non-US keyboard layout.

### Tests
- Extended `core/commands/hotkeys.test.ts` for physical letter-key dispatch
  and top-row punctuation normalization.
- Validation: scoped `bunx biome check --write`, `bun run typecheck`,
  targeted hotkey tests, `bun run test` (426 tests / 42 files), and
  `bun run build` pass.

---

## 2026-05-12 — Hotkey multi-binding

- **Multiple custom bindings** — commands can now store and dispatch multiple
  user-assigned hotkeys instead of replacing the whole command with one
  override.
- **Settings controls** — Settings → Hotkeys shows all effective bindings,
  adds captured bindings without dropping existing ones, removes the most
  recent custom binding, and still supports clearing all custom bindings.
- **Default restoration** — default command hotkeys are suppressed only while a
  command has custom bindings; clearing custom bindings restores defaults.

### Tests
- Added `core/commands/hotkeys.test.ts` covering multi-binding dispatch,
  de-duplication, individual removal, and default restoration.
- Validation: scoped `bunx biome check --write`, `bun run typecheck`,
  targeted hotkey tests, `bun run test` (424 tests / 42 files), and
  `bun run build` pass.

---

## 2026-05-12 — Interactive canvas embeds

- **Reading-mode canvas embeds** — `![[file.canvas]]` now mounts the real
  `CanvasView` inside Reading mode instead of replacing the embed with a
  click-only summary card.
- **Embed chrome** — embedded canvases keep a compact header with title,
  node/edge summary, and an explicit Open button for moving the canvas into a
  normal tab.
- **Unmount cleanup** — embedded Canvas React roots are cleaned up when the
  rendered markdown changes or the host note unmounts.

### Tests
- Added `ui/views/ReadingView.test.tsx` to prove a markdown note with a canvas
  embed mounts `.canvas-view` inside `.canvas-embed.is-interactive`.
- Validation: `bun run typecheck`, targeted ReadingView embed test,
  `bun run test` (421 tests / 41 files), and `bun run build` pass.

---

## 2026-05-12 — Canvas marquee and duplicate interactions

- **Multi-node selection** — Canvas selection now supports multiple selected
  cards, with Shift-drag marquee selection from the background and group
  deletion / keyboard movement for the selected set.
- **Group drag behavior** — dragging a selected card moves the whole selected
  set, while Shift during the drag locks movement to the dominant axis.
- **Alt-duplicate** — Alt/Option-drag duplicates the active selection, including
  edges whose endpoints are both in the selected set, then drags the duplicated
  cards.

### Tests
- Extended `core/canvas/interactions.test.ts` for marquee rectangle
  normalization, hit selection, axis locking, and duplicated node/edge ids.
- Validation: `bun run typecheck`, scoped canvas interaction tests,
  `bun run test` (420 tests / 40 files), and `bun run build` pass.

---

## 2026-05-12 — Canvas snap toggle

- **Snap-to-grid control** — Canvas now has a toolbar toggle for grid snapping
  instead of forcing every drag, resize, file drop, new text card, and keyboard
  move onto the 10 px grid.
- **Unsnapped precision mode** — when snapping is off, pointer movement rounds
  to whole-pixel canvas coordinates and arrow keys move by 1 px / 10 px with
  Shift; when snapping is on, arrow keys preserve the existing 10 px / 50 px
  movement behavior.

### Tests
- Added `core/canvas/interactions.test.ts` for snap math and keyboard step
  behavior.
- Validation: scoped `bunx biome check --write` for the new canvas helpers,
  `bun run typecheck`, `bun run test` (416 tests / 40 files), and
  `bun run build` pass.

---

## 2026-05-12 — Tag metadata case unification

- **Per-note tag unification** — metadata parsing now deduplicates body and
  YAML tags case-insensitively, preserving the first casing encountered for
  display.
- **Vault-wide tag aggregation** — Tags view aggregation now counts tags
  case-insensitively across files and preserves first display casing instead
  of splitting `Work` and `work` into separate tags.

### Tests
- Added `core/metadata/cache.test.ts`.
- Extended `core/metadata/parser.test.ts` for body/YAML unification.
- Validation: scoped `bunx biome check --write` for cache changes,
  `bun run typecheck`, `bun run test` (411 tests / 39 files), and
  `bun run build` pass.

---

## 2026-05-12 — Format Converter legacy property migration

- **Legacy default-property migration** — Format Converter now includes a
  vault-wide command that migrates deprecated `tag`, `alias`, and `cssclass`
  frontmatter keys to `tags`, `aliases`, and `cssclasses`.
- **Merge behavior** — migration preserves existing plural values, converts
  scalar legacy values to lists, strips leading `#` from migrated tags, and
  avoids duplicate merged values.

### Tests
- Extended `core/plugins-core/format-converter.test.ts` with scalar
  `tag`, combined `alias`/`cssclass`, merge/dedupe, and no-op cases.
- Validation: scoped `bunx biome check --write`, `bun run typecheck`,
  `bun run test` (408 tests / 38 files), and `bun run build` pass.

---

## 2026-05-12 — Property date and frontmatter round-trip hardening

- **Locale date rendering** — added `core/metadata/property-format.ts` and
  wired Reading mode property display through it so ISO Date and Date & time
  values render with `Intl.DateTimeFormat` instead of raw `String(value)`.
- **No UTC date drift** — YAML date objects at UTC midnight are displayed as
  date-only local values, avoiding off-by-one display from timezone conversion.
- **Frontmatter invariants tested** — added regression coverage proving
  internal wikilinks in Text/List properties remain quoted on save, and
  JSON-style frontmatter rewrites to YAML when edited.

### Tests
- Added `core/metadata/property-format.test.ts`.
- Extended `core/metadata/frontmatter.test.ts`.
- Validation: scoped `bunx biome check --write` on new/updated metadata tests,
  `bun run typecheck`, `bun run test` (404 tests / 38 files), and
  `bun run build` pass.

---

## 2026-05-12 — Tags nested-view toggle

- **Nested tag setting** — added persistent `showNestedTags` user setting,
  surfaced in Settings → Files & links and directly in the Tags sidebar.
- **Flat vs hierarchical model** — extracted `ui/views/sidebar/tags-model.ts`
  so Tags view rendering can switch between slash-separated hierarchy and a
  flat full-tag list without duplicating UI logic.
- **Tags pane controls** — tag rows keep filter/search behavior, while nested
  rows get explicit expand/collapse buttons.

### Tests
- Added `ui/views/sidebar/tags-model.test.ts` covering hierarchical nesting,
  flat slash-tag rendering, and deterministic sort order.
- Validation: scoped `bunx biome check --write`, `bun run typecheck`,
  `bun run test` (396 tests / 37 files), and `bun run build` pass.

---

## 2026-05-12 — Configurable delete policy

- **Trash settings surfaced** — Settings → Files & links now exposes Confirm
  file deletion and Deleted files controls (System trash / Vault trash /
  Permanently delete), and Settings search indexes delete/trash keywords.
- **Deletion policy boundary** — file explorer deletes now go through
  `core/fs/trash.ts` instead of calling `fs.remove()` directly. Vault-trash
  mode moves files under `.trash/` preserving subpaths and collision-renaming
  existing trash targets. Permanent mode remains an explicit `remove()`.
- **No fake system trash** — `FileSystemImpl` now has an optional
  `moveToSystemTrash()` host capability. The browser adapter does not expose an
  OS recycle-bin API, so System trash mode fails loudly with `FsUnsupported`
  instead of degrading into permanent deletion.
- **File explorer a11y cleanup** — file rows are semantic buttons while
  preserving keyboard open/rename/delete behavior.

### Tests
- Added `core/fs/trash.test.ts` covering permanent delete, vault trash,
  collision-renamed vault trash, unsupported browser system trash, and
  host-provided system trash.
- Validation: scoped `bunx biome check --write`, `bun run typecheck`,
  `bun run test` (393 tests / 36 files), and `bun run build` pass.

---

## 2026-05-12 — Settings live filter

- **Settings search** — added a live search box to the Settings sidebar.
  It filters built-in settings sections and plugin-supplied settings tabs by
  visible title plus curated setting keywords, and automatically moves the
  active panel to the first visible result when the current panel is filtered
  out.
- **Pure filter helper** — `ui/prompts/settings-filter.ts` keeps the matching
  logic separate from the modal's plugin/theme/snippet stores.
- **Tests** — `ui/prompts/settings-filter.test.ts` covers empty-query
  behavior, built-in matching, all-term matching, and plugin-tab matching.

---

## 2026-05-12 — Phase 12 editor fidelity sweep

- **Vim key bindings** — added `@replit/codemirror-vim` and a Settings →
  Editor selector for Standard vs Vim source-editor key bindings. Vim mode is
  wired into the CodeMirror extension stack when selected.
- **Multi-cursor + rectangular selection** — source editor now enables
  `EditorState.allowMultipleSelections`, `drawSelection({ drawRangeCursor:
  true })`, `rectangularSelection()`, and `crosshairCursor()` so Alt/Option
  multi-cursor and rectangular drag selection are supported by CM6.
- **Code folding** — source editor now enables `codeFolding()`,
  `foldGutter()`, and `foldKeymap`, adding heading/indent folding affordances
  and keyboard commands.
- **Fold-state persistence** — markdown leaf state now carries folded ranges;
  `core/workspace/folds.ts` normalizes/collects ranges from CodeMirror and
  restores them with `foldEffect`. Existing workspace persistence writes those
  ranges to `.granite/workspace.json` / localStorage with the rest of the leaf
  snapshot.
- **Live-preview marker coverage expanded** — inactive-line decoration hiding
  now covers double-underscore bold, triple bold+italic markers, asterisk
  italic, Markdown links/images, Obsidian inline and block comment delimiters,
  inline and block math delimiters, and callout type/fold markers in addition
  to the existing bold, highlight, strikethrough, underscore italic, wikilink,
  embed, fenced-code, and inline-code handling.
- **Severe testing artifact** — `/Users/chabotc/Desktop/severe-testing.md`
  now includes a Granite-specific severe-test matrix covering every
  `24_acceptance_criteria.md` section and the current Phase 12 test set.

### Tests
- Added `core/workspace/folds.test.ts`.
- Extended `core/markdown/cm-livepreview-decorations.test.ts` to 27 cases.
- Extended `core/workspace/persist.test.ts` so folded markdown ranges are
  explicitly proven to survive workspace save/restore.
- Validation: scoped `bunx biome check --write`, `bun run typecheck`,
  `bun run test` (388 tests / 35 files), and `bun run build` pass.
  `bun run lint` still reflects the repo-wide Biome baseline and is not newly
  green.

---

## 2026-05-12 — Phases 9-11: plugin platform, search & Bases parity, graph completeness

### Phase 9 — Plugin platform completeness
- **`PluginApi` extended** with persistence and chrome integration:
  - `loadData<T>()` / `saveData(data)` reading and writing
    `.granite/plugins/<id>/data.json` via the existing atomic-write FS layer
    (`core/plugins/data-store.ts`).
  - `addSettingsTab({ name, render })` — plugins inject custom panels into
    Settings → Plugin options. Render is imperative (`render(containerEl)`)
    and may return a cleanup function. The loader also bulk-removes residual
    tabs on plugin unload.
  - `statusBar.add({ text, tooltip?, onClick? })` returning a handle with
    `setText`/`setTooltip`/`setOnClick`/`remove`. The `StatusBar` shell
    component subscribes via `useSyncExternalStore` and renders all items.
  - `events.on(name, listener)` for `file-open`, `active-leaf-change`,
    `layout-change`, `file-rename`. The bus bridges into `workspaceStore` so
    real subscriber updates emit appropriate events; per-plugin disposers are
    bulk-removed at unload time (safety net).
  - `metadataCache.{getFileCache, getBacklinks, getAllTags, getAllProperties}`
    as a read-only window into the live cache.
- **PluginManifest** gains `manifestUrl` and `minAppVersion` fields so plugins
  can declare a remote endpoint for update checks and a host-version floor.
- **Update check**: `core/plugins/update-check.ts` + a new
  `plugins:check-updates` command. Fetches each plugin's `manifestUrl`,
  compares versions with a small semver-like comparator, and shows a notice
  summary (with an explicit warning when `minAppVersion` isn't met).
- **Sample plugin** `examples/plugins/data-store/` demonstrates every new
  surface — counter persisted via `saveData`, increment via status-bar
  click, reset button + last-updated readout via a settings tab, and a
  `file-open` event listener that logs to the console.
- **Public TS declarations** (`examples/plugins/granite-api.d.ts`) updated to
  expose all new types.

### Phase 10 — Search & Bases parity
- **Search regex** — `/pattern/flags` and `-/pattern/flags` token forms.
  Empty flag list defaults to case-insensitive; explicit flags are
  authoritative. Mismatched regexes fall through and are treated as free
  terms.
- **Property operators** — `[name]` (must exist with a non-null value),
  `[name:value]` (equals, case-insensitive by default, array-aware so
  `[tags:work]` matches a tag list), `[name:null]` (must be missing or
  null), `[name:!null]`. All forms support `-` negation.
- **Bases formula evaluator** (`core/bases/formula.ts`) — recursive-descent
  parser + tree-walking evaluator. Supports arithmetic, comparison, boolean
  short-circuit, unary `-`/`!`, field `obj.key`, index `obj["k"]`/`arr[0]`,
  and 18 built-ins (`length`, `lower`, `upper`, `trim`, `now`, `date`,
  `datetime`, `concat`, `if`, `contains`, `startsWith`, `endsWith`,
  `coalesce`, `min`, `max`, `abs`, `floor`, `ceil`, `round`). Frontmatter
  keys are exposed both as bare identifiers and under `fm.<key>`.
- **Bases summaries** (`core/bases/summary.ts`) — `count`, `sum`, `avg`,
  `min`, `max`, `median` plus `groupRowsBy()` keyed string buckets used by
  group-by views.
- **`BaseConfig` schema extensions** — `view: "table" | "list" | "cards"`,
  optional `groupBy`, `summaries: SummarySpec[]`, and named `formulas`
  (`{ size_kb: "file.size / 1024" }`). Legacy `.base` files still parse.
- **BasesView refactor** — extracted row builder / sorter / formatter into
  `ui/views/bases/shared.ts`. The main view dispatches to one of three
  presentations:
  - `BasesTableView` — sortable headers, group headings as sibling `<tr>`s
    (fixed nested-tbody markup), summary footer.
  - `BasesListView` — title + muted property strip per row.
  - `BasesCardsView` — auto-fill CSS grid of bordered cards with
    key/value rows.
- **User-chosen sort override** now resets when the active `.base` file
  changes so each base honors its own configured default sort.

### Phase 11 — Graph completeness
- **Graph configuration store** (`core/graph/store.ts`) — persists to
  `localStorage` immediately and `.granite/graph.json` (debounced). State
  covers `filter`, named `groups`, `colorMode`, four display sliders, four
  force sliders, and the local-graph toggle. `mergeWithDefaults` validates
  every numeric field via `Number.isFinite` so a corrupt persisted blob
  cannot inject NaN into the simulation.
- **Color modes** — `core/graph/colors.ts` deterministic string → HSL
  hashing for the `tag` (dominant tag) and `folder` (top-level folder)
  presets; same input always produces the same hue.
- **Groups** (`core/graph/groups.ts`) — user-named buckets with a query
  string + CSS color. The matcher reuses the search-query parser, restricted
  to the content-free operator subset (tag/path/file/props + free terms
  against path/stem) so it can be evaluated against the metadata cache
  without reading file bodies. `firstMatchingGroup` resolves priority by
  array order.
- **Live filter** — the configured query restricts the graph to matching
  nodes; the search-query parser is reused so the same syntax users know from
  the Search panel works in the graph.
- **Display + force sliders** — node size, link thickness, label size, label
  threshold (zoom level above which all labels appear), plus repulsion, edge
  attraction, link distance (now a real spring rest length:
  `(dist − linkDistance) × attraction`), and center gravity. A "Reset
  display & forces" button restores defaults.
- **Local graph mode** — when enabled, the graph trims to a configurable
  N-hop neighborhood of the active markdown file.
- **`GraphView` overhaul** — collapsible controls panel with a settings
  cog toggle, color-by selector, group editor with per-row color picker,
  and all sliders. The simulation reads parameters from the store so changes
  take effect on the next animation frame.

### Tests
- 86 new test cases:
  - Plugins: `host-registries.test.ts`, `events.test.ts`,
    `update-check.test.ts` (+ extended `loader` smoke tests).
  - Search: regex + property operators (+ existing cases).
  - Bases: `formula.test.ts` (parser + evaluator + built-ins),
    `summary.test.ts` (aggregations + grouping), extended `schema.test.ts`
    for new fields.
  - Graph: `colors.test.ts`, `groups.test.ts`, `store.test.ts` (including
    a fresh-module-load hydration test that proves corrupt localStorage
    cannot poison the simulation).
- **Total: 365 tests passing across 33 files**, up from the previously
  reported 71 / 8. CI workflow (`typecheck + lint + test + build`) is green.

---

## 2026-05-10 (late) — Canvas, Bases, search/replace, print, persistence migration

### Canvas (JSON Canvas v1)
- New `core/canvas/schema.ts` — forgiving parse + serialize for the JSON Canvas v1
  format with all four node types (text/file/link/group). 8-test coverage.
- `ui/views/CanvasView.tsx` — interactive viewer/editor:
  - Pan via background drag, scroll-wheel zoom (0.2×–3×), fit-to-content.
  - Drag nodes to reposition (snap to 10 px grid); arrow-key nudge while selected.
  - Drag from a side anchor on the selected node to another node → creates an
    edge with arrowhead. Drafting tracked at the document level so releasing
    outside the canvas still finalizes correctly.
  - Bottom-right resize handle on each selected node (snap-to-grid; minimum
    80 × 40).
  - Color picker in the toolbar paints the selected node with one of the six
    canvas colors or clears the color.
  - Double-click a text node to open an inline `<textarea>` editor (commit on
    Cmd/Ctrl+Enter or blur; Esc cancels).
  - Drag-and-drop a vault file from the file explorer onto the canvas to create
    a file node.
  - Delete via toolbar trash button or `Cmd/Ctrl+Backspace` on the selection.
  - Debounced save back to disk (600 ms).

### Bases (database) view
- New `core/bases/schema.ts` — YAML parser/serializer for a minimal `.base`
  format (`name`, `filter`, `columns`, `sort`, `sortOrder`). 13-test coverage.
- `ui/views/BasesView.tsx` — table view:
  - Reuses the Search panel query syntax for `filter`, so existing operators
    (`tag:`, `path:`, `file:`, `line:`, `-term`, quoted phrases) all work.
  - Short-circuits full-text reads: files failing tag/path/file constraints
    skip `fs.readText` entirely.
  - Renders configured columns including `file.name`, `file.path`,
    `file.modified`, `file.created`, `file.size`, `tags`, and any frontmatter
    property key. Clickable tag pills in the `tags` column.
  - Sortable columns — click a header to toggle/switch.
  - Honors the user's exclude-files list.
  - Live-refreshes on FS watcher events.
- New `bases:create` command scaffolds a `.base` file at the user-chosen
  name; throws on conflict so the calling success path is gated.

### Vault-wide find & replace
- New `core/plugins-core/vault-find-replace.ts` with a pure `replaceInText`
  helper supporting literal mode (regex-escaped find, `$`-escaped replacement)
  and regex mode (capture groups, named groups, `$&`/`$$` tokens).
- Count-first dry-run with an explicit `confirm()` listing up to the top five
  affected files; only writes after the user OKs. Reports per-file counts in
  the success notice. 14-test coverage covering capture-group expansion.

### Excluded files
- New `core/fs/exclude.ts` with parsing, bare-name shorthand, `*`/`**`/`?`
  globs, and `filterExcluded`. 10-test coverage.
- Applied across `metadataCache.indexVault`/`refreshOne`, `QuickSwitcher`,
  `SearchView`, `FileExplorerView`, and embedded `query` blocks.
- Disk-side re-index when the exclude list is relaxed (set-difference detect).

### Per-vault state to disk (`.granite/*.json`)
- New `core/vault/granite-config.ts` helper that reads/writes JSON config
  files under `.granite/` on the active vault. 4-test in-memory coverage.
- Migrated workspace persistence (`core/workspace/persist.ts`): disk-first
  restore with localStorage fallback, write to both during the migration
  window.
- Bookmarks now mirror to `.granite/bookmarks.json` after disk hydration
  finishes (race-guarded).
- Plugin / snippet / theme enabled state now mirrored to disk too.

### Reading view + renderer
- `renderNoteMarkdown` strips frontmatter and rewrites `data-line` so task
  checkboxes still toggle the original source line.
- Heading slug rule + tests — rendered headings get deterministic `id`s with
  per-document de-duplication, so anchor-style links resolve natively.
- Comments `%% … %%` (inline + block) hidden in reading view.
- Frontmatter Properties strip at the top of the reading view (collapsible
  per-path).
- Embedded ` ```backlinks ` fences render a live backlinks list using the
  metadata cache.
- Markdown-form `[text](path)` links Cmd/Ctrl-clickable in the editor.

### Print
- `styles/print.css` + a `file:print-active-note` command that switches the
  active leaf to reading view and triggers `window.print()` so users can save
  the active note as PDF via the browser dialog.

### Tab UX
- Dirty-state dot indicator (`•`) in tab title when editing.
- Middle-click closes a tab.
- `Mod+W` close active tab; `Ctrl+Tab` / `Ctrl+Shift+Tab` cycle tabs;
  `Mod+Shift+P` alias for the command palette; `Mod+1..9` focuses tab N.
- Drag-and-drop tab reorder + move-between-groups (drop indicators).
- Stacked tab groups (vertical column instead of strip).
- Right-click tab menu: split right/down, close other / close right, pin /
  unpin, pop-out to new window.

### Pop-out windows
- `?popout=1&vaultId=…&leaf=…` URL bootstraps a popout window that loads the
  named vault and the requested leaf, with chrome hidden.

### Plugin platform
- Plugin loader reads `.granite/plugins/<id>/manifest.json` + `main.js`,
  passes a typed `PluginApi` to `onLoad`, captures `onUnload`. Enabled set is
  vault-scoped + disk-persisted.
- `plugins:reload-all` command toggles every enabled plugin off and back on
  for live development.

### Hotkeys editor (Settings)
- Click "Edit" on a row → capture the next key chord → save as a user
  override. "Reset" removes the override.

### Tags
- Tag autocomplete in the editor (`#` trigger, code-block-aware).
- Tag pills in frontmatter `tags:` are clickable → opens Search with
  `tag:<name>`.
- Right-click a tag in the sidebar Tags view → "Rename across vault…"
  pre-filled with the source tag.
- `tags:rename-across-vault` command rewrites inline `#oldTag` and YAML
  `tags:` arrays (inline + block list, hierarchy preserved). `inTagBlock`
  state machine prevents overcounting `- foo` entries inside unrelated
  YAML lists.

### File explorer
- Inline rename (F2), `Cmd+Delete` removes the selected file(s).
- Drag a file onto a folder → moves it and rewrites every wikilink and
  markdown-form `[text](file.md)` link across the vault.
- Selection with Shift / Cmd-click.

### Sidebar
- New Recents pane (right sidebar) tracking last-opened files.
- Outline filter input.
- Local graph view (radial SVG with hover dim).

### Help
- `help:open-cheat-sheet` command (`F1`) opens a modal listing keyboard
  shortcuts and tips. Wired from the ribbon `?` button.

### Copy-link commands
- `links:copy-wikilink`, `links:copy-markdown-link`, and
  `links:copy-vault-path` for the active note.

### Web viewer
- `web-viewer:open` command; `<WebViewerView>` renders an iframe with a
  back/forward/reload toolbar + URL input.

### Theming
- High-contrast variant via `body.theme-high-contrast`.
- `prefers-reduced-motion` overrides.
- Theme picker in Settings.

### a11y + polish
- Focus rings on every focusable control; ARIA labels on icon-only buttons.
- `node-inserted` sentinel animation + `is-flashing` jump-to highlight.
- Mobile breakpoints (`mod-phone`/`mod-tablet`/`mod-mobile`) hide the right
  sidebar below 720 px and collapse the left to a 56 px rail below 480 px.

### Service worker
- Cache-first for `/assets/*` (hashed Vite filenames), network-first for
  navigations with shell fallback. Registered in `main.tsx` on prod builds.

---

## 2026-05-10 — Exclusions, spellcheck, frontmatter, backlinks-block, bookmark persistence

### Excluded files

- New helper `core/fs/exclude.ts` with `parseExcludePatterns`, `isExcluded`,
  and `filterExcluded`. Supports bare segments ("archive" matches any
  segment named `archive`), `*`/`**`/`?` globs, and `#`-prefixed comments.
- `core/metadata/cache.ts` filters during `indexVault` and `refreshOne`, prunes
  cached entries when the exclude list changes, and re-indexes when patterns
  are *removed* so newly eligible files return without a watcher round-trip.
- `QuickSwitcher`, `SearchView`, and `FileExplorerView` all subscribe to the
  exclusion setting and live-refresh when it changes. The file explorer hides
  excluded entries (and shows a dedicated empty-state when filters hide
  everything). Embedded ` ```query ` blocks in the reading view also honor
  exclusions.
- New `Settings → Files & links → Excluded files` textarea with placeholder
  examples (`archive`, `*.tmp`, `private/**`).
- 10-test Vitest suite at `core/fs/exclude.test.ts`.

### Frontmatter-aware reading view

- `renderNoteMarkdown` in `core/markdown/renderer.ts` strips the YAML
  frontmatter from rendered output but rewrites every `data-line="N"` so
  task-list checkbox toggles still hit the original source-file line.
- ReadingView swapped to `renderNoteMarkdown`, so frontmatter no longer
  appears as `<hr>` + `<p>title: …</p>`.

### Embedded backlinks blocks

- ` ```backlinks ` fences in reading view resolve to a live list of
  incoming-link rows for the current note, using `metadataCache.getBacklinks`.
- Clicks open the source file (Cmd/Ctrl-click → new tab).
- Re-renders when the metadata cache emits.
- New `.backlinks-block*` chrome in `styles/markdown.css`.

### Spellcheck toggle

- `Settings → Editor → Spellcheck` (default off).
- `MarkdownView` applies `view.contentDOM.spellcheck = settings.spellcheck`
  on init and recreates the editor on toggle.

### Bookmark-group persistence

- `BookmarksView` now persists `extraGroups` (empty user-created groups)
  under `granite.bookmark-groups.v1` localStorage key so they survive reloads.

---

## 2026-05-10 (evening) — Plugin platform + popouts + canvas/bases

### Plugin platform
- **Plugin loader** (`src/core/plugins/loader.ts`): discovers `.granite/plugins/<id>/manifest.json` + `main.js` in the active vault, evaluates plugin code via `new Function("module", "exports", "api", code)` with a stable API surface, calls `onLoad`/`onUnload` hooks, supports per-vault enabled list (Restricted Mode default-on), hot-reloads via the FS watcher.
- **PluginApi**: `commands`, `workspace`, `notice`, `vault.{active,read,write,listMarkdown}`, `granite.{version,activeThemePath}`, `log` prefixed with the plugin id.
- **Settings → Plugins** tab listing every discovered plugin with name/version/description and an enable toggle. Live-subscribed.
- **Sample plugin** under `examples/plugins/word-counter/` (manifest + main.js + README) demonstrating commands.register, vault.listMarkdown, vault.read, notice.show.
- **TypeScript declarations** (`examples/plugins/granite-api.d.ts`) for plugin authors covering CommandRegistry / WorkspaceStoreApi / NoticeManager / PluginApi.

### Pop-out windows (Phase 4)
- **`Open in new window`** in tab right-click context menu encodes the leaf state + active vault id into URL params and opens via `window.open(url, "_blank", "popup")`.
- **VaultProvider** detects `?popout=1&vaultId=…&leaf=<encoded>` and bootstraps a single-leaf workspace: re-opens the vault (silent for OPFS, permission-prompt for FSA), then opens the requested leaf (markdown / webviewer / graph).
- **`is-popout` body class** hides the titlebar / ribbon / both sidebars / status bar so only the active leaf is visible.

### Hotkeys
- **`captureHotkey()`** in `src/core/commands/hotkeys.ts` returns the next keypress as a `Hotkey` object (Esc cancels). Skips pure-modifier presses while waiting for a real key.
- **Settings → Hotkeys** rows now have **Edit** + **Reset** buttons. Edit captures the next keypress and saves a user override; Reset clears the override.
- `getUserHotkey`, `clearUserHotkey`, `subscribeHotkeys`, `listUserHotkeys` exported.

### Canvas + Bases placeholders (Phase 6 foundation)
- **`canvas` and `bases` leaf types** added to LeafState. `workspaceStore.openCanvas/openBase()` mirror `openGraph/openWebviewer` semantics (focus existing same-path leaf, replace empty/unpinned, or append).
- **Placeholder `<CanvasView>` + `<BasesView>`** show a "coming soon" panel with the file path (when known). Wires the ribbon icons + commands so they do something visible.

### Renderer tests
- New `src/core/markdown/renderer.test.ts` (11 cases): wikilink/embed/heading/block parsing, alias display, tag parsing (numeric tags rejected), highlight, task list with `data-line` + `data-checked`, callout canonical-type + alias, inline `%%comment%%` consumption, block-level `%% ... %%` consumption.
- Test count grew from 54 → 71 across 8 files.

### Bug fixes
- Workspace tabs: `closeRightTabs` always activates the clicked tab.
- Plugin loader: `delete entry.cleanup` instead of `= undefined` (exactOptionalPropertyTypes).
- Plugin loader: pass api to `onUnload` so plugins can use vault APIs during teardown.
- VaultContext: `await unbindPlugins()` before disposing the FS runtime so plugin teardown can use vault APIs.
- Notice convenience helpers: conditionally include `timeoutMs` to satisfy exactOptionalPropertyTypes.
- `useSyncExternalStore` snapshot caching for command registry, snippet loader, theme loader to prevent infinite re-render loops.
- Restored `katex/dist/katex.min.css` import after a regression.
- WorkspaceStore.hydrate now clears nav history before rebuilding state.

---

## 2026-05-10 (afternoon) — Phase 4-8 substantial advancement

### Workspace
- **Tab split-down** (`Mod+Shift+\\`) + columns-of-groups layout. WorkspaceState gains `columns: TabGroupId[][]`. `splitLeaf("right")` adds a new column; `splitLeaf("down")` adds a new group inside the same column. `closeGroup` drops empty columns. `rootGroupIds` remains a derived flat list for legacy callers.
- **Workspace persistence migration** to columns shape (legacy flat `groups` snapshots remain readable).
- **Stacked tab groups** (`mod-stacked`) — vertical card list rendering — persisted per group.
- **Vault auto-reopen on launch** — silent for OPFS, click-to-grant notice for FSA.
- **Per-leaf back/forward navigation history** wired to titlebar buttons.
- **Tab right-click context menu** (close / close others / close to right / split right / split down / pop out / pin).
- **Drag-and-drop tab reordering and move-across-groups** (custom MIME, drop indicator).

### Settings
- **CSS snippets** (`.granite/snippets/*.css`) loader + Settings → Appearance toggles + hot-reload.
- **Themes** (`.granite/themes/*.css`) — single active theme, Settings dropdown, hot-reload.
- **Hotkeys reference tab** + (later in the day) **editable hotkey capture**.

### File explorer
- Drag-drop file moves with vault-wide wikilink sweep.
- Multi-select (Shift / Ctrl-click) + bulk delete (Mod+Delete on focused container).

### Reading view
- **Hover popover** for `.internal-link` anchors (300 ms delay, viewport-clamped 360×280).
- **Markdown-form `[text](path)`** auto-tagged as `.internal-link`; absolute URLs as `.external-link`.
- **Mermaid diagrams** with theme-aware initialization.
- **Audio / video / PDF embeds** (native players + sized iframe via blob URLs).
- **Note section embeds** (`![[Note#Heading]]`) and **block embeds** (`![[Note#^block]]`).
- **Embedded query blocks** (` ```query ``` `) with live refresh on metadata changes.
- **Task list checkbox toggle write-back**.

### Editor
- **Slash commands** (`/`) and **wikilink autocomplete** (`[[`).
- **Source-mode fragment scrolling** — heading or `^block` jumps via metadataCache lookup.
- **Block-id insertion** — `editor:insert-block-id` (idempotent).
- **Heading-anchor cross-vault search** — `[[##query]]` autocomplete shows every heading in the vault.

### Linking
- `rewriteWikilinksOnRename` — vault-wide rewriter wired to InlineTitle rename and file-explorer drag-drop.

### Sidebar views
- **FootnotesView**, **LocalGraphView** (1-hop SVG), **AllPropertiesView** (with type inference), **OutgoingLinksView**, **TagsView**.
- **QuickSwitcher with aliases**.
- **Bookmarks** with file / heading / block / search types and named groups (collapsible folders).

### Search
- **Structured query parser** with `tag:` `path:` `file:` `line:` operators, `-foo` exclusions, quoted phrases, `matchCase`.
- **Match-case toggle + sort orders** (relevance / name / modified).
- **Inline tag fallback** for files without cached metadata.

### Graph
- **Global graph leaf type** with Verlet simulation, SVG render, pan/zoom, click-to-open, live metadata refresh.

### Plugins (built-in)
- Daily Notes, Templates (modal picker), Random Note, Workspaces (named layouts in columns format), File Recovery, Note Composer, Audio Recorder, Unique Note Creator, Web Viewer, Format Converter (wikilinks → markdown, copy as HTML).

### Markdown rules
- **Comments** `%% ... %%` (inline + multi-line block).
- **Wikilinks**, **embeds**, **tags**, **highlights**, **task list items** with `data-line` and `data-checked`.

---

## 2026-05-09 — Phase 0-3 foundation

(Bootstrap, design tokens, app shell, vault filesystem (Effect 4 service), command registry, hotkeys, theme provider, markdown-it renderer with custom rules, ReadingView, MarkdownView, file explorer, quick switcher, command palette, vault picker, settings modal scaffold, metadata cache, KaTeX math, callouts, footnotes, image embeds, Prism syntax highlighting, project bootstrap, spec organization.)

---

## 2026-05-09 — Project bootstrap

- Spec organization: `specs/product/` and `specs/renderer/`.
- Project README with name **Granite**.
