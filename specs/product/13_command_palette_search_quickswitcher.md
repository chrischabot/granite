# 13 — Keyboard prompts: Command palette, Quick Switcher, Search

The app has three first-class fuzzy-prompt surfaces. They share visual styling (rounded modal floated near the top of the window) but address different domains.

## 13.1 Common visual language

All three prompts use the **Prompt** component:

| CSS variable | Meaning |
|--------------|---------|
| `--prompt-input-height` | Height of the input bar at the top of the prompt. |
| `--prompt-width` | Default width. |
| `--prompt-max-width` | Maximum width (smaller window cap). |
| `--prompt-max-height` | Max height of the result list. |
| `--prompt-border-width` | Border width. |
| `--prompt-border-color` | Border color (uses `--background-modifier-border`). |

Layer: `--layer-modal` (50). A semi-transparent dimmer at `--layer-cover` (5) goes behind the prompt.

Keyboard contract every prompt obeys:

| Key | Effect |
|-----|--------|
| `Up` / `Down` | Move selection. |
| `PageUp` / `PageDown` | Move by ~10. |
| `Home` / `End` | Jump to first / last result. |
| `Enter` | Activate the selected result. |
| `Shift+Enter` | Force-create a new note (Quick Switcher) or other "secondary" action. |
| `Ctrl/Cmd+Enter` | Open in a new tab (Quick Switcher) or run-and-keep-open. |
| `Esc` | Close the prompt. |
| `Tab` | Where supported, accept the current value as a partial (e.g. drill into headings). |

Fuzzy matching is required (every prompt does subsequence matching with score-by-position). Acronym fuzziness — typing "scf" must find "Save current file".

## 13.2 Command palette

Opens with `Ctrl/Cmd+P` or the ribbon's *Open command palette* (`terminal` icon).

### Behavior

- Top of the prompt: search input with placeholder "Type to search…".
- Result list: every registered command (core + plugin) the user can run *right now* (some commands are context-gated — e.g. *Toggle Live Preview/Source* only shows when the active tab is a Markdown editor).
- Each result row shows:
  - Optional plugin/origin label (small, faint, left).
  - Command name (primary text).
  - Hotkey (right-aligned, dim) if one is bound.
- **Recently used commands** appear at the top when the search input is empty (fuzzy matches still re-rank as the user types).

### Pinned commands

Configurable in Settings → Plugin options → Command palette:

- *New pinned command* selector lists all commands; pick one to pin.
- Pinned commands appear above recently used.
- Remove via the **×** next to each pinned entry.

### Implementation notes

- The Command Registry must support: `id`, `name`, `callback`, `icon` (optional), `hotkeys` (default), `checkCallback` (returns whether to show the entry given the current context), `repeatable`, `mobileOnly` flag.
- A command entry might also expose an `editorCallback` variant that only shows in editor contexts.

## 13.3 Quick Switcher

Opens with `Ctrl/Cmd+O` or ribbon's *Open Quick switcher* (`file-search` icon). Mobile: tapping the bottom-center plus button when not editing.

### Result domain

- Every Markdown note in the vault (and other supported file types).
- Every alias of those notes (rendered with a curved-arrow indicator next to the name).
- Recent notes (when input is empty, list = MRU descending).

### Match rules

| Input | Result |
|-------|--------|
| Empty | Up to ~25 most recent notes. |
| Some text | Fuzzy-matched notes and aliases, sorted by score then recency. |
| Text matches no existing file | The result list still shows close matches; pressing **`Enter`** with no exact match creates a new note named exactly that input. |
| Exact match exists but the user wants a *new* note with that name | `Shift+Enter` to force-create. |
| | `Ctrl/Cmd+Enter` to open in a new tab. |
| `[[Note#` *typed in the editor*, not the switcher | The same logic powers in-editor link-autocomplete. |

### Performance behavior at scale

In vaults of 10,000+ entries, switch to a coarser/faster matcher (less precise but no UI stall). The threshold is currently 10,000 items; document this number and make it configurable via a hidden setting.

### Excluded files

Items matching the user's *Excluded files* patterns are deprioritized to the bottom of the list.

## 13.4 Search (full-text)

Opens with `Ctrl/Cmd+Shift+F` or by clicking the Search tab in the left sidebar. The full UI lives in the sidebar (not a modal). When opened by hotkey while text is selected, the selected text becomes the initial query.

### Operator language

| Operator | Description | Example |
|----------|-------------|---------|
| (bare word) | Match in note content. | `meeting work` |
| `"phrase"` | Exact phrase. | `"star wars"` |
| `OR` | Disjunction. | `meeting OR call` |
| `-term` | Negation. | `-archive` |
| `( )` | Group. | `(work OR meetup) -archive` |
| `file:` | Match in filename. | `file:.png` |
| `path:` | Match in vault path. | `path:"Daily/2025"` |
| `content:` | Force content-only match. | `content:"happy cat"` |
| `match-case:` | Case-sensitive match for a token. | `match-case:HappyCat` |
| `ignore-case:` | Case-insensitive. | `ignore-case:ikea` |
| `tag:` | Find tag (skips code blocks). | `tag:#work` |
| `line:` | At least one line matches. | `line:(mix flour)` |
| `block:` | Within the same block. | `block:(dog cat)` |
| `section:` | Within the same heading section. | `section:(intro)` |
| `task:` | In a task. | `task:call` |
| `task-todo:` | In an unchecked task. | `task-todo:call` |
| `task-done:` | In a checked task. | `task-done:call` |
| `[propname]` | Has property. | `[aliases]` |
| `[propname:value]` | Property equals (sub-queryable). | `[status:Draft OR Published]` |
| `[propname:null]` | Property exists but is empty. | `[date:null]` |
| `/regex/` | JavaScript-flavor regex. | `/\d{4}-\d{2}-\d{2}/` |
| `[propname:>5]` etc. | Range filter on numeric properties. | `[duration:>5]` |

### Operator precedence

`( )` highest, then `-`, then `OR`, then concatenation (implicit `AND`).

### Query *Explain* mode

The settings popover offers *Explain search term*, which when on shows a plain-English breakdown of the parsed query above the results list. Useful for debugging.

### Result list

Two visual modes:

| Mode | Behavior |
|------|----------|
| Collapsed | Shows file rows only, count of matches per file in a small chip on the right. |
| Expanded (default) | Each file row, then snippet rows beneath showing match context with the matched substring highlighted via `--text-highlight-bg`. |

Toggle via the settings popover (sliders icon).

The *Show more context* toggle expands snippets from a single line up to the full enclosing paragraph.

Drag a result file row to insert a link to it elsewhere; right-click for a *Bookmark*, *Copy markdown link*, *Reveal in file explorer* menu.

### Sort orders

The same six file-system orders supported in File explorer: file name A↔Z, modified time new↔old, created time new↔old.

### Result actions

The `more-horizontal` (three-dots) icon next to the count opens:
- *Copy search results*
- *Bookmark this search* (saves the query as a Bookmarks entry)
- *Replace in vault…* (rare — guarded behind a confirmation)

### Embedding

A `query` fenced code block in any note runs the embedded query and renders results inline:

````md
```query
tag:#meeting -path:Archive
```
````

## 13.5 Slash commands (in-editor mini-palette)

When the *Slash commands* core plugin is enabled, typing `/` at the start of a line or after whitespace inside the editor opens a fuzzy command popover identical in appearance and keyboard contract to the Command palette but anchored to the cursor location. `Esc` or `Space` dismisses without invoking; arrow keys navigate; `Enter` runs.

The popover shows only commands that make sense from the editor (so things like *Open settings* still appear, but not *e.g. Copy line down* if the cursor is in a non-editor context).

## 13.6 Implementation: shared modal infrastructure

Build one `Modal` primitive and one `SuggestModal<T>` derivative used by all three prompts, plus the link-autocomplete popover, plus the Insert-template picker, etc. Keys behaviors are identical so users can build muscle memory.