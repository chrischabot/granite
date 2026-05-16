# Hotkeys

A **hotkey** is a keyboard shortcut bound to a command. Granite ships
with a set of default hotkeys and lets you remap any of them (or add
your own) from *Settings → Hotkeys*.

This page covers how hotkeys work and how to customise them. For the
exhaustive list of default bindings, see the
[hotkeys reference](../reference/hotkeys.md).

## Two layers of shortcuts

Granite distinguishes two categories:

- **Hotkeys** — bound to commands; configurable in
  *Settings → Hotkeys*. Examples: `Mod+P` (open command palette),
  `Mod+E` (toggle Reading view).
- **Editing shortcuts** — provided by the OS and the underlying text
  editor (CodeMirror). Examples: `Mod+C` (copy), `Mod+Z` (undo),
  `Option+Backspace` (delete previous word). These are *not*
  customisable from within Granite.

Editing shortcuts behave the way they do everywhere else on your
system. If something feels off, it is almost always a hotkey, not an
editing shortcut.

## The `Mod` modifier

Granite documents shortcuts with a neutral `Mod` modifier:

- `Mod` = `Cmd` on macOS.
- `Mod` = `Ctrl` on Windows and Linux.

`Alt` on Windows/Linux equals `Option` on macOS.

So `Mod+Shift+F` reads as `Cmd+Shift+F` on a Mac and
`Ctrl+Shift+F` on a PC.

## A few hotkeys to know

A small handful you will use constantly:

| Shortcut | Command |
|----------|---------|
| `Mod+P` | Open command palette |
| `Mod+O` | Open Quick Switcher |
| `Mod+E` | Toggle Reading view / Editing view |
| `Mod+N` | Create new note |
| `Mod+S` | Save current file |
| `Mod+W` | Close active tab |
| `Mod+T` | Open new tab |
| `Mod+Shift+T` | Reopen last closed tab |
| `Mod+F` | Search current file |
| `Mod+Shift+F` | Search in all files |
| `Mod+G` | Open graph view |
| `Mod+Shift+G` | Open local graph |
| `Mod+B` | Toggle bold |
| `Mod+I` | Toggle italic |
| `Mod+K` | Insert link |
| `Mod+;` | Add file property |
| `Mod+,` | Open settings |

For the complete catalog of defaults — file ops, tab management,
formatting, sidebars, plugin commands — see the
[hotkeys reference](../reference/hotkeys.md).

## Customising hotkeys

Open *Settings → Hotkeys*. Each row is a command:

- Command name on the left, with a faint plugin/category prefix.
- Each currently-assigned hotkey as a chip with an **×** to remove it.
- A **+** button to add a new hotkey.

### Assigning a new hotkey

1. Click the **+** next to the command you want to bind.
2. A capture modal opens — press the key combination you want.
3. Click *Save* (or *Cancel* to abort).

You can bind **multiple hotkeys** to the same command. They are all
listed as chips on the command's row.

### Resolving conflicts

If the combination you press is already bound to another command, the
capture modal warns you and offers three buttons:

- *Replace* — remove the existing binding and use yours.
- *Add anyway* — keep both bindings. The most recently registered one
  wins for the focused context.
- *Cancel* — back out without changing anything.

### Filtering

A search input at the top of the page filters commands by name. The
filter icon next to it toggles to *Show only commands with assigned
hotkeys* — useful when reviewing your customisations.

### Removing a hotkey

Click the **×** on the chip next to the binding.

To remove **every** custom binding for a command and return it to its
default, remove each custom chip; the default reappears automatically
because it was never deleted, just shadowed.

## Tips for choosing hotkeys

A few guidelines that keep bindings sane:

- **Do not use single-letter shortcuts without modifiers.** They
  collide with typing.
- **Reserve `F1`–`F12` for power-user use.** They are easy to bind
  and rarely conflict.
- **Use `+` and `=` interchangeably.** Granite normalises physical
  keys, so `Mod+=` and `Mod++` both bind to "Zoom in".
- **Layout independence is built in.** Hotkey symbols are displayed
  in US QWERTY layout regardless of your actual keyboard layout, and
  the shortcut triggers from the underlying *physical* key code — so
  changing your input language does not break your bindings.

## Where bindings are stored

Custom hotkey bindings are stored at
`.granite/hotkeys.json` inside the vault. The file format is:

```json
{
  "command-id": [
    { "modifiers": ["Mod"], "key": "P" }
  ]
}
```

Editing this file by hand and reloading the app works fine. The file
is version-controlled with the rest of your vault if you keep your
vault in git.

## See also

- [Reference → Hotkeys](../reference/hotkeys.md) — every default
  binding.
- [Reference → Commands](../reference/commands.md) — the full command
  catalog.
- [Command palette](./command-palette.md) — run any command without a
  hotkey.

---

[← Command palette](./command-palette.md) · [Index](./README.md) · [next: Settings →](./settings.md)
