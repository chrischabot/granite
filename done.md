# DONE

> Log of completed work. Items move here from `todo.md` when they ship. Newest entries on top.

---

## 2026-05-13 — Renderer tree item CSS module

- **Dedicated module** — extracted the shared tree row primitive into
  spec-linked `src/styles/tree-item.css`, including rename, drag, cut, icon,
  focus, nested-child, and drop-indicator states from the renderer spec.
- **Regression audit** — extended the renderer module test so tree item styles
  stay imported, spec-linked, and out of the file-explorer view stylesheet.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer notice CSS module

- **Dedicated module** — extracted toast container/base/action/progress/kind
  styles into spec-linked `src/styles/notice.css`.
- **Regression audit** — extended the renderer module test so notice styles stay
  imported, spec-linked, and out of the shared overlay stylesheet.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer animation CSS module

- **Dedicated module** — moved shared keyframes out of `base.css` into
  spec-linked `src/styles/animations.css` and added the remaining renderer
  animation names from `specs/renderer/animations.md`.
- **Regression audit** — extended the renderer module test to require the
  animation module and all renderer keyframe names.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer slider and flair CSS modules

- **Dedicated modules** — added spec-linked `src/styles/slider.css` and
  `src/styles/flair-and-pill.css` for range inputs, suggestion flairs,
  tree-item flairs, and pill primitives.
- **Regression audit** — extended the renderer module test so these modules must
  stay imported and spec-linked.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer controls CSS module extraction

- **Dedicated modules** — extracted button/icon-button, text input/textarea, and
  checkbox/radio styling into `src/styles/buttons.css`,
  `src/styles/inputs.css`, and `src/styles/checkbox.css`, each linked to its
  renderer spec.
- **Regression audit** — added a style module test to prove the new modules are
  imported, spec-linked, and not left buried in shell/overlay styles.

### Tests
- Added `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Plugin loader invariant i18n ratchet

- **Plugin loader invariant** — routed the no-active-vault plugin API failure
  through a locale key before it can be embedded in the vault plugin-loader
  notice.
- **Regression audit** — extended the plugin-loader i18n audit so the raw
  English invariant cannot return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted plugin-loader/i18n tests, full
  `bun run test`, `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Filesystem capability error i18n ratchet

- **Capability errors** — changed folder-pick, permission-denied, and OPFS
  browser capability failures to throw coded filesystem errors from the adapter,
  then translated them at the vault UI boundary before they reach notices or
  vault-picker error text.
- **Regression audit** — extended the i18n audit and adapter tests so raw
  English browser-capability errors cannot return from the filesystem adapter.

### Tests
- Extended `src/core/fs/handle-adapter.test.ts`,
  `src/core/i18n/index.test.ts`, and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted filesystem/i18n tests, full
  `bun run test`, `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Help shortcut-key i18n ratchet

- **Help shortcut column** — routed visible Help modal shortcut/action labels
  through locale keys alongside the already-localized descriptions.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if the English shortcut labels return in the Help modal data.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Bases default-name i18n ratchet

- **Default base names** — routed missing/default `.base` display names and
  scaffolded base-file names through locale keys instead of the schema default.
- **Schema cleanup** — made the core default base name empty data so UI layers
  supply the localized fallback at render/scaffold time.
- **Regression audit** — extended the Bases externalization audit to fail if
  the hard-coded English default or raw `config.name` rendering returns.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted Bases/i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — File-exists error i18n ratchet

- **Bases scaffold errors** — routed existing-file failures from `.base`
  scaffold creation through locale keys.
- **Inline title errors** — routed rename destination collisions through
  locale keys before surfacing them as notices.
- **Regression audit** — extended Bases and Inline Title externalization tests
  to fail if the hard-coded file-exists messages return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Bases column-label cleanup

- **Removed stale helper** — deleted the unused core Bases `columnLabel` helper
  that returned hard-coded English labels outside the UI i18n path.
- **Regression audit** — extended the Bases externalization audit to read the
  core schema and fail if the stale non-localized helper is reintroduced.

### Tests
- Updated `src/core/bases/schema.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted Bases/i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Tour note i18n ratchet

- **Generated tour note** — routed the built-in Tour plugin's generated note
  filename and Markdown body through locale keys.
- **Tour notice** — changed the creation notice to interpolate the localized
  tour filename instead of baking it into the message.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if the Tour plugin reintroduces the hard-coded English path/body.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Community registry error i18n ratchet

- **Registry errors** — routed community-plugin registry parse and HTTP fetch
  failures through locale keys because those messages surface in the Install
  Plugin modal.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if community-registry surfaced errors return as hard-coded English
  literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n/community-registry tests, full
  `bun run test`, `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Settings/install placeholder i18n ratchet

- **Settings placeholders** — routed attachments folder, excluded-file samples,
  daily-note date format, and template date/time format placeholders through
  locale keys.
- **Install Plugin placeholder** — routed the manual manifest URL example
  through i18n while preserving the URL sample as data.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if these Settings or Install Plugin placeholders return as hard-coded
  JSX literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Graph placeholder i18n ratchet

- **Graph placeholders** — routed graph filter and group-query placeholder
  examples through locale keys.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if those Graph View placeholder examples return as hard-coded English
  JSX literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Vault Context i18n ratchet

- **Vault lifecycle notices** — routed pop-out bootstrap failure, reopen-grant
  notice, reopen fallback, and plugin-loader binding failure copy through
  locale keys.
- **Surfaced reopen errors** — routed missing registry entry, lost folder
  handle, and read/write permission denial errors through i18n because they can
  surface through the reopen notice flow.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if Vault Context lifecycle notices or surfaced errors return as
  hard-coded English literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Plugin Loader i18n ratchet

- **Loader failure notices** — routed plugin main-file read failures and
  plugin load failures through locale keys while preserving plugin names,
  filenames, and thrown messages as data.
- **Loader cleanup** — replaced the touched loader's `delete entry.cleanup`
  with an explicit undefined assignment to satisfy the repo lint gate.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if plugin loader failure notices return as hard-coded English literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — File Recovery plugin i18n ratchet

- **File Recovery labels** — routed command names/categories for viewing
  recovery snapshots and taking an immediate snapshot through locale keys.
- **Fallback flow copy** — routed no-active-note and no-snapshot notices,
  restore picker prompt, overwrite confirmation, restore success notice, and
  fallback restore error through i18n.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if File Recovery plugin command text returns as hard-coded English
  literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, targeted File Recovery snapshot
  behavior tests, full `bun run test`, `bun run build`, and `git diff --check`
  pass.

---

## 2026-05-13 — Templates/workspaces i18n ratchet

- **Templates labels** — routed template insertion, current-date, and
  current-time command names/categories through locale keys.
- **Workspaces prompts** — routed save/load/delete workspace command
  names/categories, empty-state notices, prompts, success summaries, and load
  errors through i18n.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if Templates or Workspaces plugin strings return as hard-coded English
  literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Vault editing plugin i18n ratchet

- **Vault editing labels** — routed Vault Find/Replace and Tag Rename command
  names/categories through locale keys.
- **Prompts and summaries** — routed find/replace prompts, confirmation text,
  no-match notices, write summaries, tag-rename prompts, validation errors,
  no-occurrence notices, success summaries, and fallback errors through i18n.
- **Parser cleanup** — removed non-null assertions from the touched Tag Rename
  parsing helpers while preserving the existing rewrite/count behavior.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if these vault editing plugin prompts or notices return as hard-coded
  English literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, targeted Vault Find/Replace +
  Tag Rename behavior tests, full `bun run test`, `bun run build`, and
  `git diff --check` pass.

---

## 2026-05-13 — Utility core plugin i18n ratchet

- **Utility plugin labels** — routed Unique Note, Daily Notes, Vault Stats, and
  Audio Recorder command names/categories through locale keys.
- **Notices and stats copy** — routed unique-note fallback errors, Vault Stats
  summary labels, Audio Recorder recording lifecycle notices, save notices, and
  fallback errors through i18n.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if these utility plugin labels or notices return as hard-coded English
  literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Note Composer i18n ratchet

- **Note Composer labels** — routed extract-selection and merge-into command
  names/categories through locale keys.
- **Prompts and notices** — routed new-note and merge prompts, selection and
  active-note warnings, duplicate/missing-target errors, extract/merge success
  notices, and fallback errors through i18n.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if Note Composer's command labels, prompts, notices, or surfaced errors
  return as hard-coded English literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Format Converter i18n ratchet

- **Format Converter labels** — routed wikilink conversion, legacy-property
  migration, and copy-as-HTML command names/categories through locale keys.
- **Conversion notices** — routed no-op, success, and fallback error notices for
  wikilink conversion, property migration, and HTML copy through i18n.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if Format Converter's command labels or notices return as hard-coded
  English literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n/Format Converter tests, full
  `bun run test`, `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Link/reload/tour/update plugin i18n ratchet

- **Plugin labels and notices** — routed Copy Link, Plugin Reload, Tour, and
  plugin update-check command labels, notices, and fallback errors through
  locale keys.
- **Update summaries** — localized plugin-update compatibility, all-clear,
  missing-remote, single-update, and multi-update notice scaffolding while
  preserving plugin ids and versions as data.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if these plugin labels or notices return as hard-coded English literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n/update-check tests, full
  `bun run test`, `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Small core plugin i18n ratchet

- **Core plugin labels** — routed Bases scaffold, Web Viewer, Random Note, and
  Random Walk command names/categories through locale keys.
- **Prompts and notices** — routed their prompts, empty-state notices, success
  messages, and fallback errors through i18n while leaving filenames and URLs as
  user data.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if these small core plugin labels return as hard-coded English literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Built-in command i18n ratchet

- **Command registrations** — routed built-in command palette names and
  categories from `CommandsBootstrap` through locale keys, including tab focus
  labels.
- **Locale switching** — command registrations now refresh when the active UI
  locale changes so Command Palette and Hotkeys labels can update without a
  reload.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if these built-in command labels return as hard-coded English literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Inline and overlay i18n ratchet

- **Inline title** — routed rename validation, rename/rewrite notices, fallback
  rename error, plural labels, and rename tooltip through locale keys.
- **Overlay chrome** — routed error-boundary fallback title/actions/safety copy,
  hover preview loading/missing states, and notice dismiss aria label through
  i18n.
- **Accessibility cleanup** — converted the hover preview opener to a semantic
  button and documented the sanitized Markdown preview injection.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if these formerly hard-coded inline/overlay labels return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n/overlay tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Bases view i18n ratchet

- **Bases view chrome** — routed no-path/loading states, filter summary,
  match count, grouping summary, and base title through locale keys.
- **Bases renderers** — routed table/list/cards empty states and built-in
  column labels through `t()` while preserving user-defined formula and summary
  labels as vault content.
- **Bases map and embeds** — routed map aria labels, coordinate helper, empty
  state, embedded base loading text, embedded empty state, and embedded column
  labels through shared localized labels.
- **Accessibility cleanup** — converted list/card row activators and sortable
  headers to semantic buttons, and added keyboard activation for table rows.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if Bases view's formerly hard-coded labels return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n/Bases tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-12 — Canvas view i18n ratchet

- **Canvas toolbar** — routed add-text, snap-to-grid, zoom, fit, color, delete,
  and stats labels through `t()`.
- **Canvas nodes** — routed save fallback error, new-text prompt, no-path/loading
  states, anchor/resize tooltips, file-node fallback/open hint, and link-node
  label through locale keys.
- **Accessibility cleanup** — documented the existing Canvas Markdown render
  safety at the local `dangerouslySetInnerHTML` callsite.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if Canvas view's formerly hard-coded labels return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n/canvas tests, full `bun run test`,
  and `bun run build` pass.

---

## 2026-05-12 — Reading view i18n ratchet

- **Reading view embeds** — routed canvas/base embed summaries, open labels,
  circular/file-missing markdown embed messages, embedded base loading state,
  query block labels/status/errors, and backlinks block labels/counts through
  `t()`.
- **Reading view chrome** — routed loading state and frontmatter properties
  strip count through locale keys.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if Reading view's formerly hard-coded imperative-rendered labels return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n/ReadingView tests, full
  `bun run test`, and `bun run build` pass.

---

## 2026-05-12 — Markdown and Web Viewer i18n ratchet

- **Markdown source view** — routed read-failure copy, attachment-save fallback
  errors, dropped-file path warnings, and save-status text through `t()`.
- **Web Viewer** — routed back/forward/reload labels and URL placeholder through
  `t()`.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if these Markdown source or Web Viewer strings return as hard-coded
  English UI literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n/ReadingView tests, full
  `bun run test`, and `bun run build` pass.

---

## 2026-05-12 — Workspace chrome i18n ratchet

- **Titlebar and tab strip** — routed back/forward navigation labels, new-tab,
  stack/unstack, close-tab, and close-group labels through `t()`.
- **Workspace tabs and leaf headers** — routed tab context-menu actions,
  pinned-tab controls, markdown read/edit and split actions, fallback leaf
  titles, and active-tab live-region announcements through locale keys.
- **Empty workspace states** — reused the existing welcome/vault-picker strings
  and added i18n keys for the active-vault no-file hint and in-browser-vault
  title.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if workspace chrome, tab actions, leaf titles, or empty-state copy return
  as hard-coded English UI literals.

### Tests
- Extended `src/core/i18n/index.test.ts`,
  `src/core/i18n/externalization.test.ts`, and covered the localized
  announcement path through `src/ui/A11yAnnouncer.test.tsx`.
- Validation: Biome check, targeted i18n/a11y tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Settings modal i18n ratchet

- **Settings modal** — routed modal chrome, search placeholder, sidebar group
  labels, empty search state, Appearance, Editor, Files, Hotkeys, Plugins, Daily
  Notes, Templates, and plugin-tab render fallback text through `t()`.
- **Settings section filter** — built-in section navigation now carries locale
  keys for rendered titles while preserving English search terms for matching.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if SettingsModal or built-in settings-filter English titles return as
  rendered literals.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Install Plugin i18n ratchet

- **Install Plugin modal** — routed manifest validation errors, fetch errors,
  registry mismatch errors, success notice, modal title/description, registry
  search/loading labels, manual manifest label, fetch/install/cancel actions,
  author label, and plugin-code size summary through `t()`.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if Install Plugin's formerly hard-coded English labels or surfaced
  errors return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — File Recovery i18n ratchet

- **File Recovery modal** — routed load fallback error, copy/restore/clear
  notices, clear confirmation, modal title, snapshot list label, filename/filter
  labels, loading/empty states, byte count, show-changes toggle, and copy/restore
  actions through `t()`.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if File Recovery's formerly hard-coded English labels return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Graph view i18n ratchet

- **Graph canvas chrome** — routed empty states, SVG accessible label/title,
  graph stats text, and controls-toggle labels through `t()`.
- **Graph controls panel** — routed panel title/close label, section headers,
  local-graph toggle text, color-mode labels, group empty/add/remove/default
  names, display slider labels, force slider labels, and reset action through
  `t()`.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if Graph View's formerly hard-coded English labels return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Utility modal and bookmarks i18n ratchet

- **Modal overlay** — routed the close button label, fallback dialog label, and
  modal-open live announcement through `t()`.
- **Vault Picker** — routed modal title/body, OPFS prompts/defaults, recent-vault
  labels, active/open/remove actions, and new-vault buttons/tooltips through
  `t()`.
- **Help modal** — converted section titles, shortcut descriptions, modal title,
  and footer copy to i18n keys while keeping shortcut chords as literal input
  hints.
- **Bookmarks view** — routed bookmark notices, prompts, menu labels, default
  group display, empty state, group selector tooltip, and remove action through
  `t()` while preserving persisted group values.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if the old modal, vault picker, help, or bookmarks literals return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Prompt surfaces i18n ratchet

- **Shared prompt overlay** — routed the no-match state through `t()` so every
  command-style picker inherits the locale-reactive empty state.
- **Quick Switcher** — routed loading/placeholder text, create-note synthetic
  row labels, alias/recent/new flairs, fallback open error, and keyboard
  instructions through `t()`.
- **Command Palette and Template Picker** — routed placeholders, pin/unpin
  labels, and prompt instruction text through `t()`.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if the old prompt, switcher, command palette, or template picker
  literals return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — File Explorer i18n ratchet

- **File Explorer actions** — routed new-note/new-folder prompts, invalid-name
  and duplicate-name fallback errors, delete confirmations, delete/import/move
  notices, context-menu labels, sort-menu labels, toolbar labels, and empty
  states through `t()`.
- **Trash/delete labels** — replaced UI usage of core English trash labels with
  File Explorer i18n keys for system trash, vault trash, and permanent
  deletion.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if File Explorer's formerly hard-coded English prompts, menus, notices,
  toolbar labels, or empty states return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n and file-explorer sort tests, full
  `bun run test`, and `bun run build` pass.

---

## 2026-05-12 — Shell ribbon and status i18n ratchet

- **Ribbon actions** — routed quick switcher, command palette, graph, canvas,
  base, daily note, workspace, template, unique note, random note, recorder,
  vaults, help, and settings action labels through `t()`.
- **Status bar** — routed local-only, word-count labels, edit/read mode chip,
  and toggle tooltip/aria labels through `t()`; removed misleading button
  semantics from the non-clickable local-only status item.
- **Vault profile** — routed switch-vault, no-vault fallback, and settings
  action labels through `t()`.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if the old shell literals return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Property sidebar i18n ratchet

- **File properties pane** — routed property add/remove prompts, empty states,
  list placeholders, fallback error text, and remove action labels through
  `t()`.
- **All properties pane** — routed the vault-wide empty state, inferred/override
  titles, inferred option label, usage tooltip, note-count labels, and property
  type labels through `t()`.
- **Keyboard semantics cleanup** — replaced the clickable property-name `div`
  with a semantic button and removed a stale select click handler while touching
  the pane.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  fail if the old Properties or All Properties hard-coded English literals
  return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Sidebar chrome and local graph i18n ratchet

- **Sidebar tab chrome** — replaced hard-coded sidebar tab labels with
  `labelKey` entries and resolved them through `useI18n()` in both sidebars.
- **Sidebar actions** — routed open-in-center, split group, close group, and
  unavailable-sidebar fallback labels through `t()`.
- **Local graph** — externalized the no-active-note state, empty state, neighbor
  count, and node-open accessible labels; added an SVG title and keyboardable
  node links while touching the graph.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` to
  guard sidebar registry labels, sidebar shell actions, Local Graph labels, and
  unavailable sidebar fallback text.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Recents, footnotes, and outline i18n ratchet

- **Sidebar utility panes** — routed Recents, Footnotes, and Outline empty
  states, labels, placeholders, footnote tooltip text, and remove action labels
  through `t()`.
- **Keyboard semantics** — replaced clickable `div` rows in Footnotes and
  Outline with semantic buttons; split Recents into a file-open button plus a
  separate remove button to avoid nested interactive controls.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` so
  the old hard-coded Recents, Footnotes, and Outline strings fail if they
  return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Backlinks and outgoing links i18n ratchet

- **Sidebar link panes** — routed Backlinks and Outgoing Links empty states,
  line labels, unlinked-mention labels, and match tooltips through `t()`.
- **Hebrew coverage** — added Hebrew translations for the new Backlinks and
  Outgoing Links keys.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` so
  the old hard-coded Backlinks and Outgoing Links strings fail if they return.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: Biome check, targeted i18n tests, full `bun run test`, and
  `bun run build` pass.

---

## 2026-05-12 — Shared error reporting channel

- **Sentry-style reporter** — added a small app error reporter that normalizes
  unknown thrown values, stores the latest report, and publishes captured
  errors by source (`react`, `window`, `promise`, `effect`, `manual`).
- **Boundary integration** — `ErrorBoundary` now subscribes to the reporter,
  handles global `error` / `unhandledrejection` events, and renders async
  reports with their source instead of only catching React render failures.
- **Effect fire-and-forget coverage** — `runFork()` now taps Effect causes and
  reports failures through the shared channel before the fiber failure
  continues.

### Tests
- Added `src/core/errors/reporter.test.ts`, `src/core/effect/runtime.test.ts`,
  and `src/ui/overlay/ErrorBoundary.test.tsx`.
- Validation: scoped `bunx biome check --write`, targeted reporter/runtime/
  boundary tests, and `bun run typecheck` pass.

---

## 2026-05-12 — Icon-button accessibility audit

- **Static a11y gate** — added `bun run audit:a11y`, including a source-level
  audit that fails when a `.clickable-icon` button or `ClickableIcon` callsite
  lacks an accessible label.
- **Tooltip-label parity** — the audit checks literal tooltip text against
  literal `aria-label` text for icon-only controls, preventing visual tooltip
  text from drifting away from assistive-technology text.
- **Canvas cleanup** — aligned canvas toolbar tooltip text with its accessible
  labels for snap and delete controls.

### Tests
- Added `src/core/a11y/icon-buttons.test.ts`.
- Validation: `bun run audit:a11y` passes.

---

## 2026-05-12 — Obsidian compatibility core fixture

- **Fixture vault** — added an Obsidian-style vault fixture in
  `src/core/compat/obsidian-roundtrip.test.ts` with `.obsidian/` config,
  Markdown aliases/tags/callouts/math/embeds/block IDs/footnotes, a JSON Canvas
  board, and a `.base` file.
- **No-mutation read path** — the test indexes the fixture through the real
  metadata cache and asserts no filesystem writes occur, including no writes to
  `.obsidian/` config.
- **Semantic round-trips** — the fixture canvas and base file parse and
  serialize back to semantically equivalent Granite structures.

### Tests
- Added `src/core/compat/obsidian-roundtrip.test.ts`.
- Validation: targeted compatibility test passes.

---

## 2026-05-12 — Public docs site

- **Static docs entrypoint** — added `docs/index.html` and `docs/styles.css`
  as a dependency-free public documentation site.
- **Vault format docs** — added `docs/vault-format.md` covering `.granite/`,
  Obsidian compatibility, accepted file formats, Markdown, JSON Canvas, Bases,
  plugin data, atomic writes, and trash behavior.
- **Plugin API docs** — added `docs/plugin-api.md` for the current `PluginApi`
  surface, plus `docs/contributor-guide.md` and a README link.
- **Docs drift check** — added `bun run docs:check`, which verifies the static
  docs entrypoint, vault-format coverage terms, and every top-level `PluginApi`
  member from `src/core/plugins/types.ts`.

### Tests
- Added `src/core/docs/public-docs.test.ts`.
- Validation: `bun run docs:check` passes.

---

## 2026-05-12 — Community theme compatibility fixture

- **Obsidian theme layout support** — the theme loader now discovers
  `.obsidian/themes/<theme-name>/theme.css` alongside Granite's
  `.granite/themes/*.css` layout.
- **No-rewrite application path** — applying an Obsidian-layout theme injects
  the source CSS into the document while only persisting the active-theme choice
  under `.granite/active-theme.json`.
- **Theme list hygiene** — snippet CSS and unrelated CSS files are ignored by
  the theme list.

### Tests
- Added `src/core/themes/loader.test.ts`.
- Validation: targeted theme loader test passes.

---

## 2026-05-12 — Search view i18n ratchet

- **React i18n hook** — added `useI18n()` so UI components can subscribe to
  locale changes and re-render translated labels.
- **Search view externalization** — routed the Search pane placeholder, match
  case label, sort label/options, empty states, and result status text through
  `t()`.
- **Regression audit** — added `src/core/i18n/externalization.test.ts` to fail
  if Search view's formerly hard-coded English strings return as visible UI
  literals.

### Tests
- Extended `src/core/i18n/index.test.ts`.
- Added `src/core/i18n/externalization.test.ts`.
- Validation: targeted i18n tests pass.

---

## 2026-05-12 — Tags view i18n ratchet

- **Tags pane externalization** — routed the empty state, nested-tags toggle,
  expand/collapse labels, and context-menu labels through `t()`.
- **Hebrew coverage** — added Hebrew translations for the Tags pane strings.
- **Regression audit** — extended `src/core/i18n/externalization.test.ts` so
  Search and Tags view literals are both guarded against English-string
  regressions.

### Tests
- Extended `src/core/i18n/index.test.ts` and
  `src/core/i18n/externalization.test.ts`.
- Validation: targeted i18n and tags-model tests pass.

---

## 2026-05-12 — Performance budget first pass

- **Quick Switcher keystroke path** — extracted reusable fuzzy indexes and
  changed the prompt to reuse the index across query changes. Quick Switcher no
  longer rebuilds its item list just to append the "create note" row.
- **Search scan throughput** — global search now scans 128-file chunks instead
  of 16-file chunks, reducing async and render churn for large vault regex
  searches while preserving progressive result updates.
- **Graph pan path** — graph drag now updates the SVG viewport transform
  imperatively during mousemove and commits React state once at drag end, so
  panning does not rerender every node and edge per pointer event.
- **Atomic save budget coverage** — added a deterministic File System Access
  handle mock that exercises `handleAdapter.writeText()` and `readText()` around
  the real atomic temp-file copy path, asserting the content round-trips under
  the 50 ms budget in the adapter layer.

### Tests
- Extended `src/core/search/fuzzy.test.ts` with a 10k-item reusable-index
  keystroke budget assertion under 16 ms.
- Extended `src/core/search/query.test.ts` with a 10k-note regex scan budget
  assertion under 500 ms.
- Extended `src/core/fs/handle-adapter.test.ts` with an atomic text save
  round-trip budget assertion under 50 ms.
- Validation: scoped `bunx biome check --write`, targeted search performance
  and filesystem adapter tests, and `bun run typecheck` pass. Browser FPS and
  host-disk save validation remain open for their product-budget items.

---

## 2026-05-12 — Community plugin registry browser

- **Official registry browse** — the install modal now loads the Obsidian
  `community-plugins.json` registry, searches by name, id, author,
  description, and repo, and lets users select a community plugin before the
  existing preview/install confirmation.
- **Obsidian release install path** — registry installs resolve the repo
  manifest for the latest version, fetch the matching GitHub release assets
  (`manifest.json`, `main.js`, optional `styles.css`), and persist a remote
  `manifestUrl` so update checks have a configured source.
- **Manual URL path preserved** — pasted `manifest.json` installs still use the
  existing sibling-asset behavior for development or out-of-registry plugins.

### Tests
- Added `src/core/plugins/community-registry.test.ts` covering official
  registry parsing, unsafe entry rejection, search, URL derivation, and
  credential-free fetch behavior.
- Validation: scoped `bunx biome check --write`, targeted plugin registry and
  update-check tests, `bun run typecheck`, and direct network checks for
  Advanced Tables, Git, and Calendar registry manifests plus release assets
  pass.

---

## 2026-05-12 — Vertical sidebar tab groups

- **Sidebar group stack** — left and right sidebars now render one or more
  vertical groups, each with its own active tab and content pane.
- **Split/close controls** — each sidebar group can be split below the current
  group, copying its active tab, and non-final groups can be closed.
- **Shared group model** — extracted pure sidebar group state helpers so split,
  activate, and close behavior is covered outside React rendering.

### Tests
- Added `src/ui/shell/sidebar-groups.test.ts`.
- Validation: scoped `bunx biome check --write`, targeted sidebar group tests,
  `bun run typecheck`, full `bun run test`, `bun run build`, and
  `git diff --check` pass.

---

## 2026-05-12 — Sidebar tabs as central workspace leaves

- **Sidebar leaf state** — workspace leaves now support a `sidebar` state with
  side and tab id, so sidebar views can be opened, focused, persisted, and
  restored in the central workspace like other tabs.
- **Shared sidebar registry** — left/right sidebar definitions now share one
  registry with the central leaf renderer, avoiding duplicated view routing.
- **Pop into center** — both sidebars expose an icon-only action to open the
  active sidebar tab in the central area.

### Tests
- Added `src/core/workspace/sidebar-view.test.ts` covering central sidebar
  leaves and duplicate-focus behavior.
- Validation: scoped `bunx biome check --write`, targeted sidebar workspace
  and persistence tests, `bun run typecheck`, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-12 — Live Preview block and table marker coverage

- **Block markers** — inactive Live Preview lines now hide heading hashes and
  task checkbox source markers while preserving the visible heading/task text.
- **Table markers** — valid GFM table rows hide unescaped cell pipes, and
  separator rows are replaced as table structure instead of raw Markdown.
- **Block comment edges** — multiline Obsidian comments that start or end on a
  content-bearing line now hide delimiters and avoid decorating comment body
  text.

### Tests
- Extended `src/core/markdown/cm-livepreview-decorations.test.ts` with heading,
  task, GFM table, cursor-line table, and multiline comment edge cases.
- Validation: scoped `bunx biome check --write`, targeted Live Preview
  decoration tests, full `bun run test`, `bun run build`, and
  `git diff --check` pass.

---

## 2026-05-12 — Multi-window vault bootstrap

- **Vault window URLs** — added a dedicated `?vaultWindow=1&vaultId=...`
  launch path that opens a registered vault in a separate browser window
  without replacing the current window's active vault.
- **Vault picker action** — recent vault rows now include an icon-only
  "Open in new window" action alongside the existing same-window Open action.
- **Pop-out compatibility** — tab pop-outs still use `?popout=1` and serialized
  leaf state, while standalone vault windows intentionally strip inherited
  pop-out leaf parameters.

### Tests
- Added `src/core/vault/window-url.test.ts` for vault-window URL construction
  and request parsing.
- Validation: scoped `bunx biome check --write`, targeted vault-window tests,
  `bun run typecheck`, full `bun run test`, `bun run build`, and
  `git diff --check` pass. Browser automation was unavailable in this tool
  context; Vite was started on `http://localhost:8081/` for local smoke
  availability.

---

## 2026-05-12 — Native host system-trash bridge

- **Native trash bridge** — `handleAdapter()` now wires System trash mode to a
  trusted host capability at `window.graniteHost.fs.moveToSystemTrash()` when
  one is present.
- **Vault-scoped request** — native trash requests pass the vault root display
  name and vault-relative path to the host, keeping browser code out of
  absolute-path guessing.
- **Browser safety retained** — regular browser FSA/OPFS adapters still omit
  `moveToSystemTrash()`, so unsupported System trash mode fails loudly instead
  of falling back to permanent deletion.

### Tests
- Added `src/core/fs/native-trash.test.ts` and
  `src/core/fs/handle-adapter.test.ts`.
- Validation: scoped `bunx biome check --write`, targeted filesystem trash
  tests, full `bun run test`, `bun run build`, and `git diff --check` pass.

---

## 2026-05-12 — Workspace crash-restart persistence

- **Fast-close flush** — workspace persistence now flushes any pending
  debounced snapshot when persistence is unbound, so a quick close cannot drop
  the latest layout.
- **Before-unload flush** — bound persistence installs a `beforeunload` handler
  that writes the current workspace snapshot before the window exits.
- **Empty-state guard retained** — transient single-empty-leaf states still do
  not clear the disk snapshot, preserving the prior recovery behavior.

### Tests
- Extended `src/core/workspace/persist.test.ts` with fast-close,
  before-unload, and 100-cycle kill-and-restart workspace restoration coverage.
- Validation: scoped `bunx biome check --write`, targeted workspace
  persistence tests, full `bun run test`, `bun run build`, and
  `git diff --check` pass.

---

## 2026-05-12 — External edit sync budget

- **Open-editor refresh** — Markdown editors now subscribe to vault file
  watcher events and refresh the open document when its backing file changes.
- **No-clobber guard** — external content is applied only while the editor
  document still matches the last saved content, so unsaved local edits are not
  overwritten by a watcher event.
- **500 ms gate** — the watcher debounce is centralized at 200 ms and tested
  against the 500 ms acceptance budget.

### Tests
- Added `src/core/markdown/external-edit.test.ts` for watcher path matching,
  no-clobber external edit decisions, and the sync budget assertion.
- Validation: scoped `bunx biome check --write`, targeted external-edit tests,
  and `bun run typecheck` pass.

---

## 2026-05-12 — External file drag-and-drop handling

- **Editor file-url modifier** — OS file drops in the editor now honor
  Ctrl on Windows/Linux and Option on macOS by inserting `file:///` Markdown
  links instead of importing when the desktop host exposes file paths.
- **Editor safety fallback** — modifier drops prevent browser navigation and
  warn when the host cannot provide external file paths.
- **File Explorer imports** — dropping OS files onto a folder or the empty
  File Explorer root copies them into that vault location, with sanitized names
  and collision suffixes.
- **Shared helpers** — external-path extraction, file URL encoding, platform
  modifier selection, filename sanitization, and unique import paths are covered
  by core unit tests.

### Tests
- Added `src/core/dnd/external-files.test.ts`.
- Validation: scoped `bunx biome check --write`, targeted D&D helper tests,
  and `bun run typecheck` pass.

---

## 2026-05-12 — CommonMark conformance harness

- **Official fixture** — added the CommonMark 0.31.2 JSON examples from
  `https://spec.commonmark.org/0.31.2/spec.json` as a checked-in regression
  fixture.
- **Base CommonMark renderer** — added `renderCommonMark()` using the
  `markdown-it` CommonMark preset with raw HTML enabled and extension linkify
  disabled.
- **99% gate** — the conformance test asserts the official suite stays at or
  above the acceptance threshold while keeping Granite's GFM/Obsidian
  extension renderer separate.

### Tests
- Added `src/core/markdown/commonmark-conformance.test.ts`.
- Validation: scoped `bunx biome check --write`, targeted CommonMark and
  renderer tests, and `bun run typecheck` pass.

---

## 2026-05-12 — Theme body-text contrast assertion

- **Contrast gate** — added a token-level WCAG AA assertion for
  `--text-normal` against `--background-primary` in light, dark, and
  high-contrast theme variants.
- **Real CSS coverage** — the test reads `tokens.css` and
  `high-contrast.css` directly, resolves CSS variable chains, and computes
  relative luminance rather than relying on duplicated fixture values.

### Tests
- Added `src/styles/contrast.test.ts` for body text contrast.
- Added minimal test-runtime typings for `node:fs` so CSS source files can be
  read without widening the app's TypeScript environment.
- Validation: scoped `bunx biome check --write`, targeted contrast test, and
  `bun run typecheck` pass.

---

## 2026-05-12 — Accessibility live announcements

- **Shared live region** — added a central polite/atomic screen-reader
  announcer mounted at the app root.
- **Tab change announcements** — workspace active-tab changes now announce the
  focused tab title after the initial render.
- **Dialog announcements** — modal opens announce their title/label, title-less
  dialogs get an accessible `ariaLabel`, and the modal shell uses native
  `<dialog open>` semantics while preserving the existing focus trap.
- **Notice announcements** — notices announce their content when shown, and the
  notice store now returns immutable snapshots so `useSyncExternalStore`
  subscribers re-render reliably.

### Tests
- Added `core/a11y/announcer.test.ts`, `ui/A11yAnnouncer.test.tsx`,
  `ui/overlay/Modal.test.tsx`, and `ui/overlay/NoticeContainer.test.tsx`.
- Extended `core/notices/notice.test.ts` for immutable snapshots and spoken
  notice content.
- Validation: scoped `bunx biome check --write`, targeted a11y/notice/modal
  tests, and `bun run typecheck` pass.

---

## 2026-05-12 — Bases Map view

- **Map layout** — `.base` files can now use `view: map`, rendering rows with
  valid latitude/longitude properties as pins on a deterministic coordinate
  plane.
- **Coordinate configuration** — Base configs now persist `mapLatitude` and
  `mapLongitude` column names, defaulting to `lat` / `lng`.
- **Row materialization** — map coordinate columns are included when rows are
  computed, even if they are not visible table/card columns.
- **Empty state** — Map view reports when no rows have valid coordinates
  instead of silently rendering an empty surface.

### Tests
- Extended `core/bases/schema.test.ts` for map config parsing and round-trip.
- Added `ui/views/bases/BasesMapView.test.ts` for coordinate projection and
  invalid-coordinate filtering.
- Validation: scoped `bunx biome check --write`, targeted Bases tests, and
  `bun run typecheck`, `bun run test` (445 tests / 47 files), and
  `bun run build` pass.

---

## 2026-05-12 — RTL locale and per-note direction

- **Hebrew demo locale** — added a built-in `he` locale for the currently
  externalized app/settings/search strings.
- **Locale direction binding** — locale changes now update
  `document.documentElement.dir` and body RTL classes so chrome can flip from
  the active UI locale.
- **Per-note direction** — `dir: rtl` / `dir: ltr` frontmatter is read from
  note metadata and applied to Reading mode `.markdown-rendered` and Source
  mode CodeMirror hosts.
- **RTL CSS hooks** — markdown surfaces now set explicit direction classes and
  preserve `unicode-bidi: plaintext` for mixed-direction note content.

### Tests
- Added `core/i18n/direction.test.ts` for locale and note direction helpers.
- Extended `core/i18n/index.test.ts` for the Hebrew built-in locale.
- Added `ui/LocaleDirectionBinder.test.tsx` for document/body direction state.
- Extended `ui/views/ReadingView.test.tsx` for `dir: rtl` frontmatter.
- Validation: scoped `bunx biome check --write`, focused i18n/ReadingView
  tests, `bun run typecheck`, `bun run test` (443 tests / 46 files), and
  `bun run build` pass.

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
