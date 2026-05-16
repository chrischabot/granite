# Command palette and Quick Switcher

Granite is keyboard-first. Two prompts in particular do most of the
heavy lifting:

- **Quick Switcher** (`Mod+O`) — fuzzy-find any note in the vault and
  open it.
- **Command palette** (`Mod+P`) — fuzzy-find any command and run it.

Both share the same visual style and the same keyboard behaviour. If
you learn one, you know the other.

## Shared keyboard contract

| Key | Effect |
|-----|--------|
| `Up` / `Down` | Move the selection. |
| `PageUp` / `PageDown` | Move by about 10 rows. |
| `Home` / `End` | Jump to first / last result. |
| `Enter` | Activate the selected result. |
| `Shift+Enter` | Secondary action — create a new note (Quick Switcher) or run-and-keep-open. |
| `Mod+Enter` | Open in a new tab (Quick Switcher) or run in a secondary context. |
| `Esc` | Close the prompt. |
| `Tab` | Where supported, accept the current value as a partial — e.g. drill into headings inside the link autocomplete. |

Both prompts use **fuzzy matching** — they match every input
character as a subsequence and rank by how tightly the characters
cluster. Acronyms work: typing `scf` finds *Save current file*.

## Command palette

Open with `Mod+P` or click the ribbon's *Open command palette* icon.

### What you see

- An input bar with placeholder *Type to search…*.
- Every command currently available — core commands plus those
  contributed by enabled plugins. Some commands are context-gated
  (e.g. *Toggle Live Preview / Source* only appears when the active
  tab is a Markdown editor).
- **Recently used commands** appear at the top when the input is
  empty; once you start typing, results re-rank by fuzzy score.

Each row shows:

- An optional plugin / origin label in faint text on the left.
- The command name as primary text.
- The bound hotkey (right-aligned and dim) if one exists.

### Pinned commands

You can pin commands so they always appear at the top of the palette,
above recently-used. Configure pins in *Settings → Plugin options →
Command palette*:

- *New pinned command* picker — choose any command to pin.
- Remove a pinned command via the **×** next to its entry.

### Running a command

Type a few characters, use the arrows or your mouse to pick a row,
press `Enter`. The palette closes and the command runs.

## Quick Switcher

Open with `Mod+O` or click the ribbon's *Open Quick Switcher* icon.

### What you see

- Every Markdown note in the vault — plus other supported file types.
- Every alias on those notes (an alias row shows with a curved-arrow
  icon).
- **Recently opened notes** when the input is empty.

### Match behaviour

| Input | Result |
|-------|--------|
| (empty) | Up to about 25 most-recently-opened notes. |
| Some text | Fuzzy-matched notes and aliases, ranked by score then recency. |
| No exact match | Pressing **`Enter`** creates a new note named exactly your input. |
| An exact match exists but you want a *new* note with that name | Press `Shift+Enter` to force-create. |
| You want to open in a new tab | Press `Mod+Enter`. |

Excluded files appear at the bottom of the list, after non-excluded
results. They are still findable — just deprioritised.

### Performance at scale

In vaults of more than 10,000 files, the Quick Switcher transparently
switches to a coarser, faster matcher to keep the UI responsive. You
should not notice anything except that ranking is slightly less
precise.

## Slash commands

When the **Slash commands** core plugin is enabled, typing `/` at the
start of a line or after whitespace inside the editor opens a fuzzy
command popover identical in appearance and keys to the Command
palette — but anchored to the cursor instead of centered.

| Key | Effect |
|-----|--------|
| arrow keys | Move selection. |
| `Enter` | Run the command and dismiss. |
| `Esc` or `Space` | Dismiss without running. |

The popover shows only commands that make sense in an editor context.
Configure trigger character and code-block exclusion in *Settings →
Plugin options → Slash commands*.

## Keyboard-first workflow tips

Granite was designed around the assumption that you rarely take your
hands off the keyboard. A few habits that make a big difference:

- **Open notes with `Mod+O`.** Faster than the file tree once your
  vault is large.
- **Find any command with `Mod+P`.** You do not need to learn or
  invent hotkeys for commands you use occasionally — `Mod+P` then a
  couple of characters is fast enough.
- **Pin the commands you run weekly.** Pinned commands take a single
  `Mod+P` then `Enter` to run.
- **Bind hotkeys for commands you run daily.** *Settings → Hotkeys*.
- **Use slash commands inside the editor.** They keep your hands on
  the editing line.

## See also

- [Hotkeys](./hotkeys.md) — assigning shortcuts to commands.
- [Search](./search.md) — for finding content (not just files).
- [Reference → Commands](../reference/commands.md) — the full command
  catalog.

---

[← Graph view](./graph.md) · [Index](./README.md) · [next: Hotkeys →](./hotkeys.md)
