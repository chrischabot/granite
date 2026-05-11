# 17 — Hotkeys reference

Two layers of keyboard shortcuts:
- **Hotkeys** — bound to commands; user-customizable in Settings → Hotkeys.
- **Editing shortcuts** — provided by the OS / underlying editor framework; not customizable from within the app.

## 17.1 Default Hotkeys (customizable)

Conventions: `Ctrl` is `Cmd` on macOS unless otherwise noted; `Alt` is `Option` on macOS.

### File operations

| Command | Default |
|---------|---------|
| Create new note | `Ctrl/Cmd + N` |
| Create new note in new tab/pane | `Ctrl/Cmd + Shift + N` |
| Save current file | `Ctrl/Cmd + S` |
| Close active tab | `Ctrl/Cmd + W` |
| Close all other tabs | (unbound) |
| Close all tabs to the right | (unbound) |
| Reopen last closed tab | `Ctrl/Cmd + Shift + T` |
| Open new tab | `Ctrl/Cmd + T` |
| Delete current file | (unbound) |
| Rename current file | `F2` |
| Move current file to another folder | (unbound) |
| Open settings | `Ctrl/Cmd + ,` |

### Navigation

| Command | Default |
|---------|---------|
| Navigate back | `Ctrl/Cmd + Alt + ←` |
| Navigate forward | `Ctrl/Cmd + Alt + →` |
| Open quick switcher | `Ctrl/Cmd + O` |
| Open command palette | `Ctrl/Cmd + P` |
| Toggle Reading view / Editing view | `Ctrl/Cmd + E` |
| Toggle Live Preview / Source mode | (unbound) |
| Open graph view | `Ctrl/Cmd + G` |
| Open local graph | `Ctrl/Cmd + Shift + G` |
| Search current file | `Ctrl/Cmd + F` |
| Search and replace in current file | `Ctrl/Cmd + H` |
| Search in all files | `Ctrl/Cmd + Shift + F` |

### Tab management

| Command | Default |
|---------|---------|
| Next tab | `Ctrl + Tab` (Win/Linux) · `Ctrl + Tab` (macOS) |
| Previous tab | `Ctrl + Shift + Tab` |
| Switch to tab N | `Ctrl/Cmd + 1` … `Ctrl/Cmd + 8` |
| Switch to last tab | `Ctrl/Cmd + 9` |
| Move current tab to new window | (unbound) |
| Move current tab to next pane | (unbound) |
| Split right | (unbound) |
| Split down | (unbound) |
| Focus on pane above / below / left / right | (unbound) |

### Editing (formatting commands)

| Command | Default |
|---------|---------|
| Toggle bold | `Ctrl/Cmd + B` |
| Toggle italic | `Ctrl/Cmd + I` |
| Toggle code | `` Ctrl/Cmd + ` `` |
| Insert link | `Ctrl/Cmd + K` |
| Toggle highlight | (unbound) |
| Toggle strikethrough | (unbound) |
| Toggle blockquote | (unbound) |
| Toggle bullet list | (unbound) |
| Toggle numbered list | (unbound) |
| Toggle task list | (unbound) |
| Cycle heading H1…H6 | (unbound) |
| Insert callout | (unbound) |
| Insert table | (unbound) |
| Insert horizontal rule | (unbound) |
| Insert template | (unbound; via ribbon) |
| Add file property | `Ctrl/Cmd + ;` |
| Toggle folding at cursor (Fold more) | (unbound) |
| Toggle unfolding at cursor (Fold less) | (unbound) |
| Fold all | (unbound) |
| Unfold all | (unbound) |
| Delete current line | `Ctrl/Cmd + Shift + K` (system shortcut) |

### Sidebars and workspace

| Command | Default |
|---------|---------|
| Toggle left sidebar | (unbound) |
| Toggle right sidebar | (unbound) |
| Show/hide ribbon | (unbound) |
| Manage workspace layouts | (unbound) |
| Save current workspace layout | (unbound) |
| Reload Obsidian without saving | (unbound) |

### Plugins (selection of bindable commands)

These have *no* default but are common assignments:

- *Bookmarks: Bookmark active tab*
- *Daily notes: Open today's daily note*
- *Daily notes: Open previous daily note*
- *Daily notes: Open next daily note*
- *Templates: Insert template*
- *Templates: Insert current date*
- *Templates: Insert current time*
- *Note composer: Merge current file with another file*
- *Note composer: Extract current selection*
- *Random note: Open random note*
- *Audio recorder: Start/stop recording*
- *Bases: Create new base*
- *Canvas: Create new canvas*
- *Format converter: Open format converter*

## 17.2 System editing shortcuts (not customizable)

These come from the OS and the underlying editor framework. The replica must respect them so that text editing matches user expectations.

### Common actions (Windows / Linux | macOS)

| Action | Win/Linux | macOS |
|--------|-----------|-------|
| Copy | `Ctrl + C` | `Cmd + C` |
| Cut | `Ctrl + X` | `Cmd + X` |
| Paste | `Ctrl + V` | `Cmd + V` |
| Paste without formatting | `Ctrl + Shift + V` | `Cmd + Shift + V` |
| Undo | `Ctrl + Z` | `Cmd + Z` |
| Redo | `Ctrl + Shift + Z` or `Ctrl + Y` | `Cmd + Shift + Z` |
| Copy current paragraph (no selection) | `Ctrl + C` | `Cmd + C` |
| Cut current paragraph (no selection) | `Ctrl + X` | `Cmd + X` |
| Bold | `Ctrl + B` | `Cmd + B` |
| Italic | `Ctrl + I` | `Cmd + I` |

### Text editing

| Action | Win/Linux | macOS |
|--------|-----------|-------|
| Insert new line | `Enter` | `Enter` |
| Hard line break (within paragraph) | `Shift + Enter` | `Shift + Enter` |
| Delete previous character | `Backspace` | `Backspace` |
| Delete next character | `Delete` | `Delete` |
| Delete previous word | `Ctrl + Backspace` | `Option + Backspace` |
| Delete next word | `Ctrl + Delete` | `Option + Delete` |
| Delete to start of line | n/a | `Cmd + Backspace` |
| Delete to end of line | n/a | `Cmd + Delete` |
| Delete entire line (no selection) | `Ctrl + Shift + K` | `Cmd + Shift + K` |
| Indent / outdent (in lists) | `Tab` / `Shift + Tab` | `Tab` / `Shift + Tab` |

### Cursor movement

| Action | Win/Linux | macOS |
|--------|-----------|-------|
| Char left/right | `←` / `→` | `←` / `→` |
| To start of previous word | `Ctrl + ←` | `Option + ←` |
| To end of next word | `Ctrl + →` | `Option + →` |
| To start of line | `Home` | `Cmd + ←` |
| To end of line | `End` | `Cmd + →` |
| Up/down line | `↑` / `↓` | `↑` / `↓` |
| To start of note | `Ctrl + Home` | `Cmd + ↑` |
| To end of note | `Ctrl + End` | `Cmd + ↓` |
| Page up / down | `Page Up` / `Page Down` | `Fn + ↑` / `Fn + ↓` |

### Selection

| Action | Win/Linux | macOS |
|--------|-----------|-------|
| Simplify selection (collapse to caret) | `Esc` | `Esc` |
| Select all | `Ctrl + A` | `Cmd + A` |
| Extend by char | `Shift + ←/→` | `Shift + ←/→` |
| Extend by word | `Ctrl + Shift + ←/→` | `Option + Shift + ←/→` |
| Extend to start/end of line | `Shift + Home/End` | `Cmd + Shift + ←/→` |
| Extend to start/end of note | `Ctrl + Shift + Home/End` | `Cmd + Shift + ↑/↓` |
| Extend page up/down | `Shift + Page Up/Down` | `Ctrl + Shift + ↑/↓` |
| Add caret (multi-cursor) | `Alt + click` | `Option + click` |
| Rectangular selection drag | `Shift + Alt + drag` | `Shift + Option + drag` |

### Modifiers when clicking links

| Modifier | Effect |
|----------|--------|
| (none) | Navigate in current tab. |
| `Ctrl/Cmd + click` | Open in new tab. |
| `Ctrl/Cmd + Shift + click` | Open in new tab from Source mode. |
| `Ctrl/Cmd + Alt/Option + click` | Open in new tab group (split). |
| `Ctrl/Cmd + Alt/Option + Shift + click` | Open in new pop-out window. |

### Properties block keyboard contract

Already enumerated in `10_properties_and_tags.md` §10.4.

## 17.3 Customizing hotkeys

1. Open Settings → Hotkeys.
2. Search for the command (or browse).
3. Click `+` to assign or `×` to remove.
4. In the capture modal, press the desired combination, then click *Save*.

A command may have multiple hotkey bindings.

When two commands collide, the most recently registered binding wins for the focused context, but the user is warned during assignment.

## 17.4 Conventions

- Don't use single-letter hotkeys without modifiers (they collide with typing).
- Reserve `F1`–`F12` (function keys) for power-user customization.
- The implementation should normalize physical keys (e.g. treat both `=` and `+`-when-shifted as the same code so `Ctrl/Cmd + +` and `Ctrl/Cmd + =` both work for "zoom in").