# DONE

> Log of completed work. Items move here from `todo.md` when they ship. Newest entries on top.

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