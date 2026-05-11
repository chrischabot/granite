# Editor — Tables

> Markdown tables in both reading mode (`.markdown-rendered table`) and source live-preview (`.cm-table-widget`). Plus the source-mode `.HyperMD-table-row` styling used when the cursor is inside a table line.

Tokens: see [`design-tokens.md`](design-tokens.md) §22. Source: `renderer/app.css`.

---

## 1. Reading-mode table (`app.css:14432-14593`)

### 1.1 Outer table

```css
.markdown-rendered table {
  margin-block-start: var(--p-spacing);   /* 1rem */
  margin-block-end:   var(--p-spacing);
  word-break: normal;
}

.cm-html-embed table,
.markdown-rendered table {
  border-collapse: collapse;
  line-height: var(--table-line-height);   /* 1.3 */
}
```

### 1.2 Cells (shared td + th)

```css
.cm-html-embed td, .markdown-rendered td,
.cm-html-embed th, .markdown-rendered th {
  padding: var(--size-2-2) var(--size-4-2);   /* 4px 8px */
  border:  var(--table-border-width) solid var(--table-border-color);
                                                /* 1px solid --background-modifier-border */
  max-width: var(--table-column-max-width);    /* none by default */
  min-width: var(--table-column-min-width);    /* 6ch */
  vertical-align: var(--table-cell-vertical-alignment);   /* top */
}

.cm-html-embed td, .markdown-rendered td {
  font-size: var(--table-text-size);    /* --font-text-size = 16px */
  color:    var(--table-text-color);    /* inherit */
}

.cm-html-embed th, .markdown-rendered th {
  font-size:   var(--table-header-size);   /* same as text */
  font-weight: var(--table-header-weight); /* 600 */
  color:       var(--table-header-color);  /* --text-normal */
  font-family: var(--table-header-font);   /* inherit */
  line-height: var(--line-height-tight);   /* 1.3 */
}
```

Default cell:
- 4 × 8 px padding.
- 1 px border in `--background-modifier-border` (collapsed, so adjacent cells share borders).
- Text aligns to the **top** of the cell (`vertical-align: top`).
- Header cells are bold (600) — the only difference between th and td.

### 1.3 Cell text alignment

```css
.cm-html-embed th, .markdown-rendered th,
.cm-html-embed td, .markdown-rendered td { text-align: start; }

.cm-html-embed th[align="left"],   .markdown-rendered th[align="left"],
.cm-html-embed td[align="left"],   .markdown-rendered td[align="left"]   { text-align: start; }

.cm-html-embed th[align="center"], .markdown-rendered th[align="center"],
.cm-html-embed td[align="center"], .markdown-rendered td[align="center"] { text-align: center; }

.cm-html-embed th[align="right"],  .markdown-rendered th[align="right"],
.cm-html-embed td[align="right"],  .markdown-rendered td[align="right"]  { text-align: end; }
```

Markdown table alignment markers (`|:--|`, `|:-:|`, `|--:|`) emit `align="..."` attributes which CSS picks up. `left` → `start` (RTL aware).

### 1.4 Cell ellipsis behavior

```css
.cm-html-embed thead > tr > th, .markdown-rendered thead > tr > th,
.cm-html-embed tbody > tr > td, .markdown-rendered tbody > tr > td {
  white-space: var(--table-white-space);    /* break-spaces */
  text-overflow: ellipsis;
  overflow: hidden;
}

.cm-html-embed thead > tr > th > .markdown-embed,
.markdown-rendered thead > tr > th > .markdown-embed,
.cm-html-embed tbody > tr > td > .markdown-embed,
.markdown-rendered tbody > tr > td > .markdown-embed {
  white-space: normal;
}
```

Default `white-space: break-spaces` lets long text wrap on whitespace; if it still overflows, ellipsis truncates. Embedded markdown (links to other notes embedded inside cells) bypasses this — they need normal whitespace handling.

### 1.5 Row striping and hover

```css
.cm-html-embed tbody tr,
.markdown-rendered tbody tr {
  background-color: var(--table-background);            /* transparent */
}

@media (hover: hover) {
  .cm-html-embed tbody tr:hover,
  .markdown-rendered tbody tr:hover {
    background-color: var(--table-row-background-hover);  /* transparent default */
  }
}

.cm-html-embed tbody tr:nth-child(odd),
.markdown-rendered tbody tr:nth-child(odd) {
  background-color: var(--table-row-alt-background);    /* transparent default */
}

@media (hover: hover) {
  .cm-html-embed tbody tr:nth-child(odd):hover,
  .markdown-rendered tbody tr:nth-child(odd):hover {
    background-color: var(--table-row-alt-background-hover);
  }
}

.cm-html-embed tbody tr > td:nth-child(2n+2),
.markdown-rendered tbody tr > td:nth-child(2n+2) {
  background-color: var(--table-column-alt-background);
}
```

By default, no striping — every token is `transparent` or `--table-background`. Themes can opt in by overriding any of `--table-row-alt-background`, `--table-row-background-hover`, `--table-column-alt-background`. The selector pattern is set up so theme overrides work without further CSS — odd rows, hover, and even columns are all separately addressable.

### 1.6 Border weights

```css
.cm-html-embed tbody tr:last-child > td,
.markdown-rendered tbody tr:last-child > td {
  border-bottom-width: var(--table-row-last-border-width);   /* 1px */
}

.cm-html-embed tbody tr > td:first-child,
.markdown-rendered tbody tr > td:first-child {
  border-left-width: var(--table-column-first-border-width); /* 1px */
}

.cm-html-embed tbody tr > td:last-child,
.markdown-rendered tbody tr > td:last-child {
  border-right-width: var(--table-column-last-border-width); /* 1px */
}
```

The last-row, first-column, and last-column borders are explicitly exposed as tokens so themes can change just one edge of the table independently.

### 1.7 Header backgrounds

```css
.cm-html-embed thead tr,
.markdown-rendered thead tr {
  background-color: var(--table-header-background);   /* --table-background = transparent */
}

@media (hover: hover) {
  .cm-html-embed thead tr:hover,
  .markdown-rendered thead tr:hover {
    background-color: var(--table-header-background-hover);  /* inherit */
  }
}

.cm-html-embed thead tr > th,
.markdown-rendered thead tr > th {
  border-top-width: var(--table-header-border-width);
  border-color:     var(--table-header-border-color);
}

.cm-html-embed thead tr > th:nth-child(2n+2),
.markdown-rendered thead tr > th:nth-child(2n+2) {
  background-color: var(--table-column-alt-background);
}

.cm-html-embed thead tr > th:first-child,
.markdown-rendered thead tr > th:first-child {
  border-left-width: var(--table-column-first-border-width);
}
.cm-html-embed thead tr > th:last-child,
.markdown-rendered thead tr > th:last-child {
  border-right-width: var(--table-column-last-border-width);
}
```

Header row gets the same hover/even-column treatment as body rows. Default theme keeps these transparent.

---

## 2. Source-mode table line — `.HyperMD-table-row` (`app.css:14595-14653`)

When the user is editing the markdown source inside a table line, the `.cm-line.HyperMD-table-row` class is applied:

```css
.cm-s-obsidian .HyperMD-table-row {
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
  font-size: var(--code-size);          /* 0.875em — smaller, monospace-style */
  font-family: var(--font-monospace);
}

.cm-s-obsidian .HyperMD-table-row span.cm-inline-code {
  --code-size: 1em;                      /* counteract the parent's smaller size */
}

.cm-s-obsidian .HyperMD-table-rtl { direction: rtl; }

.cm-s-obsidian .hmd-table-column,
.cm-s-obsidian .hmd-table-column-content { display: inline-block; }

.cm-s-obsidian .hmd-table-column-left   { text-align: left; }
.cm-s-obsidian .hmd-table-column-center { text-align: center; }
.cm-s-obsidian .hmd-table-column-right  { text-align: right; }

.cm-s-obsidian .HyperMD-table-row span.cm-hmd-table-sep,
.cm-s-obsidian .HyperMD-table-row-1 {
  color: var(--text-faint);              /* table separators (`|`) and the alignment row are dim */
}

.cm-s-obsidian .HyperMD-table-row-0 {
  color: var(--table-header-color);      /* --text-normal — header row stands out */
}

/* HTML tables embedded as folded HTML get explicit borders */
.cm-s-obsidian .hmd-fold-html table {
  border-collapse: collapse;
}
.cm-s-obsidian .hmd-fold-html table td,
.cm-s-obsidian .hmd-fold-html table th {
  padding: 10px;
  border: 1px solid #ccc;                /* fixed neutral gray; not theme-aware */
}

.cm-s-obsidian .hmd-inactive-line.HyperMD-table-row-1 {
  color: transparent;
  text-shadow: none;
}

/* The alignment row (`|:--|:-:|--:|`) — when the line is inactive, replaces `:` and `-` with a faint pixel-perfect dashed line via a 1-pixel base64 PNG repeated horizontally */
.cm-s-obsidian .hmd-inactive-line.HyperMD-table-row-1 > span {
  background: url(data:image/png;base64,iVBORw0KGgo…) repeat-x 0px center;
}

.cm-s-obsidian .hmd-inactive-line.HyperMD-table-row span.cm-hmd-table-sep {
  color: transparent;
}
```

Reproducer rules:
- **Source-mode** table lines are monospace and `code-size` (87.5 %) so column widths look stable.
- The pipe character (`|`) and the alignment row (`|:--|...|`) are dim — only the header (row 0) and content rows are normal text color.
- When a table line is **inactive** (cursor not on it), the alignment row's `:`s and `-`s are replaced with a single horizontal dashed-line image (a 1-px-tall PNG repeated horizontally) — so the user sees a clean visual separator between header and body without the noisy syntax characters.
- HTML tables (folded into `.hmd-fold-html`) get explicit 10 px padding + 1 px solid `#ccc` borders — fixed neutral gray since these tables are usually external HTML and need predictable rendering.

```css
.markdown-source-view.mod-cm6 .cm-line.HyperMD-table-row {
  min-width: max-content;     /* let the table line scroll horizontally beyond viewport */
}

.markdown-source-view.mod-cm6 .cm-table-widget table {
  margin-top: 0;
  margin-bottom: 0;            /* widget removes the default 1rem block margins */
}
```

---

## 3. The CodeMirror table widget — `.cm-table-widget` (`app.css:3691-3795`)

When the cursor is **off** a table line in live-preview, CodeMirror replaces the markdown source with a rendered table widget. The widget reuses the standard `.markdown-rendered table` chrome plus extra states.

```css
.markdown-source-view.mod-cm6 .cm-table-widget {
  /* the widget container — outer styling and selection support */
}

.markdown-source-view.mod-cm6 .cm-table-widget.is-loading { /* spinner overlay */ }
.markdown-source-view.mod-cm6 .cm-table-widget .table-wrapper { /* scroll wrapper */ }
.markdown-source-view.mod-cm6 .cm-table-widget tr { /* row defaults */ }
.markdown-source-view.mod-cm6 .cm-table-widget th,
.markdown-source-view.mod-cm6 .cm-table-widget td { /* cell defaults */ }

/* Selection states — when the user has selected one or more cells */
.markdown-source-view.mod-cm6 .cm-table-widget th.is-selected .table-cell-wrapper,
.markdown-source-view.mod-cm6 .cm-table-widget td.is-selected .table-cell-wrapper {
  /* tinted accent fill on the cell-wrapper */
}
.markdown-source-view.mod-cm6 .cm-table-widget th.is-selected::after,
.markdown-source-view.mod-cm6 .cm-table-widget td.is-selected::after {
  /* selection border drawn via ::after pseudo-element */
}

/* Edge selectors — top/bottom corner adjustments */
.markdown-source-view.mod-cm6 .cm-table-widget th.top::after,
.markdown-source-view.mod-cm6 .cm-table-widget td.top::after { /* top edge */ }
.markdown-source-view.mod-cm6 .cm-table-widget th.bottom::after,
.markdown-source-view.mod-cm6 .cm-table-widget td.bottom::after { /* bottom edge */ }

/* When the widget itself is selected (entire table) */
.markdown-source-view.mod-cm6 .cm-table-widget.has-selection { /* outer selected state */ }
.markdown-source-view.mod-cm6 .cm-table-widget.has-selection .cm-content { /* dim content under selection */ }
.markdown-source-view.mod-cm6 .cm-table-widget.has-selection .cm-selectionLayer,
.markdown-source-view.mod-cm6 .cm-table-widget.has-selection .cm-cursorLayer {
  /* hide CM's selection/cursor when widget owns selection */
}
.markdown-source-view.mod-cm6 .cm-table-widget.is-selected {
  /* table-level selection appearance */
}
.markdown-source-view.mod-cm6 .cm-table-widget.is-selected table::after {
  /* outer selection rect on the table */
}
```

Selection mechanics:
- `.is-selected` on a cell adds a 2 px accent border via `::after` (using `--table-selection-border-*` tokens). The cell-wrapper gets a 10 % accent tint via `--table-selection`.
- `.has-selection` on the widget tells CodeMirror to suppress its own selection layer so the table's selection takes over.
- `.is-selected` on the **widget** (the entire table) gets a 2 px outer accent rectangle.

---

## 4. Drag handles — `.table-drag-target` (`app.css:14669-14688`)

```css
.table-drag-target {
  position: absolute;
  z-index: 2;
}
.table-drag-target::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background-color: var(--interactive-accent);
}
.table-drag-target.mod-row::after {
  inset-block: calc(-1 * var(--table-drop-indicator-half-width));   /* -2px / -2px */
}
.table-drag-target.mod-col::after {
  inset-inline: calc(-1 * var(--table-drop-indicator-half-width));  /* -2px / -2px */
}
```

When the user drags a row or column to reorder, a 4 px accent-colored bar (`-2 + 2 = 4` px tall for rows, wide for columns) overlays the target slot.

---

## 5. Token recap (cross-reference to design-tokens.md §22)

| Token | Default | Purpose |
| --- | --- | --- |
| `--table-background` | transparent | base row bg |
| `--table-border-width` | 1px | cell borders |
| `--table-border-color` | `--background-modifier-border` | cell border color |
| `--table-white-space` | break-spaces | cell wrapping |
| `--table-text-size` | `--font-text-size` (16px) | cell font size |
| `--table-line-height` | `--line-height-tight` (1.3) | cell line height |
| `--table-header-weight` | `calc(--font-weight + --bold-modifier)` (600) | th weight |
| `--table-header-color` | `--text-normal` | th color |
| `--table-column-min-width` | 6ch | minimum cell width |
| `--table-row-background-hover` | `--table-background` (transparent) | hover row bg |
| `--table-row-alt-background` | `--table-background` | every-other-row bg |
| `--table-column-alt-background` | `--table-background` | every-other-col bg |
| `--table-selection` | `hsla(--color-accent-hsl, 0.1)` | selected cell fill |
| `--table-selection-border-color` | `--interactive-accent` | selected cell border |
| `--table-selection-border-width` | 2px | selection ring thickness |
| `--table-selection-border-radius` | 4px | selection ring corner |
| `--table-cell-vertical-alignment` | top | cell content alignment |
| `--table-drop-indicator-half-width` | 2px | drop bar half-thickness |

---

## 6. Reproducer build order

1. Tables in reading mode: `border-collapse: collapse; line-height: 1.3`. Cells: 4 × 8 padding, 1 px border, `vertical-align: top`. th = bold (600).
2. Markdown alignment markers (`|:-|:-:|-:|`) emit `align="..."` attrs which CSS maps to `text-align: start/center/end`.
3. Default theme has **no striping** — every alt-row/alt-col token is transparent. Themes opt into striping via the tokens.
4. Borders are exposed per-edge via `--table-row-last-border-width`, `--table-column-first-border-width`, `--table-column-last-border-width` — themes can vary these.
5. Source-mode table lines: monospace, 87.5 % size. The alignment row (row 1) is dim; when inactive its `:`/`-` chars are replaced with a 1-px-tall repeated PNG dash. The header (row 0) and body rows use normal text color.
6. CM6 table widget: when cursor leaves a table line, replace markdown text with a rendered widget. Widget reuses reading-mode chrome plus selection states.
7. Cell selection: `.is-selected` adds 10 % accent fill (via `--table-selection`) plus 2 px accent border (via `::after`).
8. Drag-to-reorder: `.table-drag-target.mod-row` or `.mod-col` paints a 4 px accent bar at the target slot.
9. HTML tables (raw `<table>` blocks in markdown) embedded inside `.cm-html-embed` reuse the same chrome — keep the dual selectors so embedded HTML matches markdown tables.
