# 24 — Acceptance criteria

A checklist of testable conditions the v1 desktop replica must satisfy before shipping. Each item should be verifiable with an automated test or a documented manual procedure.

The app's native configuration folder is `.granite/` per `25_legal_branding_notes.md`.
Compatibility tests still prove existing `.obsidian/` vault data opens without semantic
modification and that Granite does not write into `.obsidian/` during round-trips.

## 24.1 Vault and files

- [x] Opening a vault folder for the first time creates a `.granite/` configuration folder containing only the files the app actually uses (no junk).
- [x] Every accepted file format (see `20_file_storage.md` §20.2) is recognized in File explorer with the correct icon and is openable in its appropriate view.
- [x] An external edit to a `.md` file (made in another text editor) appears in the open editor within ≤ 500 ms.
- [x] Renaming a note via File explorer or `F2` updates every wikilink and Markdown link to it across the vault, in ≤ 1 s for a 10k-note vault.
- [x] Deleting a note honors the configured trash setting (system trash / vault `.trash/` / permanent).
- [x] Atomic save: killing the process during a save never produces a half-written file.
- [x] Vaults can be added, opened, renamed, moved, and removed via the Vault Switcher.
- [x] Multiple vaults can be open simultaneously, each in its own window.

## 24.2 Editor

- [x] All three modes (Reading, Live Preview, Source) are reachable and toggleable via hotkey, status bar (when enabled), and view switcher.
- [x] Live Preview hides Markdown markers when the cursor is outside the corresponding line/block, reveals them when the cursor is inside.
- [x] All inline formats from `07_markdown_syntax.md` §7.3 round-trip correctly between Source and Live Preview.
- [x] Spellcheck respects the configured language (or system default on macOS).
- [x] Vim key bindings, when enabled, support normal/insert/visual mode and key remapping.
- [x] Multi-cursor editing works with `Alt/Option + click`.
- [x] Rectangular selection with `Shift+Alt/Option + drag`.
- [x] Folding works at heading and indent levels; folded state restored across reload.

## 24.3 Markdown parser fidelity

- [x] CommonMark conformance test suite passes ≥ 99% of cases.
- [x] GFM conformance: tables, task lists, strikethrough, autolinks, all pass.
- [x] Obsidian extensions: wikilinks (with display text), embeds, block IDs, callouts (every default type + foldable + nested), highlights, comments, math (block + inline), Mermaid diagrams, footnotes (block + inline) — all render correctly.
- [x] Markdown is *not* parsed inside HTML blocks (intentional limitation).

## 24.4 Linking & metadata

- [x] Wikilink autocomplete shows files and aliases after typing `[[`.
- [x] Heading autocomplete after typing `#` inside a wikilink.
- [x] Block autocomplete after typing `^` inside a wikilink.
- [x] Vault-wide heading search via `[[##term`.
- [x] Vault-wide block search via `[[^^term`.
- [x] Backlinks panel correctly counts and renders both Linked and Unlinked mentions.
- [x] Outgoing links panel correctly enumerates current note's links and unlinked mentions.
- [x] Aliases populate Quick Switcher and link autocomplete.
- [x] Excluded files honor their patterns across all surfaces.

## 24.5 Properties

- [x] All seven property types (Text, List, Number, Checkbox, Date, Date & time, Tags) editable inline.
- [x] Type changes propagate vault-wide via the All-properties view.
- [x] Default keys (`tags`, `aliases`, `cssclasses`) work as documented.
- [x] Deprecated singular keys (`tag`, `alias`, `cssclass`) can be migrated by Format Converter.
- [x] JSON-style frontmatter is parsed and rewritten as YAML on save.
- [x] Internal links inside Text or List properties remain quoted on save.

## 24.6 Tags

- [x] Tags from body and YAML are unified in Tags view.
- [x] Nested tags display hierarchically when *Show nested tags* is on.
- [x] Case-insensitive matching but case-preserved display.
- [x] All-numeric tags rejected; alphanumeric/Unicode tags accepted.

## 24.7 Search

- [x] Every operator in `13_command_palette_search_quickswitcher.md` §13.4 produces correct results on the integration fixture vault.
- [x] Regex via `/.../` works (JS flavor).
- [x] Property search `[name]`, `[name:value]`, `[name:null]`, with sub-queries.
- [x] Match-case toggle changes results live.
- [x] Sort order options change results live.
- [x] Embedded `query` code blocks render live results in notes.
- [x] Search performance: 10k-note vault, full-text non-regex query, < 200 ms to first paint.

## 24.8 Graph

- [x] Global graph renders all nodes and edges from the metadata cache.
- [x] Local graph follows the active tab when opened as a linked view.
- [x] Filters, groups, display sliders, force sliders all behave per `14_graph_view.md`.
- [x] Graph state persists with the workspace.
- [x] Performance: 10k nodes at ≥ 30 fps while panning.

## 24.9 Canvas

- [x] All four card types (text/file/link/group) creatable.
- [x] Edges with custom anchors, labels, colors, and end markers work.
- [x] JSON Canvas files produced by another conforming app open and round-trip cleanly.
- [x] Pan, zoom, marquee, multi-select, snap toggle, alt-duplicate, shift-axis-lock, all behave per spec.
- [x] Embedded canvases (`![[file.canvas]]`) render and interact in the host note.

## 24.10 Bases

- [x] All four built-in view types (Table, List, Cards, Map-when-installed) render the fixture data.
- [x] Filter, sort, group, and properties UIs match `12_bases.md`.
- [x] Formulas evaluate correctly with the documented operators and built-in functions.
- [x] Summaries (built-in + custom) compute as documented.
- [x] `this` context resolves correctly per the three locations (main / embed / sidebar).
- [x] Round-trip of a `.base` file: edit in UI → reopen as text → edit as text → reopen in UI.

## 24.11 Workspace and tabs

- [x] Splitting tabs right and down works via right-click menu, More-options menu, drag, and Command palette.
- [x] Stacked tab groups work with the documented stacking-CSS variables.
- [x] Pop-out windows: drag a tab outside, move tabs between windows, close parent closes pop-outs.
- [x] Workspaces plugin saves and restores complete layouts.
- [x] Pinning tabs in central area prevents tab replacement.
- [x] Pinning sidebar tabs freezes their target.

## 24.12 Sidebars

- [x] Both sidebars collapse and expand via icon toggle.
- [x] Sidebar tabs are reorderable by drag.
- [x] Sidebar tabs are pop-out-able into the central area.
- [x] Multiple sidebar tab groups (vertical splits within a sidebar) work.
- [x] Vault profile button opens the Vault Switcher menu.

## 24.13 Status bar

- [x] Word count chip works (CJK-aware).
- [x] Editing-mode chip switches modes when enabled.
- [x] Plugin-added status items appear and remove cleanly on plugin enable/disable.

## 24.14 Hotkeys

- [x] Every default hotkey in `17_hotkeys_reference.md` §17.1 works out of the box.
- [x] System editing shortcuts in §17.2 work in the editor.
- [x] Custom hotkey assignment via Settings → Hotkeys: capture, save, conflicts, multi-binding.
- [x] Hotkey display normalizes to US layout but triggers from physical keys.

## 24.15 Settings

- [x] Every option enumerated in `16_settings_reference.md` exists, defaults match, persists across restart.
- [x] Search inside Settings filters categories live.
- [x] Per-plugin settings pages appear under "Plugin options" only when the plugin is enabled.
- [x] Settings are written to the configured config folder, not the global folder.

## 24.16 Themes & snippets

- [x] Switching themes from the dropdown applies instantly without restart.
- [x] Light/dark mode follows OS, light-only, or dark-only per setting.
- [x] Accent color picker updates `--accent-h/-s/-l` and propagates everywhere.
- [x] CSS snippets folder is watched; saving a snippet file applies within < 500 ms.
- [x] Each snippet has its own toggle.

## 24.17 Plugins

- [x] Restricted mode default-on for new vaults.
- [x] Browse → install → enable flow works for at least 3 popular community plugins from the existing Obsidian ecosystem.
- [x] Plugin lifecycle (`onload` / `onunload`) cleans up registered commands, ribbon icons, sidebar tabs, settings tabs, event handlers.
- [x] Plugin `loadData()` / `saveData()` persists to `data.json`.
- [x] Plugin update check works against the configured registry.
- [x] `minAppVersion` mismatch disables the plugin gracefully with a notice.

## 24.18 Drag and drop

- [x] Every source × destination combination from `21_dnd_and_pop_out_windows.md` §21.1 / §21.2 produces the documented effect.
- [x] External drags from the OS file manager and the browser behave as documented (with `Ctrl/Option` modifier behavior).
- [x] Drop zones highlight visibly during drag.

## 24.19 Performance

- [x] All performance budgets in `23_implementation_blueprint.md` §23.5 met.
- [x] No frame drop > 50 ms while typing in a 100k-character note.
- [x] No memory leak observed over a 4-hour session of normal use.

## 24.20 Accessibility

- [x] All commands reachable from the keyboard (no mouse required for any core flow).
- [x] Visible focus rings on every focusable element using `--background-modifier-border-focus`.
- [x] Screen reader announces tab changes, modal opens, and notice content.
- [x] All icon-only buttons have `aria-label` matching their tooltip.
- [x] Minimum contrast 4.5:1 for body text in both light and dark themes.
- [x] Reduced-motion preference respected (no graph-animate by default if set).

## 24.21 i18n

- [x] String externalization complete; English + at least one RTL language demonstrable.
- [x] Date pickers honor system locale.
- [x] Right-to-left layout flips sidebars and text direction correctly when chosen per-note via property.

## 24.22 Crash safety & recovery

- [x] On unexpected exit, the app reopens with the last saved workspace.
- [x] File recovery snapshots can restore a note to a prior state.
- [x] Atomic-write protocol is unit-tested.
- [x] No data loss in 100 random kill-and-restart cycles during edit-heavy use.

## 24.23 Compatibility round-trip

- [x] An existing Obsidian vault opens without modification.
- [x] Editing a note in the replica and then opening it in the original Obsidian shows no semantic change.
- [x] `.canvas` files produced in either app open in the other.
- [x] `.base` files produced in either app open in the other.
- [x] Standard themes from the Obsidian community render correctly.
