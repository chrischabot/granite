# Editor — Headings and Lists

> The structural typographic elements of every markdown document. Headings rules already documented in [`typography.md`](typography.md) §3; this file covers list-specific styling: bullet rendering, indent geometry, collapse states, ordered vs unordered, task lists.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css:13728-13950`.

---

## 1. Heading recap (cross-reference)

Heading sizes, weights, line-heights, and letter-spacing live in `typography.md` §3. Heading collapse-indicator behavior — visible on hover or when collapsed — lives in `tree-item.md` §8. The relevant tokens are `--h1-size … --h6-size`, `--h1-weight … --h6-weight`, `--h1-line-height …`, `--h1-letter-spacing …`. All headings get `margin-block-start/end: var(--p-spacing) = 1rem`.

In source mode, heading lines are `.cm-line.HyperMD-header` and get `padding-top: var(--p-spacing)` (`app.css:13421`). The line *after* a heading (when non-empty) gets `padding-top: var(--p-spacing-empty) = 0` to suppress double-spacing (`app.css:13425-13427`).

---

## 2. Default list markers (`app.css:13728-13755`)

```css
ul ul, ol ul, ol ol ul, ol ul ul, ul ol ul, ul ul ul {
  list-style-type: disc;          /* nested ULs are always disc bullets */
}

ol { list-style-type: var(--list-numbered-style); }   /* default: decimal */

ul > li, ol > li { text-align: start; }

ol > li::marker, ul > li::marker {
  color: var(--list-marker-color);          /* --text-faint */
}

ol > li.is-collapsed::marker,
ul > li.is-collapsed::marker {
  color: var(--list-marker-color-collapsed);  /* --text-accent */
}
```

Reproducer:
- Default UL marker is whatever the browser chooses based on nesting depth (Chromium: disc / circle / square). Obsidian forces every nested level beyond level 1 to **disc** for visual consistency.
- OL uses `--list-numbered-style` (default `decimal` — themes can override to `lower-alpha`, `upper-roman`, etc.).
- The bullet itself uses `--text-faint` color; collapsed lists swap to `--text-accent` so collapsed branches stand out.

---

## 3. Reading-mode list spacing (`app.css:13760-13804`)

```css
.markdown-rendered ul,
.markdown-rendered ol {
  padding-inline-start: 0;
  margin-block-start: var(--p-spacing);    /* 1rem */
  margin-block-end: var(--p-spacing);
}

.markdown-rendered ul ul, .markdown-rendered ol ul,
.markdown-rendered ul ol, .markdown-rendered ol ol {
  margin-block-start: 0;
  margin-block-end: 0;
}

.markdown-rendered ul li p:first-of-type { margin-block-start: 0; }
.markdown-rendered ul li p:last-of-type  { margin-block-end: 0; }
.markdown-rendered ol li p:first-of-type { margin-block-start: 0; }
.markdown-rendered ol li p:last-of-type  { margin-block-end: 0; }

.markdown-rendered ul > li,
.markdown-rendered ol > li {
  padding-top: var(--list-spacing);        /* 0.075em */
  padding-bottom: var(--list-spacing);
  position: relative;
}

.markdown-rendered ul > li,
.markdown-rendered ol > li {
  margin-inline-start: 3ch;                /* 3 character widths of indent at level 1 */
}

.markdown-rendered ol ol > li,
.markdown-rendered ul ul > li {
  margin-inline-start: var(--list-indent); /* 2.25em (= --indent-unit × --indent-size = 0.5625 × 4) for nested */
}
```

Reproducer rules:
- Outer-most lists get 1 rem block margin (top + bottom). Nested lists collapse this to 0 so they don't add extra space inside their parent.
- Each item gets 0.075em top/bottom padding — a very tight gap that adds visual rhythm without breaking lines apart.
- Level-1 indent is `3ch` (three character widths — visually balanced regardless of font); level-2+ uses `--list-indent: 2.25em`.
- Paragraph margins inside `<li>` are zeroed at the first/last child so the visual size of an item is just the item content, not extra paragraph spacing.

---

## 4. Source-mode and live-preview list indents (`app.css:13806-13848`)

```css
.markdown-source-view {
  --list-padding-inline-start: var(--list-indent-source);    /* 0 */
  --list-marker-space: 0;
}

.markdown-source-view.is-live-preview {
  --list-padding-inline-start: var(--list-indent-editing);   /* 0.75em */
  --list-marker-space: 0.25em;
}

.cm-formatting-list-ul,
.cm-formatting-list-ol {
  font-variant-numeric: tabular-nums;
  padding-inline-start: var(--list-padding-inline-start);
}

.markdown-source-view.mod-cm6 .HyperMD-list-line-nobullet .cm-indent {
  min-width: var(--list-indent);                              /* 2.25em */
}

.cm-s-obsidian .cm-formatting-list { color: var(--list-marker-color); }
.cm-s-obsidian .is-collapsed ~ .cm-formatting-list { color: var(--list-marker-color-collapsed); }

.cm-line.HyperMD-list-line { tab-size: var(--list-indent); }

/* per-item spacing for both modes */
.markdown-source-view ol > li,
.markdown-source-view ul > li,
.markdown-preview-view ol > li,
.markdown-preview-view ul > li,
.mod-cm6 .HyperMD-list-line.cm-line {
  padding-top: var(--list-spacing);
  padding-bottom: var(--list-spacing);
}
```

Reproducer rules:
- **Plain source mode**: zero indent on list-formatting markers (the `- ` or `1. `) — they sit flush at the line start. `--list-marker-space: 0` removes any gap between marker and content.
- **Live-preview mode**: 0.75em indent on the marker, plus 0.25em space between marker and content — visually closer to the rendered preview but still letting the user see the markdown source character.
- `tab-size: var(--list-indent)` (2.25em) on `.HyperMD-list-line` so tab-indent expands to one indent level per tab character.
- The `.is-collapsed` cascade uses sibling selector (`~`) on `.cm-formatting-list` so the bullet color updates the moment the collapse state changes.

---

## 5. Custom bullet rendering (`app.css:13851-13912`)

When `--list-bullet-size > 0` (default `0.3em`), Obsidian replaces the native marker with a CSS-drawn bullet:

```css
.markdown-rendered .list-collapse-indicator {
  margin-inline-start: -2.65em;       /* pull left into the bullet's column */
  padding-inline-end: 2em;
}

.markdown-rendered .list-bullet {
  float: inline-start;                /* legacy `float: left` paired with logical `inline-start` */
  margin-inline-start: -0.8em;        /* nudge to align with text */
}

.markdown-rendered .task-list-item > .list-bullet {
  display: none;                       /* tasks use their checkbox, not a bullet */
}

.markdown-rendered ul.has-list-bullet {
  list-style-type: '\200B';            /* zero-width space — suppress browser bullet */
}

.markdown-rendered ul.has-list-bullet > li::marker {
  color: transparent;
}

.list-bullet {
  color: transparent;                  /* hide the markdown character itself */
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}
.list-bullet:before { content: '\200B'; }   /* baseline anchor */

.list-bullet:after {
  position: absolute;
  content: '\200B';
  pointer-events: none;
  color: var(--list-marker-color);
  border-radius:    var(--list-bullet-radius);   /* 50% — circular */
  width:            var(--list-bullet-size);     /* 0.3em */
  height:           var(--list-bullet-size);
  border:           var(--list-bullet-border);   /* none */
  transform:        var(--list-bullet-transform);/* none */
  background-color: var(--list-marker-color);
  transition: transform 0.15s, box-shadow 0.15s;
}

.list-bullet::selection { background-color: transparent !important; }
                                /* prevent the bullet area being included in user selections */

li.is-collapsed .list-bullet:after,
.is-collapsed ~ .cm-formatting-list .list-bullet:after {
  background-color: var(--list-marker-color-collapsed);
  box-shadow: 0 0 0 4px var(--background-modifier-active-hover);
                                                /* halo around collapsed bullet */
}
```

The bullet pattern:
- `.list-bullet` is the wrapper element. The actual character (typically `-` or `*` from markdown) is invisible (`color: transparent`).
- A `::after` pseudo-element paints the actual bullet — a 0.3em filled circle in `--list-marker-color`.
- When the list is collapsed, the bullet swaps to accent color and gets a 4 px halo (`box-shadow`) tinted by `--background-modifier-active-hover` (10 % accent).

Hover affordance (`app.css:13929-13950`):

```css
@media (hover: hover) {
  .list-collapse-indicator:hover ~ .list-bullet:after,
  .cm-fold-indicator:hover ~ .list-bullet:after,
  .list-collapse-indicator:hover ~ .cm-formatting-list .list-bullet:after,
  .cm-fold-indicator:hover ~ .cm-formatting-list .list-bullet:after {
    background-color: var(--list-marker-color-hover);   /* --text-muted */
    box-shadow: 0 0 0 4px var(--background-modifier-hover);
  }

  /* When already collapsed AND hovered: keep the collapsed accent color, halo darkens */
  li.is-collapsed .list-collapse-indicator:hover ~ .list-bullet:after,
  li.is-collapsed .cm-fold-indicator:hover ~ .list-bullet:after,
  …
  .cm-fold-indicator:hover.is-collapsed ~ .cm-formatting-list .list-bullet:after {
    background-color: var(--list-marker-color-collapsed);
    box-shadow: 0 0 0 4px var(--background-modifier-active-hover);
  }
}
```

Hovering over the collapse-indicator (caret) brightens the bullet to `--text-muted` and draws a 4 px halo. When already collapsed, hovering keeps the accent color but darkens the halo to the active-hover state.

The 0.15 s transition on `.list-bullet:after` for `transform` and `box-shadow` smooths the halo entrance/exit.

---

## 6. Live-preview-only list rules (`app.css:13916-13927`)

```css
.markdown-source-view.mod-cm6.is-live-preview .cm-line.HyperMD-list-line .cm-fold-indicator .collapse-indicator {
  padding-inline-end: 0;
}

.markdown-source-view.mod-cm6.is-live-preview .cm-line.HyperMD-list-line:not(.cm-active):not(.HyperMD-task-line) .cm-fold-indicator .collapse-indicator {
  padding-inline-end: var(--list-bullet-end-padding);          /* 1.3rem */
  inset-inline-end: calc(var(--list-bullet-end-padding) * -1); /* -1.3rem */
}
```

In live-preview, the collapse-indicator (caret) on a non-active list line gets shifted **right** by 1.3 rem so it sits in the bullet's column rather than after the text. On the active line (cursor inside), the indicator returns to its default position so it doesn't shift the editing position.

Task-line items (`.HyperMD-task-line`) keep the default position regardless of active state — task checkboxes are positioned differently than bullets.

---

## 7. Indentation guides (`app.css:8437-8476`)

```css
.markdown-rendered.show-indentation-guide li > ul,
.markdown-rendered.show-indentation-guide li > ol {
  position: relative;
}
.markdown-rendered.show-indentation-guide li > ul::before,
.markdown-rendered.show-indentation-guide li > ol::before {
  content: "\200B";
  position: absolute;
  display: block;
  inset-inline-start: var(--indentation-guide-reading-indent);   /* -0.85em */
  top: 0; bottom: 0;
  border-inline-end: var(--indentation-guide-width) solid var(--indentation-guide-color);
                                                                 /* 1px solid 12% mono */
}

/* Source / live-preview mode */
.markdown-source-view.mod-cm6 .cm-indent {
  min-width: var(--list-indent);
  display: inline-block;
}
.markdown-source-view.mod-cm6 .cm-indent::before {
  content: "\200B";
  display: block;
  width: 1px;
  border-inline-end: var(--indentation-guide-width) solid var(--indentation-guide-color);
  color: transparent;
  position: absolute;
  top: 0; bottom: 0;
  margin-inline-start: var(--indentation-guide-source-indent);  /* 0.25em */
}
.markdown-source-view.mod-cm6.is-live-preview .cm-indent::before {
  margin-inline-start: var(--indentation-guide-editing-indent); /* 0.85em */
}
.markdown-source-view.mod-cm6 .cm-active-indent::before {
  border-inline-end: var(--indentation-guide-width-active) solid var(--indentation-guide-color-active);
                                                                 /* 1px solid 30% mono */
}
```

Indentation guides are vertical 1 px lines drawn at the inline-start of each indent level:
- Reading mode: positioned at `-0.85em` from the nested list's left edge.
- Source mode: 0.25em margin (the bullet's column).
- Live preview: 0.85em margin (after the bullet).
- Active line (cursor on it): switches color from 12 % mono to 30 % mono — `.cm-active-indent` is the modifier.

---

## 8. Reproducer build order

1. Reading mode: outer lists get 1 rem top/bottom margin; nested lists collapse this. Each `<li>` gets `padding: 0.075em 0`. Indents: level-1 uses `3ch`, level-2+ uses `--list-indent` (2.25em).
2. Markers: ULs default to `disc` for nested (browser default); OLs use `--list-numbered-style: decimal`. Default marker color is `--text-faint`; collapsed swaps to `--text-accent`.
3. Custom bullets: `.list-bullet:after` paints a 0.3em filled circle in `--list-marker-color`. The `<li>`'s `::marker` is suppressed via `list-style-type: '\200B'` + `color: transparent`.
4. Collapse halo: 4 px box-shadow in `--background-modifier-active-hover` (10 % accent). Animate `box-shadow` and `transform` over 0.15 s.
5. Source mode: marker gets `--list-padding-inline-start: 0` (flush left). Live-preview gets `0.75em` for visual parity with rendered.
6. Indentation guides: 1 px line in `rgba(mono-100, 0.12)` (12 % gray). Active line lifts to 30 %.
7. Task lists: `.task-list-item-checkbox` replaces the bullet — `.list-bullet` is hidden via `display: none` (see `checkbox.md` §5).
8. Source-mode formatting characters (`#`, `-`, `*`) use `--text-faint` so they recede visually.
9. The `.cm-active` class on the cursor's current line is the gate for many "show full markdown" rules in live-preview — without it, formatting characters and bullet positions hide; with it, they show.
