# 11 — Canvas

A **canvas** is an infinite 2D pannable workspace where the user lays out cards (notes, text, media, web pages) and connects them with directional lines. Canvas data is stored in `.canvas` files using the open **JSON Canvas** schema (see `20_file_storage.md` for the schema reference).

## 11.1 Creating a canvas

- Command palette → *Canvas: Create new canvas* (creates beside the active file).
- File explorer right-click → *New canvas*.
- Ribbon → *Create new canvas* (`layout-dashboard` icon).

The new file uses the `.canvas` extension and opens in a Canvas view tab.

## 11.2 The Canvas viewport

Three layers stacked back-to-front:

1. **Background** — solid color `--canvas-background` plus a 1-px dot grid using `--canvas-dot-pattern`.
2. **Cards layer** — each card is a rectangle with a configurable color (1–6, see `--canvas-color-1`…`-6`). Cards have a header label area styled by `--canvas-card-label-color`.
3. **Connections layer** — lines and arrows between cards.

A small zoom/utility cluster floats in the upper-right of the canvas:

| Button | Icon | Action |
|--------|------|--------|
| Zoom in | `plus` | Zooms in. |
| Zoom out | `minus` | Zooms out. |
| Zoom to fit | `maximize` | Frames every card. Hotkey `Shift+1`. |
| Reset zoom | `circle-dashed` (or `100`-text) | Returns to 1:1. |
| (Optional) Toggle grid | `grid-3x3` | Hides/shows dots. |

A small toolbar floats at the **bottom-center** (or appears on canvas hover) for adding cards:

| Tool | Icon | Action |
|------|------|--------|
| Add text card | `file-blank` | Drop a text card at the cursor. |
| Add note card | `file` | Choose a note to add. |
| Add media card | `image` | Choose an image/audio/video/PDF. |
| Add web page | `globe` | Prompt for URL. |

## 11.3 Card types

| Type | Storage in `.canvas` | Renders as |
|------|---------------------|-----------|
| **Text card** | `"type":"text"` with inline Markdown content | Rich Markdown (Live Preview style). |
| **File card** | `"type":"file"` with `file:` path | Embedded note / image / PDF / audio / video. |
| **Link card** | `"type":"link"` with `url:` | Embedded web page (uses Web viewer). |
| **Group** | `"type":"group"` | Labeled rectangle that visually contains other cards. |

### Text-card → file conversion

Right-click a text card → *Convert to file...* prompts for a name and writes the content to a new `.md` file, replacing the text card with a file card pointing to it. (Text cards do not appear in Backlinks until converted.)

## 11.4 Adding cards

- **Drag from File explorer** → file card.
- **Drag from outside the OS** → file card (imported into the attachments folder).
- **Drag a URL** → link card.
- **Right-click empty area** → *Add note from vault*, *Add media from vault*, *Add web page*, *Create text card*, *Create group*.
- **Double-click empty area** → text card at click position.
- **Drag a folder** → adds every file in the folder.

## 11.5 Selecting

- Click a card → select it.
- Drag-rectangle on the empty background → marquee-select.
- `Shift+click` → add/remove from selection.
- `Ctrl/Cmd+A` → select all.
- A selected card moves to the front in z-order.

## 11.6 Moving and resizing

- **Move** — drag a selected card. `Shift` constrains to one axis. `Alt`/`Option` while dragging duplicates the selection. `Space` while moving disables snapping.
- **Resize** — drag any of the eight edge/corner handles. `Shift` maintains aspect ratio. `Space` disables snapping.

## 11.7 Connections (edges)

To connect two cards: hover an edge of card A — a small filled circle appears — drag it to card B. Releasing on empty space lets the user drop a *new* card to wire to.

Edge anchor sides: top / right / bottom / left. The chosen anchor is stored in JSON Canvas as `fromSide`/`toSide`.

### Edge actions

- Click an edge → select it. Two small circles appear at the endpoints; drag either to re-anchor.
- Right-click an edge:
  - *Remove*
  - *Edit label*
  - *Set color* — palette of canvas colors.
  - *Go to source* / *Go to target* (jumps the camera).

### Labels

Double-click an edge to type a label; press `Esc` or click off to commit. Stored as `label` in the JSON Canvas edge object.

### End markers

JSON Canvas edges have `fromEnd` and `toEnd` fields with values `none` or `arrow`. Default: `fromEnd: none`, `toEnd: arrow`.

## 11.8 Groups

A group is a labeled rectangle. Drag any card inside to move it together with the group's container. Double-click the group label to rename it. Right-click → *Ungroup*, *Set color*, *Remove group (keep contents)*.

## 11.9 Panning and zooming

- **Pan** — `Space + drag`, middle-mouse drag, or trackpad two-finger scroll. `Shift+scroll` pans horizontally.
- **Zoom** — `Ctrl/Cmd + scroll` or pinch.
- **Zoom to fit** — `Shift+1` or zoom-to-fit button.
- **Zoom to selection** — `Shift+2` or right-click → *Zoom to selection*.

## 11.10 Editing cards

Double-click a text or note card to enter edit mode (Markdown editing as in the main editor). Click outside or press `Esc` to leave edit mode.

Right-click → *Edit* opens the card in edit mode. Right-click → *Open in new tab/window* opens the underlying file in the main editor.

## 11.11 Deleting / removing

`Backspace` (or `Delete` on macOS) removes selected cards and edges. The underlying note files are **not** deleted — only their canvas reference is.

## 11.12 Color palette

Cards and edges share a palette of 6 named colors:

| Index | Variable |
|-------|----------|
| 1 | `--canvas-color-1` (red-ish) |
| 2 | `--canvas-color-2` (orange-ish) |
| 3 | `--canvas-color-3` (yellow-ish) |
| 4 | `--canvas-color-4` (green-ish) |
| 5 | `--canvas-color-5` (cyan/blue-ish) |
| 6 | `--canvas-color-6` (purple-ish) |

In JSON Canvas the color field accepts an index `"1"`…`"6"` or any hex string `"#a882ff"`.

## 11.13 Embedding canvases in notes

```md
![[Brainstorm.canvas]]
```

Renders an interactive canvas inline at `--embed-canvas-max-height`. The user can pan/zoom inside the embed without affecting the embed dimensions in the host note.

## 11.14 Selection controls (floating toolbar)

When one or more cards are selected, a floating toolbar appears just above the selection with:

| Button | Icon | Action |
|--------|------|--------|
| Set color | `palette` | Palette picker. |
| Add to canvas | `plus` | (Group/connect) |
| Remove | `trash-2` | Delete selection. |
| Edit label (edges only) | `pencil` | |
| Convert to file (text card only) | `file-plus` | |
| Swap file (file card only) | `replace` | |

## 11.15 Performance budget

The implementation must remain interactive (60 fps panning) with at least 500 cards on screen. Use a virtualized renderer or canvas/WebGL drawing for the connections layer.