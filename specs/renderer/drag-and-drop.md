# Drag & Drop

> The visual elements that appear during drag operations: ghost copies of the dragged item, drop indicators, the workspace-drop overlay (for tab docking), and the fake-target overlay (for split previews).

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css`.

---

## 1. Ghosts

When the user starts dragging an item (file, tab, leaf), JS appends a ghost element to the body that follows the cursor. There are three ghost types.

### 1.1 `.drag-ghost` — generic single-line ghost (`app.css:3493-3505`)

```css
.drag-ghost {
  position: fixed;
  font-size: var(--font-ui-small);              /* 13px */
  color: var(--drag-ghost-text-color);          /* #fff */
  padding: var(--size-2-3) var(--size-4-2);     /* 6px 8px */
  border-radius: var(--radius-s);               /* 4px */
  background-color: var(--drag-ghost-background); /* rgba(0, 0, 0, 0.85) */
  box-shadow: 0 2px 8px var(--background-modifier-box-shadow);
                                                 /* light: rgba(0,0,0,0.1) | dark: rgba(0,0,0,0.3) */
  z-index: var(--layer-dragged-item);            /* 80 */
  max-width: 300px;
  font-weight: var(--font-medium);               /* 500 */
  pointer-events: none;
}

.drag-ghost.mod-leaf {
  display: flex;
  z-index: var(--layer-tooltip);                 /* 70 — slightly lower for whole-leaf drags */
}

.drag-ghost-icon {
  margin-right: var(--size-2-3);                 /* 6px */
  position: relative;
}
```

Geometry:
- Black-on-white pill with 4 px radius, 6 px × 8 px padding.
- Max 300 px wide, font 13 px medium, color hardcoded `#fff` (matches `.notice` and `.tooltip` — fixed light-on-dark for legibility regardless of theme).
- z-index 80 (`--layer-dragged-item`) — the highest layer except sometimes lowered to 70 for `.mod-leaf`.
- `pointer-events: none` so the ghost never intercepts the cursor.

### 1.2 `.drag-ghost-self` and `.drag-ghost-action` — multi-line ghosts (`app.css:3527-3554`)

```css
.drag-ghost-self {
  display: flex;
}
.drag-ghost-self > .svg-icon {
  --icon-size: var(--icon-xs);                  /* 14px */
  --icon-stroke: var(--icon-xs-stroke-width);
  opacity: 0.7;
  vertical-align: middle;
  align-self: center;
  margin-right: var(--size-2-2);                /* 4px */
  flex-shrink: 0;
}
.drag-ghost-self span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.drag-ghost-action {
  padding: var(--size-2-1) 0 0 0;               /* 2px top */
  font-size: var(--font-ui-smaller);            /* 12px */
  opacity: 0.7;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

DOM for a typical multi-line drag ghost (e.g. dragging a file with action label):

```
<div class="drag-ghost mod-leaf">
  <div class="drag-ghost-self">
    <svg class="svg-icon">…</svg>
    <span>Filename.md</span>
  </div>
  <div class="drag-ghost-action">Move to Archive</div>
</div>
```

The action sub-line is at 70 % opacity in 12 px (smaller and dimmer than the main label).

### 1.3 `.drag-ghost-hidden` — placeholder for the dragged item's source position (`app.css:3556-3571`)

```css
.drag-ghost-hidden {
  visibility: hidden;          /* the original element becomes invisible */
  position: relative;
}
.drag-ghost-hidden:before {
  content: ' ';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  visibility: visible;
  border-radius: 5px;
  background-color: hsla(var(--interactive-accent-hsl), 0.3);
                                /* 30 % accent fill — the "left this slot" indicator */
}
```

When dragging, the element being dragged is given `.drag-ghost-hidden`. The element itself is `visibility: hidden` (preserves layout), and a `::before` pseudo-element paints a 30 %-opacity accent rectangle in the same position — visually marking the slot that the dragged item came from.

### 1.4 `.drag-reorder-ghost` — for tree reordering (`app.css:3517-3525`)

```css
.drag-reorder-ghost {
  position: fixed;
  border-radius: var(--radius-s);              /* 4px */
  corner-shape: var(--corner-shape);
  background-color: var(--background-primary); /* page color, NOT black */
  box-shadow: 0 2px 8px var(--background-modifier-box-shadow);
  z-index: var(--layer-dragged-item);          /* 80 */
  pointer-events: none;
}
```

Used when reordering rows in trees (file explorer, tabs, settings hotkeys). Unlike `.drag-ghost`, this paints with `--background-primary` (page color) — a near-1:1 visual copy of the row, not a labeled chip. JS clones the row's outer HTML into the ghost so it looks identical to the original.

---

## 2. Drop indicators

### 2.1 `.drop-indicator` — between-rows line (`app.css:10841-10852`)

```css
.drop-indicator {
  position: absolute;
  left: 0;
  width: 100%;
  height: 0;
  border: 2px solid var(--interactive-accent);
  pointer-events: none;
}
.drop-indicator:not(.is-active) { display: none; }
```

A 2 px-tall horizontal accent line between rows. JS positions it (top + width) and toggles `.is-active`. Used inside trees and in tab rails for "drop between these two".

### 2.2 `.workspace-drop-overlay` — leaf docking preview (`app.css:6612-6639`)

See `app-shell.md` §9.3 for the full rules. Recap:

```css
.workspace-drop-overlay {
  will-change: transform, width, height;
  position: fixed;
  inset-inline-start: 0; top: 0;
  width: 0; height: 0;
  transform: translate(0, 0);
  transition: all 100ms ease-in-out;
  z-index: var(--layer-cover);          /* 5 */
  pointer-events: none;
}
.workspace-drop-overlay:before {
  content: ' ';
  position: absolute;
  width:  calc(100% - 6px);
  height: calc(100% - 6px);
  top: 0; left: 0; bottom: 0; right: 0; margin: auto;
  background-color: var(--interactive-accent);
  border-radius: var(--radius-m);       /* 8px */
  opacity: 0.5;
}
```

A 50 %-opacity accent box, inset 3 px on every side, with 8 px radius. JS sets `width`, `height`, and `transform` to indicate which half/quarter of the target leaf the dragged tab will dock into. The 100 ms transition makes the overlay morph smoothly as the cursor crosses split boundaries.

### 2.3 `.workspace-fake-target-overlay` — full-content preview (`app.css:6649-6665`)

```css
.workspace-fake-target-container {
  visibility: hidden;
  position: absolute;
  pointer-events: none;
  top: 0; inset-inline-start: 0;
}
.workspace-fake-target-overlay {
  will-change: transform, width, height;
  position: fixed;
  inset-inline-start: 0; top: 0;
  width: 0; height: 0;
  transform: translate(0, 0);
  transition: all 100ms ease-in-out;
  z-index: var(--layer-cover);
  pointer-events: none;
  visibility: visible;
  overflow: hidden;
  background-color: var(--background-primary);
}
.workspace-fake-target-overlay > * { width: 100%; height: 100%; }
```

A duplicated render of the leaf being dragged — JS clones the leaf into the overlay so the user sees the actual content snap into the target's geometry. Same 100 ms transition.

---

## 3. Drag-related body classes

`<body>` gains classes during drag operations:

| Class | Effect | Selector | Source |
| --- | --- | --- | --- |
| `is-grabbing` | Forces `cursor: grabbing` everywhere except resize handles; disables iframe/webview pointer events. | `body.is-grabbing, body.is-grabbing *:not(.workspace-leaf-resize-handle)` | `app.css:3244-3253` |
| (none for drop) | (no body-level class for "is-dropping" — drop targets manage their own state via `.is-being-dragged-over` on `.tree-item-self`, etc.) | — | — |

Tree-item drop state (`app.css:10694-10701`):

```css
.tree-item-self.is-being-dragged-over {
  color: var(--nav-item-color-highlighted);              /* --text-accent */
  background: hsla(var(--interactive-accent-hsl), 0.1);  /* 10 % accent */
}
.tree-item-self.is-being-dragged-over .collapse-icon {
  color: var(--nav-item-color-highlighted);
}
```

And the dragged-source state (`app.css:10759-10767`):

```css
.tree-item-self.is-being-dragged {
  color: var(--text-on-accent);
  background-color: var(--interactive-accent);
}
```

So a tree row in the middle of a drag has three concurrent states:
- The row itself: `.is-being-dragged` (solid accent fill).
- The drop target: `.is-being-dragged-over` (10 % accent wash).
- A `.drop-indicator` may sit above/below to mark the slot.

---

## 4. The `is-being-dragged` modal opacity hack (`app.css:9092-9104`)

```css
.modal-container.is-being-dragged {
  pointer-events: none !important;
}
.modal-container.is-being-dragged .prompt,
.modal-container.is-being-dragged .modal {
  pointer-events: none;
  opacity: 0.25;                /* fade modal during drag */
}
.modal-container.is-being-dragged .modal-bg {
  opacity: 0 !important;        /* hide backdrop */
}
```

When dragging a tab while a modal (e.g. command palette) is open, the modal becomes 25 % opaque and entirely click-through so the user can drop the tab onto the target underneath the modal.

---

## 5. Tab drag region wiring (`app.css:6963-6974`)

```css
.workspace-tab-header-spacer { display: flex; flex-grow: 1; }
body:not(.is-grabbing):not(.is-fullscreen) .workspace-tabs.mod-top .workspace-tab-header-spacer {
  -webkit-app-region: drag;
}
body:not(.is-grabbing):not(.is-fullscreen).is-hidden-frameless .mod-top .workspace-tab-header-container {
  -webkit-app-region: drag;
}
```

The empty rail space is a window-drag region — but **only** when the user isn't currently dragging a tab (`:not(.is-grabbing)`). This prevents the user from grabbing a tab and accidentally dragging the window instead.

---

## 6. Drag-target ARIA / visual outline

There is no explicit ARIA state for drop targets in `app.css` — Obsidian relies on the visual highlight (`.is-being-dragged-over`). For accessibility, screen-reader announcements are JS-driven (the `aria-live` region updates).

---

## 7. Reproducer build order

1. Body sets `.is-grabbing` on dragstart, removes on dragend/cancel. This single class drives the global cursor and the iframe-block.
2. The dragged item gains:
   - `.drag-ghost-hidden` on its original slot (visibility:hidden, accent-tint pseudo-element).
   - JS appends a `.drag-ghost` (or `.drag-reorder-ghost`) to body and tracks it to the cursor.
3. `.drag-ghost` is the canonical labeled ghost — black bg, white 13 px medium text, 4 px radius, 8 px shadow, 6 × 8 padding. `pointer-events: none`, z-index 80.
4. `.drag-reorder-ghost` is for tree reorders — uses `--background-primary` as bg so it looks like a copy of the row.
5. Drop targets:
   - Trees: `.tree-item-self.is-being-dragged-over` (10 % accent wash).
   - Splits: a `.workspace-drop-overlay` (50 % accent fill) repositioned by JS as cursor crosses regions.
   - Between rows: a `.drop-indicator` (2 px accent line) absolutely positioned at the appropriate y-coordinate.
6. `.workspace-fake-target-overlay` is a **duplicate clone** of the dragged leaf, animating to the destination geometry — separate from the drop-overlay highlight, both fire together.
7. Modal containers fade to 25 % during drag so the user can drop through them.
8. The 100 ms `all` transition on overlays makes the geometry morph fluidly when the cursor crosses split boundaries — this is critical to the polished feel; do not omit it.
9. `is-fullscreen` and `is-grabbing` together gate the tab-rail drag-region — only allow window-drag from rail empty space when not fullscreen and not currently dragging a tab.
