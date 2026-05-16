# Vaults

A **vault** is the folder of files Granite is currently showing. Every
note, attachment, canvas, and base inside that folder belongs to the
vault. Granite never moves your files out of the vault, never converts
them into a proprietary format, and never depends on a server.

You can have as many vaults as you like — one for work, one for
journaling, one for a book project. Each vault opens in its own window
and is completely independent.

## What lives inside a vault

A vault is just a folder on your filesystem. Granite recognises a few
file types directly and shows everything else as a generic attachment.

| File type | Extensions | Opened as |
|-----------|------------|-----------|
| Markdown notes | `.md` | Editor (Reading / Live Preview / Source) |
| Canvas | `.canvas` | Canvas view |
| Base | `.base` | Bases view |
| Image | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.bmp`, `.svg` | Inline preview |
| Audio | `.mp3`, `.m4a`, `.flac`, `.ogg`, `.wav`, `.webm`, `.3gp` | Audio player |
| Video | `.mp4`, `.mov`, `.mkv`, `.ogv`, `.webm` | Video player |
| PDF | `.pdf` | Embedded PDF reader |

Other extensions are still shown in the file explorer (when *Settings →
Files and links → Show all file types* is on) and can be linked or
embedded, but opening them is delegated to the operating system.

Two rules to keep in mind:

- **Vaults must not be nested.** Granite refuses to open a vault that
  lives inside another vault — internal links would not resolve
  correctly.
- **Files are UTF-8 plain text.** Markdown is encoded as UTF-8 without
  a BOM. Existing line endings are preserved; new files use your OS
  default (LF on macOS and Linux, CRLF on Windows).

## Opening a vault

Granite is a browser-based desktop app. The first time you launch it,
you will see the vault picker. From there you can:

- **Open an existing folder.** Pick any folder on your disk; Granite
  reads its contents directly using the browser's File System Access
  API. The folder becomes a vault the first time it is opened.
- **Create a new vault.** Pick a parent folder and a vault name;
  Granite creates an empty folder and opens it.
- **Reopen a recent vault.** Vaults you have opened before are listed
  in the *Vault switcher* (bottom of the left sidebar) and on the
  start screen.

The first time you open a folder your browser will prompt for
permission. Grant **read and write** access — otherwise Granite cannot
save your changes. The permission persists per browser profile; if you
clear site data you will be re-prompted on the next open.

## The vault switcher

A button at the bottom of the left sidebar shows the current vault's
name with a small chevron icon. Click it to:

- See the list of recent vaults.
- **Open another vault** in this window.
- **Open another vault in a new window** (`Mod+click`).
- **Manage vaults** — rename a label, remove a vault from the list, or
  remove the saved permission grant.

Removing a vault from the switcher only forgets it from Granite's
memory. The files on disk are not touched.

## Multiple vaults at once

Granite supports multiple windows, each pointing at a different vault.
Use the vault switcher's *Open in new window* option, or run the
command **Vault: Open another vault** from the Command palette
(`Mod+P`).

Each window has its own:

- Workspace layout (open tabs, sidebars, splits, pop-out windows).
- Settings — most options are stored per vault.
- Plugins — community plugins are enabled per vault, not globally.

What is shared across windows:

- The list of recent vaults.
- The default theme (until you override per-vault).
- The browser's permission grants (these are per-folder, not
  per-vault).

## Permissions

Granite uses the browser's File System Access API. Three permission
states matter to you:

| State | What it means |
|-------|---------------|
| **Granted** | Granite can read and write the vault folder. |
| **Prompt** | Granite will ask for permission the next time it tries to read or write. |
| **Denied** | Granite cannot open this vault until you grant access in your browser settings. |

If you see a notice that says *Permission required*, click the vault
switcher and pick *Reauthorize* on the affected vault. Granite will
re-show the browser prompt.

## The `.granite` folder

The first time Granite needs to save anything for a vault, it creates a
hidden folder named `.granite/` at the vault root. This folder stores
everything Granite needs to remember about *this* vault — your
settings, the workspace layout, installed plugins, themes, snippets,
and bookmarks.

Typical layout:

```
MyVault/
├── .granite/
│   ├── settings.json          ← your settings for this vault
│   ├── workspace.json         ← currently open tabs and splits
│   ├── bookmarks.json         ← saved bookmarks
│   ├── core-plugins.json      ← which core plugins are enabled
│   ├── community-plugins.json ← which community plugins are enabled
│   ├── hotkeys.json           ← custom hotkey bindings
│   ├── graph.json             ← saved graph state
│   ├── plugins/
│   │   └── <plugin-id>/       ← each installed plugin's folder
│   ├── themes/
│   │   └── <theme-name>/      ← each installed theme
│   └── snippets/
│       └── *.css              ← your CSS snippets
├── Daily/
├── Projects/
├── attachments/
└── README.md
```

A few things worth knowing:

- **Everything in `.granite/` is plain JSON or CSS.** You can edit
  these files in any text editor. Granite watches the folder and
  reloads when it changes.
- **`.granite/` is local to one vault.** Copying a vault to another
  computer copies its settings too.
- **It is safe to delete `.granite/`** if something is wrong — Granite
  will recreate it with defaults on the next launch. You will lose
  per-vault customisation but no notes.
- **Existing Obsidian vaults are read.** If a folder already contains
  an `.obsidian/` directory, Granite reads it for compatibility so
  your Obsidian customisations carry over. Granite still writes its
  own state to `.granite/`.

## Excluded files

You can tell Granite to ignore parts of your vault — folders full of
auto-generated notes, archive directories, drafts you do not want in
search results. Go to *Settings → Files and links → Excluded files*
and add one glob pattern per line.

Excluded files are:

- Hidden from the Search view by default.
- Deprioritised in the Quick Switcher and link autocomplete.
- Hidden from the Graph view's nodes.
- Excluded from Backlinks unlinked-mentions.

They still exist in the vault — you can still open them by typing
their path. Excluding files only filters them out of *suggestions*.

## Moving and renaming a vault

A vault is just a folder. To move it, quit Granite, move the folder
in your file manager, then reopen it from Granite's vault switcher
(you may need to *Open folder* again so the browser grants permission
to the new path). To rename a vault, rename the folder on disk.

To duplicate a vault, copy the entire folder — `.granite/` and all.
The duplicate is a fully working independent vault.

## Backing up your vault

Because your vault is just a folder, any folder-level backup tool
works: Time Machine, Restic, Borg, Backblaze, Dropbox, Syncthing, an
external drive — whatever you already trust. There is no special
"export" to run. Plain text means future-proof.

For per-file roll-back inside Granite, see [File recovery in
Troubleshooting](./troubleshooting.md#file-recovery).

---

[← User guide index](./README.md) · [Index](./README.md) · [next: Editor modes →](./editor.md)
