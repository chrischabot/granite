# Canvas

A **canvas** is an infinite 2D workspace where you arrange cards
(notes, text, images, web pages) and connect them with directional
lines. Canvases are saved as `.canvas` files in the open
[JSON Canvas](https://jsoncanvas.org) format — plain text, vendor
neutral, future proof.

## Creating a canvas

Three ways:

- **Command palette** → *Canvas: Create new canvas*. Creates a file
  next to the active note.
- **File explorer** → right-click a folder → *New canvas*.
- **Ribbon** → *Create new canvas* (the dashboard-grid icon).

The new file has a `.canvas` extension and opens in a Canvas view tab.

## The viewport

The canvas viewport has three layers stacked back-to-front:

1. **Background** — solid colour plus a faint dot grid.
2. **Cards layer** — each card is a rectangle with a configurable
   colour and an optional header label.
3. **Connections layer** — directional lines between cards, optionally
   labelled.

A small toolbar floats in the **upper-right** for zoom and view
controls:

| Button | Action |
|--------|--------|
| Zoom in | Zooms in by one step. |
| Zoom out | Zooms out by one step. |
| Zoom to fit | Frames every card on screen. Hotkey `Shift+1`. |
| Reset zoom | Returns to 1 : 1. |
| Toggle grid | Hides or shows the dot grid. |

A second toolbar floats at the **bottom-center** with creation tools:

| Tool | Action |
|------|--------|
| Add text card | Drop a text card at the cursor. |
| Add note card | Pick a `.md` file to embed. |
| Add media card | Pick an image, audio, video, or PDF to embed. |
| Add web page | Prompt for a URL. |

## Card types

| Type | Stored as | Renders as |
|------|-----------|-----------|
| **Text card** | `"type":"text"` with inline Markdown content | Rich Markdown (Live Preview style). |
| **File card** | `"type":"file"` with a `file:` path | The embedded note, image, PDF, audio, or video. |
| **Link card** | `"type":"link"` with a `url:` | Embedded web page (Web viewer required). |
| **Group** | `"type":"group"` | Labelled rectangle that visually contains other cards. |

### Text cards vs file cards

Text cards live entirely inside the `.canvas` file — their content is
not a `.md` note on its own and does not appear in Backlinks or the
graph. If you want a text card to become a "real" note, right-click it
and choose **Convert to file…**. Granite prompts for a name, writes
the content to a new `.md` file, and replaces the text card with a
file card pointing at it.

## Adding cards

| Gesture | Result |
|---------|--------|
| **Drag from File explorer** | File card. |
| **Drag a file from outside the app** | File card. The file is imported into the attachments folder. |
| **Drag a URL** | Link card. |
| **Right-click empty area** | Menu: *Add note from vault*, *Add media from vault*, *Add web page*, *Create text card*, *Create group*. |
| **Double-click empty area** | Text card at click position. |
| **Drag a folder** | Adds every file in the folder. |

## Selecting

| Gesture | Result |
|---------|--------|
| Click a card | Select it. |
| Drag-rectangle on empty background | Marquee select. |
| `Shift+click` | Toggle membership in the selection. |
| `Mod+A` | Select every card in the canvas. |

A selected card moves to the front in z-order, so it is easier to
manipulate when overlapping.

## Moving and resizing

- **Move** — drag a selected card. Hold `Shift` to constrain to one
  axis. Hold `Alt`/`Option` while dragging to duplicate the selection.
  Hold `Space` during a drag to temporarily disable snapping.
- **Resize** — drag any of the eight edge or corner handles on a
  selected card. Hold `Shift` to maintain aspect ratio. Hold `Space`
  to disable snapping.

## Connections (edges)

To connect two cards, hover near an edge of card A — a small filled
circle appears. Drag it to card B. Releasing on empty space lets you
drop a *new* card to wire to.

Connection actions:

- **Click an edge** — select it. Two small circles appear at the
  endpoints; drag either to re-anchor.
- **Double-click an edge** — type a label. `Esc` or click off to
  commit.
- **Right-click an edge** — *Remove*, *Edit label*, *Set color*,
  *Go to source*, *Go to target*.

Connections have end markers at each endpoint, either `none` or
`arrow`. By default the source end is `none` and the target end is an
arrow.

## Groups

A **group** is a labelled rectangle that visually contains other
cards. Drag any card into a group's bounds and it moves with the
group when you drag the group's container.

- Double-click the group label to rename it.
- Right-click a group for *Ungroup*, *Set color*, *Remove group (keep
  contents)*.

## Panning and zooming

| Action | Gesture |
|--------|---------|
| Pan | `Space+drag`, middle-mouse drag, or trackpad two-finger scroll. `Shift+scroll` pans horizontally. |
| Zoom | `Mod+scroll` or pinch. |
| Zoom to fit | `Shift+1` or the *Zoom to fit* button. |
| Zoom to selection | `Shift+2` or right-click → *Zoom to selection*. |

## Editing cards

Double-click a text or note card to enter edit mode — the same
Markdown editor as the main editor view. Click outside or press `Esc`
to leave edit mode.

For deeper editing of a note card, right-click → *Open in new tab /
window* to open the underlying `.md` file in the main editor.

## Deleting

`Backspace` (or `Delete` on macOS) removes the selected cards and
edges. **The underlying note files are not deleted** — only their
reference in this canvas. Use the file explorer to delete the actual
files.

## Colour palette

Cards and edges share a six-colour palette:

| Index | Suggested colour |
|-------|-------|
| 1 | Red |
| 2 | Orange |
| 3 | Yellow |
| 4 | Green |
| 5 | Cyan / blue |
| 6 | Purple |

Themes can rebind these via `--canvas-color-1` … `--canvas-color-6`.
In the JSON Canvas file the colour field accepts either the palette
index (`"1"` … `"6"`) or any hex string (`"#a882ff"`).

## Selection toolbar

When one or more cards are selected, a small toolbar appears just
above the selection:

| Button | Action |
|--------|--------|
| Set colour | Palette picker. |
| Remove | Delete selection. |
| Edit label | Edges only. |
| Convert to file | Text cards only. |
| Swap file | File cards only. |

## Embedding canvases in notes

A canvas can be embedded inline in any Markdown note:

```md
![[Brainstorm.canvas]]
```

The embed is interactive — you can pan and zoom inside it without
affecting the embed's size in the host note.

## The `.canvas` file format

A canvas file is a single JSON document. The schema is the open
[JSON Canvas](https://jsoncanvas.org) specification, so any tool that
speaks JSON Canvas can read and write Granite canvases.

A minimal example:

```json
{
  "nodes": [
    {
      "id": "a1",
      "type": "text",
      "text": "Hello",
      "x": 0, "y": 0, "width": 200, "height": 80,
      "color": "5"
    },
    {
      "id": "b2",
      "type": "file",
      "file": "Projects/Project A.md",
      "x": 300, "y": 0, "width": 320, "height": 200
    }
  ],
  "edges": [
    {
      "id": "e1",
      "fromNode": "a1", "fromSide": "right",
      "toNode": "b2", "toSide": "left",
      "label": "leads to"
    }
  ]
}
```

You can edit this by hand in any text editor and Granite will reload
the canvas when the file changes on disk.

## See also

- [Markdown syntax](./markdown-syntax.md) — for what you can put
  inside text and note cards.
- [Reference → File formats](../reference/file-formats.md) — the full
  JSON Canvas schema.

---

[← Properties and tags](./properties-and-tags.md) · [Index](./README.md) · [next: Bases →](./bases.md)
