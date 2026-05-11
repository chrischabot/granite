# 21 — Drag-and-drop and pop-out windows

## 21.1 Drag-and-drop sources

Sources are anywhere a user can grab a "file-like" thing:

| Source | Drag payload |
|--------|--------------|
| File explorer file row | One or more file references. Multi-select via `Ctrl/Alt + click` or `Shift + click` for ranges. |
| File explorer folder row | Folder reference (recursive). |
| Search result row | File reference at the matched line. |
| Backlinks / Outgoing-links result row | File reference. |
| Tab header (in tab strip) | Tab handle (a live tab). |
| Sidebar tab icon | Tab handle (a sidebar tab). |
| In-editor link (Live Preview / Reading view) | File reference of the link target. |
| Bookmark row | The bookmarked target (file/folder/heading/block/search). |
| Canvas card | Canvas selection (out-of-canvas dropping is ignored). |
| Properties row | Property reference (used to drag-reorder within the editor). |

## 21.2 Drag-and-drop destinations

| Destination | Effect |
|-------------|--------|
| Editor text area | Insert a wikilink/Markdown link to the dropped file at the drop position. Hold `Alt` (or `Shift` on macOS) to drop anywhere inside the tab even when over the tab header. |
| Editor when dropping multiple files | Insert one link per file, separated by newlines. |
| File explorer folder row | Move the dragged file/folder into that folder. (Cross-vault drops are not supported.) |
| File explorer empty area at the bottom | Move to vault root. |
| Tab strip (above an existing tab) | Inserts a new tab; positions left/right of the target tab depending on which half is over. |
| Tab body (drop zone covers the whole tab) | Replaces the active tab in that group with the dragged file. |
| Tab strip + new column drop zones (left/right edges) | Splits the tab group right or left. |
| Tab body + bottom drop zone | Splits the tab group down. |
| Sidebar tab strip | Pins the dragged tab to that sidebar position. |
| Out-of-window | Spawns a new pop-out window with this tab. |
| Bookmarks tab | Adds the source as a bookmark. |
| Canvas | Creates a canvas card from the dropped item (file card / link card / image card / etc.). |
| Other windows of the same vault | Cross-window tab transfer. |

### Drop-zone visual feedback

Each candidate drop zone highlights the moment the drag enters it with a tinted overlay using `rgba(var(--color-accent-rgb), 0.15)` (using the user's accent) and a 2-px dashed outline using `--text-accent`. The drag ghost (the floating preview) sits at `--layer-dragged-item` (80).

## 21.3 Drag from outside the application

| Source | Effect |
|--------|--------|
| OS file manager → editor | Imports a copy into the configured attachments folder and inserts an embed link. |
| OS file manager → File explorer folder | Imports a copy into that folder. |
| Browser HTML/text drag → editor | Converts pasted HTML to Markdown (if Settings → Editor → *Convert pasted HTML to Markdown* is on). |
| Browser URL drag → editor | Inserts the URL as a Markdown link with the page title (when available). |
| Browser URL drag → Canvas | Creates a link card. |
| OS file manager → editor with `Ctrl` (Windows/Linux) or `Option` (macOS) | Inserts a `file:///` link instead of importing. |

## 21.4 Drag *out* of the application

Dragging a file from File explorer to outside the app creates an `obsidian://` URL handle in the receiving application (e.g. typing into a chat, your OS Quick Look may show a link). The actual binary file is **not** dropped to the OS file manager — only an Obsidian URI link.

## 21.5 Modifier keys for opening links

Already enumerated in `09_links_embeds_aliases.md` §9.x and `17_hotkeys_reference.md` §17.2 — repeated here for completeness:

| Modifier | Effect |
|----------|--------|
| (none) | Navigate in current tab. |
| `Ctrl/Cmd + click` | Open in new tab. |
| `Ctrl/Cmd + Shift + click` | Open in new tab from Source mode. |
| `Ctrl/Cmd + Alt/Option + click` | Open in new tab group (split). |
| `Ctrl/Cmd + Alt/Option + Shift + click` | Open in new pop-out window. |

## 21.6 Tab-pinning interaction

A tab dragged from the central area to a sidebar becomes pinned in the sidebar (and conversely, drag from sidebar back to central unpins). The user may also right-click → *Pin* / *Unpin*.

## 21.7 Pop-out windows

A pop-out window is a fully independent OS window owned by a vault. The window has:

- A central area (one or more tab groups).
- **No** ribbon.
- **No** sidebars.
- **No** status bar by default (configurable).

### Lifecycle

- Closing the parent (vault) window closes all its pop-outs.
- Closing a pop-out has no effect on the parent.
- Closing the last pop-out tab closes the pop-out window.
- Tabs may move between windows of the **same vault** only.

### Creating a pop-out

| Method | UI path |
|--------|---------|
| Drag a tab outside the application's main window | Drag from tab strip into empty desktop area. |
| Tab right-click → *Open in new window* | Opens the file in a new pop-out. |
| Tab right-click → *Move to new window* | Moves the existing tab into a new pop-out. |
| File explorer right-click → *Open in new window* | Opens the file in a new pop-out. |
| Editor's More-options dots → *Open current tab in new window* | |
| Right-click an in-editor link → *Open in new window* | |
| Command palette → *Open current tab in new window* / *Move current tab to new window* | |

### Moving tabs between existing windows

Drag the tab from window A's tab strip and drop it into window B's tab strip. The drop zones in window B highlight just as in same-window splits.

### Pop-out z-order

OS-managed; pop-out windows can be focused independently. The app must coordinate state (a file is open in only one tab logically, but its embed in another window updates correctly).

## 21.8 Cross-window state propagation

When a note's content is modified in window A, every open editor for that file in any window must reflect the change immediately (CodeMirror documents shared across views, or simple post-save broadcast).

Plugin commands invoked from a pop-out should still be able to discover all windows' tabs via the workspace API.

## 21.9 Edge cases

- **Drag a folder into a sub-folder of itself** — refused.
- **Drag a file with an open conflict** (e.g. unsaved changes elsewhere) — prompt confirm/discard.
- **Drag a file out of an OS app while dragging is already active in our app** — cancel the in-progress drag silently.
- **Drag an in-editor link into a sidebar's Bookmarks tab** — adds a bookmark to that link target.