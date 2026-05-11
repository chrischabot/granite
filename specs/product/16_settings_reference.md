# 16 — Settings reference (every tab, every option)

The Settings window opens as a **Modal** (layer `--layer-modal`). Layout: vertical sidebar of categories on the left, settings page on the right. Width and max-height controlled by `--modal-width`, `--modal-max-width`, `--modal-max-height`; community sidebar uses `--modal-community-sidebar-width`.

A search box at the top of the modal filters categories by name as the user types.

The settings sidebar contains three top-level areas:
1. **Options** — General, Editor, Files and links, Appearance, Hotkeys, About.
2. **Plugin options** — every enabled core plugin and every installed community plugin (each with its own settings page).
3. **Plugin management** (at the bottom) — *Core plugins* and *Community plugins* pages, where plugins are turned on or off and where community plugins are browsed and installed.

## 16.1 General

### Version and updates

| Field | Default | Description |
|-------|---------|-------------|
| Current version + installer version | (read-only) | Shown at top. |
| Check for updates | (button) | Manual update check. |
| Read the changelog | (link) | Opens external changelog. |
| Automatic updates | toggle, on | Auto-check + download. |
| Receive early access versions | toggle, off (gated by Catalyst license) | Auto-update to beta builds. |

### Language

| Field | Default | Description |
|-------|---------|-------------|
| Language | system | UI translation. |
| Learn how to add a new language | link | Translation contribution. |

### Help

| Field | Description |
|-------|-------------|
| Open | Opens help docs (in Web viewer if available, else default browser). |

### Account

| Field | Default |
|-------|---------|
| Your account | (signed-out by default) |
| Manage / Log out buttons | — |
| Catalyst license | none |
| Commercial license | Activate / Purchase |

### Advanced

| Field | Default | Description |
|-------|---------|-------------|
| Notify if startup takes longer than expected | toggle, on | Diagnostic notice. |
| Check startup time | (button) | Runs a profiling pass and shows a report. |

## 16.2 Editor

### Always focus new tabs

Toggle, on. When opening a link in a new tab, switch to it.

### Default view for new tabs

Dropdown: *Editing view* (default), *Reading view*.

### Default editing mode

Dropdown: *Live Preview* (default), *Source mode*.

### Show editing mode in status bar

Toggle, off. Adds a status-bar chip to switch modes.

### Display group

| Setting | Type | Default |
|---------|------|---------|
| Readable line length | toggle | on |
| Strict line breaks | toggle | off |
| Properties in document | dropdown: *Visible* / *Hidden* / *Source* | Visible |
| Fold heading | toggle | on |
| Fold indent | toggle | on |
| Show line numbers | toggle | off |
| Show indentation guides | toggle | on |
| Right-to-left (RTL) | toggle | off |
| Auto-pair brackets | toggle | on |
| Auto-pair Markdown syntax | toggle | on |
| Smart lists | toggle | on |
| Indent using tabs | toggle | on |
| Convert pasted HTML to Markdown | toggle | on |

### Behavior group

| Setting | Type | Default |
|---------|------|---------|
| Spellcheck | toggle | system |
| Spellcheck languages | (multi-select; macOS hides this — uses system) | system locale |
| Indent visual width | number (1-8) | 4 |

### Advanced

| Setting | Type | Default |
|---------|------|---------|
| Vim key bindings | toggle | off |

## 16.3 Files and links

### Default location for new notes

Dropdown:
- Vault folder *(default)*
- Same folder as current file
- In the folder specified below — adds a folder picker

### Default location for new attachments

Dropdown:
- Vault folder *(default)*
- In the folder specified below — folder picker
- Same folder as current file
- In subfolder under current folder — name input (default: `attachments`)

### Links group

| Setting | Type | Default |
|---------|------|---------|
| New link format | dropdown: *Shortest path when possible* / *Relative path to file* / *Absolute path in vault* | Shortest path |
| Automatically update internal links | toggle | on |
| Use \[\[Wikilinks\]\] | toggle | on |
| Show all file types | toggle | off |

### Trash

| Setting | Type | Default |
|---------|------|---------|
| Confirm file deletion | toggle | on |
| Deleted files | dropdown: *System trash* / *Obsidian trash* (`.trash` in vault) / *Permanently delete* | System trash |

### Advanced

| Setting | Type | Default |
|---------|------|---------|
| Excluded files | (Manage button → patterns modal) | empty |
| Override config folder | text (must start with `.`) | `.obsidian` |
| Allow URI callbacks | toggle | on |
| Rebuild vault cache | (button) | — |

## 16.4 Appearance

### Base color scheme

Dropdown: *Adapt to system* / *Light* / *Dark*.

### Accent color

Color input + reset button.

### Themes

Dropdown listing installed themes (default first). *Manage* button opens the community-themes browser modal. Folder-open icon reveals `.obsidian/themes/` in the OS file manager.

### Current community themes

Read-only count + *Check for updates* button.

### Font group

| Setting | Type | Default |
|---------|------|---------|
| Interface font | text + Manage | system |
| Text font | text + Manage | system |
| Monospace font | text + Manage | system mono |
| Font size | slider | 16 px |
| Quick font size adjustment | toggle | on |

### Interface group

| Setting | Type | Default |
|---------|------|---------|
| Show inline title | toggle | on |
| Show tab title bar | toggle | on |
| Show ribbon | toggle | on |
| Ribbon menu configuration | (Manage button) | — |

### Advanced

| Setting | Type | Default |
|---------|------|---------|
| Zoom level | slider | 1.0 |
| Native menus | toggle | off |
| Window frame style | dropdown: *Obsidian frame* / *Native frame* / *Hidden frame* | Obsidian frame |
| Custom app icon | (Choose button) | — |
| Translucent window | toggle (macOS only effective) | off |
| Hardware acceleration | toggle | on |

### CSS snippets

A list of files in `.obsidian/snippets/`, each with an enable toggle. Buttons: *Reload snippets* (refresh icon), *Open snippets folder* (folder-open icon).

## 16.5 Hotkeys

Search bar at the top filters by command name. Filter button (`filter` icon) shows only commands with assigned hotkeys.

Each row:
- Command name (clickable plugin/category prefix in faint color).
- Each assigned hotkey shown as a chip with an `×` to remove.
- A `+` button to add a new hotkey: opens a "Press the keys" capture modal; *Save* commits, *Cancel* aborts.

### Conflicts

If a captured hotkey is already in use, the modal warns and offers *Replace* / *Add anyway* / *Cancel*.

### Keyboard layout note

Hotkey symbols are displayed using the US QWERTY layout regardless of the user's actual layout. The shortcuts trigger from the underlying physical-key codes so layout changes don't break bindings.

See `17_hotkeys_reference.md` for the full default-binding catalog.

## 16.6 About (information page)

Read-only credits, license, and version information.

## 16.7 Core plugins

Sidebar item: *Core plugins*. Page lists every core plugin with:

- Plugin name (clickable to expand description).
- Plugin description (short).
- *Enable* toggle.
- `+` icon → opens its hotkeys filter prefilled.
- `cog` icon → opens its settings page (only if the plugin has settings).

Filter input at the top filters by name.

## 16.8 Community plugins

### Restricted mode banner

When restricted mode is on (default for new vaults), the page shows a *Turn on community plugins* banner with a security caveat. After enabling, the rest of the page becomes interactive.

### Browse / Update / Open folder / Reload

Top toolbar:
- *Browse* button → community plugin marketplace modal (showing categories, search, install button).
- *Check for updates* button.
- *Reload plugins* (refresh icon).
- *Open plugins folder* (folder-open icon).

### Installed plugins

A list with per-plugin row icons:
- *Settings* (cog) — only if plugin exposes settings.
- *Hotkeys* (`plus-circle`) — opens the Hotkeys page filtered to this plugin.
- *Funding* (`heart`) — opens the plugin author's URL.
- *Uninstall* (`trash-2`).
- *Enable / Disable* toggle.

## 16.9 Per-plugin settings pages

Each enabled plugin (core or community) gets its own page in the sidebar under "Plugin options". Layout is the standard `Setting` rows: each row has a label, optional description, and a control on the right (toggle / dropdown / text input / button / slider / color picker).

The `Setting` API surface (for plugin authors) provides:
- `setName(name)`
- `setDesc(desc)`
- `setHeading()` — render as a section title.
- `addToggle(cb)`, `addText(cb)`, `addTextArea(cb)`, `addDropdown(cb)`, `addSlider(cb)`, `addButton(cb)`, `addExtraButton(cb)`, `addColorPicker(cb)`, `addMomentFormat(cb)`, `addSearch(cb)`.

This section is informational here; the plugin API is fully documented in `22_plugins_themes_architecture.md`.

## 16.10 Settings modal styling defaults

| Token | Default |
|-------|---------|
| `--modal-background` | `--background-primary` |
| `--modal-radius` | `--radius-l` (12 px) |
| `--modal-border-color` | `--background-modifier-border` |
| `--modal-border-width` | 1 px |
| `--modal-max-width` | 1100 px |
| `--modal-max-height` | 80 vh |
| `--modal-community-sidebar-width` | 280 px |

The Settings modal's left navigation list uses the `Navigation` component variables (`--nav-item-*`).