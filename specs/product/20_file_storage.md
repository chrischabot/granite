# 20 — File storage and on-disk formats

Everything the application persists. Plain-text-first; the user must always be able to read and edit content with any text editor.

## 20.1 Vault layout

A vault is a folder. Inside it the user creates whatever folder hierarchy they want. The app adds exactly one top-level folder of its own: `.obsidian/` (the configuration folder).

```
MyVault/
├── .obsidian/                  ← config (this is the only thing the app creates)
├── Daily notes/
│   ├── 2025-01-01.md
│   └── 2025-01-02.md
├── Projects/
│   ├── Project A.md
│   └── Brainstorm.canvas
├── Books.base
├── attachments/
│   ├── Image.png
│   └── Recording.webm
└── README.md
```

Vaults must not be nested. Multiple vaults can coexist on the same machine, but the app refuses to open one vault from inside another.

## 20.2 Accepted file formats

Native (the app opens them directly):

| Category | Extensions |
|----------|------------|
| Markdown | `.md` |
| JSON Canvas | `.canvas` |
| Bases | `.base` |
| Image | `.avif`, `.bmp`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.svg`, `.webp` |
| Audio | `.flac`, `.m4a`, `.mp3`, `.ogg`, `.wav`, `.webm`, `.3gp` |
| Video | `.mkv`, `.mov`, `.mp4`, `.ogv`, `.webm` |
| PDF | `.pdf` |

Audio/video playback depends on platform codecs. Other extensions are visible in File explorer (when *Show all file types* is on) and can be linked / embedded / exported, but the app delegates opening them to the OS.

## 20.3 Markdown encoding

| Property | Value |
|----------|-------|
| Encoding | UTF-8, no BOM (BOM is preserved on read but not added on write). |
| Line endings | Preserve the file's existing line endings; for new files, use the OS default (LF on macOS/Linux, CRLF on Windows). |
| Trailing newline | Always end the file with a single trailing `\n`. |
| Whitespace at end of line | Preserve unless the user explicitly trims. (Significant for two-trailing-spaces line breaks.) |

## 20.4 The `.obsidian` configuration folder

Every file inside is JSON. The user can edit them directly. The app watches the folder for external changes.

| File | Purpose |
|------|---------|
| `app.json` | Global application preferences (showInlineTitle, defaultViewMode, accentColor, useWikilinks, etc.). |
| `appearance.json` | Theme + accent + base color scheme + custom font names + font size + zoom. |
| `core-plugins.json` | Array (or object map) of `plugin-id → enabled`. |
| `community-plugins.json` | Array of installed plugin IDs that are currently enabled. |
| `core-plugins-migration.json` | Internal migration markers. |
| `daily-notes.json` | Settings for the Daily notes plugin. |
| `templates.json` | Settings for Templates. |
| `bookmarks.json` | The user's bookmark tree. |
| `workspace.json` | Current desktop workspace layout (open tabs, splits, sizes). |
| `workspace-mobile.json` | Mobile layout (separate from desktop on synced vaults). |
| `workspaces.json` | Saved workspace snapshots from the Workspaces plugin. |
| `hotkeys.json` | User-overridden hotkeys: `command-id → array of {modifiers, key}`. |
| `graph.json` | Settings of the (default/global) Graph view. |
| `canvas.json` | Last-used Canvas defaults. |
| `command-palette.json` | Pinned commands. |
| `unique-note-creator.json` | Settings for unique-note plugin. |
| `note-composer.json` | Settings for note composer. |
| `audio-recorder.json` | Settings for audio recorder. |
| `file-recovery.json` | Settings for file recovery (interval, retention). |
| `web-viewer.json` | Settings for web viewer (save folder, ad block, etc.). |
| `bases.json` | Bases plugin defaults. |
| `types.json` | Map of property name → type (Text, List, Number, Checkbox, Date, DateTime, Tags). |
| `themes.json` | Installed theme metadata. |
| `themes/<theme-name>/theme.css` | Each installed theme. |
| `themes/<theme-name>/manifest.json` | Theme metadata. |
| `snippets/*.css` | User CSS snippets. |
| `plugins/<plugin-id>/main.js` | Compiled plugin entry. |
| `plugins/<plugin-id>/manifest.json` | Plugin metadata. |
| `plugins/<plugin-id>/styles.css` | Plugin CSS (optional). |
| `plugins/<plugin-id>/data.json` | Plugin's own data (its `loadData()/saveData()`). |

### Override

The user can change the configuration folder name via Settings → Files and links → *Override config folder*. The new name must start with a `.`. Existing config does not migrate; the app starts with defaults in the new folder.

## 20.5 Plugin manifest schema (`manifest.json`)

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "What it does.",
  "author": "Your Name",
  "authorUrl": "https://example.com",
  "fundingUrl": "https://example.com/donate",
  "isDesktopOnly": false
}
```

Themes use a smaller manifest:

```json
{
  "name": "My Theme",
  "version": "1.0.0",
  "minAppVersion": "0.16.0",
  "author": "Your Name",
  "authorUrl": "https://example.com"
}
```

## 20.6 JSON Canvas (`.canvas`)

Open published format used for the Canvas plugin. Top-level shape:

```jsonc
{
  "nodes": [ /* array of node objects */ ],
  "edges": [ /* array of edge objects */ ]
}
```

### Node object

Common fields (all nodes):

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique within the canvas. |
| `type` | `"text"` \| `"file"` \| `"link"` \| `"group"` | Node type. |
| `x`, `y` | number | Top-left in canvas coordinates. |
| `width`, `height` | number | Size in canvas units. |
| `color` | string \| undefined | `"1"`–`"6"` palette index, or any hex (`#rrggbb`). |

Type-specific:

| Type | Extra fields |
|------|--------------|
| `text` | `text: string` (Markdown content) |
| `file` | `file: string` (vault-relative path), optional `subpath: string` (e.g. `#Heading` or `#^id`) |
| `link` | `url: string` |
| `group` | `label: string`, optional `background: string`, optional `backgroundStyle: "cover" \| "ratio" \| "repeat"` |

### Edge object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique. |
| `fromNode` | string | Node `id`. |
| `toNode` | string | Node `id`. |
| `fromSide` | `"top"` \| `"right"` \| `"bottom"` \| `"left"` \| `undefined` | Anchor side on source. |
| `toSide` | same as above | Anchor side on target. |
| `fromEnd` | `"none"` \| `"arrow"` (default `"none"`) | Marker at source end. |
| `toEnd` | `"none"` \| `"arrow"` (default `"arrow"`) | Marker at target end. |
| `color` | string \| undefined | Same palette/hex format. |
| `label` | string \| undefined | Optional text label. |

The format is a published open standard (jsoncanvas.org). Other apps may produce/consume `.canvas` files, so the parser must be lenient: ignore unknown fields rather than refusing the file.

## 20.7 Bases (`.base`)

A YAML file with a defined schema. Top-level keys:

| Key | Type | Required |
|-----|------|----------|
| `filters` | object (and/or/not tree of conditions) | no |
| `formulas` | object: `{name: expression}` | no |
| `properties` | object: `{property-key: {displayName, ...}}` | no |
| `summaries` | object: `{name: expression}` | no |
| `views` | array of view objects | yes |

Each view is an object with at minimum `type` and `name`. See `12_bases.md` for the complete schema.

When embedded in a Markdown file, the same content appears inside a `base` fenced code block.

Bases must round-trip: the visual editor's serialization must produce a YAML file the textual editor would have produced from the same configuration.

## 20.8 Metadata cache

Maintained in IndexedDB (or equivalent local key-value store) keyed by absolute file path. Holds for each note:
- File path, ctime, mtime, size.
- Frontmatter properties (parsed YAML).
- List of headings with depths and positions.
- List of internal links (with subpaths and display text).
- List of embeds.
- List of tags (body + frontmatter).
- List of footnote definitions and references.
- Block IDs and their positions.

The cache is rebuilt on demand (Settings → Files and links → *Rebuild vault cache*). External edits to files are detected via filesystem watchers and trigger incremental cache updates.

A cache rebuild on a 50,000-note vault should complete within a few seconds to a few minutes depending on hardware. Progress shown as a notice.

## 20.9 File recovery snapshots

Stored **outside** the vault, in the global app config (e.g. `%APPDATA%/<app>/file-recovery/`). Each snapshot is keyed by absolute path + timestamp. Format: full file content as a blob, plus a small metadata JSON entry with timestamp and size.

Default cadence: 5-minute interval. Default retention: 7 days. Both configurable. See `15_other_core_plugins.md` §15.5.

Snapshots do not sync between devices.

## 20.10 Global config (outside the vault)

Per-OS standard locations:

| OS | Path |
|----|------|
| macOS | `/Users/<user>/Library/Application Support/<app>/` |
| Windows | `%APPDATA%/<app>/` |
| Linux | `$XDG_CONFIG_HOME/<app>/` (fallback `~/.config/<app>/`) |

Contains: license info, account state, file recovery snapshots, the global vaults list (so the Vault Switcher remembers your vaults), telemetry opt-in, etc.

Important: never create a vault inside this global config folder.

## 20.11 Trash behavior

Three options (Settings → Files and links → Deleted files):

- **System trash** *(default)* — uses the OS recycling bin.
- **Vault trash** — moves the file into `<vault>/.trash/` preserving relative subpath. The user can manually empty.
- **Permanent** — `unlink()` immediately. Shows a confirmation dialog.

## 20.12 Symbolic links and junctions

Sometimes used to alias a folder into the vault. Risks:
- Watchers may not fire on changes inside the link target.
- Renames may break.

The replica should follow Obsidian's conservative posture: support symbolic links/junctions but warn the user when one is detected at vault open.

## 20.13 File watcher behavior

Watch the entire vault for create/rename/modify/delete events. Throttle/debounce to avoid storms. Re-parse only the changed file's metadata; only refresh views that depend on it. Use platform-native APIs (FSEvents / ReadDirectoryChangesW / inotify).

## 20.14 Atomic writes

When saving a `.md` or `.canvas` file:
1. Write the new content to a sibling temp file.
2. `fsync` the temp file.
3. Rename the temp over the original (atomic on POSIX; near-atomic on Windows with `MoveFileEx`).

This prevents partial writes after a crash.

## 20.15 Lockdown / privacy notes

If Apple's Lockdown Mode is enabled and the app isn't exempted: IndexedDB (cache) and file recovery snapshots will not persist. The app re-indexes on every launch. Surface this state to the user via a notice.