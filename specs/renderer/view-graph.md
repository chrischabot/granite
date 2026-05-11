# View — Graph

> The visual graph of notes and their links. The graph itself is rendered with WebGL (via PixiJS) — `app.css` styles only the surrounding chrome (controls panel, color swatches, headings).

Source: `renderer/app.css:17139-17324`. Tokens: see [`design-tokens.md`](design-tokens.md) §8 (graph).

---

## 1. DOM scaffold

```
.workspace-leaf-content[data-type="graph"]
  └─ .view-content
       ├─ <canvas>                                      ← Pixi.js renders the actual graph here
       └─ .graph-controls [.is-close]
            ├─ .graph-control-section [.is-collapsed]
            │    ├─ .graph-control-section-header        ← clickable section title
            │    ├─ .graph-color-group                    ← color swatch + label rows
            │    ├─ .setting-item                          ← shared with settings styling
            │    └─ .graph-color-button-container          ← "Add color" button
            └─ .graph-controls-button                      ← collapse / expand controls
```

The graph is rendered via PixiJS (`renderer/lib/pixi.min.js`) into a `<canvas>`. Token-driven colors (below) are read by JS and passed to the WebGL shaders.

---

## 2. Graph color tokens — for Pixi to consume (`app.css:17139-17207`)

```css
.graph-view.color-fill            { color: var(--graph-node);            }
.graph-view.color-fill-focused    { color: var(--graph-node-focused);    }
.graph-view.color-fill-tag        { color: var(--graph-node-tag);        }
.graph-view.color-fill-attachment { color: var(--graph-node-attachment); }
.graph-view.color-fill-unresolved {
  color: var(--graph-node-unresolved);
  opacity: 0.5;
}
.graph-view.color-fill-1          { color: var(--text-muted); }
.graph-view.color-fill-2          { color: var(--text-muted); }
.graph-view.color-fill-3          { color: var(--text-muted); }
.graph-view.color-fill-4          { color: var(--text-muted); }
.graph-view.color-fill-5          { color: var(--text-muted); }
.graph-view.color-fill-6          { color: var(--text-muted); }
.graph-view.color-arrow           { color: var(--text-normal);  opacity: 0.5; }
.graph-view.color-circle          { color: var(--graph-node-focused); }
.graph-view.color-line            { color: var(--graph-line); }
.graph-view.color-text            { color: var(--graph-text); }
.graph-view.color-fill-highlight  { color: var(--interactive-accent); }
.graph-view.color-line-highlight  { color: var(--interactive-accent); }
```

Pattern: each graph-color is exposed via a `.graph-view.color-*` selector. JS reads `getComputedStyle(...).color` for each, parses it, and passes the parsed RGB value to the Pixi shader. This lets themes restyle the graph by overriding the underlying tokens (`--graph-node`, `--graph-line`, `--graph-node-focused`, etc.) without touching JS.

Token resolutions (light theme):
- `--graph-text` → `--text-normal` → `#222`
- `--graph-line` → `--color-base-35` → `#d4d4d4`
- `--graph-node` → `--text-muted` → `#5c5c5c`
- `--graph-node-unresolved` → `--text-faint` → `#ababab` (× 0.5 opacity)
- `--graph-node-focused` → `--text-accent` → `#7c52ed`
- `--graph-node-tag` → `--color-green` → `#08b94e`
- `--graph-node-attachment` → `--color-yellow` → `#e0ac00`

---

## 3. `.graph-controls` panel (`app.css:17209-17241`)

```css
.graph-controls {
  border-radius: var(--menu-radius);                  /* 8px */
  corner-shape: var(--menu-corner-shape);
  position: absolute;
  inset-inline-end: var(--size-4-3);                  /* 12px from inline-end */
  top: var(--size-4-3);                               /* 12px from top */
  padding: 0;
  background-color: var(--menu-background);           /* --background-secondary */
  width: var(--graph-controls-width);                 /* 240px */
  overflow: auto;
}

.graph-controls:not(.is-close) {
  max-height: calc(100% - var(--size-4-4));           /* 100% - 16px */
  border: var(--menu-border-width) solid var(--menu-border-color);
                                                       /* 1px solid --background-modifier-border-hover */
  box-shadow: var(--shadow-s);
}

.graph-controls.is-close {
  min-width: inherit;
  width: auto;
  background-color: var(--background-primary);
  border: var(--menu-border-width) solid transparent;
  padding: var(--size-2-3);                            /* 6px */
}

.graph-controls.is-close > .graph-control-section { display: none; }

.workspace-split:not(.mod-root) .graph-controls.is-close {
  background-color: var(--background-secondary);
}

.graph-controls::-webkit-scrollbar,
.graph-controls::-webkit-scrollbar-thumb { display: none; }
```

The controls panel:
- Floats at `top: 12px; inset-inline-end: 12px` over the graph canvas.
- 240 px wide, 8 px corner radius, menu-style border + shadow.
- `.is-close` collapses to a tiny circular button (just the toggle icon).
- Scrollbar hidden.

---

## 4. Inputs and settings inside graph controls (`app.css:17243-17296`)

```css
.graph-controls input[type='text'],
.graph-controls input[type='range'] {
  width: 100%;
  font-size: var(--font-ui-small);                    /* 13px */
}

.graph-controls .mod-cta {
  margin-top: var(--size-2-3);                        /* 6px */
  width: 100%;
}

.graph-controls .setting-item {
  background-color: transparent;
  padding: var(--size-2-3) 0;                         /* 6px 0 */
  margin-bottom: var(--size-4-1);                     /* 4px */
  border: none;
}

.graph-controls .setting-item .setting-item-info {
  display: flex;
  align-items: center;
}

.graph-controls .setting-item:first-of-type { border-top: none; }

.graph-controls .setting-item.mod-slider {
  flex-direction: column;
}
.graph-controls .setting-item.mod-slider > * { width: 100%; }
.graph-controls .setting-item.mod-slider .setting-item-info { margin-inline-end: 0; }
.graph-controls .setting-item.mod-slider .setting-item-control { padding-top: var(--size-4-3); }

.graph-controls .setting-item.mod-toggle .setting-item-control { padding-top: 0; }

.graph-controls .setting-item.mod-search-setting .setting-item-info { margin-inline-end: 0; }

.graph-controls .setting-item-name { font-size: var(--font-ui-small); }
```

Inside the controls panel, `.setting-item`s lose their card chrome (no background, no border, 6 × 0 padding). Sliders stack vertically (info on top, slider below at full width). All inputs go full-width.

---

## 5. Color swatches (`.graph-color-group`) (`app.css:17303-17323`)

```css
.graph-color-group {
  --swatch-height: 18px;
  --swatch-width:  18px;
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 0 6px 0;
  transition: top 200ms ease-in-out;
}

.graph-color-group input[type="color"] {
  margin: 0 2px 0 6px;
}

.graph-color-group .clickable-icon {
  padding: var(--size-2-2);                           /* 4px */
}

.graph-color-button-container {
  text-align: center;
  margin-bottom: 10px;
}
```

The graph-color picker rows (one per color group):
- 18 × 18 swatches (overrides the standard 22 × 22 from `--swatch-height/width`).
- 6 px bottom padding between rows.
- Each row has a color-input + a label + a remove icon.
- The "Add color" button sits in `.graph-color-button-container`, centered.

The `transition: top` on the row enables smooth reordering animations when groups are added/removed.

---

## 6. Reproducer build order

1. The graph itself is a WebGL `<canvas>` rendered via PixiJS — not styled by CSS. Just provide the canvas and let JS draw.
2. JS reads the `.graph-view.color-*` selectors via `getComputedStyle` to extract colors. Reproducers must keep these selectors and their `color` properties — without them the graph cannot retint per theme.
3. The `.graph-controls` panel is `position: absolute; top: 12px; inset-inline-end: 12px` over the canvas, 240 px wide, 8 px radius, menu chrome.
4. `.is-close` collapses the panel to a small button (just the toggle).
5. Settings rows inside the panel use the normal `.setting-item` DOM but lose their card chrome — set `background: transparent; border: none; padding: 6px 0`.
6. Color picker rows use 18 × 18 swatches (override `--swatch-height/width` locally).
7. Mobile preserves this structure but with `--icon-size: var(--icon-l)` and tighter spacing — see `mobile.md` for cross-cutting rules.
