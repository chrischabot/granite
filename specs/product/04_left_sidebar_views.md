# 04 — Left sidebar views

Each of the four default left-sidebar tabs is documented here in full: header strip, body, every button, every right-click action.

## 4.1 File explorer

### Header (icon row at the top of the panel)

Five icon buttons aligned left, each with a tooltip:

| # | Icon (Lucide) | Action |
|---|---------------|--------|
| 1 | `pen-line` | **New note** — creates a note in the default-new-notes folder. |
| 2 | `folder-plus` | **New folder** — creates a folder at the top level. |
| 3 | `arrow-up-narrow-wide` | **Change sort order** — opens a menu: *File name (A→Z)*, *File name (Z→A)*, *Modified time (new→old)*, *Modified time (old→new)*, *Created time (new→old)*, *Created time (old→new)*. |
| 4 | `gallery-vertical` | **Auto-reveal active file** — toggle. When on, the explorer scrolls to and selects the currently open note. |
| 5 | `chevrons-up-down` / `chevrons-down-up` | **Expand all** / **Collapse all** folders. The icon swaps. |

### Body (folder tree)

- Indentation: each level adds `--list-indent` (default ≈ 16 px).
- Each folder row: chevron-right when collapsed, chevron-down when expanded; folder icon optional; folder name; right-click menu.
- Each file row: file-type icon (or none for `.md`), file name (without extension by default), trailing area can show small badges (e.g. unsaved indicator).
- Selected row uses `--nav-item-background-selected`; hovered row uses `--nav-item-background-hover`; active (currently displayed in the editor) uses `--nav-item-background-active`.
- Indentation guides drawn at `--nav-indentation-guide-width` (typically 1 px) using `--nav-indentation-guide-color`.

### Right-click context menu

**On a file:**
- New note (in this folder)
- New folder (subfolder)
- New canvas
- New base
- Open in new tab
- Open in new pane (split)
- Open in new window
- Open in default app (desktop)
- Show in system explorer (desktop)
- Make a copy
- Rename — inline edit
- Delete
- Bookmark...
- Set as attachment folder (for image/PDF/etc.)
- Move file to... — opens a folder picker

**On a folder:**
- New note
- New folder
- New canvas
- New base
- Move folder to...
- Rename
- Delete
- Bookmark
- Set as attachment folder
- Search in folder
- Reveal in system explorer

**On the empty area:**
- New note
- New folder
- New canvas
- New base
- Reveal current vault in system explorer

### Inline rename

Triggered by `F2` on the focused row, *Rename* in the context menu, or double-click on the active note's title at the top of the editor. The filename becomes a text input; press Enter to commit, Escape to cancel. On commit, all wikilinks pointing at this file across the vault are updated automatically (or, if Settings → Files and links → *Automatically update internal links* is off, the user is prompted to confirm).

### Drag and drop

- Drag file → folder = move.
- Drag file → editor = insert link to the file at the drop location.
- Drag file → tab strip = open in that tab group.
- Drag file → outside the app = creates an `obsidian://` URL link.
- Drag external file from OS into File explorer = imports a copy into the vault under the configured attachments folder.

## 4.2 Search

### Header

A single text input at the top with three controls:

| Control | Icon | Function |
|---------|------|----------|
| Match case toggle | `obsidian-icon-upper-lowercase` (custom) or `case-sensitive` (Lucide) | Highlights when on. |
| Settings | `sliders-horizontal` | Reveals: *Explain search term*, *Collapse results*, *Show more context*. |
| Sort order | dropdown labeled with the current sort | *File name A→Z / Z→A*, *Modified time new→old / old→new*, *Created time new→old / old→new*. |

A small label under the input shows the result count and a `more-horizontal` (`...`) menu containing *Copy search results* and *Bookmark search*.

### Search syntax

The complete operator language is documented in `13_command_palette_search_quickswitcher.md` and `16_settings_reference.md`. Summary:

- Bare words AND together; `OR` toggles to OR; `-word` excludes; quotes for exact phrase; parentheses for grouping; angle brackets `[<5]` for range filters.
- Operators: `file:`, `path:`, `content:`, `match-case:`, `ignore-case:`, `tag:`, `line:`, `block:`, `section:`, `task:`, `task-todo:`, `task-done:`.
- Property syntax: `[propname]`, `[propname:value]`, `[propname:null]`.
- Regex by enclosing in `/.../`. JavaScript flavor.

### Results list

Each result is a folder/file row with the file path, then collapsible match snippets. Snippets show the matched text with the term highlighted using `--text-highlight-bg`. Click a result file to open it; click a match to jump to the match position. Right-click a result for a *Bookmark*, *Copy markdown link*, *Reveal in file explorer* menu.

### Embedding searches

A `query` code block embeds a live search:

````md
```query
tag:#meeting -path:archive
```
````

Renders as a search-results list inline.

## 4.3 Bookmarks

### Header

| Control | Icon | Function |
|---------|------|----------|
| Bookmark active tab | `bookmark-plus` | Adds the current tab as a bookmark. |
| New bookmark group | `folder-plus` | Adds an empty bookmark group. |
| Sort order | `arrow-up-narrow-wide` | *Custom*, *Alphabetical*, *Recent*. |

### Bookmark types

A bookmark may target any of:
- File
- Folder
- Heading
- Block (`Note#^id`)
- Search query (with the user's term and options frozen in)
- Graph view (with a saved camera + filter state)
- Web link (when the Web viewer plugin is enabled)

### Body

Tree of bookmark groups (collapsible). Within a group, drag-to-reorder. Right-click any bookmark for *Edit*, *Open in new tab/pop-out/window*, *Move to group*, *Remove*.

The Add/Edit dialog has fields:
- **Title** (text input — defaults to the source's name)
- **Group** (dropdown — *Top level* or any existing group)

## 4.4 Tags (Tags view)

### Header

| Control | Icon | Function |
|---------|------|----------|
| Sort order | `arrow-up-narrow-wide` | *Tag name (A→Z)*, *Tag name (Z→A)*, *Frequency (high→low)*, *Frequency (low→high)*. |
| Show nested tags toggle | `list-tree` (Lucide) | When on, nested tags display hierarchically. |
| Expand all / Collapse all | `chevrons-up-down` / `chevrons-down-up` |

### Body

Each row: the tag name (without the `#`), a count of notes containing it, expand chevron if there are nested children.

- **Click a tag** → opens Search prefilled with `tag:#name`.
- **Ctrl/Cmd-click** → toggles the tag in the existing search term.
- **Right-click** → *Search for tag*, *Open in new tab*, *Add to bookmarks*, *Replace tag in vault…*, *Remove tag from vault…*.

## 4.5 Behavior shared by all sidebar views

- All sidebar views can be popped out of the sidebar by dragging into the central area, where they then live as tabs (with full title bars, not icon-only).
- All views can be collapsed when the sidebar is collapsed; the icon-only strip is always shown for the active group.
- Sidebar view list is order-customizable by drag-and-drop on the icon strip. Order persists in `workspace.json`.
- Each view has a corresponding command in the Command palette: *Open <view>*. So *Open: Backlinks* / *Open: Search* etc. always work even if the user has closed the tab.