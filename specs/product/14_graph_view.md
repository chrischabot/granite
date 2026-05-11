# 14 — Graph view (global and local)

A force-directed visualization of the link structure between notes.

## 14.1 Global graph

Open via:
- Ribbon → *Open graph view* (icon: `git-fork` / graph icon).
- Command palette → *Graph view: Open graph view*.
- Hotkey `Ctrl/Cmd+G` (default).

The graph opens as a tab in the central area. The tab can be split, popped out, bookmarked, etc.

### Visual model

- Each **node** is a circle representing a vault file (Markdown by default; tags and attachments are toggleable).
- Each **edge** is a straight line representing one or more internal links between the two nodes. Direction can be drawn as an arrow when *Display → Arrows* is on.
- Node radius scales with in-degree (number of incoming links). Min/max radii configurable via the *Display → Node size* slider.
- Text labels are drawn beside each node, fading out at small zoom (governed by *Display → Text fade threshold*).

### Default colors

| Element | CSS variable |
|---------|--------------|
| Edge line | `--graph-line` |
| Resolved node | `--graph-node` |
| Unresolved node (link target with no file) | `--graph-node-unresolved` |
| Tag node | `--graph-node-tag` |
| Attachment node | `--graph-node-attachment` |
| Focused/hovered node | `--graph-node-focused` |
| Node label text | `--graph-text` |

The settings panel uses width `--graph-controls-width` (≈ 240 px).

### Interaction

- **Hover** a node → its connected edges and neighbors highlight; non-neighbors fade.
- **Click** a node → opens the corresponding note in a new tab (or `Ctrl/Cmd+click` to force a new tab).
- **Right-click** a node → opens the standard file context menu (Open in new tab/pane/window, Bookmark, etc.).
- **Drag** a node → temporarily fixes its position (release returns it to the simulation).
- **Pan** by dragging empty space (or arrow keys; `Shift` for fast).
- **Zoom** with the scroll wheel (or `+`/`-` keys).

## 14.2 Local graph

Variant scoped to nodes connected to the active note. Open via *Local graph: Open local graph* or hotkey `Ctrl/Cmd+Shift+G` (default). It can also be opened as a *linked view* attached to a note tab so it follows the active note.

Local-graph-specific control:
- **Depth** slider (1, 2, 3…) — neighbor distance to include. Each step adds the next ring of connections.

All other settings are shared with the global graph.

## 14.3 Settings panel (cog icon, upper-right of the graph tab)

Four collapsible sections:

### 14.3.1 Filters

| Control | Description |
|---------|-------------|
| **Search files** | Search-syntax (same as `13`'s) limiting the visible nodes. |
| **Tags** | Toggle tag nodes. |
| **Attachments** | Toggle attachment nodes. |
| **Existing files only** | When on, hides nodes representing unresolved link targets (notes that don't yet exist). |
| **Orphans** | Toggle orphan nodes (no edges). |

Excluded files are also hidden here regardless of these toggles.

### 14.3.2 Groups

A list of named groups, each with a query and a color. Order matters: the first group whose query a node matches determines its color. Add via *New group*, edit by clicking the colored disc to pick a color, remove via the trash icon. Group queries use the standard search-operator language.

### 14.3.3 Display

| Control | Range / type | Description |
|---------|--------------|-------------|
| Arrows | toggle | Draw direction arrows. |
| Text fade threshold | slider 0…1 | Above this zoom, labels fade in. |
| Node size | slider | Scale factor on min/max node radii. |
| Link thickness | slider | Edge stroke width. |
| Animate | button | Starts a chronological time-lapse: nodes appear in `created` order. |

### 14.3.4 Forces

The simulation is a standard d3-force-style model. Sliders:

| Control | Description |
|---------|-------------|
| **Center force** | Pull toward graph center. Higher = more circular. |
| **Repel force** | Pairwise repulsion between nodes. |
| **Link force** | Edge spring tension. |
| **Link distance** | Edge rest length. |

A *Restore default settings* button resets all sliders.

## 14.4 Saving graph state

A graph view's complete state (filter query, group definitions, display sliders, force sliders, camera position) is saved with the workspace and persists across restarts. A graph state can also be saved as a Bookmark entry so multiple "graph perspectives" can be one click away.

## 14.5 Performance

The renderer must handle 10,000-node graphs at interactive frame rates. Use canvas/WebGL — DOM elements per node will not scale. Edge bundling is not required. The force simulation can pause when the camera is still and the user has not interacted for ~2 seconds.

## 14.6 Mermaid diagrams

Internal links inside Mermaid diagrams (declared with the `internal-link` class — see `07_markdown_syntax.md` §7.8) do **not** appear as graph edges. This is intentional and must be replicated.