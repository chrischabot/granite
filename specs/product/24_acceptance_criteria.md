# 24 — Acceptance criteria

A checklist of testable conditions the v1 desktop replica must satisfy before shipping. Each item should be verifiable with an automated test or a documented manual procedure.

## 24.1 Vault and files

- [ ] Opening a vault folder for the first time creates a `.obsidian/` configuration folder containing only the files the app actually uses (no junk).
- [ ] Every accepted file format (see `20_file_storage.md` §20.2) is recognized in File explorer with the correct icon and is openable in its appropriate view.
- [ ] An external edit to a `.md` file (made in another text editor) appears in the open editor within ≤ 500 ms.
- [ ] Renaming a note via File explorer or `F2` updates every wikilink and Markdown link to it across the vault, in ≤ 1 s for a 10k-note vault.
- [ ] Deleting a note honors the configured trash setting (system trash / vault `.trash/` / permanent).
- [ ] Atomic save: killing the process during a save never produces a half-written file.
- [ ] Vaults can be added, opened, renamed, moved, and removed via the Vault Switcher.
- [ ] Multiple vaults can be open simultaneously, each in its own window.

## 24.2 Editor

- [ ] All three modes (Reading, Live Preview, Source) are reachable and toggleable via hotkey, status bar (when enabled), and view switcher.
- [ ] Live Preview hides Markdown markers when the cursor is outside the corresponding line/block, reveals them when the cursor is inside.
- [ ] All inline formats from `07_markdown_syntax.md` §7.3 round-trip correctly between Source and Live Preview.
- [ ] Spellcheck respects the configured language (or system default on macOS).
- [ ] Vim key bindings, when enabled, support normal/insert/visual mode and key remapping.
- [ ] Multi-cursor editing works with `Alt/Option + click`.
- [ ] Rectangular selection with `Shift+Alt/Option + drag`.
- [ ] Folding works at heading and indent levels; folded state restored across reload.

## 24.3 Markdown parser fidelity

- [ ] CommonMark conformance test suite passes ≥ 99% of cases.
- [ ] GFM conformance: tables, task lists, strikethrough, autolinks, all pass.
- [ ] Obsidian extensions: wikilinks (with display text), embeds, block IDs, callouts (every default type + foldable + nested), highlights, comments, math (block + inline), Mermaid diagrams, footnotes (block + inline) — all render correctly.
- [ ] Markdown is *not* parsed inside HTML blocks (intentional limitation).

## 24.4 Linking & metadata

- [ ] Wikilink autocomplete shows files and aliases after typing `[[`.
- [ ] Heading autocomplete after typing `#` inside a wikilink.
- [ ] Block autocomplete after typing `^` inside a wikilink.
- [ ] Vault-wide heading search via `[[##term`.
- [ ] Vault-wide block search via `[[^^term`.
- [ ] Backlinks panel correctly counts and renders both Linked and Unlinked mentions.
- [ ] Outgoing links panel correctly enumerates current note's links and unlinked mentions.
- [ ] Aliases populate Quick Switcher and link autocomplete.
- [ ] Excluded files honor their patterns across all surfaces.

## 24.5 Properties

- [ ] All seven property types (Text, List, Number, Checkbox, Date, Date & time, Tags) editable inline.
- [ ] Type changes propagate vault-wide via the All-properties view.
- [ ] Default keys (`tags`, `aliases`, `cssclasses`) work as documented.
- [ ] Deprecated singular keys (`tag`, `alias`, `cssclass`) can be migrated by Format Converter.
- [ ] JSON-style frontmatter is parsed and rewritten as YAML on save.
- [ ] Internal links inside Text or List properties remain quoted on save.

## 24.6 Tags

- [ ] Tags from body and YAML are unified in Tags view.
- [ ] Nested tags display hierarchically when *Show nested tags* is on.
- [ ] Case-insensitive matching but case-preserved display.
- [ ] All-numeric tags rejected; alphanumeric/Unicode tags accepted.

## 24.7 Search

- [ ] Every operator in `13_command_palette_search_quickswitcher.md` §13.4 produces correct results on the integration fixture vault.
- [ ] Regex via `/.../` works (JS flavor).
- [ ] Property search `[name]`, `[name:value]`, `[name:null]`, with sub-queries.
- [ ] Match-case toggle changes results live.
- [ ] Sort order options change results live.
- [ ] Embedded `query` code blocks render live results in notes.
- [ ] Search performance: 10k-note vault, full-text non-regex query, < 200 ms to first paint.

## 24.8 Graph

- [ ] Global graph renders all nodes and edges from the metadata cache.
- [ ] Local graph follows the active tab when opened as a linked view.
- [ ] Filters, groups, display sliders, force sliders all behave per `14_graph_view.md`.
- [ ] Graph state persists with the workspace.
- [ ] Performance: 10k nodes at ≥ 30 fps while panning.

## 24.9 Canvas

- [ ] All four card types (text/file/link/group) creatable.
- [ ] Edges with custom anchors, labels, colors, and end markers work.
- [ ] JSON Canvas files produced by another conforming app open and round-trip cleanly.
- [ ] Pan, zoom, marquee, multi-select, snap toggle, alt-duplicate, shift-axis-lock, all behave per spec.
- [ ] Embedded canvases (`![[file.canvas]]`) render and interact in the host note.

## 24.10 Bases

- [ ] All four built-in view types (Table, List, Cards, Map-when-installed) render the fixture data.
- [ ] Filter, sort, group, and properties UIs match `12_bases.md`.
- [ ] Formulas evaluate correctly with the documented operators and built-in functions.
- [ ] Summaries (built-in + custom) compute as documented.
- [ ] `this` context resolves correctly per the three locations (main / embed / sidebar).
- [ ] Round-trip of a `.base` file: edit in UI → reopen as text → edit as text → reopen in UI.

## 24.11 Workspace and tabs

- [ ] Splitting tabs right and down works via right-click menu, More-options menu, drag, and Command palette.
- [ ] Stacked tab groups work with the documented stacking-CSS variables.
- [ ] Pop-out windows: drag a tab outside, move tabs between windows, close parent closes pop-outs.
- [ ] Workspaces plugin saves and restores complete layouts.
- [ ] Pinning tabs in central area prevents tab replacement.
- [ ] Pinning sidebar tabs freezes their target.

## 24.12 Sidebars

- [ ] Both sidebars collapse and expand via icon toggle.
- [ ] Sidebar tabs are reorderable by drag.
- [ ] Sidebar tabs are pop-out-able into the central area.
- [ ] Multiple sidebar tab groups (vertical splits within a sidebar) work.
- [ ] Vault profile button opens the Vault Switcher menu.

## 24.13 Status bar

- [ ] Word count chip works (CJK-aware).
- [ ] Editing-mode chip switches modes when enabled.
- [ ] Plugin-added status items appear and remove cleanly on plugin enable/disable.

## 24.14 Hotkeys

- [ ] Every default hotkey in `17_hotkeys_reference.md` §17.1 works out of the box.
- [ ] System editing shortcuts in §17.2 work in the editor.
- [ ] Custom hotkey assignment via Settings → Hotkeys: capture, save, conflicts, multi-binding.
- [ ] Hotkey display normalizes to US layout but triggers from physical keys.

## 24.15 Settings

- [ ] Every option enumerated in `16_settings_reference.md` exists, defaults match, persists across restart.
- [ ] Search inside Settings filters categories live.
- [ ] Per-plugin settings pages appear under "Plugin options" only when the plugin is enabled.
- [ ] Settings are written to the configured config folder, not the global folder.

## 24.16 Themes & snippets

- [ ] Switching themes from the dropdown applies instantly without restart.
- [ ] Light/dark mode follows OS, light-only, or dark-only per setting.
- [ ] Accent color picker updates `--accent-h/-s/-l` and propagates everywhere.
- [ ] CSS snippets folder is watched; saving a snippet file applies within < 500 ms.
- [ ] Each snippet has its own toggle.

## 24.17 Plugins

- [ ] Restricted mode default-on for new vaults.
- [ ] Browse → install → enable flow works for at least 3 popular community plugins from the existing Obsidian ecosystem.
- [ ] Plugin lifecycle (`onload` / `onunload`) cleans up registered commands, ribbon icons, sidebar tabs, settings tabs, event handlers.
- [ ] Plugin `loadData()` / `saveData()` persists to `data.json`.
- [ ] Plugin update check works against the configured registry.
- [ ] `minAppVersion` mismatch disables the plugin gracefully with a notice.

## 24.18 Drag and drop

- [ ] Every source × destination combination from `21_dnd_and_pop_out_windows.md` §21.1 / §21.2 produces the documented effect.
- [ ] External drags from the OS file manager and the browser behave as documented (with `Ctrl/Option` modifier behavior).
- [ ] Drop zones highlight visibly during drag.

## 24.19 Performance

- [ ] All performance budgets in `23_implementation_blueprint.md` §23.5 met.
- [ ] No frame drop > 50 ms while typing in a 100k-character note.
- [ ] No memory leak observed over a 4-hour session of normal use.

## 24.20 Accessibility

- [ ] All commands reachable from the keyboard (no mouse required for any core flow).
- [ ] Visible focus rings on every focusable element using `--background-modifier-border-focus`.
- [ ] Screen reader announces tab changes, modal opens, and notice content.
- [ ] All icon-only buttons have `aria-label` matching their tooltip.
- [ ] Minimum contrast 4.5:1 for body text in both light and dark themes.
- [ ] Reduced-motion preference respected (no graph-animate by default if set).

## 24.21 i18n

- [ ] String externalization complete; English + at least one RTL language demonstrable.
- [ ] Date pickers honor system locale.
- [ ] Right-to-left layout flips sidebars and text direction correctly when chosen per-note via property.

## 24.22 Crash safety & recovery

- [ ] On unexpected exit, the app reopens with the last saved workspace.
- [ ] File recovery snapshots can restore a note to a prior state.
- [ ] Atomic-write protocol is unit-tested.
- [ ] No data loss in 100 random kill-and-restart cycles during edit-heavy use.

## 24.23 Compatibility round-trip

- [ ] An existing Obsidian vault opens without modification.
- [ ] Editing a note in the replica and then opening it in the original Obsidian shows no semantic change.
- [ ] `.canvas` files produced in either app open in the other.
- [ ] `.base` files produced in either app open in the other.
- [ ] Standard themes from the Obsidian community render correctly.