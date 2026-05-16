# Graph view

The graph view is a force-directed visualisation of the link
structure in your vault. Every note is a node; every internal link is
an edge.

Granite ships two flavours:

- **Global graph** — every note in the vault.
- **Local graph** — only the active note and its neighbours, out to a
  configurable depth.

## Opening the graph

| Method | Hotkey |
|--------|--------|
| Ribbon → *Open graph view* | — |
| Command palette → *Graph view: Open graph view* | `Mod+G` |
| Command palette → *Local graph: Open local graph* | `Mod+Shift+G` |

The graph opens as a regular tab in the central area. You can split
it, pop it out, or bookmark it like any other tab.

A local graph can also be opened as a **linked view** in the sidebar
that follows whichever note is active — open the active editor's
*More options* menu (three dots in the tab title bar) and choose
*Open local graph*.

## What you see

- **Nodes** are circles representing files (Markdown by default; tags
  and attachments can be added).
- **Edges** are straight lines representing internal links between
  files. Direction can be shown as an arrow.
- **Node radius** scales with in-degree (number of incoming links).
  Heavily-linked notes appear larger.
- **Labels** sit beside nodes and fade out at low zoom levels — large
  graphs become legible by zooming in.

Default colours come from the active theme; themes can rebind them
via CSS variables (`--graph-line`, `--graph-node`, `--graph-text`,
etc.).

## Interaction

| Action | Effect |
|--------|--------|
| **Hover** a node | Its edges and neighbours highlight; non-neighbours fade. |
| **Click** a node | Opens the corresponding note in a new tab. |
| `Mod+click` a node | Forces a new tab even if one exists. |
| **Right-click** a node | Standard file context menu (Open in new tab/pane/window, Bookmark, etc.). |
| **Drag** a node | Temporarily fixes its position; release to return it to the simulation. |
| **Pan** | Drag empty space, or use the arrow keys (`Shift` for fast). |
| **Zoom** | Scroll wheel, or `+` and `-` keys. |

## The settings panel

The cog icon in the upper-right of the graph tab opens the settings
panel. Four collapsible sections.

### Filters

| Control | What it does |
|---------|--------------|
| **Search files** | Limits visible nodes using the same operator language as the [Search panel](./search.md). |
| **Tags** | Toggle tag nodes on and off. |
| **Attachments** | Toggle attachment nodes (images, PDFs, etc.) on and off. |
| **Existing files only** | Hides nodes that represent links to notes that do not yet exist. |
| **Orphans** | Toggle nodes with no edges. |

Excluded files (from *Settings → Files and links → Excluded files*)
are always hidden regardless of these toggles.

### Groups

A list of named groups, each with a query (same operator language as
Search) and a colour. The first group whose query matches a node
determines its colour, so order matters — drag rows to reorder.

| Action | How |
|--------|-----|
| Add a group | *New group* button. |
| Pick its colour | Click the coloured disc to open a colour picker. |
| Edit its query | Type in the query field. |
| Remove | Trash icon. |

Common patterns:

| Query | Effect |
|-------|--------|
| `path:Daily` | Daily notes in a distinct colour. |
| `tag:#project-a` | Project A notes coloured together. |
| `tag:#archive` | Archived notes faded out (with a dim colour). |

### Display

| Control | Effect |
|---------|--------|
| **Arrows** | Draw direction arrows on edges. |
| **Text fade threshold** | Above this zoom level, labels fade in. Slider 0…1. |
| **Node size** | Scale factor on min and max node radii. |
| **Link thickness** | Edge stroke width. |
| **Animate** | Starts a chronological time-lapse: nodes appear in their `created` order. |

### Forces

The simulation is a standard force-directed model. Sliders:

| Slider | Effect |
|--------|--------|
| **Center force** | Pull toward the centre of the graph. Higher = more circular. |
| **Repel force** | Pairwise repulsion between nodes. |
| **Link force** | Edge spring tension. |
| **Link distance** | Edge rest length. |

A *Restore default settings* button resets all sliders.

## Local graph specifics

The local graph shares every setting with the global graph, plus one
extra control:

- **Depth** slider — neighbour distance to include. `1` is direct
  neighbours, `2` adds neighbours of neighbours, and so on.

Local graphs are scoped to the **active note**. If you open one as a
linked view in the sidebar, it follows along as you switch tabs.

## Persisted state

A graph view's complete state is saved with the workspace, so it
survives a reload:

- Filter query
- Group definitions (queries and colours)
- Display sliders
- Force sliders
- Camera position and zoom

You can also save a graph view as a Bookmark — useful for keeping
several "graph perspectives" one click away (e.g. *Just my projects*,
*Archive subset*, *Tags only*).

## Mermaid diagrams

Internal links declared inside a Mermaid diagram (with the
`internal-link` class) do **not** appear in the graph as edges. This
is intentional and matches the rest of the Markdown ecosystem.

## Performance

The renderer handles 10,000-node graphs at interactive frame rates by
drawing to a single canvas (not per-node DOM elements). The force
simulation pauses automatically when the camera has been still for
about two seconds — interacting wakes it up.

If your graph is huge and feels slow:

- Turn off **Tags** and **Attachments** to reduce node count.
- Use the **Search files** filter to scope the visible set.
- Add a few **Groups** with restrictive queries — they help your eyes
  parse the structure faster than colour-uniform nodes.

## See also

- [Search](./search.md) — the operator language used by graph filters
  and groups.
- [Links and embeds](./links-and-embeds.md) — how edges are created.

---

[← Search](./search.md) · [Index](./README.md) · [next: Command palette →](./command-palette.md)
