# View — Bases (Database)

> Bases is Obsidian's database view: a queryable filtered/sorted/grouped table of notes (or attachments) presented as a table, list, cards, or grouped list. Embedded into markdown via ` ```base ` blocks or used as standalone `.base` files.

Source: `renderer/app.css:15106-16886`. Tokens: see [`design-tokens.md`](design-tokens.md) §3 (Bases section).

This is the largest single component in the renderer — over 1700 lines of CSS. This file documents the structural surfaces; the full selector list is too long to enumerate inline. See `app.css` for exact rules, but the below covers the patterns.

---

## 1. View types and DOM

```
.workspace-leaf-content[data-type="bases"]
  └─ .view-content
       └─ .bases-view [.is-being-dragged-over]
            ├─ .bases-header                    ← top header strip (40px tall)
            ├─ .bases-toolbar                    ← view selector + filters + sort + properties + counts
            ├─ .bases-query-container            ← wrapper for the rendered view
            │    └─ one of:
            │       ├─ .bases-table-container
            │       │    └─ .bases-table
            │       │         ├─ .bases-thead
            │       │         │    └─ .bases-tr
            │       │         │         └─ .bases-table-header-* …
            │       │         ├─ .bases-tbody
            │       │         │    └─ .bases-tr
            │       │         │         └─ .bases-table-cell …
            │       │         └─ .bases-table-footer
            │       ├─ .bases-cards-container
            │       │    └─ .bases-cards-group
            │       │         └─ .bases-cards-item
            │       │              ├─ .bases-cards-cover (image)
            │       │              ├─ .bases-cards-line
            │       │              ├─ .bases-cards-property
            │       │              └─ .bases-cards-label
            │       └─ .bases-list-container
            │            └─ .bases-list-group
            │                 └─ .bases-list-item
            └─ .bases-footer-suggestion-item    ← "Add new item" suggestion at bottom
```

When embedded in markdown: `.bases-embed` wraps the view; when on canvas: `.canvas-node-content.bases-embed`.

---

## 2. Token-driven layout

The Bases view is heavily token-driven (see `design-tokens.md` §3). Key tokens:

```
--bases-header-height:                  40px
--bases-table-row-height:               30px
--bases-table-group-gap:                10px
--bases-table-font-size:                var(--font-smaller)   /* 0.875em */
--bases-cards-radius:                   var(--radius-m)       /* 8px */
--bases-cards-line-height:              24px
--bases-cards-shadow:                   0 0 0 1px var(--background-modifier-border)
--bases-cards-shadow-hover:             0 0 0 1px var(--background-modifier-border-hover)
--bases-table-cell-shadow-active:       0 0 0 2px var(--background-modifier-border-focus)
--bases-table-cell-shadow-focus:        0 0 0 2px var(--interactive-accent)
--bases-table-row-background-hover:     var(--table-row-background-hover)
--bases-table-cell-background-selected: var(--table-selection)
--bases-filter-menu-width:              520px
```

Themes can override every dimension/color via these tokens — the structural CSS reads everything from the token layer.

---

## 3. `.bases-toolbar` (`app.css:15411-15484`)

```css
.bases-toolbar {
  align-items: center;
  position: relative;
  display: flex;
  column-gap: var(--size-2-2);              /* 4px */
  width: 100%;
}

.bases-toolbar .text-icon-button { margin: 2px; }

.bases-toolbar .bases-toolbar-item {
  margin: 0 -2px;                            /* tight pack */
  display: flex;
}

.bases-toolbar .bases-toolbar-item:not(.bases-toolbar-views-menu, .bases-toolbar-result-count) .text-button-label {
  display: var(--bases-toolbar-label-display);   /* block by default */
}

.bases-toolbar .bases-toolbar-result-count {
  color: var(--text-muted);
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-inline-end: auto;                  /* push to inline-start, others to inline-end */
}

.bases-toolbar .bases-toolbar-result-count .text-button-icon { display: none; }
.bases-toolbar .bases-toolbar-result-count .text-button-label {
  font-size: var(--font-ui-smaller);        /* 12px */
  unicode-bidi: plaintext;
}

.bases-toolbar .toolbar-badge {
  --flair-background: transparent;
  padding: 0;
  color: inherit;
  opacity: 0.61;
  display: var(--bases-toolbar-badge-display);   /* none by default */
  padding-inline-end: var(--size-2-1);
  font-size: var(--font-ui-smaller);
}

.bases-toolbar .mod-error {
  --flair-background: var(--text-error);
  --flair-color: var(--text-on-accent);
  color: var(--text-error);
}
```

The toolbar is a flex row of `.text-icon-button`s (see `buttons.md` §3). The result count uses `margin-inline-end: auto` to anchor itself to the start, with all other buttons packed at the end.

---

## 4. Toolbar menus (`app.css:15485-15700+`)

The toolbar's filter / sort / properties / new-item dropdowns are full menus styled via:

```css
.bases-toolbar-menu {
  --input-height: 28px;
  z-index: var(--layer-modal);          /* 50 */
  min-width: 220px;
  max-width: 100vw;
}
.bases-toolbar-menu.bases-toolbar-filter-menu {
  width: var(--bases-filter-menu-width); /* 520px */
}

.bases-toolbar-menu .bases-toolbar-section {
  padding: var(--size-2-1);
}
.bases-toolbar-menu .bases-toolbar-section:not(:last-child) {
  border-bottom: var(--border-width) solid var(--background-modifier-border);
}

.bases-toolbar-menu .bases-toolbar-section-header {
  --flair-background: var(--background-modifier-hover);
  --flair-color: var(--text-muted);
  /* … further chrome … */
}
```

Filter menus are 520 px wide; other menus are 220 px minimum. Sections are separated by 1 px hairlines.

---

## 5. `.bases-table` (`app.css:15760-16100ish`)

```
.bases-table-container         outer wrapper, 1px border, 4px radius
  .bases-thead                 sticky header row
    .bases-tr                  row
      .bases-table-header-*    column header parts
        .bases-table-header-icon
        .bases-table-header-label
        .bases-table-header-name
        .bases-table-header-resizer    drag handle
        .bases-table-header-sort       sort indicator
  .bases-tbody                 scrollable body
    .bases-tr                  row (30px tall)
      .bases-table-cell        individual cell
      .bases-table-active-cell active editing cell
  .bases-table-footer          group summary / totals
    .bases-table-summary-cell  per-column summary
    .bases-table-group-summary-row
```

Key cell rules:
- 30 px row height (`--bases-table-row-height`).
- Cells have 0 px borders by default; hover paints `--bases-table-row-background-hover`.
- Active cell (clicked once) gets a 2 px shadow in `--background-modifier-border-focus` (gray).
- Focused cell (editing) gets a 2 px shadow in `--interactive-accent` (purple).
- Selected cells get `--bases-table-cell-background-selected` fill (10 % accent via `--table-selection`).
- The header sort button uses a mask gradient for a fade effect.

Column resizer (`.bases-table-header-resizer`) is a small drag handle on the right edge of each header cell that resizes the column.

---

## 6. `.bases-cards` (`app.css:16070-16300ish`)

```
.bases-cards-container        flex/grid container
  .bases-cards-group          group label + cards
    .bases-cards-item         single card
      .bases-cards-cover      image cover (top of card)
      .bases-cards-line       text line
      .bases-cards-property   property row (key + value)
      .bases-cards-label      metadata-label style line
```

Cards:
- 8 px corner radius (`--bases-cards-radius`).
- 1 px shadow border in `--background-modifier-border` (token: `--bases-cards-shadow`); hover lifts to `--background-modifier-border-hover`.
- Background: `--background-primary`.
- Cover image background: `--background-primary-alt`.
- Font size: 0.875em.
- Line height: 24 px.
- Scale (zoom): `--bases-cards-scale: 1` — themes can override.

---

## 7. `.bases-list` (`app.css:16300-16500ish`)

A flat or grouped list view:

```
.bases-list-container
  .bases-list-group
    .bases-list-group-list
      .bases-list-item
```

Tighter than cards — single-line rows with optional indentation for group hierarchy.

---

## 8. Group headings (`app.css:15700-15800`)

```css
.bases-group-heading {
  /* property and value side-by-side header */
}
```

When grouped, each group gets a heading row showing the property name (smaller, muted) + value (larger, semibold). Tokens:
- `--bases-group-heading-property-size: --font-ui-smaller` (12px)
- `--bases-group-heading-property-weight: 400`
- `--bases-group-heading-property-color: --text-muted`
- `--bases-group-heading-value-size: --font-smaller` (0.875em)
- `--bases-group-heading-value-weight: 600`

---

## 9. Drag-over and embedded states (`app.css:15123-15263`)

```css
.bases-view {
  /* base */
}
.bases-view.is-being-dragged-over {
  /* drop-target highlight */
}
.bases-view.is-being-dragged-over:after {
  /* the highlight overlay */
}

/* Embedded contexts */
.canvas-node .bases-embed { /* in canvas */ }
.canvas-node-content.bases-embed { /* directly in canvas content */ }
.bases-embed { /* generic markdown embed */ }
```

Embedded bases (`.bases-embed`) inside markdown reuses the same chrome but with adjusted borders and padding.

---

## 10. Search row, filter rows (`app.css:15810-15990`)

```css
.bases-search-row {
  /* a single filter-rule row in the filter menu */
}
.bases-summary-menu-item, .bases-toolbar-sort-item, .bases-toolbar-groupby-item {
  /* item shapes inside their respective menus */
}
.bases-formula-error, .bases-error {
  /* error states in formula fields and overall view */
}
```

Filter rules have a property selector + operator selector + value field (or value picker), plus a remove × on the right.

---

## 11. Reproducer build order

1. The Bases view is enormous — over 1700 lines of CSS. Reproducer should treat it as a separate sub-system. Token-driven everything (see `design-tokens.md` §3).
2. Start with `.bases-view` shell, `.bases-toolbar`, then pick **one** view type to implement first (table is most common).
3. The toolbar is a flex row of `.text-icon-button`s with the result count anchored to inline-start.
4. Filter / sort / properties menus are 220-520 px wide modal-z-index dropdowns with sections separated by 1 px hairlines.
5. Table:
   - 30 px row height.
   - Active cell: 2 px gray shadow. Focused (editing): 2 px accent shadow. Selected: 10 % accent fill.
   - Column resizers on header cell right edges.
   - Sort indicator with linear-gradient mask for fade effect.
6. Cards: 8 px radius, 1 px shadow border, 0.875em font, 24 px line-height. Hover lifts shadow to `--background-modifier-border-hover`.
7. List: flat or grouped vertical rows, tighter than cards.
8. Group headings: property-name (small/muted) + value (semibold).
9. Embedded bases use the same chrome with adjusted spacing — `.bases-embed`.
10. When inside a callout (see `editor-callouts.md` §3), table borders re-tint via `color-mix` to a 25 %-callout-color blend.
11. Filter/value/error states reuse the `.search-input-container`, `.suggestion-container`, `.menu` primitives — Bases is built on top of all the foundations.
