# Granite — Completion Plan

_Generated: 2026-05-12. Companion to `STATUS.md`._

This plan reconciles every line of `specs/product/*.md` and `specs/renderer/*.md` with
the current implementation under `src/`, then schedules the remaining work in
nine concrete phases. Each phase has deliverables, acceptance gates, and the
test the gate is measured by.

---

## 0. Reading order

- `STATUS.md` — current state, what's done, what's outstanding, what `todo.md` is wrong about.
- `specs/product/24_acceptance_criteria.md` — the **only** definition of done.
- `specs/product/23_implementation_blueprint.md` — phased build with perf budgets.
- `specs/renderer/*.md` — 75 files, one per visual surface. **Source of truth for every CSS rule.**
- `todo.md` / `done.md` — historical journal; superseded by this plan for forward work.

---

## 1. Inventory snapshot

### 1.1 Source code (live in `src/`)

| Layer | Files | Coverage |
|---|---|---|
| `core/` (Effect services) | 84 files | Fully scaffolded — bases, canvas, commands, fs, i18n, links, markdown, metadata, notices, plugins, plugins-core, search, settings, snippets, themes, vault, workspace |
| `ui/` (React) | 41 files | Shell, overlays, prompts, views, sidebar, workspace, controls — all major surfaces present |
| `styles/` (CSS) | 20 files | `base, callouts, cm-livepreview, dropdown, high-contrast, index, markdown, menu, mobile, overlays, popover, print, prism, settings, shell, tabs, toggle, tokens, tooltip, views` |
| Tests | 25 files, **279 cases** (Vitest) | CI green at `.github/workflows/ci.yml` |
| Plugin platform | 16 built-in core plugins under `core/plugins-core/`, 2 sample plugins under `examples/plugins/`, full TypeScript definitions at `examples/plugins/granite-api.d.ts` |

### 1.2 Specification surface

| Spec area | Count | What it defines |
|---|---|---|
| `specs/product/00–25` | 26 | Product narrative + acceptance criteria + legal/branding notes |
| `specs/renderer/` | 75 | Per-component CSS contracts — every visual surface |

The renderer count includes 27 spec files that **do not yet have a counterpart
CSS module** in `src/styles/` (see §3.2).

### 1.3 Spec → CSS file mapping (current)

| Renderer spec | Current CSS home |
|---|---|
| `design-tokens.md` | `tokens.css` ✓ (complete, three-layer system + macOS overrides) |
| `app-shell.md`, `titlebar.md`, `status-bar.md`, `ribbon.md`, `sidedock.md`, `workspace-and-splits.md`, `view-header.md` | `shell.css` (partial — needs full per-spec audit) |
| `tabs.md` | `tabs.css` (partial — needs corner-curve trick, container queries, sticky controls, stacked mode) |
| `toggle.md` | `toggle.css` (basic; press-stretch / macOS dimensions / forced-colors not verified) |
| `menu.md` | `menu.css` (partial) |
| `tooltip.md` | `tooltip.css` (partial; needs `mod-top/-left/-right/-error/-wide` arrow variants, pop-down keyframe) |
| `dropdown-select.md` | `dropdown.css` (partial; needs `combobox-button` chrome) |
| `editor-markdown-rendering.md`, `editor-callouts.md`, `editor-code-blocks.md`, `editor-tables.md`, `editor-tags-and-links.md`, `editor-headings-and-lists.md`, `editor-footnotes.md`, `editor-embeds.md`, `editor-properties.md`, `editor-inline-title.md` | `markdown.css` + `callouts.css` (partial — large surface area unfinished) |
| `editor-codemirror.md`, `editor-live-preview.md`, `editor-source-mode.md`, `editor-document-search.md`, `editor-reading-mode.md` | `cm-livepreview.css` (partial) |
| `mobile.md`, `editor-mobile-toolbar.md`, `settings-mobile.md` | `mobile.css` (partial) |
| `hover-popover.md` | `popover.css` (partial — sizing, edit state, footnote sizing missing) |
| `themes-light-dark.md`, `high-contrast.css` | `tokens.css` + `high-contrast.css` ✓ |
| `print.css` | `print.css` ✓ |
| `settings-modal.md`, `settings-vertical-tabs.md`, `settings-horizontal-tabs.md` | `settings.css` (partial) |
| `view-file-explorer.md`, `view-search.md`, `view-backlinks.md`, `view-outgoing-links.md`, `view-outline.md`, `view-tags.md`, `view-bookmarks.md`, `view-canvas.md`, `view-bases.md`, `view-graph.md`, `view-pdf.md`, `view-webviewer.md`, `view-release-notes.md`, `view-history-sync.md`, `view-header.md` | `views.css` (partial) |
| `tree-item.md`, `multi-select.md`, `flair-and-pill.md`, `checkbox.md`, `slider.md`, `inputs.md`, `buttons.md`, `card.md`, `modal.md`, `dialog.md`, `progress-bar.md`, `loading-states.md`, `empty-state.md`, `notice.md`, `splash.md`, `scrollbars.md`, `drag-and-drop.md`, `suggestion-and-prompt.md`, `animations.md`, `typography.md`, `os-modifiers.md`, `rtl.md`, `icons-and-assets.md`, `settings-community-plugins.md`, `settings-community-themes.md` | **No dedicated CSS module yet** — rules currently scattered across other files or absent |

Currently 20 CSS modules cover ~48 of the 75 spec files at varying fidelity.
**27 specs have no dedicated CSS file**; their rules either live partially in a
generic module or are absent entirely.

---

## 2. Work tracks

The remaining work splits cleanly into four parallel tracks. Each phase below
schedules slices across tracks rather than working one track at a time.

### Track A — Functional (acceptance criteria)
Closes red items in `specs/product/24_acceptance_criteria.md` §24.1–§24.23.
Examples: regex search, plugin `loadData()`/`saveData()`, Bases formula
evaluator, Vim mode.

### Track B — Renderer fidelity
Brings every visual surface in line with `specs/renderer/*.md`. Each spec file
becomes a dedicated CSS module (or addition to the existing one), audited
selector-by-selector against the spec.

### Track C — Infrastructure
Perf harness, i18n externalization, a11y audit, crash-safety harness,
compatibility round-trip fixtures, observability.

### Track D — Documentation
Vault format / plugin API documentation site, contributor guide, public
changelog.

---

## 3. Gap analysis

### 3.1 Track A — acceptance criteria gaps (verified via grep + reading)

Section-by-section, items still red after STATUS.md verification:

**§24.1 Vault & files**
- Configurable trash setting (system trash / vault `.trash/` / permanent).
- External-edit-detected ≤ 500 ms perf assertion.
- Multi-window simultaneous vaults.
- `.obsidian/` vs `.granite/` spec text alignment.

**§24.2 Editor**
- Vim key bindings (none of `vim`, vim-related extensions imported).
- Multi-cursor (`EditorState.allowMultipleSelections` not enabled).
- Rectangular selection (CM6 `rectangularSelection` extension absent).
- Code folding (no `foldGutter` / `codeFolding`).
- Folded-state persistence across reload.

**§24.3 Parser fidelity**
- CommonMark ≥ 99 % conformance harness (no test suite).
- GFM autolink coverage (untested).
- Math `block + inline` round-trip tests.

**§24.4 Linking & metadata**
- `[[^^term` vault-wide block search (only intra-file).
- Quoted-string preservation inside Text/List properties on save.
- Aliases in Quick Switcher already work; aliases in autocomplete need verification.

**§24.5 Properties**
- Date/datetime locale rendering.
- Format Converter for legacy singular `tag/alias/cssclass` → plural.
- JSON-style frontmatter → YAML on save rewrite path.

**§24.6 Tags**
- All-numeric tag rejection already implemented; "Show nested tags" toggle UI not surfaced.

**§24.7 Search**
- `/.../` regex form not in `core/search/query.ts`.
- Property operators `[name]`, `[name:value]`, `[name:null]` absent.
- 10 k-note <200 ms first-paint gate (no perf harness).

**§24.8 Graph**
- Filters, groups, color-by-tag/folder.
- Display + force sliders.
- Persisted graph state (zoom/pan).
- 10 k-node ≥ 30 fps panning gate.

**§24.9 Canvas**
- Marquee select, alt-duplicate, shift-axis-lock.
- Embedded canvas interaction inside host note.
- Snap toggle (currently always-on at 10 px).

**§24.10 Bases**
- List view, Cards view, Map view (only Table view today).
- Formula evaluator.
- Summaries (built-in + custom).
- `this` context for embedded usage.
- ` ```base `` ` fenced embedding.

**§24.11 Workspace & tabs** — all satisfied.

**§24.12 Sidebars**
- Pop-out sidebar tabs into central area.
- Multiple vertical tab groups within a sidebar.

**§24.13 Status bar**
- CJK-aware word count (current splits on whitespace only).
- Editing-mode chip.
- Plugin-added status items (`PluginApi.statusBar` API).

**§24.14 Hotkeys**
- Multi-binding per command (single override only).
- US-layout normalization with physical-key trigger.

**§24.15 Settings**
- Live filter input.
- Per-plugin settings pages (`PluginApi.addSettingsTab`).
- All defaults persisted to `.granite/` (some still localStorage).

**§24.16 Themes & snippets** — all satisfied.

**§24.17 Plugins**
- `loadData()` / `saveData()` (the biggest community-plugin blocker).
- Update check + version-mismatch handling.
- Community plugin browser (modal exists; registry calls absent).

**§24.18 D&D**
- External-OS-drag with `Ctrl/Option` modifier behavior.
- Full enumeration of source × destination matrix in tests.

**§24.19 Perf** — all unmeasured. No harness.

**§24.20 A11y**
- Full keyboard audit.
- Screen-reader announcements for tab change / modal open / notice content.
- 4.5:1 contrast assertion.

**§24.21 i18n**
- String externalization complete (most strings still hard-coded in JSX).
- RTL language demonstrable.
- `dir="rtl"` flip per-note via property.

**§24.22 Crash safety**
- 100-cycle kill-and-restart fixture.
- File-recovery restore UI.

**§24.23 Compatibility round-trip**
- Open existing Obsidian vault unmodified.
- Standard theme cross-render.

### 3.2 Track B — renderer fidelity gaps

27 spec files have no dedicated CSS module yet. Beyond the missing modules,
several existing modules are partial. Each renderer spec ends with a
"Reproducer build order" section — that is the verification checklist for the
module.

**Spec → module action plan:**

| Spec | Action |
|---|---|
| `typography.md` | Extract from `markdown.css` and `shell.css` into `src/styles/typography.css` (heading scale, body baseline, inline-title, link tokens, italic/bold modifier formula, garbled mode, RTL bidi list). |
| `animations.md` | New `src/styles/animations.css` with all 13 `@keyframes` (node-inserted, blink, sk-cubeGridScaleDelay, multi-select-highlight, increase, decrease, pop-down, pop-right, rotation, hmd-file-uploading-ani, progress-bar, spin, slideIn). Reduced-motion overrides per-component. |
| `buttons.md` | New `src/styles/buttons.css` covering `<button>` (default / `.mod-cta` / `.mod-warning` / `.mod-destructive` / `.mod-loading`), `.clickable-icon` (full state table), `.text-icon-button`, `.input-button`, `.card-container`/`.card`. |
| `inputs.md` | New `src/styles/inputs.css` consolidating the shared base for text-shaped inputs, textarea, multi-select-container, date/datetime subfield rules, search container, range slider, color input, formula editor, setting progress bar, `.is-loading::before`. |
| `checkbox.md` | New `src/styles/checkbox.css` covering `<input type=checkbox>` / `<input type=radio>` shared base, masked-tick variant, indeterminate, task-list checkbox. |
| `slider.md` | Pull range-slider rules into `src/styles/slider.css` (cross-reference to `inputs.css`). |
| `multi-select.md` | New `src/styles/multi-select.css` (`.multi-select-container`, pill chrome, duplicate flash animation). |
| `flair-and-pill.md` | New `src/styles/flair.css` (`.flair`, `.mod-pop`, `.mod-flat`, tree-item-flair cross-ref). |
| `tree-item.md` | New `src/styles/tree-item.css` (full state hierarchy and indent geometry — currently scattered across `views.css`). |
| `tabs.md` | Audit `src/styles/tabs.css` against the spec — add corner-curve `::before`/`::after`, container queries for narrow tabs, sticky inner controls, stacked-mode rotation. |
| `tooltip.md` | Audit `src/styles/tooltip.css` — add the four positional variants and `mod-error` / `mod-wide`. Pull `pop-down` / `pop-right` keyframes into `animations.css`. |
| `notice.md` | New `src/styles/notice.css` (`.notice-container`, `.notice`, `<progress>` overrides, `.notice-cta`). |
| `menu.md` | Audit `src/styles/menu.css` — separator deduplication, mod-no-icon, submenu chevron, `is-warning` / `is-disabled` / `is-label` states. |
| `modal.md` | New `src/styles/modal.css` (default + `mod-sidebar-layout` + `mod-scrollable-content` + `mod-scrollable` + `mod-narrow`, button row, file-rename, image-lightbox, file-browser, confirmation state). |
| `dialog.md` | Cross-reference only — PDF.js dialog styling stays vendored; document the wrapping path. |
| `dropdown-select.md` | Audit `src/styles/dropdown.css` — add the chevrons-up-down SVG data URI for both themes, `.combobox` + `.combobox-button` + mobile sizing. |
| `card.md` | New `src/styles/card.css` (`.card-container`, `.card`, `.card-title`, `.card-description`, `.is-selected`). |
| `empty-state.md` | New `src/styles/empty-state.css` (`.empty-state`, action list, feedback banner). |
| `loading-states.md` | New `src/styles/loading.css` (`.is-loading::before` if not in inputs, `.loader-spinner`, `.loader-cube`, `.is-flashing`, `button.mod-loading`). |
| `progress-bar.md` | Already covered by `loading.css` + `inputs.css`; keep full-screen `.progress-bar.*` rules separate at `src/styles/progress.css`. |
| `splash.md` | New `src/styles/splash.css` (first-launch starter screen). |
| `scrollbars.md` | New `src/styles/scrollbars.css` (`body.styled-scrollbars` + WebKit + Firefox + Android). |
| `drag-and-drop.md` | New `src/styles/drag.css` (`.drag-ghost`, `.drag-reorder-ghost`, `.drag-ghost-hidden`, `.workspace-drop-overlay`, `.workspace-fake-target-overlay`, `.drop-indicator`, modal-while-dragging). |
| `suggestion-and-prompt.md` | New `src/styles/suggestion.css` and `src/styles/prompt.css` (the `.prompt` is the Command Palette / Quick Switcher; `.suggestion-container` is autocomplete). |
| `hover-popover.md` | Audit `src/styles/popover.css` — add the per-media-type child sizing rules (image, video, audio, PDF, footnote, markdown embed). |
| `view-file-explorer.md`, `view-search.md`, `view-backlinks.md`, `view-outgoing-links.md`, `view-outline.md`, `view-tags.md`, `view-bookmarks.md`, `view-canvas.md`, `view-bases.md`, `view-graph.md`, `view-pdf.md`, `view-webviewer.md`, `view-release-notes.md`, `view-history-sync.md`, `view-header.md` | Split `src/styles/views.css` into a per-view file each (`src/styles/views/<name>.css`), and add `src/styles/views/index.css` that imports the set. |
| `settings-modal.md`, `settings-vertical-tabs.md`, `settings-horizontal-tabs.md`, `settings-community-plugins.md`, `settings-community-themes.md`, `settings-mobile.md` | Split `src/styles/settings.css` into per-spec modules; community-modal gets its own file. |
| `editor-callouts.md` | Audit `callouts.css` against the per-type RGB table; add the `:has(:dir(rtl))` callout flip and color-mix table-border re-tint. |
| `editor-code-blocks.md` | Audit `markdown.css` — split off `src/styles/code.css` covering inline-code split-span pill rendering, fenced code chrome, copy button. |
| `editor-tables.md` | Audit + new `src/styles/tables.css` for the full table token system, plus the CM6 widget selection states. |
| `editor-tags-and-links.md`, `editor-headings-and-lists.md`, `editor-footnotes.md`, `editor-embeds.md`, `editor-properties.md`, `editor-inline-title.md`, `editor-markdown-rendering.md` | Audit and split `markdown.css` into per-feature modules — each spec maps 1:1 to a CSS module. |
| `editor-codemirror.md`, `editor-source-mode.md`, `editor-live-preview.md`, `editor-document-search.md`, `editor-reading-mode.md` | Audit `cm-livepreview.css` — extract source-mode chrome to `src/styles/cm.css`, document-search to `src/styles/cm-search.css`, live-preview decorations to `src/styles/cm-livepreview.css`, reading mode to `src/styles/reading.css`. |
| `mobile.md`, `editor-mobile-toolbar.md` | Audit `mobile.css` — add `is-android` scrollbar overrides, iOS contenteditable hacks, feedback banner, phone tab switcher, navbar. |
| `os-modifiers.md` | Audit existing rules; ensure macOS/Windows/Linux/iOS branches all addressed. Tokens already in `tokens.css`. |
| `rtl.md` | Audit RTL rules — `unicode-bidi: plaintext` element list, icon mirroring exceptions, callout flip via `:has(:dir(rtl))`, `--direction` token usage. |
| `themes-light-dark.md` | Already covered by `tokens.css`; document the diff table for theme authors. |
| `icons-and-assets.md` | Audit asset shipping — ensure Lucide imports use `--icon-size` cascade, `[aria-label] .svg-icon { pointer-events: none }` is set globally, macOS more-vertical rotation rule present. |
| `view-canvas.md` | Audit `views.css` canvas section — add card-menu hover transform (-6px translateY + drop-shadow), control-group chrome with `--input-shadow`, mod-canvas-color-N tokens, RTL canvas exception. |
| `view-bases.md` | Largest single component (≈1700 LOC). Token system in `tokens.css` needs `--bases-*` family added; full chrome to be authored at `src/styles/bases.css`. |

### 3.3 Track C — infrastructure gaps

- **Perf harness**: 10 k / 50 k / 100 k-note fixture vaults; Vitest perf suite asserting `<200ms`, `<500ms`, `60fps` budgets per `23_implementation_blueprint.md` §23.5. Currently zero coverage.
- **i18n**: only the welcome / search / settings labels are routed through `t()` in `core/i18n/index.ts`. Walk every JSX file; route every visible string.
- **RTL**: provide an RTL demo locale (e.g. `he`) + per-note `dir` frontmatter property + `body.is-rtl` propagation.
- **A11y**: `aria-label` audit across every icon-only button; screen-reader announcement region; focus ring uniformity check; reduced-motion respect.
- **Crash safety**: orphan `.tmp~` scan on startup; 100-cycle kill-and-restart Playwright fixture.
- **Compatibility**: integration fixture vault (200+ notes, complex frontmatter, callouts, math, Mermaid, embeds, block IDs, footnotes, comments, tasks, properties, 5 `.canvas`, 3 `.base`, `.obsidian` config).

### 3.4 Track D — documentation gaps

- Vault format public docs site (Markdown + canvas + base schemas, `.granite/` layout).
- Plugin API docs site (every public method in `core/plugins/types.ts`).
- Contributor guide (test conventions, CSS layering rules, token discipline).
- Public changelog beyond `done.md` (this becomes `CHANGELOG.md`).

---

## 4. Phases

Each phase has: deliverables, files touched, acceptance gate, test that
measures the gate. Phases are ordered by **highest leverage first**:
unblocking community plugins → unblocking compatibility → closing visible
fidelity gaps → infrastructure → polish.

### Phase 9 — Plugin platform completeness

Unblocks every community plugin port.

**Deliverables**
- `PluginApi.loadData()` / `saveData()` reading/writing `.granite/plugins/<id>/data.json` via `granite-config`.
- `PluginApi.addSettingsTab()` rendering a custom React subtree inside the Settings modal under "Plugin options".
- `PluginApi.statusBar.add()` injecting a `.status-bar-item` (with lifecycle cleanup on plugin unload).
- `PluginApi.workspace.onLayoutChange` / `on('file-open')` / `on('file-rename')` event subscription.
- `PluginApi.metadataCache.{getFileCache, getFirstLinkpathDest}` read-only access.
- Update check: HTTP GET to `manifest.json` URL declared in plugin manifest; `minAppVersion` comparison; graceful disable with notice on mismatch.
- Community plugin browser: list view over a configurable registry URL; install path that downloads `main.js` + `manifest.json` into `.granite/plugins/<id>/`.

**Files touched**
- `src/core/plugins/types.ts` (extend `PluginApi`)
- `src/core/plugins/loader.ts` (wire data persistence + settings-tab + status-bar registry)
- `src/core/plugins/registry.ts` *(new)* — HTTP fetch + registry parsing
- `src/ui/prompts/SettingsModal.tsx` (host plugin-supplied settings tabs)
- `src/ui/shell/StatusBar.tsx` (host plugin-supplied items)
- `examples/plugins/granite-api.d.ts` (extend declarations)
- `examples/plugins/data-store/` *(new sample plugin)* demonstrating loadData/saveData
- Tests: `core/plugins/loader.test.ts` covering data persistence + settings + status-bar

**Gate**: install a third-party Templater-equivalent plugin from a fixture
registry and verify it runs without modification. Tracked by `core/plugins/loader.test.ts` and a manual smoke test.

---

### Phase 10 — Search & Bases parity

Closes §24.7 and §24.10.

**Deliverables**
- Search engine: regex `/pattern/flags`, property operators `[name]`, `[name:value]`, `[name:null]`, sub-queries with parentheses. Existing operators (`tag:`, `path:`, `file:`, `line:`, `-`) preserved. New tests under `core/search/query.test.ts` + `regex.test.ts`.
- Bases formula evaluator: tokenizer + parser + evaluator supporting the operators in `12_bases.md` (`+`, `-`, `*`, `/`, `==`, `!=`, `<`, `>`, `&&`, `||`, function calls). Built-in functions: `length`, `lower`, `upper`, `now`, `date`, `concat`, `if`. Custom function registration via plugin API.
- Bases List view + Cards view (Table view already shipped).
- Bases group-by (per-property grouping with group headings).
- Bases summaries (count, sum, min, max, avg, median).
- ` ```base ` fenced embedding in markdown.
- Bases `this` resolution for embedded contexts (main / embed / sidebar).

**Files touched**
- `src/core/search/query.ts` (regex + property parsing)
- `src/core/search/regex.test.ts` *(new)*
- `src/core/bases/formula.ts` *(new)* — tokenizer + AST + evaluator
- `src/core/bases/summary.ts` *(new)* — aggregation
- `src/ui/views/BasesView.tsx` (split into `BasesTableView.tsx`, `BasesListView.tsx`, `BasesCardsView.tsx`)
- `src/core/markdown/renderer.ts` (fenced base block handler)
- Tests: `core/bases/formula.test.ts`, `core/bases/summary.test.ts`, `core/search/regex.test.ts`

**Gate**: an Obsidian-authored `.base` file with formula, group-by, and
summaries round-trips through Granite unchanged AND produces the same rendered
output.

---

### Phase 11 — Graph completeness

Closes §24.8.

**Deliverables**
- Filter input on the graph controls panel (uses search query syntax).
- Group system: user-defined groups (name + query + color). Persist to `.granite/graph.json`.
- Color-by-tag and color-by-folder presets.
- Display sliders: node size, link thickness, line width, font size.
- Force sliders: center force, repel force, link force, link distance.
- Persist graph zoom/pan/state to `.granite/workspace.json` so closing/reopening restores.
- Local graph "linked view" mode: follows active leaf's note.

**Files touched**
- `src/ui/views/GraphView.tsx` (extend with sliders + filters)
- `src/core/graph/groups.ts` *(new)* — group serialization + color assignment
- `src/core/graph/forces.ts` *(new)* — pluggable force-simulation params
- `src/core/workspace/store.ts` (persist graph leaf state)
- Tests: `core/graph/groups.test.ts`, `core/graph/forces.test.ts`

**Gate**: a 10 k-note synthesized vault renders the graph at ≥ 30 fps while
panning. Tracked by perf harness from Phase 14.

---

### Phase 12 — Editor fidelity

Closes §24.2.

**Deliverables**
- Vim mode via `@replit/codemirror-vim` (vendored or pinned dep). Toggleable from Settings → Editor → "Default editing mode → Vim".
- `EditorState.allowMultipleSelections.of(true)` + `drawSelection({drawRangeCursor: true})` for multi-cursor.
- `rectangularSelection()` from `@codemirror/view` for Alt-drag rectangular.
- `foldGutter()` + `codeFolding()` from `@codemirror/language` for heading and indent folding.
- Persisted fold state per file in `.granite/workspace.json`.
- Full live-preview decoration replacement (every formatting marker hidden when line is inactive). Currently the existing `cm-livepreview-decorations.ts` is "lite" — extend to cover `**bold**`, `*italic*`, `[[wikilink]]`, `[md](link)`, `![[embed]]`, callout titles, fenced code, table cells.
- Recursive markdown embeds: when a `![[Note]]` resolves, also process its own embeds (with cycle detection).

**Files touched**
- `src/ui/views/MarkdownView.tsx` (extend extensions array)
- `src/core/markdown/cm-livepreview-decorations.ts` (expand decoration set)
- `src/core/workspace/folds.ts` *(new)* — fold-state persistence
- `package.json` (add `@replit/codemirror-vim` if needed; verify CM6 fold/rectangular extensions)
- Tests: `core/markdown/cm-livepreview-decorations.test.ts` (extend), `core/workspace/folds.test.ts`

**Gate**: every item in §24.2 manually verifiable. Folding-state round-trip
tested.

---

### Phase 13 — Renderer fidelity (split into 5 batches)

Closes §24.16 already; covers the renderer-spec contracts.

Each batch creates new CSS modules per §3.2 and imports them from `index.css`.
Each module ends with a `/* SPEC: specs/renderer/<name>.md */` comment so the
mapping is verifiable.

**Batch 13a — Primitives**
- `animations.css`, `typography.css`, `buttons.css`, `inputs.css`,
  `checkbox.css`, `slider.css`, `toggle.css` (audit), `dropdown.css` (audit),
  `multi-select.css`, `flair.css`, `tree-item.css`, `card.css`,
  `empty-state.css`, `loading.css`, `progress.css`, `splash.css`,
  `scrollbars.css`, `tooltip.css` (audit), `notice.css`, `menu.css` (audit),
  `drag.css`, `suggestion.css`, `prompt.css`, `popover.css` (audit).

**Batch 13b — Shell & chrome**
- Split `shell.css` into `titlebar.css`, `ribbon.css`, `status-bar.css`,
  `sidedock.css`, `workspace.css`, `view-header.css`, `vault-profile.css`.

**Batch 13c — Editor & markdown**
- Split `markdown.css` and `cm-livepreview.css` into:
  `typography.css` (heading scale), `code.css`, `tables.css`, `lists.css`,
  `tags-and-links.css`, `embeds.css`, `footnotes.css`, `properties.css`,
  `inline-title.css`, `reading.css`, `cm.css`, `cm-livepreview.css`,
  `cm-search.css`, `callouts.css` (audit).

**Batch 13d — Views**
- Create `src/styles/views/`: `file-explorer.css`, `search.css`,
  `backlinks.css`, `outgoing-links.css`, `outline.css`, `tags.css`,
  `bookmarks.css`, `canvas.css`, `bases.css`, `graph.css`, `pdf.css`,
  `webviewer.css`, `release-notes.css`, `history-sync.css`.

**Batch 13e — Settings & modal**
- Create `src/styles/settings/`: `settings-modal.css`, `vertical-tabs.css`,
  `horizontal-tabs.css`, `community-plugins.css`, `community-themes.css`,
  `settings-mobile.css`.
- Create `src/styles/modal.css`.

**Files touched**: ~50 new CSS modules + `src/styles/index.css` updated to
import them. No JSX changes other than verifying classnames match spec.

**Gate**: visual diff against the spec's "Reproducer build order" checklist.
Tracked by a Playwright visual-regression test fixture (Phase 14 prerequisite).

---

### Phase 14 — Performance + crash + compatibility harness

Closes §24.19 and §24.22 and provides the gate measurement for Phases 11/13.

**Deliverables**
- `tests/perf/` Vitest suite with synthesized fixture vaults at 1 k / 10 k /
  50 k / 100 k notes (generated on the fly so the repo stays small).
- Assertions per `23_implementation_blueprint.md` §23.5:
  - Empty-vault startup < 1 s.
  - 10 k-note cold start < 3 s.
  - Quick-switcher keystroke update < 16 ms.
  - 10 k search regex < 500 ms.
  - 10 k graph pan ≥ 30 fps (frame budget < 33 ms).
  - Save round-trip < 50 ms.
- `tests/e2e/` Playwright suite for:
  - 100 random kill-and-restart cycles during edit-heavy use.
  - Compat fixture: open a 200-note `.obsidian` vault, render every note,
    save back, diff for canonical equivalence.
  - Drag-and-drop matrix from `21_dnd_and_pop_out_windows.md`.
- Orphan `.tmp~` scan on vault open.
- `granite:show-debug-info` command dumping version, platform, vault size,
  plugin list, perf stats.

**Files touched**
- `tests/perf/*.test.ts` *(new)*
- `tests/e2e/*.spec.ts` *(new)*
- `tests/fixtures/generate-vault.ts` *(new)* — vault synthesizer
- `tests/fixtures/obsidian-compat-vault/` — checked-in 200-note reference vault
- `package.json` (add `@playwright/test`)
- `.github/workflows/ci.yml` (add `bun run test:perf` and `bun run test:e2e`)
- `src/core/plugins-core/debug-info.ts` *(new)*

**Gate**: CI green on perf + e2e + unit. Compat fixture round-trips
byte-canonical or canonically equivalent for unchanged files.

---

### Phase 15 — i18n & RTL

Closes §24.21.

**Deliverables**
- Walk every `src/ui/**/*.tsx`; replace user-visible strings with `t("key", {params})` calls; add the keys to `core/i18n/index.ts`.
- Add `he` (Hebrew) as a demo RTL locale with translations for the same keys.
- `body.is-rtl` propagation: read locale, toggle class, ensure every component respects it via existing logical-property CSS.
- Per-note `dir: rtl` / `dir: ltr` frontmatter property → adds `.markdown-rendered.rtl` to the editor's wrapper.
- `unicode-bidi: plaintext` audit per `rtl.md` §4 — make sure every user-content element has the rule.
- Date pickers honor system locale (date input `lang` attribute).

**Files touched**
- Every `src/ui/**/*.tsx` (string-extraction pass)
- `src/core/i18n/locales/en.ts`, `src/core/i18n/locales/he.ts` *(new)*
- `src/core/i18n/index.ts` (locale registry)
- `src/ui/CssClassesBinder.tsx` (toggle `.is-rtl`)
- `src/styles/rtl.css` *(new)* — wrappers, exceptions per `rtl.md`
- Tests: `core/i18n/index.test.ts` (extend with RTL + param substitution)

**Gate**: switch UI to `he` and every label flips; flip per-note `dir: rtl` and the editor content flips while UI stays in the chosen UI direction.

---

### Phase 16 — A11y, observability, docs

Closes §24.20 and Track D.

**Deliverables**
- `aria-label` audit: every icon-only `.clickable-icon` has a label. Lint rule via Biome + a runtime audit script `bun run audit:a11y`.
- Screen-reader live region: `<div role="status" aria-live="polite">` for tab change, modal open, notice content. JS pushes updates.
- `prefers-reduced-motion` audit: every infinite animation guarded.
- High-contrast variant audit: contrast ratio ≥ 4.5:1 for body text in `high-contrast.css`.
- Trash setting in `settings/store.ts` (`trash: "system" | "vault" | "permanent"`) wired to file-delete flow.
- Settings live filter input.
- Hotkey multi-binding.
- Editing-mode chip in StatusBar.
- Public docs site: `docs/` with `mkdocs.yml` (or `astro.config`), rendering `specs/product/*.md`, `specs/renderer/*.md`, and the Plugin API.
- `CHANGELOG.md` reorganized from `done.md`.
- README updated to reference the docs site.

**Files touched**
- `src/ui/shell/StatusBar.tsx` (editing-mode chip + plugin-status host from Phase 9)
- `src/core/notices/notice.ts` (live-region integration)
- `src/ui/prompts/SettingsModal.tsx` (filter input + multi-hotkey)
- `src/core/commands/hotkeys.ts` (multi-binding storage)
- `src/core/fs/trash.ts` *(new)* — implements system/vault/.trash/permanent paths
- `src/styles/high-contrast.css` (audit)
- `docs/` *(new directory)*
- `.github/workflows/docs.yml` *(new)* — build + deploy docs to GitHub Pages
- `CHANGELOG.md` *(new)*

**Gate**: every box in `24_acceptance_criteria.md` ticked OR explicitly
deferred-with-justification.

---

## 5. Cross-phase rules

### 5.1 CSS layering discipline (enforced by Phase 13 reorganization)

- **Primitives** live in `tokens.css`. Components must not redeclare a primitive — always `var(--token)`.
- **Per-component CSS modules** correspond 1:1 to `specs/renderer/<name>.md`. The first comment in each module must be `/* SPEC: specs/renderer/<name>.md */`.
- Each module ends with the spec's "Reproducer build order" as comments, so reviewers can scan the file and tick boxes.
- Modules are imported from `src/styles/index.css` in deterministic order: tokens → primitives → shell → editor → views → settings → mobile → high-contrast → print.

### 5.2 Test discipline

- Every new feature lands with a Vitest test (or extends an existing one).
- Every CSS module gets a Playwright visual-regression test once the harness is in place (Phase 14).
- Perf assertions live separately under `tests/perf/` to keep unit-test runtime low.
- `bun run test` must remain green after every change before push.

### 5.3 Plugin API discipline

- Every new method added to `PluginApi` lands in `examples/plugins/granite-api.d.ts` simultaneously.
- Behavior changes to existing methods require a `compat` test ensuring word-counter / auto-tagger plugins still load.
- Plugin teardown must always run before vault unbind (already true in `VaultContext.tsx`).

### 5.4 Spec authority

- When implementation and spec disagree, fix the implementation, not the spec — unless the spec is wrong (in which case open an issue first).
- Single exception: `.obsidian/` vs `.granite/` in §24.1 — the rebrand decision is explicit in `25_legal_branding_notes.md`; the acceptance criteria text should be amended to read `.granite/` with an Obsidian-compat alias documented.

### 5.5 Token discipline

- Every hex value in a CSS module is suspect. If a number can resolve through `var()`, it must.
- `z-index` outside the `--layer-*` scale is forbidden.
- Animation durations must use `--anim-duration-*` tokens.

---

## 6. Sequencing rationale

| Phase | Unlocks | Why this position |
|---|---|---|
| 9 — Plugins | Community plugin ecosystem | Largest single user-facing blocker. Without this no third-party plugin works. |
| 10 — Search + Bases | §24.7 + §24.10 | Two parser-heavy components; together they exercise the metadata cache hard, surfacing edge cases. |
| 11 — Graph | §24.8 | Independent; can run in parallel with 10. |
| 12 — Editor | §24.2 | Independent; mostly CM6 wiring. Can run in parallel with 10/11. |
| 13 — Renderer | §24.16 + visual fidelity | Pure CSS; parallelizable across batches. Touches no business logic. |
| 14 — Perf harness | §24.19 + §24.22 | Required to give 11, 13 their numeric gates. |
| 15 — i18n + RTL | §24.21 | Mostly mechanical sweep through JSX. |
| 16 — A11y, docs | §24.20 + Track D | Final polish before declaring v1. |

Parallelizable groups: {9}, {10, 11, 12, 13a-e}, {14}, {15, 16}.

---

## 7. Per-phase exit checklist

Each phase exits when **all** of these are true:

- [ ] All deliverables landed and merged to `main`.
- [ ] CI green: typecheck, lint, unit tests, build.
- [ ] Acceptance-criteria items closed for the phase ticked in `24_acceptance_criteria.md`.
- [ ] `STATUS.md` updated to reflect what's now done.
- [ ] `done.md` log entry written.
- [ ] No critical TODOs left in code touched by the phase.

---

## 8. Definition of done (project-level)

Granite v1 ships when:

1. Every checkbox in `specs/product/24_acceptance_criteria.md` is ticked (or explicitly deferred-with-justification in this file).
2. The perf harness reports all §23.5 budgets met on the 10 k-note fixture vault.
3. The compat fixture (a 200-note vault produced in Obsidian) opens, renders, and round-trips through Granite producing canonically equivalent files.
4. At least three popular community plugins from the Obsidian ecosystem run unmodified.
5. At least two community themes render correctly.
6. The public docs site documents the vault format and plugin API.
7. CI runs typecheck + lint + unit + perf + e2e and is green on `main`.

---

## 9. Risks & dependencies

| Risk | Mitigation |
|---|---|
| CodeMirror 6 Vim extension API drift | Pin a version known-good; provide a fallback flag to disable Vim if extension import fails. |
| markdown-it edge cases vs CommonMark conformance suite | Pull the official CommonMark 0.31 spec tests into `tests/commonmark/`; expect <99% initially and harden as needed. |
| 10 k-node graph perf on web (vs Electron) | Use OffscreenCanvas + Web Worker for the simulation; fall back to main thread if unavailable. |
| File System Access API quota for `.granite/` files in OPFS | Storage estimate + warning notice when crossing 80 % of quota; documented in `20_file_storage.md`. |
| Playwright in CI environment | Already-supported runner action; pin Chromium version. |
| Community plugin code execution security in restricted mode | Continue default-off plus user-visible "Trust this plugin" gate. Document the policy in `22_plugins_themes_architecture.md`. |
| Effect 4 beta or TypeScript 7 native-preview breakage | Fallback notes already in `23_implementation_blueprint.md` §23.1; pinned in `package.json`. Each pre-release upgrade gated by CI green. |

---

## 10. Tracking

This file is the source of truth for forward work. Phase progress is tracked
by:

- Acceptance ticks in `24_acceptance_criteria.md` (the public progress board).
- Per-phase entries in `done.md` (the engineering journal).
- This file's §4 is updated only when a phase's scope or dependencies change —
  never to record progress (that's done.md's job).