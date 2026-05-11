# TODO

> Tracker for the Obsidian-style web app. Items move from this file into `done.md` when shipped.

---

## ✅ Phase 0 — Skeleton

All items complete; see `done.md`.

## ✅ Phase 1 — Core editing

Acceptance gate met. Outstanding polish (low priority):

- [ ] `.granite/` config folder created on vault init (instead of localStorage)
- [ ] Editing-mode chip in status bar
- [x] Spellcheck integration
- [ ] Pinned commands in palette
- [ ] Recently-opened files at top of empty Switcher query
- [ ] Shift+Enter creates new note when no exact match in Switcher
- [ ] Translucent window mode (CSS only)
- [ ] Sort order options in file explorer (mtime/ctime/name)
- [x] Multi-select via Shift/Ctrl click in file explorer
- [x] Drag-drop in file explorer

## ✅ Phase 2 — Linking & metadata

Acceptance gate met. Outstanding polish (low priority):

- [ ] Click resolution + unresolved styling in source mode (CM6 widget)
- [ ] Properties view editor (full type system, write-back)
- [ ] Type registry persisted to `.granite/types.json`
- [x] Excluded files setting + behavior
- [ ] Aliases in unlinked-mentions search
- [x] Heading anchor `[[##term]]` cross-vault search in autocomplete

## ✅ Phase 3 — Markdown rendering

Substantially complete. Outstanding (lower priority):

- [ ] Live Preview CM6 decorations (full hide-syntax-on-leave widgets)
- [ ] CodeMirror token highlighting refinement
- [ ] Recursive markdown embeds (nested embeds in resolved content)
- [ ] Heading anchor normalization (slug/escape rules)

## ✅ Phase 4 — Workspace plumbing

Acceptance gate met. Outstanding (lower priority):

- [x] Pop-out windows (URL-driven popout layout + tab menu entry)
- [ ] Native browser back/forward integration

## ✅ Phase 5 — Search & graph

- [x] Vault-wide content search with operators: `tag:` `path:` `file:` `line:` `-exclude`
- [x] Match-case toggle + sort orders (relevance / name / modified)
- [x] Local graph (sidebar 1-hop SVG)
- [x] Global graph leaf type with force-directed simulation, pan/zoom, live refresh
- [x] Embedded ` ```query ``` ` blocks with live refresh on metadata changes
- [ ] Graph filters, groups (color by tag/folder)
- [ ] **Gate:** 5k-note graph at 60fps, complex query <200ms (untested at scale)

## ✅ Phase 6 — Canvas & Bases

- [x] Canvas plugin
  - [x] JSON Canvas v1 schema reader/writer
  - [x] Card types: text/file/link/group
  - [x] Edges with anchors, labels, colors, end markers
  - [x] Pan/zoom/marquee/multi-select (pan + zoom; marquee is a follow-up)
  - [x] Color palette (1-6 + hex)
  - [ ] Embed canvases in notes
- [x] Bases plugin (minimal first-pass)
  - [x] YAML parser for `.base` files (no `` ```base `` fence yet)
  - [x] Filter via Search-panel query syntax
  - [x] Views: Table (List / Cards are follow-ups)
  - [x] Toolbar: result count, sort by column, properties

## ✅ Phase 7 — Plugin & theme platform

- [x] CSS snippets folder + hot-reload + Settings toggles
- [x] Theme loader (`.granite/themes/*.css`) + Settings picker + hot-reload
- [x] Hotkeys reference table in Settings
- [x] **Custom hotkey assignment** — capture next keypress + reset
- [x] Plugin loader (manifest + main.js + onLoad/onUnload + Settings UI)
- [x] Plugin API (commands / workspace / notice / vault / granite + log)
- [x] Restricted mode default-on (plugins disabled until user enables)
- [x] Sample plugin (`examples/plugins/word-counter/`) + plugin author docs
- [x] TypeScript definitions for plugin authors (`examples/plugins/granite-api.d.ts`)
- [ ] Community plugin browser
- [ ] Theme browser (community)

## ✅ Phase 8 — Polish & a11y

- [x] Tooltip system
- [x] Notice (toast) system with onActivate handler + dismiss button
- [x] Welcome / empty-state CTAs
- [x] Vitest test scaffold (71 tests passing across 8 files)
- [x] Hover popover for internal links
- [x] PWA manifest + theme color
- [x] Service worker for offline shell (production builds only)
- [x] `prefers-reduced-motion` overrides
- [x] Vault auto-reopen on launch
- [ ] Keyboard accessibility audit (full)
- [ ] Screen-reader labels on every icon-only button
- [ ] High-contrast theme variant
- [ ] Performance audit on 50k-note vault
- [ ] i18n harness (i18next) + RTL test language
- [ ] Mobile breakpoints
- [ ] All items in `specs/product/24_acceptance_criteria.md` ticked

---

## Renderer-fidelity backlog

Implemented (some partial):

- [x] design-tokens
- [x] app-shell, tabs (drop indicators + context menu + stacked variant + popout), modal, suggestion-and-prompt, tree-item (drag-over + selected + multi-select)
- [x] view-file-explorer (rename / delete / drag-drop / multi-select)
- [x] editor-codemirror (search + live-preview-lite + slash + wikilink autocomplete + heading-anchor)
- [x] editor-reading-mode, editor-tags-and-links, editor-headings-and-lists, editor-tables, editor-code-blocks, editor-callouts, editor-footnotes, editor-comments
- [x] editor-inline-title (rename + wikilink sweep)
- [x] settings-modal / settings-vertical-tabs (snippets + themes + hotkeys editable + plugins)
- [x] tooltip, notice, hover-popover (basic), menu primitive
- [x] view-backlinks, view-outgoing-links, view-outline, view-tags, view-bookmarks (typed + grouped), view-search (operators + matchCase + sort), view-footnotes, view-graph (sidebar + central + global)
- [x] view-webviewer (basic), view-canvas (placeholder), view-bases (placeholder)
- [x] mermaid-block, query-results-block

Outstanding (large surface area):
- [ ] tabs corner-curve trick + container queries
- [ ] buttons full primitive set (`.text-icon-button`, `.input-button`)
- [ ] inputs full set (date/range/color)
- [ ] scrollbars styled-mode
- [ ] checkbox mask-image tick
- [ ] tree-item indent guides
- [ ] icons-and-assets — full SVG class pattern
- [ ] editor-properties — full inline frontmatter editor (write-back)
- [ ] editor-embeds — full chrome
- [ ] view-pdf
- [ ] view-release-notes, view-history-sync
- [ ] settings full chrome, community plugins/themes browsers
- [ ] sidedock pop-outs (basic popout shipped)
- [ ] view-header breadcrumbs
- [ ] os-modifiers (Win/Linux), mobile, rtl
- [ ] loading-states, splash, slider, dialog, card, empty-state, flair-and-pill, multi-select, progress-bar
- [ ] editor-source-mode + editor-live-preview (full CM6 widgets)
- [ ] editor-mobile-toolbar

---

## Cross-cutting

- [ ] Sentry-style error boundary integrated with Effect's error channel
- [ ] Lighthouse a11y audit (manifest + theme color in place)
- [ ] Add CI workflow (typecheck + lint + test on PR)
- [ ] Document the vault format + plugin API in a public docs site (basic plugin docs in `examples/plugins/README.md`)

---

_Move items to `done.md` as they ship._