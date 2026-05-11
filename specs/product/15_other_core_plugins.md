# 15 — Remaining core plugins

Each section here is independently togglable in *Settings → Core plugins*. Together with the plugins documented in earlier files (File explorer, Search, Bookmarks, Tags view, Properties view, Quick switcher, Command palette, Graph view, Backlinks, Outgoing links, Outline, Footnotes view, Canvas, Bases) these form the complete core feature set.

## 15.1 Daily notes

Creates or opens a note for the current date.

### Command

- *Open today's daily note* (ribbon: `calendar` icon).
- *Open previous daily note* / *Open next daily note* (assignable hotkeys).

### Settings

| Setting | Type | Default |
|--------|------|---------|
| Date format | Moment.js format string | `YYYY-MM-DD` |
| New file location | folder picker | vault root |
| Template file location | file picker | empty |
| Open daily note on startup | toggle | off |

A date format containing `/` creates subfolders automatically (e.g. `YYYY/MM/YYYY-MM-DD`).

### Date-property linking

When this plugin is enabled, any Date-typed property whose value matches the daily-note date renders as a clickable link in Live Preview/Reading view.

## 15.2 Templates

Inserts a chosen template file at the cursor.

### Variables

| Variable | Meaning |
|----------|---------|
| `{{title}}` | Active note's title (filename without extension). |
| `{{date}}` | Current date, default `YYYY-MM-DD`. |
| `{{time}}` | Current time, default `HH:mm`. |
| `{{date:FORMAT}}` / `{{time:FORMAT}}` | Custom Moment.js format. |

### Settings

| Setting | Type | Default |
|--------|------|---------|
| Template folder location | folder picker | empty |
| Date format | Moment.js | `YYYY-MM-DD` |
| Time format | Moment.js | `HH:mm` |

### Behaviors

- Insertion places the template at the cursor; if no caret is in the editor, at the last cursor position.
- If the active note already has YAML properties and the template also has YAML properties, the *property keys* merge (template values overwrite on conflict).
- *Templates: Insert template* command opens a Quick-switcher-style picker over the template folder.
- Two convenience commands: *Templates: Insert current date*, *Templates: Insert current time*.

## 15.3 Unique note creator (Zettelkasten)

Creates a note whose name is a timestamp, e.g. `202401010945`.

### Settings

| Setting | Type |
|--------|------|
| Date format | Moment.js (default `YYYYMMDDHHmm`) |
| New file location | folder picker |
| Template file location | file picker |

### Command

- *Create new unique note* (ribbon: `sheet-in-box` icon).

If a file with the generated name already exists, the next available timestamp is used.

## 15.4 Audio recorder

Captures audio from the system microphone and embeds it in the active note.

### Behavior

- Ribbon icon `mic` toggles recording on / off.
- On stop: writes the audio file (default `.webm` or system codec) to the attachments folder, embeds it at the end of the active note via `![[file]]`.
- Recordings remain in the vault even after their embed is removed; manually delete via File explorer.

### Settings

| Setting | Default |
|---------|---------|
| Audio format | system default / `.webm` |
| Bitrate | system default |

(No special UI is needed.)

## 15.5 File recovery

Periodic on-disk snapshots so the user can roll back any file.

### Behavior

- Snapshots the **full content** of every changed `.md` and `.canvas` file at intervals.
- Stored in the **global** application data folder (not the vault) so they survive vault deletion.
- Default cadence: every 5 minutes if changes occurred. Default retention: 7 days.

### Settings

| Setting | Default |
|---------|---------|
| Snapshot interval (minutes) | 5 |
| Retention (days) | 7 |
| Maximum total size (MB) | unspecified — let the user control via retention |

### UI: View / restore

A *View* button opens a modal:
1. Filename field — type to filter files.
2. Snapshots list (right side) for the chosen file.
3. Diff display in the center (additions green, deletions red).
4. *Show changes* toggle.
5. Buttons: *Copy* (to clipboard) and *Restore* (overwrites current file with snapshot).

A *Clear* button clears all snapshots after a confirmation.

### Limitations

- Doesn't sync between devices (snapshots are local).
- Only `.md` and `.canvas` files.
- Disabled on macOS/iOS Lockdown Mode unless Obsidian is exempted.

## 15.6 Format converter

One-shot batch converter that rewrites notes to update legacy syntaxes.

### Categories

- **Roam Research**: `#tag` and `#[[tag]]` → `[[tag]]`; `^^highlight^^` → `==highlight==`; `{{[[TODO]]}}` → `[ ]`.
- **Bear**: `::highlight::` → `==highlight==`.
- **Zettelkasten linker**: `[[UID]]` → `[[UID File Name]]` (full) or `[[UID File Name|File Name]]` (pretty).
- **Properties**: deprecated `tag` → `tags:`, `alias` → `aliases:`, `cssclass` → `cssclasses:`.

### UX

A modal with a checklist of categories and a *Start conversion* button. A warning above the checklist tells the user to back up first. Converts the entire vault in one pass.

## 15.7 Note composer

Two operations: **merge** and **extract**.

### Merge

Combines one note into another and removes the source. Updates all wikilinks pointing at the source to point at the destination.

- Editor: *More options → Note composer → Merge entire file with…*
- File explorer: right-click → *Merge entire file with…*
- Command palette: *Note composer: Merge current file with another file…*

The destination-picker is a Quick-switcher-style modal. Activation:
- `Enter` → append to destination's end.
- `Shift+Enter` → prepend to destination's start.
- `Ctrl/Cmd+Enter` → create a new file at the destination's location with the merged content.

A confirmation dialog appears before merge unless disabled in settings.

### Extract

Pulls the current selection out of the active note into a new note (or appends to a chosen note), leaving behind a link or embed.

- Right-click in editor on a selection → *Extract current selection…*
- Command palette: *Note composer: Extract current selection…*

After extraction, the selected text is replaced. By default it becomes a wikilink to the new note; settings allow:
- **Replace with link** *(default)*
- **Replace with embed**
- **Leave nothing**

### Template variables

When *Template file location* is set, the new file is built from the template; available tokens:

| Token | Description |
|-------|-------------|
| `{{content}}` | The merged/extracted text. If absent from the template, content is appended. |
| `{{fromTitle}}` | Source note's name. |
| `{{newTitle}}` | Destination note's name. |
| `{{date:FORMAT}}` | Current date, formatted. |

## 15.8 Page preview

Hover a link → floating popover shows the linked content.

### Settings

| Setting | Default |
|---------|---------|
| In editor (require Ctrl/Cmd) | on |
| In sidebar / search / file explorer | on |
| Hover delay (ms) | 200 |

When *In editor* is on and *require Ctrl/Cmd* is also on, you must hold the modifier while hovering to summon the preview. With it off, a plain hover triggers it.

## 15.9 Random note

Opens a randomly-chosen note in the vault.

- Ribbon: `dice` icon.
- Hotkey: not bound by default; bindable as *Open random note*.

A setting filters to a folder if desired.

## 15.10 Slides

A minimalist presentation mode using `---` to separate slides in a Markdown file.

### Starting

- Right-click a tab → *Start presentation*.
- Command palette → *Slides: Start presentation*.

### Navigation

| Key | Action |
|-----|--------|
| `→` / `Space` | Next slide. |
| `←` | Previous slide. |
| `↑` / `↓` | Same as `←` / `→` (alternate). |
| `Esc` | Exit presentation. |

The presentation overlays at z-layer `--layer-slides` (45) with a centered viewport. A back-arrow / forward-arrow / close-cross cluster sits in the bottom-right.

## 15.11 Web viewer

Renders web pages inside an Obsidian tab using a sandboxed Chromium webview.

### URL bar

- Back / Forward / Reload / *Reader view* (`glasses` icon) / *More* (`more-horizontal`) icons.
- Address input field.

### Reader view

Strips chrome and shows main article content using a Readability-style algorithm.

### Save to vault

The *More* menu offers *Save page* — converts to Markdown and writes a new note in the configured folder.

### Settings

| Setting | Default |
|---------|---------|
| Save location | vault root |
| Open links from external apps in Web viewer | off |
| Enable ad blocking | on |
| Custom block lists | empty |

### Security warnings

Plugins can read cookies in Web viewer. Warn the user accordingly. Don't use Web viewer for password-protected sites if other plugins are enabled.

## 15.12 Word count

Adds a word/character/line count to the status bar (bottom-right of desktop) or the top of the right sidebar (mobile).

CJK aware: word boundaries fall back to character counts for Chinese / Japanese / Korean.

## 15.13 Workspaces (layout snapshots)

Saves and restores the full UI layout (open tabs, splits, sidebar widths, sidebar tab order, pinned states).

### Commands

- *Manage workspace layouts* (ribbon: `panels-top-left`).
- *Save layout*
- *Load layout*
- *Delete layout*

### Manage modal

Lists each saved layout with *Load* / *Delete (×)* buttons and an input to save the current layout under a new name. Re-saving an existing name overwrites it.

### Storage

Layouts persist in `.obsidian/workspaces.json`.

## 15.14 Slash commands

Already specified in `13_command_palette_search_quickswitcher.md` §13.5 — listed here for completeness as a core plugin.

### Settings

| Setting | Default |
|---------|---------|
| Trigger character | `/` |
| Disable inside code blocks | on |

## 15.15 Where each plugin's enable state is persisted

`.obsidian/core-plugins.json` lists every core plugin with an enabled/disabled flag. When the app boots, it reads this file and only initializes plugins flagged enabled. Disabled plugins must not register their commands, sidebar tabs, or ribbon icons.