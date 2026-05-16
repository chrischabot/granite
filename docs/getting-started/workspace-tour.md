# Workspace tour

A 90-second guided tour of every region of the Granite shell.

```
┌──────────────────────────────────────────────────────────────────────┐
│                            Title bar                                 │
├──┬─────────────────┬─────────────────────────────────┬──────────────┤
│  │                 │            Tab strip            │              │
│  │   Left sidebar  ├─────────────────────────────────┤ Right sidebar│
│R │                 │                                 │              │
│i │  - File         │                                 │  - Outline   │
│b │    explorer     │           Workspace             │  - Backlinks │
│b │  - Search       │      (one or more leaves)       │  - Outgoing  │
│o │  - Bookmarks    │                                 │  - Properties│
│n │  - Tags         │                                 │  - Footnotes │
│  │                 │                                 │              │
│  │  Vault profile  │                                 │              │
├──┴─────────────────┴─────────────────────────────────┴──────────────┤
│                            Status bar                                │
└──────────────────────────────────────────────────────────────────────┘
```

## Title bar

Vault name on the left, window controls on the right. Click the vault name to
open the [Vault Picker](./first-run.md#the-vault-picker).

## Ribbon (far left)

A narrow column of frequently used commands: open switcher, command palette,
graph, canvas, bases scaffold, settings. Plugins can add their own ribbon
items via the obsidian-shim (see [Plugin SDK](../sdk/overview.md)).

## Left sidebar

Four built-in panes, accessible via the vertical icon strip at the top of the
sidebar:

- **File explorer** — tree view of vault files, drag-and-drop, context menus.
- **Search** — operator-driven search across the vault.
- **Bookmarks** — saved files, folders, headings, blocks, searches, graphs.
- **Tags** — flat or hierarchical tag list with counts.

Plugins can register additional sidebar tabs.

## Workspace

The central area is divided into **leaves**, grouped into **tab groups**,
arranged in horizontal **columns**. Each leaf renders one of: an empty tab,
a Markdown note, the File explorer, Settings, the Web Viewer, the Graph, a
Canvas, a Base, or an asset (image/audio/video/PDF).

Key actions:

| Action | Hotkey | What it does |
|--------|--------|--------------|
| New tab | `Mod+T` | Open an empty tab. |
| Close tab | `Mod+W` | Close the focused tab. |
| Quick switcher | `Mod+O` | Fuzzy-find and open a note. |
| Command palette | `Mod+P` | Run any command. |
| Split right | `Mod+\` | Create a new tab group to the right. |
| Cycle leaves | `Mod+Alt+ArrowLeft/Right` | Move focus between leaves. |

Drag a tab to reorder it, split a group, or detach it into a new pop-out window.

## Right sidebar

Four built-in panes:

- **Outline** — headings of the active note.
- **Backlinks** — every note that links to the active one, with line context.
- **Outgoing links** — every link out of the active note, including unresolved.
- **Properties** — typed editor for YAML frontmatter.

Plus a **Footnotes** pane that lights up when the active note has footnotes.

## Status bar

Bottom-right. Built-in chips include word count, vault file count, sync state,
and the current editing mode. Plugins can add their own status-bar items.

## Modal prompts

Modal prompts overlay the workspace:

- **Quick switcher** — fuzzy-find and open notes by filename or alias.
- **Command palette** — fuzzy-find and run any registered command.
- **Settings** — the entire configuration surface.
- **Help** — keyboard shortcut reference and links to docs.
- **Install plugin** — browse and install community plugins.
- **File recovery** — restore an older snapshot of a file.
- **Template picker** — pick a template when creating a new note.

## Where state lives

Granite persists workspace state under `.granite/workspace.json`, recent files
under `.granite/recents.json` (and localStorage), and per-vault settings under
`.granite/settings.json`. See the [vault format reference](../reference/vault-format.md).

## What now?

- Read the [User guide](../user-guide/README.md) for feature-by-feature docs.
- Skim the [Hotkeys reference](../reference/hotkeys.md).
- If you plan to extend Granite, the [Plugin SDK](../sdk/README.md) is next.

← [Your first note](./first-note.md) · [Index](../README.md)
