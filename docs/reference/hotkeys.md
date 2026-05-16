# Hotkeys

Every default key binding in Granite. Source: each `Command` registered in
`src/core/commands/core-commands.ts`. The dispatcher implementation lives in
`src/core/commands/hotkeys.ts`.

## Modifiers

- `Mod` is **Cmd on macOS** and **Ctrl on Windows/Linux**.
- `Cmd`, `Ctrl`, `Alt`, `Shift` name themselves literally.
- `formatHotkey(h)` renders `Mod` as `⌘` on macOS and `Ctrl` elsewhere; `Alt`
  as `⌥` / `Alt`; `Shift` as `⇧` / `Shift`.
- The dispatcher ignores key events whose target is an `<input>`,
  `<textarea>`, or `contenteditable` element **unless** `Ctrl` or `Meta` is
  held — so `Mod+F` works inside an input, but plain `F2` does not.

## Storage

- Default hotkeys live on each `Command.hotkeys`.
- User overrides are stored in `localStorage` under `granite.hotkeys.v1`.
- A user override **replaces** the default. Use `addUserHotkey` to add an
  extra binding without removing the default.

## App / shell

| Command | Default hotkey | Notes |
|---------|----------------|-------|
| Open command palette | `Mod+P`, `Mod+Shift+P` | Both shortcuts are registered as defaults. |
| Open quick switcher | `Mod+O` | |
| Open vault switcher | (unbound) | |
| Open settings | `Mod+,` | |
| Show keyboard cheat sheet | `F1` | |
| Toggle light / dark theme | (unbound) | |
| Install plugin from URL | (unbound) | |
| Check plugin updates | (unbound) | |

## File

| Command | Default hotkey |
|---------|----------------|
| Create new note | `Mod+N` |
| Create new note in new tab | `Mod+Shift+N` |
| Save current file | `Mod+S` |
| Reopen last closed tab | `Mod+Shift+T` |
| Open new tab | `Mod+T` |
| Rename current file | `F2` |
| Print active note | (unbound) |

## Editor

| Command | Default hotkey |
|---------|----------------|
| Toggle bold | `Mod+B` |
| Toggle italic | `Mod+I` |
| Toggle inline code | `` Mod+` `` |
| Insert link | `Mod+K` |
| Add file property | `Mod+;` |
| Toggle reading view | `Mod+E` |
| Insert block id | (unbound) |
| Split right | `` Mod+\ `` |
| Split down | `` Mod+Shift+\ `` |
| Close current tab group | (unbound) |
| Close active tab | `Mod+W` |
| Toggle pin | (unbound) |
| Reveal active file in explorer | (unbound) |
| Focus tab 1 … 9 | `Mod+1` … `Mod+9` (hidden commands) |

## Tabs

| Command | Default hotkey |
|---------|----------------|
| Switch to next tab | `Ctrl+Tab` |
| Switch to previous tab | `Ctrl+Shift+Tab` |

`Ctrl` is intentional here — even on macOS, `Ctrl+Tab` is the standard
tab-cycle binding.

## Navigation

| Command | Default hotkey |
|---------|----------------|
| Navigate back | `Mod+Alt+ArrowLeft` |
| Navigate forward | `Mod+Alt+ArrowRight` |

## Search

| Command | Default hotkey |
|---------|----------------|
| Search current file | `Mod+F` |
| Search and replace in current file | `Mod+H` |
| Search in all files | `Mod+Shift+F` |

`Mod+F` is also bound by CodeMirror's `searchKeymap` inside an editor; the
command is a palette-visible fallback for when focus is outside the editor.

## Graph and canvas

| Command | Default hotkey |
|---------|----------------|
| Open graph view | `Mod+G` |
| Open local graph | `Mod+Shift+G` |
| Create new canvas | (unbound) |

## Plugins

Plugins register commands with their own `hotkeys` array. The dispatcher
treats them identically to core commands; users can override them from
**Settings → Hotkeys**.

## Capturing a new hotkey

`captureHotkey(): Promise<Hotkey | null>` listens for a single keypress and
resolves to the resulting `Hotkey`. Escape resolves to `null`. The Hotkeys
settings tab uses this to power the "Record" button.

## See also

- [Commands reference](./commands.md) for the command id of every entry above.
- [User guide → Hotkeys](../user-guide/hotkeys.md) for the end-user workflow.
- [Plugin API → commands](./plugin-api.md#apicommands) to register your own.

[← settings](./settings.md) · [Index](./README.md) · [glossary →](./glossary.md)
