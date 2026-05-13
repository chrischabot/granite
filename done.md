# DONE

> Log of completed work. Items move here from `todo.md` when they ship. Newest entries on top.

---

## 2026-05-13 — A11y announcements browser verifier

- **Root cause** — screen-reader announcements had unit and integration
  coverage, but the severe-test list still relied on manual browser checks for
  runtime tab-change, modal-open, and notice announcement behavior.
- **Browser path** — added `verify:a11y-announcements-browser`, which renders
  the real live region, workspace announcement bridge, modal, and notice
  container in Chromium, then verifies active-tab changes announce exactly once,
  modal openings announce a meaningful label, and success/info/warning/error
  notices announce their kind and message.
- **Focus guarantee** — the verifier also proves notices render in `role=alert`
  surfaces without stealing focus from the previously focused control.

### Tests
- `bun run verify:a11y-announcements-browser`
- `node --check scripts/verify-a11y-announcements-browser.mjs`
- `bun run audit:a11y`
- `bun run build`

---

## 2026-05-13 — Bases map browser verifier

- **Root cause** — Bases map behavior had schema and projection unit coverage,
  but the severe-test list still relied on manual browser checks for rendered
  pins, empty-coordinate messaging, grouped map planes, and pin open behavior.
- **Browser path** — added `verify:bases-map-browser`, which renders real
  `.base` files through `BasesView` in an OPFS vault, verifies valid numeric
  and numeric-string coordinates produce pins, rejects out-of-range rows,
  checks grouped pin counts, and verifies an empty map explains missing
  latitude/longitude coordinates.
- **Open behavior** — the verifier dispatches exact pin clicks and proves a
  normal pin click opens the note in the current workspace tab while Ctrl-click
  opens the note in a new tab.

### Tests
- `bun run verify:bases-map-browser`
- `node --check scripts/verify-bases-map-browser.mjs`
- `bun run test -- src/core/bases/schema.test.ts src/ui/views/bases/BasesMapView.test.ts`
- `bunx biome check src/ui/views/bases/BasesMapView.tsx src/ui/views/bases/BasesMapView.test.ts`
- `bun run build`

---

## 2026-05-13 — RTL browser verifier

- **Root cause** — RTL behavior had unit coverage for locale direction and
  per-note frontmatter, but the severe-test list still relied on manual browser
  checks for chrome direction, canvas direction, localized date controls, and
  Reading/Source note isolation.
- **Browser path** — added `verify:rtl-browser`, which switches a real fixture
  to Hebrew, verifies modal/menu/status/tab chrome is RTL, verifies canvas stays
  spatially LTR, checks Properties date and datetime inputs receive `lang="he"`,
  and proves only notes with `dir: rtl` flip in Reading and Source modes.
- **Product fixes** — kept `.canvas-view` LTR under RTL chrome, made
  Reading/Source user-content surfaces default to explicit LTR unless the note
  frontmatter opts into a direction, and taught Properties date controls to
  recognize YAML-parsed `Date` values instead of rendering them as JSON.

### Tests
- `bun run verify:rtl-browser`
- `node --check scripts/verify-rtl-browser.mjs`
- `bun run test -- src/core/i18n/direction.test.ts src/core/i18n/index.test.ts src/ui/LocaleDirectionBinder.test.tsx src/ui/views/ReadingView.test.tsx src/ui/views/sidebar/PropertiesView.test.tsx`
- `bun run build`

---

## 2026-05-13 — Markdown parser browser verifiers

- **Root cause** — GFM and CommonMark parser behavior had unit and fixture
  coverage, but the severe-test list still relied on manual Reading-mode
  browser checks for the rendered DOM path.
- **GFM browser path** — added `verify:gfm-browser`, which renders a real
  ReadingView note containing strikethrough, aligned pipe tables, bare URL and
  email autolinks, angle autolinks next to punctuation, and custom `[?]` / `[-]`
  task markers, then verifies the DOM matches the unit-test expectations.
- **CommonMark browser path** — added `verify:commonmark-browser`, which runs a
  representative set of official CommonMark 0.31.2 fixture examples through
  `renderCommonMark()` in Chromium and verifies Granite-specific extensions
  still render in Reading mode afterward.

### Tests
- `bun run verify:gfm-browser`
- `bun run verify:commonmark-browser`
- `node --check scripts/verify-gfm-browser.mjs`
- `node --check scripts/verify-commonmark-browser.mjs`
- `bun run test -- src/core/markdown/renderer.test.ts src/core/markdown/commonmark-conformance.test.ts`
- `bun run build`

---

## 2026-05-13 — Settings persistence browser verifier

- **Root cause** — settings persistence had unit coverage for `.granite`
  precedence and migration, but the severe-test list still relied on manual
  browser checks for fresh vault creation, Settings UI edits across reload, and
  per-vault hydration.
- **Browser path** — added `verify:settings-persistence-browser`, which opens a
  fresh OPFS vault through `VaultProvider`, verifies `.granite/settings.json`
  exists and includes every `DEFAULT_SETTINGS` key, changes Appearance font
  size through the Settings UI, reloads with conflicting legacy localStorage,
  and proves disk settings win.
- **Vault isolation guarantee** — the verifier opens a second OPFS vault, saves
  a different font size, then switches between the two vaults and verifies each
  active vault hydrates its own `.granite/settings.json`.

### Tests
- `bun run verify:settings-persistence-browser`
- `node --check scripts/verify-settings-persistence-browser.mjs`
- `bun run test -- src/core/settings/store.test.ts src/ui/prompts/settings-filter.test.ts src/ui/prompts/SettingsModal.test.tsx`
- `bun run build`

---

## 2026-05-13 — Hotkeys browser verifier

- **Root cause** — hotkey multi-binding and physical-key normalization had unit
  coverage, but the severe-test list still depended on manual Settings checks
  for visible effective bindings, add/remove/reset behavior, default override
  suppression, and non-US physical-key capture.
- **Browser path** — added `verify:hotkeys-browser`, which renders the real
  Settings Hotkeys table with a registered test command, adds two bindings
  through the UI, verifies the comma-separated display, triggers both custom
  bindings, removes the latest binding while keeping the older one active, and
  resets to restore the default binding.
- **Physical-key guarantee** — the same verifier captures `KeyQ`, Backquote,
  and ArrowDown through the Settings UI, proving US-layout physical labels are
  displayed for letter/punctuation slots while semantic keys remain semantic.

### Tests
- `bun run verify:hotkeys-browser`
- `node --check scripts/verify-hotkeys-browser.mjs`
- `bun run test -- src/core/commands/hotkeys.test.ts`
- `bun run build`

---

## 2026-05-13 — Canvas embed browser verifier

- **Root cause** — embedded canvases had an integration test for initial mount,
  but browser coverage was still manual, and the new verifier exposed that
  unrelated workspace updates could re-render `ReadingView` and wipe resolved
  canvas embeds before their Open button could be used.
- **Embed stability fix** — `ReadingView` now subscribes only to the active
  fragment string for its own path instead of the entire workspace state, so
  unrelated workspace changes no longer reset post-processed live embeds.
- **Browser path** — added `verify:canvas-embed-browser`, which renders a host
  note containing `![[board.canvas]]`, verifies the embedded node and canvas
  controls, pans/zooms/drags inside the embedded canvas, waits for saved JSON
  geometry, checks Open button current-tab and modified-click new-tab routing,
  and verifies removing the embed cleans up the canvas toolbar without page
  errors.

### Tests
- `bun run verify:canvas-embed-browser`
- `node --check scripts/verify-canvas-embed-browser.mjs`
- `bun run test -- src/ui/views/ReadingView.test.tsx src/core/canvas/interactions.test.ts`
- `bun run build`

---

## 2026-05-13 — Canvas marquee browser verifier

- **Root cause** — marquee, multi-select, axis-lock, and Alt/Option duplicate
  behavior had pure helper tests, but the severe-test list still relied on
  manual browser checks for the actual canvas pointer and keyboard flows.
- **Browser path** — added `verify:canvas-marquee-browser`, which renders a
  three-node canvas with an internal edge and drives real Shift-marquee,
  Cmd/Ctrl+Backspace delete, selected-node drag, Shift-axis drag, and
  Alt/Option-drag duplicate gestures in Chromium.
- **JSON guarantees** — the verifier proves marquee delete removes selected
  cards and their edge, selected drags move every selected card by the same
  delta while leaving unselected cards fixed, axis-lock zeroes the weaker axis,
  and duplicate creates fresh node ids plus a rewired internal edge while
  preserving originals.

### Tests
- `bun run verify:canvas-marquee-browser`
- `node --check scripts/verify-canvas-marquee-browser.mjs`
- `bun run test -- src/core/canvas/interactions.test.ts`
- `bun run build`

---

## 2026-05-13 — Canvas snap browser verifier

- **Root cause** — canvas snap behavior had focused interaction-unit coverage,
  but the severe-test list still depended on manual browser checks for real
  drag, resize, drop, keyboard movement, debounce save, and reload persistence.
- **Browser path** — added `verify:canvas-snap-browser`, which renders the real
  `CanvasView` against an OPFS vault, toggles snap off, drags and resizes a
  text node to sub-grid whole-pixel geometry, waits for the saved JSON, reloads,
  and verifies those exact non-10 px values persist.
- **Snap-on guarantee** — the same verifier toggles snap on, drops a vault file,
  drags, resizes, and keyboard-nudges a selected node, then proves all resulting
  coordinates and sizes land on the 10 px grid.

### Tests
- `bun run verify:canvas-snap-browser`
- `bun run test -- src/core/canvas/interactions.test.ts`
- `bun run build`

---

## 2026-05-13 — Format Converter command browser verifier

- **Root cause** — legacy-property migration had pure unit tests, but the
  severe-test list still lacked command-level evidence that the registered
  Format Converter command scans the vault correctly and reports real counts.
- **Browser path** — added `verify:format-converter-browser`, which registers
  the Format Converter plugin command against an in-memory vault, runs
  `format:migrate-legacy-properties`, and verifies the success notice reports
  4 migrated legacy properties in 2 notes.
- **Regression guarantee** — the verifier proves every Markdown file is read,
  only changed Markdown files are written, a clean Markdown file remains
  byte-identical, and a non-Markdown attachment is never read or written.

### Tests
- `bun run verify:format-converter-browser`
- `bun run test -- src/core/plugins-core/format-converter.test.ts`
- `bun run build`

---

## 2026-05-13 — Properties browser verifier

- **Root cause** — property formatting had unit coverage, but the severe-test
  list still relied on manual browser checks to prove Reading mode displays
  localized Date and Date & time properties while Source mode keeps canonical
  YAML.
- **Browser path** — added `verify:properties-browser`, which runs Chromium in
  `en-GB`, indexes a note with date, datetime, and wikilink frontmatter,
  renders `ReadingView`, and verifies the properties strip shows localized
  values instead of raw ISO datetime text.
- **Source guarantee** — the same fixture renders `MarkdownView` in Source mode
  and verifies `date: 2024-01-05`, `meeting: 2024-01-05T10:30:00Z`, and the
  quoted wikilink remain intact.

### Tests
- `bun run verify:properties-browser`
- `bun run test -- src/core/metadata/property-format.test.ts src/core/metadata/frontmatter.test.ts src/ui/views/ReadingView.test.tsx`
- `bun run build`

---

## 2026-05-13 — Tags browser verifier

- **Root cause** — nested tag behavior had model and metadata tests, but the
  severe-test list still relied on manual browser checks for the live Tags
  sidebar toggle, persisted nested/flat state, and tag-click search routing.
- **Search routing fix** — tag filtering now also dispatches the existing
  `granite:set-search-query` event, so `SearchView` receives tag queries even
  across browser module/rendering boundaries.
- **Browser path** — added `verify:tags-browser`, which indexes a real OPFS
  vault with `work/client`, `work/internal`, and `solo` tags, toggles Show
  nested tags off, verifies flat slash rows, reloads to prove persistence, then
  verifies flat and nested tag clicks both set `tag:work/client`.

### Tests
- `bun run verify:tags-browser`
- `bun run test -- src/ui/views/sidebar/tags-model.test.ts src/core/metadata/parser.test.ts src/core/metadata/cache.test.ts`
- `bun run build`

---

## 2026-05-13 — Sidebar group browser verifier

- **Root cause** — sidebar group splitting had model tests, but the severe-test
  list still relied on manual browser checks for the real left/right sidebar
  controls and icon-only accessible names.
- **Browser path** — added `verify:sidebar-groups-browser`, which splits the
  left sidebar twice, sets the three groups to Search, Bookmarks, and Tags,
  and verifies each group stays visible with its own active tab.
- **Right-sidebar close path** — the same verifier splits the right sidebar,
  changes the second group to Recent files, closes the original Outline group,
  and verifies the remaining group preserves Recent files.
- **Regression guarantee** — the verifier fails if split/close controls lose
  their accessible names or if changing one sidebar group mutates another.

### Tests
- `bun run verify:sidebar-groups-browser`
- `bun run test -- src/ui/shell/sidebar-groups.test.ts`
- `bun run build`

---

## 2026-05-13 — Sidebar central browser verifier and persistence fix

- **Root cause** — workspace persistence skipped any single-group snapshot whose
  first leaf was empty. Sidebar views opened in the central area with
  `newTab: true` keep the initial empty tab before the real sidebar tabs, so
  reload lost those central sidebar leaves.
- **Persistence fix** — tightened the empty-workspace skip so it only applies
  to a single group containing exactly one empty leaf.
- **Browser path** — added `verify:sidebar-central-browser`, a Chromium fixture
  that opens Search and Recent files from the left/right sidebars into the
  central workspace, proves the original sidebar remains independently usable,
  flushes workspace persistence, reloads, and verifies both central sidebar
  tabs restore.
- **Regression guarantee** — unit coverage now also proves real tabs persist
  even when the first tab is the initial empty leaf.

### Tests
- `bun run verify:sidebar-central-browser`
- `bun run test -- src/core/workspace/persist.test.ts src/core/workspace/sidebar-view.test.ts src/ui/shell/sidebar-groups.test.ts`
- `bun run build`

---

## 2026-05-13 — Trash settings browser verifier

- **Root cause** — trash behavior had strong `deleteVaultPath()` and adapter
  unit coverage, but the severe-test list still lacked browser proof that
  Settings changes feed File Explorer deletion confirmations and resulting
  notices.
- **Browser path** — added `verify:trash-settings-browser`, a Chromium fixture
  that opens a real OPFS vault, changes Deleted files through the Settings UI,
  and deletes files from File Explorer via keyboard.
- **Regression guarantee** — the verifier fails if Vault trash, Permanent
  deletion, or unsupported System trash show the wrong confirmation mode, skip
  the confirmation, or surface the wrong success/error notice.

### Tests
- `bun run verify:trash-settings-browser`
- `bun run test -- src/core/fs/trash.test.ts src/core/fs/native-trash.test.ts src/core/fs/handle-adapter.test.ts src/core/settings/store.test.ts`
- `bun run build`

---

## 2026-05-13 — Native formats browser verifier

- **Root cause** — native file routing had unit coverage, but the severe-test
  list still relied on manual browser checks to prove that each accepted file
  category opens into the correct rendered view.
- **Browser path** — added `verify:native-formats-browser`, a Vite-served
  Chromium fixture that opens Markdown, Canvas, Bases, image, audio, video, and
  PDF files through `workspaceStore.openPath()` using an in-memory vault.
- **Regression guarantee** — the verifier fails if any extension routes to the
  wrong leaf type or asset kind, if the active leaf is not the one just opened,
  or if the expected rendered view selector never appears.

### Tests
- `bun run verify:native-formats-browser`
- `bun run test -- src/core/fs/file-formats.test.ts src/core/workspace/store.test.ts src/ui/views/ReadingView.test.tsx`
- `bun run build`

---

## 2026-05-13 — Broader keyboard browser audit

- **Root cause** — the initial keyboard browser verifier covered shell tab
  order plus Settings and Command Palette, but the severe-test list still had a
  broader keyboard-only gap for additional no-vault shell dialogs.
- **Browser path** — expanded `verify:keyboard-browser` to require titlebar and
  ribbon controls by accessible name, then open Vault Picker, Help, Settings,
  and Command Palette using keyboard focus and Enter only.
- **Dialog-name fix in the verifier** — switched the browser assertion to
  Playwright's role/name lookup so dialogs named by `aria-labelledby`, such as
  Vault Picker, are validated through the accessibility tree instead of only
  checking `aria-label`.
- **Regression guarantee** — the verifier now fails if those dialogs do not
  open from keyboard focus, if focus escapes while tabbing inside them, if
  Command Palette ArrowDown does not move the active descendant, or if Escape
  does not close the surface.

### Tests
- `bun run verify:keyboard-browser`

---

## 2026-05-13 — Browser search performance verifier

- **Root cause** — the search and quick-switcher performance gates had unit
  coverage for query parsing and fuzzy ranking, but the §24.19 browser budget
  still relied on manual Performance-panel checks for quick-switcher keystrokes
  and 10k-note regex searches.
- **Browser path** — added a Vite-served Chromium fixture that builds 20,000
  quick-switcher candidates (10,000 files plus aliases), measures progressive
  fuzzy-query updates against the same shared fuzzy index used by `Prompt`, and
  fails any keystroke over 16 ms.
- **Search gate** — the same fixture builds 10,000 Markdown search contexts and
  runs a structured `/target-[0-9]+/ [status:active]` query through
  `parseQuery()` and `fileMatchesQuery()`, failing if the browser scan exceeds
  the 500 ms regex-search budget or returns the wrong match count.
- **Result** — Chromium measured all switcher query updates under 3 ms and the
  10k regex/property search at 3.20 ms.

### Tests
- `bun run verify:search-performance-browser`

---

## 2026-05-13 — Runtime i18n browser verifier and RTL status-bar fix

- **Root cause** — source-level i18n audits proved broad string routing, but
  they did not prove that the live app rerenders when the locale changes or
  that RTL layout remains operable. The first browser pass exposed a real RTL
  layout bug: the status bar stayed physically pinned to the right while the
  ribbon moved to the right under `dir="rtl"`, causing the status bar to
  intercept the bottom ribbon settings button.
- **Layout fix** — changed the status bar to use logical inline-end
  positioning and padding so it stays at the visual trailing edge in LTR and
  moves away from the RTL ribbon.
- **Browser path** — added a Chromium verifier that opens the real app,
  switches the runtime locale to Hebrew through the real i18n module, waits for
  `document.dir="rtl"` and RTL body classes, then verifies localized visible
  and accessible labels across the welcome screen, ribbon, Settings modal, and
  Command Palette.
- **Regression guarantee** — the verifier fails if the locale does not persist,
  RTL classes are missing, the localized settings button cannot be clicked, or
  key shell/settings/prompt labels do not rerender to Hebrew.

### Tests
- `bun run verify:i18n-browser`

---

## 2026-05-13 — Community theme browser visual verifier

- **Root cause** — the theme loader tests proved discovery, injection,
  no-rewrite behavior, and CSSOM live reload, but the open compatibility item
  still lacked browser visual evidence that Obsidian-layout community themes
  reach representative Granite surfaces.
- **Browser path** — added a Vite-served Chromium fixture that discovers two
  `.obsidian/themes/<name>/theme.css` fixtures through the real theme loader,
  renders workspace chrome, Markdown, settings rows, graph SVG, canvas, and
  bases table surfaces, then switches each theme through light and dark mode.
- **Visual gate** — the verifier captures screenshots for all four
  theme/mode combinations, fails if theme variables do not resolve to visible
  text/background values, fails if screenshots are blank-sized, and fails if
  the four visual hashes are not distinct.
- **Tracker closure** — closed the §24.23 community theme visual cross-render
  item after Chromium produced four distinct screenshots with expected
  computed tokens for both themes in light and dark mode.

### Tests
- `bun run verify:community-theme-browser`

---

## 2026-05-13 — Obsidian vault browser round-trip verifier

- **Root cause** — the large compatibility ratchet proved metadata indexing in
  Vitest, but the remaining acceptance item required browser evidence that the
  same Obsidian-style vault can render and save without mutating `.obsidian/`
  config or drifting source Markdown.
- **Browser path** — added a Vite-served Chromium fixture that builds a
  200-note Obsidian-style vault with `.obsidian/` config, theme/snippet files,
  aliases, YAML/body tags, wikilinks, embeds, callouts, block IDs, a canvas,
  a base, and an asset. The fixture binds Granite's real Effect `FileSystem`,
  indexes the vault, renders every note with the reading renderer, parses and
  serializes the canvas/base semantically, then saves every note back
  byte-for-byte.
- **No-write guarantee** — the verifier fails if indexing writes anything, if
  any `.obsidian/` file is written during the save pass, or if the generated
  vault content changes outside the intentional byte-for-byte note writes.
- **Tracker closure** — closed the §24.23 Obsidian browser/manual round-trip
  item after the browser verifier rendered 200 notes, 200 callouts, and 400
  wikilinks, then saved 200 notes without content drift or `.obsidian` writes.

### Tests
- `bun run verify:obsidian-vault-browser`

---

## 2026-05-13 — Keyboard-only browser audit verifier

- **Root cause** — the accessibility work had source and unit ratchets for
  individual controls, but no browser flow proving keyboard users can traverse
  the live shell and operate modal/prompt surfaces without pointer input.
- **Browser path** — added a Chromium verifier that opens the app, tabs across
  the ribbon/sidebar focus order, verifies core shell controls are reachable by
  accessible name, opens Settings with Enter and checks modal focus trapping,
  then opens Command Palette with Enter and checks ArrowDown updates the active
  descendant before Escape closes it.
- **Tracker closure** — closed the §24.20 keyboard-only audit item after the
  browser verifier reached 18 distinct tab targets and passed the modal/prompt
  keyboard flow checks.

### Tests
- `bun run verify:keyboard-browser`

---

## 2026-05-13 — Browser 10k startup verifier

- **Root cause** — cold-start performance had Node-side metadata and timing
  ratchets, but no browser-profile proof that the 10k metadata path stays
  under the 3 second startup budget in Chromium.
- **Browser path** — added a Vite-served Chromium fixture that binds a
  synthetic 10,000-note vault to the real Effect `FileSystem` layer, runs
  `metadataCache.indexVault()`, proves it performs 10,000 reads, 0 stats, and
  builds 20,000 switcher entries, all measured with browser `performance.now()`.
- **Tracker closure** — closed the §24.19 cold-start item after the browser
  verifier measured 34.20 ms for the 10k metadata startup path.

### Tests
- `bun run verify:startup-browser`

---

## 2026-05-13 — Browser save round-trip verifier

- **Root cause** — the save budget had a mocked File System Access adapter
  ratchet, but no browser proof that Chromium's real OPFS write path could
  complete Granite's atomic temp-write/read-back cycle under 50 ms.
- **Browser path** — added a Vite-served Chromium fixture that opens OPFS,
  writes a 120 KB Markdown payload through `handleAdapter.writeText()`, reads
  it back through the same adapter, checks byte-for-byte content preservation,
  and fails if the write round-trip exceeds 50 ms.
- **Tracker closure** — closed the §24.19 save round-trip item after the
  browser verifier measured 1.70 ms for the OPFS atomic write path.

### Tests
- `bun run verify:save-roundtrip-browser`

---

## 2026-05-13 — Graph pan browser FPS verifier

- **Root cause** — the graph pan work had a source-level transform budget, but
  no browser proof that a 10k-node SVG scene stays above the product's
  30 fps panning floor.
- **Browser path** — added a Vite-served Chromium fixture that creates 10,000
  SVG graph nodes, applies the same shared viewport transform helpers used by
  `GraphView`, pans continuously for 10 seconds, and fails below 30 fps.
- **Tracker closure** — closed the §24.19 graph pan item after the browser
  verifier reported 10k nodes at 120.1 fps with 0 long frames in headless
  Chromium.

### Tests
- `bun run verify:graph-pan-browser`

---

## 2026-05-13 — Live Preview browser verification

- **Root cause** — the Live Preview TODO had strong pure-function and
  CodeMirror DOM ratchets, but still lacked a real browser check proving
  Chromium renders replacement decorations the same way users see them.
- **Browser path** — added a Vite-served browser fixture that mounts real
  CodeMirror editors in Live Preview and Source modes. The verifier launches
  Chromium, checks inactive Live Preview hides bold, wikilink, Markdown-link,
  and table separator source markers, then moves the cursor onto the line and
  proves the raw source markers reappear.
- **Tracker closure** — closed the §24.2 Live Preview decoration item because
  the marker coverage, per-leaf mode routing, DOM integration, and browser
  rendering gates now all have repeatable tests.

### Tests
- `bun run verify:live-preview-browser`

---

## 2026-05-13 — Broad UI string externalization ratchet

- **Root cause** — the i18n work had many targeted guardrails, but the final
  acceptance gap was drift: a new UI/plugin source file could add visible
  English strings outside the audited surfaces and still pass the narrow tests.
- **Audit path** — added a broad non-test source scan across `src/ui`,
  `src/core/plugins-core`, and the core plugin registry/update loaders for
  hard-coded JSX text, labels, placeholders, command names/categories,
  prompts, confirmations, notices, and direct `textContent` strings.
- **Tracker closure** — closed §24.21 string externalization now that targeted
  surface tests and the broad source ratchet both cover the visible UI/plugin
  string classes, with the product name intentionally left literal.

### Tests
- `bun run test -- src/core/i18n/externalization.test.ts`

---

## 2026-05-13 — Localized Bases embed filter summary

- **Root cause** — fenced Bases embeds render HTML outside React, and their
  header displayed a bare filter expression without routing the visible filter
  summary through the i18n layer.
- **Embed path** — replaced the unlabeled filter code chip with the localized
  `reading.embed.filterSummary` string so the embedded Base header exposes the
  same translated filter label used by other reading-mode embeds.
- **Regression ratchet** — extended the Bases externalization audit to reject
  the old bare `<code class="bases-fence-filter">` pattern and require
  `reading.embed.filterSummary` in the Bases embed source set.
- **Tracker honesty** — recorded this as another string-externalization slice
  while keeping the broad UI audit open.

### Tests
- `bun run test -- src/core/i18n/externalization.test.ts`

---

## 2026-05-13 — Graph node and Bases row focus-ring ratchets

- **Root cause** — graph nodes and Bases table rows are keyboard-activatable
  custom controls, but graph nodes had no focus-visible state and Bases only
  styled focused cells, not the focusable row element.
- **Focus path** — added a focus-visible SVG circle stroke for graph nodes and
  an inset focus ring for Bases rows using
  `--background-modifier-border-focus`.
- **Regression ratchet** — extended `src/core/a11y/icon-buttons.test.ts` to
  read `view-graph.css` and `view-bases.css` and fail if those shared focus
  indicators disappear.
- **Tracker honesty** — kept the full keyboard-only audit open because this
  is source-level coverage for two more custom control classes, not a browser
  traversal.

### Tests
- `bun run test -- src/core/a11y/icon-buttons.test.ts`
- `bun run audit:a11y`

---

## 2026-05-13 — Custom row and status-bar focus-ring ratchets

- **Root cause** — tree-item rows and clickable status-bar items are custom
  keyboard controls, but `.tree-item-self` removed outlines and status-bar
  clickables only had hover affordance, leaving visible keyboard focus
  dependent on incidental browser behavior.
- **Focus path** — added `:focus-visible` rings for clickable/collapsible
  tree rows and clickable status-bar items using
  `--background-modifier-border-focus`.
- **Regression ratchet** — extended `src/core/a11y/icon-buttons.test.ts` to
  read `tree-item.css` and `shell.css` and fail if those shared focus rings
  disappear.
- **Tracker honesty** — kept the full keyboard-only audit open because this
  covers shared custom-control classes, not a browser traversal of every app
  route.

### Tests
- `bun run test -- src/core/a11y/icon-buttons.test.ts`
- `bun run audit:a11y`

---

## 2026-05-13 — Localized Markdown autocomplete alias detail

- **Root cause** — the Markdown wikilink autocomplete reused switcher alias
  data, but rendered alias suggestions with a hard-coded `alias for …` detail
  string outside the i18n layer.
- **Autocomplete path** — added `markdown.autocomplete.aliasFor` and routed
  alias detail text through the locale lookup at completion creation time.
- **Regression ratchet** — extended the Markdown/Web Viewer externalization
  audit to reject the old template literal and added Hebrew coverage for the
  new autocomplete detail key.
- **Tracker honesty** — kept the broad string-externalization item open while
  recording this as another audited UI string closure.

### Tests
- `bun run test -- src/core/i18n/externalization.test.ts src/core/i18n/index.test.ts`

---

## 2026-05-13 — Localized Bookmarks default group migration

- **Root cause** — the Bookmarks sidebar used the English default group label
  as both a persisted group id and a rendered fallback, so legacy saved entries
  could keep showing `Bookmarks` even when the active locale had a translated
  `bookmarks.defaultGroup`.
- **Data path** — split the default bucket onto an internal sentinel, render
  it through `bookmarks.defaultGroup`, and normalize old saved English default
  groups from localStorage or `.granite/bookmarks.json` back into the localized
  default bucket.
- **Regression ratchet** — added a Bookmarks integration test that switches to
  Hebrew with a legacy saved default group and fails if the English label still
  renders; extended the i18n externalization audit to reject the old hard-coded
  default-group constant.
- **Tracker honesty** — recorded this as another broad i18n closure slice while
  leaving the full string-externalization audit open.

### Tests
- `bun run test -- src/ui/views/sidebar/BookmarksView.test.tsx`
- `bun run test -- src/core/i18n/externalization.test.ts src/core/i18n/index.test.ts`

---

## 2026-05-13 — Clickable icon focus-ring ratchet

- **Root cause** — icon-only controls had accessible names, but the shared
  `.clickable-icon` styling did not provide its own `:focus-visible` ring, and
  hover styles explicitly cleared `box-shadow`.
- **Focus path** — added a shared keyboard focus ring using
  `--background-modifier-border-focus` so icon-only controls can be visibly
  focused without relying on browser defaults.
- **Regression ratchet** — extended `src/core/a11y/icon-buttons.test.ts` to
  read `src/styles/buttons.css` and fail if the clickable-icon focus selector
  or focus-ring token disappears.
- **Tracker honesty** — left the full keyboard-only audit open because this is
  source-level evidence for a shared control class, not a browser traversal of
  every core flow.

### Tests
- `bun run test -- src/core/a11y/icon-buttons.test.ts`

---

## 2026-05-13 — Per-leaf Live Preview mode ratchet

- **Root cause** — the workspace already modeled Markdown leaves as
  `source`, `live-preview`, or `reading`, but the editor ignored that leaf mode
  and used a global `settings.livePreview` toggle, so a Source-mode leaf could
  still receive Live Preview decorations.
- **Mode path** — `MarkdownView` now receives the leaf's Live Preview state
  explicitly, new note opens resolve through `defaultEditingMode`, and the
  Reading/Edit toggle returns to the configured editing mode.
- **Settings path** — added the missing localized "Default editing mode"
  setting from `16_settings_reference.md`, with Live Preview as the default and
  Source mode as the alternate.

### Tests
- `bun run test -- src/core/workspace/store.test.ts src/ui/views/MarkdownView.test.tsx src/core/settings/store.test.ts src/core/i18n/externalization.test.ts`
- `bunx biome check src/core/workspace/store.ts src/core/workspace/store.test.ts src/core/settings/store.ts src/ui/workspace/Leaf.tsx src/ui/views/MarkdownView.tsx src/ui/views/MarkdownView.test.tsx src/ui/prompts/SettingsModal.tsx src/ui/prompts/settings-filter.ts src/core/i18n/index.ts src/core/i18n/externalization.test.ts`

---

## 2026-05-13 — Spellcheck language settings ratchet

- **Root cause** — the editor exposed only a browser spellcheck toggle even
  though the settings and editor specs require configurable spellcheck
  languages, with system/default behavior when no language is configured.
- **Settings path** — added persisted `spellcheckLanguages`, localized Settings
  UI copy, settings-filter coverage, and a normalization helper that applies
  the first valid BCP 47 tag as the CodeMirror editable DOM `lang` attribute.
- **Tracker honesty** — this closes the source-level language hook; OS/browser
  dictionary behavior still needs browser/manual validation before the full
  editor acceptance item is closed.

### Tests
- `bun run test -- src/core/settings/spellcheck.test.ts src/core/settings/store.test.ts src/core/i18n/externalization.test.ts`
- `bunx biome check src/core/settings/store.ts src/core/settings/spellcheck.ts src/core/settings/spellcheck.test.ts src/ui/views/MarkdownView.tsx src/ui/prompts/SettingsModal.tsx src/ui/prompts/settings-filter.ts src/core/i18n/index.ts src/core/i18n/externalization.test.ts`

---

## 2026-05-13 — Live Preview footnote reference ratchet

- **Root cause** — Live Preview decoration coverage had no footnote-reference
  case, leaving `[^id]` references fully source-like even though Reading view
  renders the reference marker as `[id]`.
- **Decoration path** — inactive footnote references now replace only the caret
  in `[^id]`, yielding the conservative `[id]` preview shape while leaving
  definition lines source-like until a full footnote widget owns them.
- **Tracker honesty** — this is a marker-chrome ratchet, not full superscript
  widget or browser verification coverage.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview frontmatter no-parse ratchet

- **Root cause** — top-of-file YAML frontmatter was being scanned by the
  Live Preview marker hider as Markdown body, so `---` fences could be treated
  as horizontal rules and YAML values containing Markdown-looking text could
  be visually rewritten.
- **Decoration path** — valid frontmatter blocks at the start of a document now
  stay raw in Live Preview decoration computation until a dedicated properties
  widget owns inactive-line rendering.
- **Tracker honesty** — this closes a source-level frontmatter no-parse hole;
  the broader Live Preview browser/manual verification remains open.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview fenced-code marker ratchet

- **Root cause** — Live Preview skipped inline formatting inside fenced code
  blocks, but left the opening and closing fence source lines visible on
  inactive lines.
- **Decoration path** — fenced-code tracking now replaces inactive opening and
  closing fence lines for backtick and tilde fences, including optional
  language tokens, while preserving raw display on the cursor line.
- **Tracker honesty** — kept the Live Preview TODO open because this is a
  source-level ratchet, not the remaining browser/manual verification.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview horizontal-rule ratchet

- **Root cause** — `07_markdown_syntax.md` defines horizontal rules as block
  syntax, but Live Preview did not hide `---`, `***`, or spaced marker lines;
  `_ _ _` was even misclassified as two standalone underscore-italic markers.
- **Decoration path** — added a horizontal-rule block recognizer before inline
  emphasis decoration and replace the inactive source line as a block marker.
- **Tracker honesty** — kept the Live Preview TODO open because this closes a
  source-level syntax gap, not the remaining browser/manual verification.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview multiline HTML no-parse ratchet

- **Root cause** — the same HTML no-parse rule also applies across multiline
  HTML blocks, but Live Preview still decorated Markdown markers between a
  standalone `<div>` opener and matching closing tag.
- **Decoration path** — added a scoped HTML-block state for standalone
  opening tags. Lines inside the block stay raw, while angle-bracket autolinks
  and same-line HTML continue through the existing inline handling.
- **Tracker honesty** — kept the Live Preview TODO open because this is a
  source-level ratchet, not the remaining browser/manual verification.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview HTML no-parse ratchet

- **Root cause** — `07_markdown_syntax.md` says Markdown inside HTML
  elements is intentionally not parsed, but the Live Preview decorator still
  hid formatting and wikilink markers inside same-line HTML elements such as
  `<div>**not bold** and [[not a link]]</div>`.
- **Decoration path** — added same-line HTML element ranges to the ignored
  inline zones used by formatting, links, comments, and math decoration. Code
  spans and HTML elements now share the same "leave source raw" guard.
- **Tracker honesty** — kept the Live Preview TODO open because this adds a
  source-level spec ratchet, not the outstanding browser/manual verification.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview block-id marker ratchet

- **Root cause** — `07_markdown_syntax.md` defines `^id` block-reference
  targets, but Live Preview did not hide those source markers on inactive
  lines.
- **Decoration path** — added a block-id marker recognizer for trailing
  paragraph/list markers and standalone block-id lines. Inactive Live Preview
  now hides ` ^my-block` or `^my-block` while the cursor line remains raw.
- **Tracker honesty** — kept the Live Preview TODO open because this is source
  and CM unit coverage, not the outstanding browser/manual verification pass.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview nested underscore-bold-in-italic ratchet

- **Root cause** — the single-underscore italic path still used a content
  regex, so `_italic __bold__ text_` hid the nested bold markers but left the
  outer italic delimiters visible.
- **Decoration path** — replaced the single-underscore regex with a
  boundary-aware delimiter scan. It keeps the existing identifier guard
  (`foo_bar_baz` is not decorated), preserves punctuation-bound `_word_`, and
  supports nested `__bold__` inside underscore italic.
- **Tracker honesty** — kept the Live Preview TODO open because the remaining
  browser/manual verification gate is still not closed by this source ratchet.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview nested underscore-emphasis ratchet

- **Root cause** — the `__bold__` path had the same content-regex weakness as
  asterisk bold: when a bold span contained nested `_italic_`, the outer
  underscore-bold delimiters stayed visible on inactive lines.
- **Decoration path** — replaced the underscore-bold regex with an exact
  double-underscore delimiter scan that skips escaped markers and inline code
  spans. The Live Preview ratchet now covers `__important _nested_ text__`
  alongside the asterisk nested cases.
- **Tracker honesty** — kept the Live Preview TODO open because source and CM
  unit coverage still do not replace the remaining browser/manual audit.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview nested bold-with-asterisk-italic ratchet

- **Root cause** — the Live Preview helper still used a content regex for
  `**bold**`, so bold spans containing nested `*italic*` markers failed to
  hide the outer bold delimiters.
- **Decoration path** — replaced the asterisk-bold regex with a double-marker
  delimiter scan that skips escaped markers and inline code spans, preserving
  the existing bold behavior while allowing `**important *nested* text**` to
  hide both outer bold and inner italic chrome.
- **Tracker honesty** — kept the Live Preview TODO open because this closes a
  nested marker source-level gap, not the remaining browser/manual
  verification gate.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview nested asterisk-emphasis ratchet

- **Root cause** — the Live Preview helper used a content regex for
  `*italic*`, so any italic span containing nested `**bold**` markers failed
  to hide the outer italic delimiters even though the inner bold delimiters
  were hidden.
- **Decoration path** — replaced the single-asterisk regex with a delimiter
  scan that only accepts standalone, unescaped `*` markers outside inline code
  spans. This preserves the existing `**bold**` guard while allowing
  `*important **nested** text*` to hide both outer italic and inner bold
  chrome.
- **Tracker honesty** — left the Live Preview completion item open because
  this closes one nested marker gap in the unit ratchet, not the remaining
  browser/manual verification.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`
- `bunx biome check src/core/markdown/cm-livepreview-decorations.ts src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Live Preview escaped marker and code-span ratchet

- **Root cause** — the Live Preview decoration helper skipped single-backtick
  inline code spans, but `07_markdown_syntax.md` also documents
  multi-backtick spans; escaped inline formatting markers could also still be
  treated as hideable Markdown chrome.
- **Decoration path** — added matching-backtick-run code span detection and
  odd-backslash escape checks before replacing bold, italic, bold+italic,
  highlight, strikethrough, and inline-math markers.
- **Task markers** — added coverage for custom task states such as `[?]` and
  `[-]`, preserving the source task state while still hiding inactive
  checkbox marker chrome.
- **Tracker honesty** — left the browser verification item open because this
  extends the pure and CodeMirror-mounted ratchets, not a real browser audit.

### Tests
- `bun run test -- src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Remove stale unlocalized leaf-title helper

- **Root cause** — workspace UI already uses the localized
  `displayLeafTitle()` helper, but `src/core/workspace/types.ts` still exported
  an unused `leafTitle()` helper with hard-coded English fallback titles.
- **Cleanup** — removed the dead core helper so there is only one title path
  for workspace leaves.
- **Regression ratchet** — extended `src/core/i18n/externalization.test.ts` to
  scan `src/core/workspace/types.ts` and fail if a new unlocalized
  `leafTitle()` or English fallback title is reintroduced.
- **Tracker honesty** — recorded this as another string-externalization
  improvement while leaving the broad UI audit open.

### Tests
- `bun run test -- src/core/i18n/externalization.test.ts`

---

## 2026-05-13 — Graph pan allocation trim

- **Root cause** — the 10k graph pan budget test exposed that the hot
  viewport update path was cloning the whole viewport object with spread on
  every drag calculation, even though only `x` and `y` change.
- **Pan path** — updated `viewportForPanDrag()` to construct the next viewport
  directly and preserve `scale` explicitly, reducing avoidable work in the
  transform loop.
- **Tracker honesty** — kept the browser FPS verification item open; this
  fixes the automated budget failure but does not replace browser profiling.

### Tests
- `bun run test -- src/core/graph/pan.test.ts src/core/compat/obsidian-roundtrip.test.ts`

---

## 2026-05-13 — Large Obsidian compatibility index ratchet

- **Root cause** — the compatibility tracker calls for a large Obsidian vault
  round-trip, but the automated fixture only covered a small hand-authored
  vault.
- **Generated fixture** — extended `src/core/compat/obsidian-roundtrip.test.ts`
  with a 200-note Obsidian-style vault containing `.obsidian/` config,
  aliases, YAML tags, inline tags, wikilinks, embeds, callouts, block IDs,
  canvas, base, and asset files.
- **No-write guarantee** — the ratchet indexes the generated vault and proves
  Granite does not write to source files or `.obsidian/app.json`, while still
  producing switcher entries, headings, blocks, backlinks, tags, and property
  summaries.
- **Tracker honesty** — kept the real browser/manual large-vault round-trip
  item open because this is core indexing coverage, not a rendered vault audit.

### Tests
- `bun run test -- src/core/compat/obsidian-roundtrip.test.ts`

---

## 2026-05-13 — Native asset string externalization ratchet

- **Root cause** — the new native asset leaf added localized strings, but the
  source-level i18n regression audit did not yet cover that surface.
- **Regression ratchet** — extended `src/core/i18n/externalization.test.ts` so
  `AssetView` loading text and the workspace asset fallback title must stay
  routed through `asset.loading` and `workspace.leaf.asset`.
- **Tracker honesty** — recorded this as another UI string externalization
  improvement while leaving the full UI-wide audit open.

### Tests
- `bun run test -- src/core/i18n/externalization.test.ts src/core/i18n/index.test.ts`

---

## 2026-05-13 — Native asset file opening

- **Root cause** — the storage spec marks images, audio, video, and PDFs as
  native app-opened formats, but File Explorer only routed Markdown, Canvas,
  and Bases into workspace leaves.
- **Format oracle** — added `src/core/fs/file-formats.ts` as the shared
  classifier/mime source for every accepted native extension in
  `20_file_storage.md` §20.2, including `.3gp`.
- **Workspace path** — added asset leaves and `AssetView` so File Explorer
  opens images, audio, video, and PDF files in-app, with category icons and
  shared routing through `workspaceStore.openPath()`.
- **Embed parity** — switched Reading mode media embeds to the same classifier
  so embedded and direct-open native formats stay in sync.
- **Regression ratchet** — added format-classifier coverage and workspace
  routing coverage for every native non-Markdown category.

### Tests
- `bun run test -- src/core/fs/file-formats.test.ts src/core/workspace/store.test.ts src/ui/views/ReadingView.test.tsx src/ui/views/file-explorer/sort.test.ts src/core/i18n/index.test.ts`

---

## 2026-05-13 — Settings About section and shared app version

- **Root cause** — `16_settings_reference.md` lists About as a built-in Options
  section with read-only version, license, and credits, but Settings had no
  About tab. The app version string was also duplicated across debug info,
  plugin APIs, and update checks.
- **Settings path** — added an About section to the settings filter and modal,
  with localized version, license, and credits rows.
- **Version source** — introduced `APP_VERSION` so About, debug info, plugin
  compatibility, and update checks read the same build identifier.
- **Regression ratchet** — added `src/ui/prompts/SettingsModal.test.tsx` and
  extended settings filter/i18n externalization tests so the About section
  remains visible, searchable, and localized.

### Tests
- `bun run test -- src/ui/prompts/SettingsModal.test.tsx src/ui/prompts/settings-filter.test.ts src/core/i18n/index.test.ts src/core/i18n/externalization.test.ts src/core/plugins-core/debug-info.test.ts src/core/plugins/update-check.test.ts`

---

## 2026-05-13 — Community theme live-reload ratchet

- **Root cause** — the compatibility tracker still needs real browser visual
  verification for community themes, but the automated fixture only proved
  discovery and initial injection, not that an active Obsidian-layout theme
  continues to affect the rendered document after the CSS file changes.
- **Regression ratchet** — extended `src/core/themes/loader.test.ts` with a
  watcher-backed active-theme reload case that updates the mocked
  `.obsidian/themes/<name>/theme.css`, waits for the injected stylesheet to
  refresh, and verifies the CSS custom property visible to the document
  changes.
- **Tracker honesty** — left the browser visual cross-render item open because
  this is DOM/CSSOM evidence, not pixel-level coverage of real community
  themes.

### Tests
- `bun run test -- src/core/themes/loader.test.ts`

---

## 2026-05-13 — Slow-startup diagnostic notice

- **Root cause** — Settings → General → Advanced specified a default-on
  "Notify if startup takes longer than expected" toggle, but only the manual
  startup timing report button existed.
- **Settings path** — added a persisted `notifySlowStartup` setting, surfaced
  the toggle in General → Advanced, and runs the warning check once per app
  startup after vault settings hydrate.
- **Budget behavior** — anchored the warning to the documented 3,000 ms
  cold-start budget and includes the same timing report details as the manual
  profiler notice.
- **Regression ratchet** — extended `src/core/perf/startup.test.ts` to prove
  fast starts stay silent, disabled notices stay silent, and slow enabled
  starts show a sticky warning.

### Tests
- `bun run test -- src/core/perf/startup.test.ts src/core/settings/store.test.ts src/core/i18n/index.test.ts src/core/i18n/externalization.test.ts`

---

## 2026-05-13 — Startup timing profiling hook

- **Root cause** — the settings spec calls for General → Advanced → Check
  startup time, but the settings modal had no General section and no startup
  timing report path.
- **Profiler** — added a Performance API collector/formatter for elapsed,
  navigation, DOMContentLoaded, load, first-paint, and first-contentful-paint
  timings, with explicit unavailable markers.
- **Settings path** — added the General settings section and wired Check
  startup time to show a sticky local report notice.
- **Regression ratchet** — added `src/core/perf/startup.test.ts` and extended
  `src/ui/prompts/settings-filter.test.ts`.

### Tests
- `bun run test -- src/core/perf/startup.test.ts src/ui/prompts/settings-filter.test.ts src/core/i18n/index.test.ts`

---

## 2026-05-13 — Orphan atomic-write temp scan

- **Root cause** — the File System Access adapter writes through
  `.granite-tmp~` siblings for atomic saves, but vault startup did not scan for
  abandoned temp files after an interrupted write.
- **Startup warning** — added a filesystem scanner for legacy `.tmp~` and
  current `.granite-tmp~` leftovers, and wired vault activation to show a
  sticky warning with up to five paths while leaving the files untouched for
  inspection.
- **Regression ratchet** — added `src/core/fs/orphan-temp.test.ts` to prove the
  matcher and active `FileSystem` scan path.

### Tests
- `bun run test -- src/core/fs/orphan-temp.test.ts src/core/i18n/index.test.ts`

---

## 2026-05-13 — Locale-bound property date pickers

- **Root cause** — Properties sidebar date and datetime inputs used native
  picker controls without a `lang` attribute, so the browser could not render
  those controls using Granite's active locale.
- **Locale path** — subscribed `PropertiesView` to the i18n locale and passed
  it to `type="date"` and `type="datetime-local"` inputs.
- **Regression ratchet** — added `src/ui/views/sidebar/PropertiesView.test.tsx`
  to prove Hebrew locale is applied to both native picker types.
- **Tracker honesty** — recorded this as closing a concrete date-picker gap
  while leaving the broader UI string externalization audit open.

### Tests
- `bun run test -- src/ui/views/sidebar/PropertiesView.test.tsx`

---

## 2026-05-13 — Debug-info support command

- **Root cause** — PLAN Phase 14 called for a `granite:show-debug-info`
  support dump, but no command or collector existed.
- **Support dump** — added a built-in debug-info core plugin that collects
  app version, platform, user agent, vault file counts/size, workspace shape,
  command count, plugin state, and metadata tag/property counts.
- **User path** — registered `granite:show-debug-info` in the command palette,
  writes the dump to the clipboard when available, and shows it as a sticky
  notice.
- **Regression ratchet** — added `src/core/plugins-core/debug-info.test.ts`
  for collection, formatting, command registration, clipboard write, and
  notice output.

### Tests
- `bun run test -- src/core/plugins-core/debug-info.test.ts`

---

## 2026-05-13 — 10k metadata cold-start ratchet

- **Root cause** — the metadata cold-start test guarded the no-restat
  optimization, but only at 1k files and without measuring the 3 s budget named
  in the acceptance criteria.
- **Performance ratchet** — raised the fixture to 10k markdown files and
  asserted `metadataCache.indexVault()` completes under 3,000 ms while still
  making zero `stat()` calls and indexing file aliases.
- **Tracker honesty** — recorded this as a stronger automated proxy while
  leaving browser/profile verification open.

### Tests
- `bun run test -- src/core/metadata/cache.test.ts`

---

## 2026-05-13 — Bookmarks add-menu keyboard navigation

- **Root cause** — the Bookmarks sidebar used a local inline add menu instead
  of the shared `MenuHost`, so the previous shared-menu keyboard fix did not
  cover this surface.
- **Keyboard path** — added roving focus, ArrowUp/ArrowDown wrapping, Home/End
  jumps, Escape close-and-return-focus, and trigger `aria-haspopup` /
  `aria-expanded` state for the Bookmarks add menu.
- **Regression ratchet** — added `src/ui/views/sidebar/BookmarksView.test.tsx`
  to prove the menu focus contract and Escape focus restoration.
- **Tracker honesty** — recorded this as another keyboard-only improvement
  while leaving the full browser/manual keyboard audit open.

### Tests
- `bun run test -- src/ui/views/sidebar/BookmarksView.test.tsx`

---

## 2026-05-13 — Locale-aware date token formatting

- **Root cause** — Daily Notes and Templates supported `MMMM`/`MMM`/`dddd`/`ddd`
  style tokens with hard-coded English month and weekday names, so generated
  filenames and inserted template text ignored the active locale.
- **Shared formatter** — added `src/core/i18n/date-format.ts` to keep numeric
  Moment-style tokens intact while resolving month and weekday names through
  `Intl.DateTimeFormat(getLocale())`.
- **Plugin wiring** — routed Daily Notes filenames and Template `{{date}}` /
  `{{time}}` expansions through the shared formatter.
- **Regression ratchet** — added locale-aware formatter tests and extended the
  source externalization audit so English month/day arrays cannot creep back
  into those plugin paths.
- **Tracker honesty** — recorded this as another i18n improvement while leaving
  the full UI-wide externalization audit open.

### Tests
- `bun run test src/core/i18n/date-format.test.ts src/core/i18n/externalization.test.ts src/core/i18n/index.test.ts`
- `bun run test`
- `bun run build`
- `git diff --check`

---

## 2026-05-13 — Filesystem adapter error externalization

- **Root cause** — FSA adapter `FsAccessDenied.reason` values can surface in
  UI error messages, but empty-path writes and directory renames still emitted
  hard-coded English.
- **i18n path** — routed both adapter reasons through `fs.error.emptyPath` and
  `fs.error.directoryRenameUnsupported` with English and Hebrew translations.
- **Error preservation** — fixed the adapter error mapper so internally raised
  `FsAccessDenied` values are not wrapped as generic `FsIoError`.
- **Regression ratchet** — extended `src/core/fs/handle-adapter.test.ts` and
  `src/core/i18n/externalization.test.ts` to lock those adapter failures to
  i18n keys.
- **Tracker honesty** — recorded this as another string-externalization
  improvement while leaving the full UI-wide externalization audit open.

### Tests
- `bun run test src/core/fs/handle-adapter.test.ts src/core/i18n/externalization.test.ts src/core/i18n/index.test.ts`
- `bun run test`
- `bun run build`
- `git diff --check`

---

## 2026-05-13 — Trash error externalization

- **Root cause** — File Explorer delete errors can surface
  `FsUnsupported.feature`, but the vault-trash exhaustion and system-trash
  unsupported messages in `src/core/fs/trash.ts` were still hard-coded English.
- **i18n path** — routed both messages through
  `fs.trash.error.vaultPathUnavailable` and
  `fs.trash.error.systemUnavailable` with English and Hebrew translations.
- **Regression ratchet** — extended `src/core/fs/trash.test.ts` and
  `src/core/i18n/externalization.test.ts` so trash failures cannot
  silently fall back to hard-coded English.
- **Tracker honesty** — recorded this as a string-externalization improvement
  while leaving the full UI-wide externalization audit open.

### Tests
- `bun run test src/core/fs/trash.test.ts src/core/i18n/externalization.test.ts src/core/i18n/index.test.ts`
- `bun run test`
- `bun run build`
- `git diff --check`

---

## 2026-05-13 — Shared menu keyboard navigation

- **Keyboard gap** — shared context menus only supported arrow movement and
  Enter activation, so keyboard users could not jump to menu boundaries or
  activate items with Space.
- **Roving focus** — menu items now keep a single tabbable active item and move
  DOM focus as keyboard selection changes.
- **Navigation parity** — ArrowUp/ArrowDown wrap, Home/End jump to menu
  boundaries, and Space activates the focused item alongside Enter.
- **Regression ratchet** — added `src/ui/overlay/Menu.test.tsx` to exercise the
  portal-backed menu with real document key events.
- **Tracker honesty** — recorded this as another keyboard-only audit
  improvement while leaving the full browser flow audit open.

### Tests
- `bunx biome check --write src/ui/overlay/Menu.tsx src/ui/overlay/Menu.test.tsx`
- `bun run test src/ui/overlay/Menu.test.tsx`
- `bun run test src/ui/overlay/Menu.test.tsx src/ui/workspace/TabStrip.test.tsx src/core/a11y/icon-buttons.test.ts`
- `bun run test`
- `bun run build`
- `git diff --check`

---

## 2026-05-13 — Workspace tablist keyboard navigation

- **Keyboard gap** — workspace tabs exposed ARIA `tab`/`tablist` semantics but
  did not support arrow-key tablist navigation.
- **Tablist behavior** — added ArrowLeft/ArrowRight plus Home/End navigation
  for horizontal tab groups, and ArrowUp/ArrowDown for stacked tab groups.
- **Activation parity** — Space now activates focused tabs in addition to
  Enter.
- **Regression ratchet** — added `src/ui/workspace/TabStrip.test.tsx` for
  horizontal and stacked keyboard navigation.
- **Tracker honesty** — recorded this as a keyboard-only audit improvement
  while leaving the full browser flow audit open.

### Tests
- `bunx biome check --write src/ui/workspace/TabStrip.tsx src/ui/workspace/Tab.tsx src/ui/workspace/TabStrip.test.tsx`
- `bun run test src/ui/workspace/TabStrip.test.tsx src/core/a11y/icon-buttons.test.ts`
- `bun run test`
- `bun run build`
- `git diff --check`

---

## 2026-05-13 — Cold-start metadata indexing stat reduction

- **Root cause** — bulk metadata indexing already receives `mtimeMs` and file
  identity from `listAll()`, but then called the single-file refresh path and
  re-statted every Markdown path before reading it.
- **Indexing path** — added a listed-file refresh path that reads each Markdown
  file once and stores metadata with the `listAll()` timestamp, preserving the
  stat-based path for watcher and on-demand refreshes.
- **Performance ratchet** — extended `src/core/metadata/cache.test.ts` with a
  fake 1k-file filesystem proving cold-start indexing performs zero per-file
  stat calls and indexes the expected switcher entries.
- **Tracker honesty** — recorded this as a cold-start improvement while leaving
  the 10k-note browser/profile budget open.

### Tests
- `bunx biome check --write src/core/metadata/cache.ts src/core/metadata/cache.test.ts`
- `bun run test src/core/metadata/cache.test.ts`

---

## 2026-05-13 — Graph pan transform budget ratchet

- **Pan helper** — extracted graph viewport drag math and SVG transform
  formatting into `src/core/graph/pan.ts` so the pan path has a focused,
  non-React contract.
- **Renderer wiring** — updated `GraphView` to use the shared transform helper
  for the initial SVG transform, resize/view sync, and pointer-drag movement.
- **Performance ratchet** — added `src/core/graph/pan.test.ts` to prove 10k
  pan transform calculations stay under a single-frame budget.
- **Tracker honesty** — recorded this as automated coverage for the imperative
  pan path while leaving browser FPS verification open.

### Tests
- `bunx biome check --write src/core/graph/pan.ts src/core/graph/pan.test.ts src/ui/views/GraphView.tsx`
- `bun run test src/core/graph/pan.test.ts src/core/graph/store.test.ts`

---

## 2026-05-13 — Live preview DOM rendering ratchet

- **Integration coverage** — extended
  `src/core/markdown/cm-livepreview-decorations.test.ts` beyond pure range
  calculation by mounting the real `livePreviewDecorations` CodeMirror
  extension in the test DOM.
- **Regression target** — the new test proves non-cursor inline, table, and
  callout markers are removed from rendered editor text while the active cursor
  line remains raw/editable.
- **Tracker honesty** — updated `todo.md` and severe-testing notes to record
  this stronger automated ratchet while leaving the remaining browser/manual
  verification item open.

### Tests
- `bun run test src/core/markdown/cm-livepreview-decorations.test.ts`

---

## 2026-05-13 — Lighthouse accessibility audit

- **Root cause fix** — Lighthouse flagged the workspace tab headers as
  `role="tab"` elements without a required `tablist` parent and the app shell
  as missing a main landmark.
- **Workspace semantics** — promoted the central workspace shell to
  `<main className="workspace">` and labeled each tab strip as a localized
  `role="tablist"` while keeping tab drag wrappers presentational.
- **I18n guard** — added `workspace.tab.list` in English and Hebrew and
  extended the workspace chrome externalization ratchet for the new label.
- **Audit closure** — reran Lighthouse against the local Vite app and reached
  accessibility score `1` with zero failed audits.

### Tests
- `bunx biome check --write src/ui/shell/Workspace.tsx src/ui/workspace/TabStrip.tsx src/core/i18n/index.ts src/core/i18n/externalization.test.ts`
- `bun run audit:a11y`
- `bun run test src/core/i18n/externalization.test.ts`
- `bunx lighthouse http://127.0.0.1:8081 --only-categories=accessibility --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=/tmp/granite-lighthouse-a11y-after.json --quiet`

---

## 2026-05-13 — Renderer Bases CSS module

- **Dedicated module** — added spec-linked `src/styles/view-bases.css` for the
  Bases shell, header, toolbar/menu hooks, table/list/cards/map views,
  grouping, summaries, drag-over state, embedded/error/search row hooks, and
  map pins.
- **Token coverage** — added the `--bases-*` token family from
  `specs/renderer/design-tokens.md`.
- **Implementation cleanup** — moved the main Bases view, table, list, cards,
  and map layout/style chrome out of inline JSX and into the module.
- **Regression audit** — extended the renderer module test so Bases selectors
  and Bases design-token links remain wired.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- `bunx biome check --write src/styles/view-bases.css src/styles/tokens.css src/styles/index.css src/styles/renderer-modules.test.ts src/ui/views/BasesView.tsx src/ui/views/bases/BasesTableView.tsx src/ui/views/bases/BasesListView.tsx src/ui/views/bases/BasesCardsView.tsx src/ui/views/bases/BasesMapView.tsx`
- `bun run test src/styles/renderer-modules.test.ts src/styles/contrast.test.ts src/core/bases/schema.test.ts src/core/bases/formula.test.ts src/core/bases/summary.test.ts src/ui/views/bases/BasesMapView.test.ts`
- `bun run test`
- `bun run build`
- `git diff --check`

---

## 2026-05-13 — Renderer PDF CSS module

- **Dedicated module** — added spec-linked `src/styles/view-pdf.css` for the
  pdf.js wrapper chrome, themed container, toolbar, sidebar, find bar,
  password dialog, presentation-mode hiding, and markdown PDF embed frame.
- **Token coverage** — added the missing `--pdf-*` token family and dark-theme
  PDF shadow overrides from `specs/renderer/design-tokens.md`.
- **Implementation cleanup** — moved Reading View PDF embed box/frame styles
  out of inline DOM mutation code and into the PDF module.
- **Regression audit** — extended the renderer module test so PDF selectors
  and PDF design-token links remain wired.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted PDF/style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer graph CSS module

- **Dedicated module** — added spec-linked `src/styles/view-graph.css` for
  graph color-token hooks, the graph canvas shell, empty/stat overlays,
  floating controls panel, collapsed-control state, control sections, group
  color rows, swatches, and slider value chrome.
- **Token coverage** — added the missing `--graph-*` token family from
  `specs/renderer/design-tokens.md`.
- **Regression audit** — extended the renderer module test so graph selectors
  and graph design-token links remain wired.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted graph/style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer community browser CSS module

- **Dedicated module** — added spec-linked `src/styles/settings-community.css`
  for the shared Community Plugins/Themes modal chrome, including sidebar
  rows, search-result states, community cards, screenshots, details panes,
  action buttons, README media constraints, and selected/update states.
- **Regression audit** — extended the renderer module test to support shared
  modules linked to more than one renderer spec.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer history and sync CSS module

- **Dedicated module** — added spec-linked `src/styles/view-history-sync.css`
  for file-recovery modal layout, snapshot rows, markdown-aware recovery text,
  sync-history sidebar rows, avatars, version groups, content panes, sync
  status spin, and sync settings rows.
- **Implementation cleanup** — moved File Recovery modal layout and list styles
  out of inline JSX and into the renderer CSS module.
- **Regression audit** — extended the renderer module test so history/sync
  styles stay imported and spec-linked.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style/file-recovery tests, full
  `bun run test`, `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer release-notes CSS module

- **Dedicated module** — added spec-linked
  `src/styles/view-release-notes.css` for release-notes markdown wrapper
  spacing, readable-line width, overflow behavior, and changelog item labels.
- **Regression audit** — extended the renderer module test so release-notes
  styles stay imported and spec-linked.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer typography CSS module

- **Dedicated module** — added spec-linked `src/styles/typography.css` for body
  text baseline, markdown/source-mode heading scale, paragraph spacing,
  emphasis, links, keyboard labels, inline title behavior, and garbled privacy
  text.
- **Regression audit** — extended the renderer module test so typography rules
  stay imported, spec-linked, and out of broad base/markdown/source-mode files.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer suggestion and prompt CSS module

- **Dedicated module** — added spec-linked
  `src/styles/suggestion-and-prompt.css` for prompt chrome, flat prompt inputs,
  instruction strips, anchored suggestion containers, CodeMirror autocomplete
  chrome, suggestion item states, complex suggestion rows, and secret-key
  suggestions.
- **Regression audit** — extended the renderer module test so prompt/suggestion
  styles stay imported, spec-linked, and out of the broad overlay module.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer RTL CSS module

- **Dedicated module** — added spec-linked `src/styles/rtl.css` for RTL chrome
  direction, stacked tab direction tokens, mobile nav padding, icon mirroring,
  bidi plaintext user-content selectors, callout RTL detection, and markdown
  content direction.
- **Regression audit** — extended the renderer module test so RTL styles stay
  imported, spec-linked, and out of broad token/markdown modules.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer OS modifier CSS module

- **Dedicated module** — added spec-linked `src/styles/os-modifiers.css` for
  macOS control-token overrides, Apple more-menu icon rotation, OS titlebar
  variants, and frameless window spacers.
- **Regression audit** — extended the renderer module test so OS modifier styles
  stay imported, spec-linked, and out of the token module.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer loading and progress CSS modules

- **Dedicated modules** — added spec-linked `src/styles/loading.css` for thin
  loading bars, spinners, button loading state, flashing highlights, and mobile
  icon tap feedback, plus `src/styles/progress.css` for the full-screen vault
  progress overlay.
- **Regression audit** — extended the renderer module test so loading/progress
  styles stay imported, spec-linked, and out of broad base/button styles.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer card CSS module

- **Dedicated module** — added spec-linked `src/styles/card.css` for selectable
  card containers, hover/selected states, titles, descriptions, and card lists.
- **Regression audit** — extended the renderer module test so card styles stay
  imported and spec-linked.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer empty-state CSS module

- **Dedicated module** — added spec-linked `src/styles/empty-state.css` for
  full-leaf empty states, action links, side-dock empty rows, and phone feedback
  banners.
- **Regression audit** — extended the renderer module test so empty-state styles
  stay imported, spec-linked, and out of the broad shell stylesheet.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style/i18n tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer splash CSS module

- **Dedicated module** — added spec-linked `src/styles/splash.css` for the
  starter screen wrapper, splash layout, brand/version text, and help-options
  container.
- **Regression audit** — extended the renderer module test so splash styles
  stay imported and spec-linked.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer drag-and-drop CSS module

- **Dedicated module** — extracted drag body state, drag ghosts, reorder ghosts,
  hidden-source marker, drop indicator, workspace drop overlay, and fake-target
  overlay into spec-linked `src/styles/drag.css`.
- **Regression audit** — extended the renderer module test so drag styles stay
  imported, spec-linked, and out of broad base/shell stylesheets.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer modal CSS module

- **Dedicated module** — extracted base modal styles into spec-linked
  `src/styles/modal.css` and filled in scrollable variants, sidebar layout,
  confirmation state, mobile nav actions, message boxes, lightbox,
  file-browser, and rename textarea rules from the renderer spec.
- **Regression audit** — extended the renderer module test so modal styles stay
  imported, spec-linked, and out of the shared overlay/view stylesheets.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style/modal tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer scrollbar CSS module

- **Dedicated module** — added spec-linked `src/styles/scrollbars.css` for
  styled scrollbars, Android geometry, Firefox fallback, screenshot hiding,
  print hiding, and always-hidden scroll surfaces.
- **Regression audit** — extended the renderer module test so scrollbar styles
  stay imported and spec-linked.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: Biome check, targeted style tests, full `bun run test`,
  `bun run build`, and `git diff --check` pass.

---

## 2026-05-13 — Renderer multi-select CSS module

- **Dedicated module** — extracted multi-select container, pill, remove button,
  input placeholder, focus ring, and duplicate-flash styles into spec-linked
  `src/styles/multi-select.css`.
- **Token completion** — added the pill focus sizing tokens documented by the
  renderer spec.
- **Regression audit** — extended the renderer module test so multi-select
  styles stay imported, spec-linked, and out of the flair-only module.

### Tests
- Extended `src/styles/renderer-modules.test.ts`.
- Validation: targeted style tests, full `bun run test`, `bun run build`,
  and `git diff --check` pass.

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
