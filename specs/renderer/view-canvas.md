# View — Canvas

> The 2D infinite canvas with cards (notes, files, groups, links). Pan, zoom, drag, resize, group, link.

Source: `renderer/app.css:18961-19700+`. Tokens: see [`design-tokens.md`](design-tokens.md) §5 (Canvas section), §3 (`--canvas-color-*`).

---

## 1. Mod-color tokens (`app.css:18961-18996`)

```css
.mod-canvas-color-1 { --canvas-color: var(--canvas-color-1); }
.mod-canvas-color-2 { --canvas-color: var(--canvas-color-2); }
.mod-canvas-color-3 { --canvas-color: var(--canvas-color-3); }
.mod-canvas-color-4 { --canvas-color: var(--canvas-color-4); }
.mod-canvas-color-5 { --canvas-color: var(--canvas-color-5); }
.mod-canvas-color-6 { --canvas-color: var(--canvas-color-6); }
```

Tokens:
- `--canvas-color-1` → `--color-red-rgb`
- `--canvas-color-2` → `--color-orange-rgb`
- `--canvas-color-3` → `--color-yellow-rgb`
- `--canvas-color-4` → `--color-green-rgb`
- `--canvas-color-5` → `--color-cyan-rgb`
- `--canvas-color-6` → `--color-purple-rgb`

Default `--canvas-color` (no mod class):
- light theme: `192, 192, 192` (mid gray)
- dark theme: `126, 126, 126` (slightly darker mid gray)

```css
.workspace-leaf-content[data-type='canvas'] .view-content {
  padding: 0;
  position: relative;
}

body          { --canvas-color: 192, 192, 192; }
body.theme-dark { --canvas-color: 126, 126, 126; }
```

The leaf strips its own padding so the canvas fills edge-to-edge.

---

## 2. `.canvas-wrapper` (`app.css:18998-19036`)

```css
.canvas-wrapper {
  position: absolute;
  width: 100%; height: 100%;
  left: 0; top: 0;
  --resizer-size: 20px;
  --shadow-stationary: 0px 0.5px 1px 0.5px rgba(0, 0, 0, 0.1);
  --shadow-drag:        0px 2px 10px rgba(0, 0, 0, 0.1);
  --shadow-border-accent: 0 0 0 2px var(--color-accent);
  --zoom-multiplier: 1;
  background-color: var(--canvas-background);   /* --background-primary */
  overflow: hidden;
  contain: strict;
  touch-action: none;                            /* JS handles all touch */
  user-select: none;
}

.canvas-wrapper.is-dragging { cursor: grabbing; }
.canvas-wrapper.is-dragging iframe:not(.is-controlled),
.canvas-wrapper.is-dragging webview { pointer-events: none; }

.canvas-wrapper.is-screenshotting { z-index: 999999; }
.canvas-wrapper.is-screenshotting .canvas-card-menu,
.canvas-wrapper.is-screenshotting .canvas-controls { display: none !important; }
.canvas-wrapper.is-screenshotting * { pointer-events: none !important; }
```

The canvas wrapper:
- Fills the leaf, `contain: strict` (its own paint/layout boundary).
- `touch-action: none` — JS captures every touch event.
- Locally exposes `--zoom-multiplier`, `--resizer-size`, three shadow tokens.
- Body classes: `.is-dragging` (pan in progress), `.is-screenshotting` (full-bleed capture, hides chrome).

---

## 3. `.canvas-mover` and `.canvas-background` (`app.css:19038-19062`)

```css
.canvas-mover {
  position: absolute;
  width: 100%; height: 100%;
  left: 0; top: 0;
  cursor: grab;
}
.canvas-mover:active { cursor: grabbing; }

.canvas-background {
  position: absolute;
  width: 100%; height: 100%;
  left: 0; top: 0;
  pointer-events: none;
}

.canvas-background circle { fill: var(--canvas-dot-pattern); }
                                                    /* --color-base-30 */
```

The background is an SVG dot pattern (small circles at regular intervals). `pointer-events: none` so clicks pass through to the canvas. The wrapper itself acts as the pan-grab target via `.canvas-mover`.

---

## 4. `.canvas` and `.canvas-selection` (`app.css:19064-19104`)

```css
.canvas {
  position: absolute;
  width: 100%; height: 100%;
  left: 0; top: 0;
  transform-origin: 0 0;          /* zoom/pan via transform: scale(z) translate(x, y) */
  pointer-events: none;
}

.canvas > * { pointer-events: initial; }   /* re-enable for children */

.canvas-selection {
  pointer-events: none;
  position: absolute;
  background-color: hsla(var(--color-accent-hsl), 0.1);
  border: 2px solid var(--color-accent);
  z-index: -1;
}

.canvas-selection.mod-group-selection {
  border-width: 3px;
  border-radius: 3px;
  background-color: hsla(var(--color-accent-hsl), 0.03);
  border-color: hsla(var(--color-accent-hsl), 0.3);
  pointer-events: initial;          /* groups are drag-targets */
}

.canvas-wrapper:not(.mod-readonly) .canvas-selection.mod-group-selection { cursor: grab; }
.canvas-wrapper:not(.mod-readonly) .canvas-selection.mod-group-selection:active { cursor: grabbing; }

.canvas-selection.mod-node-highlight { border-radius: var(--radius-m); }
                                       /* 8px */
```

Selection box: 10 % accent fill + 2 px solid accent border. Group selection drops to 3 % fill + 30 %-opacity 3 px border with 3 px radius. Node-highlight selection uses 8 px radius (matching node radius).

---

## 5. `.canvas-card-menu` and `.canvas-controls` (`app.css:19106-19180`)

```css
.canvas-controls,
.canvas-card-menu {
  display: flex;
  position: absolute;
  z-index: var(--layer-cover);                       /* 5 */
  font-size: var(--font-ui-medium);                  /* 15px */
}

/* Bottom-center floating "add card" menu */
.canvas-card-menu {
  background-color: var(--background-primary);
  border-radius: var(--radius-s);                    /* 4px */
  box-shadow: var(--input-shadow);
  bottom: var(--size-4-4);                           /* 16px from bottom */
  left: 50%;
  transform: translatex(-50%);
  align-items: stretch;
}

.is-phone .canvas-card-menu,
.mod-toolbar-open .canvas-card-menu { display: none; }

.theme-dark .canvas-card-menu { background-color: var(--background-secondary); }

.canvas-card-menu .canvas-card-menu-divider {
  width: 1px;
  background-color: var(--background-modifier-border);
}

.canvas-card-menu .canvas-card-menu-button {
  color: var(--text-muted);
  height: auto;
  display: flex;
  line-height: 1;
  align-items: center;
  justify-content: center;
  padding: var(--size-4-2);                          /* 8px */
  --icon-size:   var(--icon-xl);                     /* 32px */
  --icon-stroke: var(--icon-xl-stroke-width);        /* 1.25px */
}

@media (hover: hover) {
  .canvas-card-menu .canvas-card-menu-button:hover {
    color: var(--color-accent);
  }
}

.canvas-card-menu .canvas-card-menu-button svg {
  fill: var(--background-primary);
}

.theme-dark .canvas-card-menu .canvas-card-menu-button svg {
  fill: var(--background-secondary);
}

.canvas-card-menu .canvas-card-menu-button.mod-draggable { cursor: grab; }
.canvas-card-menu .canvas-card-menu-button.mod-draggable:active { cursor: grabbing; }

.canvas-card-menu .canvas-card-menu-button.mod-draggable svg {
  transition: 90ms transform ease-out;
}
@media (hover: hover) {
  .canvas-card-menu .canvas-card-menu-button.mod-draggable:hover svg {
    transform: translateY(-6px) scale(var(--direction), 1);
    filter: drop-shadow(0px 6px 2px rgba(0, 0, 0, 0.1));
  }
}
```

The bottom-center "add card" menu (text card / file card / web card / group):
- 4 px-radius card with `--input-shadow` chrome.
- Each button is 32 px Lucide icon (`--icon-xl`), 1.25 px stroke. Padding 8 px.
- `.mod-draggable` buttons (the ones the user drags onto the canvas) get a hover effect: SVG translates up 6 px with a drop shadow. Animated 90 ms ease-out. The `scale(var(--direction), 1)` part flips horizontally for RTL.

---

## 6. `.canvas-controls` (right-side button stack) (`app.css:19183-19228`)

```css
.canvas-controls {
  inset-inline-end: var(--size-4-2);                 /* 8px */
  top: var(--size-4-2);                               /* 8px */
  gap: var(--size-4-2);                               /* 8px */
  display: flex;
  flex-direction: column;
}

.is-mobile .canvas-controls {
  inset-inline-end: var(--size-4-3);                 /* 12px on mobile */
}

.canvas-control-group {
  border-radius: var(--canvas-controls-radius);      /* 4px */
  background-color: var(--interactive-normal);
  border: 1px solid var(--background-modifier-border);
  box-shadow: var(--input-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.is-mobile .canvas-control-group { border: none; }

.canvas-control-item {
  border-radius: 0;
  box-shadow: none;
  height: auto;
  display: flex;
  line-height: 1;
  font-size: inherit;
  align-items: center;
  justify-content: center;
  /* … further padding/icon rules … */
}
```

Top-right vertical stack of zoom controls + minimap toggle. Each group is a `.canvas-control-group` (small rounded card with hairline border + input-shadow). Items inside are `.canvas-control-item` — flat, no individual borders or shadows; the group provides the chrome.

---

## 7. `.canvas-node` and `.canvas-edges`

(Many more selectors at `app.css:19228-19700+` for node containers, content blockers, group labels, edge labels, minimap, instruction overlays, watermarks, snaps. The patterns:

- `.canvas-node` — outer node wrapper with `--canvas-color` for tinting.
- `.canvas-node-content` — the actual content (could be a markdown render, file embed, web card, etc.).
- `.canvas-node-content-blocker` — overlay that captures clicks for selection without bubbling to content.
- `.canvas-node-resizer` — 8 corner / edge resize handles.
- `.canvas-node-connection-point` — the small "drag to connect" dots on each edge.
- `.canvas-node-group` — group rectangle (transparent fill with border, label at top).
- `.canvas-edges` / `.canvas-path-label` — connection lines + their labels.
- `.canvas-minimap` — fixed-position thumbnail of the entire canvas (bottom-right).
- `.canvas-menu` / `.canvas-submenu` — context menus when right-clicking nodes.
- `.canvas-watermark` — diagonal watermark text for read-only canvases.
- `.canvas-snaps` — alignment guides during drag.
- `.canvas-instruction` / `.canvas-help` / `.canvas-placeholder-message` — empty-state guides.)

The visual identity is consistent: cards have rounded corners (`--radius-m` / `--radius-l`), accent-tinted borders when selected, `--canvas-color` for type-color. Nodes use the `var(--canvas-color)` token via `rgba(var(--canvas-color), <alpha>)` for backgrounds and borders.

---

## 8. RTL (`app.css:4956-4994`)

```css
.mod-rtl .canvas-wrapper { direction: ltr; }
.mod-rtl .canvas-card-menu { flex-direction: row-reverse; }
```

The canvas itself stays LTR even in RTL interfaces (the user's spatial canvas is independent of UI text direction). The card menu reverses its row order to match RTL UI conventions.

---

## 9. Reproducer build order

1. The leaf's `.view-content` strips padding so the canvas is edge-to-edge.
2. `.canvas-wrapper` is `position: absolute; contain: strict; touch-action: none`. JS handles all interactions.
3. The dot-pattern background is an SVG with circles filled `--canvas-dot-pattern` (`--color-base-30`).
4. `.canvas` itself is a transformed `pointer-events: none` container; only its children receive events. Pan/zoom is via `transform: translate(x, y) scale(z)` with `transform-origin: 0 0`.
5. Selections: 10 % accent fill + 2 px accent border. Groups: 3 % fill + 30 %-opacity 3 px border, 3 px radius.
6. `.canvas-card-menu` is bottom-center, `bottom: 16px`, `left: 50%; transform: translateX(-50%)`. 32 px (`--icon-xl`) Lucide icons. Hover lifts SVG -6 px with drop shadow.
7. `.canvas-controls` is top-right, 8 px from edges, vertical stack.
8. Each `.canvas-control-group` is a 4 px-radius card with `--input-shadow`. Items inside lose their own borders.
9. Color groups via `.mod-canvas-color-N` set `--canvas-color` to the corresponding RGB triplet. Use `rgba(var(--canvas-color), <alpha>)` everywhere a tint is needed.
10. RTL: canvas content stays LTR; only the card menu's row-direction reverses.
