# Settings

Settings opens as a modal: a sidebar of categories on the left, a
settings page on the right. Open it with `Mod+,` or via the gear icon
at the bottom of the left sidebar.

A search box at the top of the modal filters categories by name.

The sidebar has three top-level areas:

1. **Options** — General, Editor, Files and links, Appearance,
   Hotkeys, About.
2. **Plugin options** — every enabled core plugin and every installed
   community plugin gets its own page here.
3. **Plugin management** — *Core plugins* and *Community plugins*
   pages at the bottom, where plugins are turned on or off (and where
   community plugins are browsed and installed).

This page is a tour of the most important options. For the
exhaustive table with every default value and on-disk location, see
[Reference → Settings](../reference/settings.md).

## General

| Setting | Notes |
|---------|-------|
| Current version + installer version | Read-only. |
| Check for updates | Manual update check. |
| Read the changelog | Opens the changelog externally. |
| Automatic updates | Default on. |
| Language | Default *system*. |
| Notify if startup takes longer than expected | Diagnostic notice; default on. |
| Check startup time | Runs a profiling pass and shows a report. |

## Editor

The biggest tab. Most editing behaviour lives here.

### Defaults

| Setting | Default |
|---------|---------|
| **Always focus new tabs** | On |
| **Default view for new tabs** | Editing view |
| **Default editing mode** | Live Preview |
| **Show editing mode in status bar** | Off |

### Display

| Setting | Default |
|---------|---------|
| Readable line length | On |
| Strict line breaks | Off |
| Properties in document | Visible |
| Fold heading | On |
| Fold indent | On |
| Show line numbers | Off |
| Show indentation guides | On |
| Right-to-left (RTL) | Off |
| Auto-pair brackets | On |
| Auto-pair Markdown syntax | On |
| Smart lists | On |
| Indent using tabs | On |
| Convert pasted HTML to Markdown | On |

### Behaviour

| Setting | Default |
|---------|---------|
| Spellcheck | Off |
| Spellcheck languages | system locale |
| Indent visual width | 4 |

### Advanced

| Setting | Default |
|---------|---------|
| Vim key bindings | Off |

See [Editor modes](./editor.md) for what each option does in practice.

## Files and links

How Granite generates link paths, where new notes and attachments go,
how rename rewrites work, and what to do on delete.

### Default locations

| Setting | Choices |
|---------|---------|
| **Default location for new notes** | *Vault folder* *(default)* / *Same folder as current file* / *In the folder specified below* |
| **Default location for new attachments** | *Vault folder* *(default)* / *In the folder specified below* / *Same folder as current file* / *In subfolder under current folder* |

The default attachments folder name is `attachments`.

### Links

| Setting | Default |
|---------|---------|
| **New link format** | Shortest path when possible |
| **Automatically update internal links** | On |
| **Use \[\[Wikilinks\]\]** | On |
| **Show all file types** | Off |

### Trash

| Setting | Default |
|---------|---------|
| Confirm file deletion | On |
| **Deleted files** | *System trash* / *Granite trash* (`.trash` in vault) / *Permanently delete* |

### Advanced

| Setting | Default |
|---------|---------|
| **Excluded files** | empty |
| **Override config folder** | `.granite` |
| **Allow URI callbacks** | On |
| **Rebuild vault cache** | button |

## Appearance

| Setting | Default |
|---------|---------|
| **Base color scheme** | Adapt to system |
| **Accent color** | theme default |
| **Themes** | Default theme |
| **Interface font** | system |
| **Text font** | system |
| **Monospace font** | system mono |
| **Font size** | 16 |
| **Show inline title** | On |
| **Show tab title bar** | On |
| **Show ribbon** | On |
| **Zoom level** | 1.0 |
| **Native menus** | Off |
| **Window frame style** | Custom frame |
| **Translucent window** | Off (macOS only) |
| **Hardware acceleration** | On |
| **CSS snippets** | (list with per-snippet toggles) |

See [Themes and CSS snippets](./themes-and-snippets.md) for the
theming pipeline.

## Hotkeys

Search for a command, click `+` to assign a new shortcut, or click
`×` on a chip to remove one. See [Hotkeys](./hotkeys.md) for the full
workflow.

## About

Read-only credits, license, and version information.

## Core plugins

The Core plugins page lists every plugin that ships with Granite.
Each row has:

- The plugin name (clickable to expand a short description).
- An *Enable* toggle.
- A `+` icon → opens its hotkeys filter prefilled.
- A cog icon → opens its settings page (only when the plugin has
  one).

A filter input at the top filters by name.

Common core plugins:

- **File explorer** — left-sidebar file tree.
- **Search** — full-text search panel.
- **Quick switcher** — fuzzy file picker.
- **Command palette** — fuzzy command runner.
- **Graph view** and **Local graph** — link visualisation.
- **Backlinks** and **Outgoing links** — link tracking sidebars.
- **Outline** — heading outline of the active note.
- **Footnotes view** — list of footnotes in the active note.
- **Tags view** — tag tree across the vault.
- **Properties view** — File-properties and All-properties panels.
- **Bookmarks** — bookmarked files, folders, headings, blocks,
  searches, graphs.
- **Daily notes** — date-keyed notes with templates.
- **Templates** — insert template files at the cursor.
- **Unique note creator** — Zettelkasten-style timestamped notes.
- **File recovery** — periodic snapshots so you can roll back.
- **Note composer** — merge and extract.
- **Page preview** — hover popovers for links.
- **Slash commands** — `/` command popover inside the editor.
- **Random note** — open a random note.
- **Slides** — minimalist presentation mode.
- **Web viewer** — render web pages inside a tab.
- **Word count** — chip in the status bar.
- **Workspaces** — save and restore layouts.

## Community plugins

The Community plugins page is gated by **Restricted mode** (default
on). While restricted, a banner reads *Turn on community plugins*
with a security caveat. Once you opt in, the rest of the page becomes
interactive:

- **Browse** — opens the community plugin marketplace.
- **Check for updates**, **Reload plugins**, **Open plugins folder**.
- **Installed plugins** list — one row per plugin with *Settings*,
  *Hotkeys*, *Funding*, *Uninstall*, and an enable / disable toggle.

See [Plugins](./plugins.md) for the full story.

## Per-plugin settings pages

Each enabled plugin (core or community) gets its own page in the
sidebar under *Plugin options*. The layout is a vertical list of
*Setting* rows: label, optional description, control on the right
(toggle, dropdown, text input, button, slider, color picker).

The same row primitive is exposed to plugin authors — see [Plugin
SDK → Settings API](../sdk/types.md).

## Where settings are stored

Settings live in your vault, not in your browser:

- Per-vault settings: `.granite/settings.json`
- Per-vault hotkeys: `.granite/hotkeys.json`
- Per-vault core-plugin enable state: `.granite/core-plugins.json`
- Per-vault community-plugin enable state:
  `.granite/community-plugins.json`
- Per-plugin data: `.granite/plugins/<plugin-id>/data.json`

You can edit these files in any text editor; Granite watches them and
reloads on change. Copying a vault copies its settings.

## See also

- [Reference → Settings](../reference/settings.md) — every option with
  its default and on-disk location.
- [Vaults](./vaults.md) — what else lives in `.granite/`.

---

[← Hotkeys](./hotkeys.md) · [Index](./README.md) · [next: Themes and CSS snippets →](./themes-and-snippets.md)
