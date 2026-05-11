# Multi-select

> The `.multi-select-container` — a tag-style multi-value input with removable pills. Used in Properties for tag/list values, and in some settings (e.g. excluded folders).

Source: `renderer/app.css:9401-9504`. Tokens: see [`design-tokens.md`](design-tokens.md) §16.

---

## 1. DOM scaffold

```
.multi-select-container [.has-input-focus]
  ├─ .multi-select-pill [.multi-select-duplicate] [...]
  │    ├─ .multi-select-pill-content
  │    └─ .multi-select-pill-remove-button
  ├─ .multi-select-pill …
  └─ .multi-select-input          ← contenteditable text input
```

The container reuses standard input chrome (border, hover, focus — see `inputs.md` §1) but flexes its children as wrapped pills.

---

## 2. `.multi-select-container` (`app.css:9401-9409`)

```css
.multi-select-container {
  cursor: text;
  display: inline-flex;
  vertical-align: top;
  flex-wrap: wrap;
  flex: 1 1 auto;
  gap: var(--size-2-3);                              /* 6px */
  min-height: var(--input-height);                    /* 30px */
}
```

Inline flex with wrapping, 6 px gap between pills. Min-height matches a single-line input even when empty.

The container also picks up the shared input rules from `inputs.md` §1: border, hover, focus, placeholder.

---

## 3. `.multi-select-pill` (`app.css:9411-9447`)

```css
body { /* — body-level focus tokens — */ }

.multi-select-pill {
  --icon-size:   var(--icon-xs);                     /* 14px */
  --icon-stroke: var(--icon-xs-stroke-width);
  display: flex;
  align-items: center;
  background-color: var(--pill-background);          /* transparent */
  border: var(--pill-border-width) solid var(--pill-border-color);
                                                       /* 1px solid --background-modifier-border */
  border-radius: var(--pill-radius);                 /* 2em — fully pill */
  color: var(--pill-color);                          /* --text-muted */
  cursor: var(--cursor);
  font-weight: var(--pill-weight);
  padding: var(--pill-padding-y) 0;                  /* 0.25em top/bottom */
  line-height: 1;
  max-width: calc(100% - var(--size-2-3) - 1ch);     /* prevent single pills from blowing out */
  gap: var(--size-2-1);                              /* 2px between content and remove button */
  position: relative;
}

.multi-select-pill:focus:after {
  content: '';
  display: block;
  position: absolute;
  pointer-events: none;
  border-radius: var(--pill-radius);
  inset-inline-end: var(--pill-focus-left-adjust);   /* -4px */
  width:  var(--pill-focus-width);                    /* 100% + 6px */
  height: 100%;
  box-shadow: 0 0 0 1px var(--background-modifier-border-focus),
              inset 0 0 0 1px var(--background-modifier-border-focus);
}

@media (hover: hover) {
  .multi-select-pill:hover {
    background-color: var(--pill-background-hover);
    border:           var(--pill-border-width) solid var(--pill-border-color-hover);
    color:            var(--pill-color-hover);
    text-decoration:  var(--pill-decoration-hover);
  }
}
```

State summary:

| State | `color` | `border-color` | Notes |
| --- | --- | --- | --- |
| base | `--text-muted` | `--background-modifier-border` | transparent bg, 2em radius |
| `:hover` | `--text-normal` | `--background-modifier-border-hover` | (token-driven) |
| `:focus` | (inherited) | (inherited) | + 1 px outer + 1 px inset focus ring via `::after` |

The focus ring uses an `::after` pseudo-element that's slightly **larger** than the pill (`width: 100% + 6px`, `inset-inline-end: -4px`) — appears as a 1 px halo around the pill plus a 1 px inset. The body declares `--pill-focus-width: calc(100% + 6px)` and `--pill-focus-left-adjust: -4px` (`app.css:9396-9399`).

---

## 4. `.multi-select-pill-content` (`app.css:9450-9454`)

```css
.multi-select-pill-content {
  word-break: break-word;
  margin-inline-start: var(--pill-padding-x);        /* 0.65em */
  overflow: hidden;
}
```

The visible text inside the pill — left-padded by `--pill-padding-x` (0.65em). Wrapping allows long values to break.

---

## 5. `.multi-select-pill-remove-button` (`app.css:9456-9472`)

```css
.multi-select-pill-remove-button {
  margin-inline-end: min(var(--size-2-3), var(--pill-padding-x));   /* min(6px, 0.65em) */
  cursor: var(--cursor);
  color: var(--pill-color-remove);                  /* --text-faint */
  border-radius: var(--radius-s);
  corner-shape: var(--corner-shape);
  display: flex;
  align-items: center;
  --icon-size:   var(--icon-xs);                    /* 14px */
  --icon-stroke: var(--icon-xs-stroke-width);
}

@media (hover: hover) {
  .multi-select-pill-remove-button:hover {
    color: var(--pill-color-remove-hover);          /* --text-accent */
  }
}
```

The × button on the right edge of each pill. Default color is `--text-faint`; hover lifts to `--text-accent`. Margin-inline-end uses `min()` so very narrow pills don't lose proportions.

---

## 6. `.multi-select-input` (`app.css:9474-9493`)

```css
.multi-select-input {
  cursor: text;
  font-family: var(--font-interface);
  min-width: 1ch;
  max-width: max-content;
  color: var(--text-normal);
  background-color: inherit;
  border: none;
  word-break: break-word;
}

.multi-select-input::-webkit-scrollbar { display: none; }

.multi-select-input:empty:before {
  content: attr(placeholder, '\200B');
  color: var(--input-placeholder-color);             /* --text-faint */
  pointer-events: none;
}
```

The contenteditable text-entry area at the end of the pill list:
- `min-width: 1ch` ensures it always shows at least one character of cursor space.
- `max-width: max-content` so it grows with what the user types.
- Empty state shows the placeholder via `::before` (CSS `attr()`), with `--text-faint` color.
- Hidden scrollbar (long values scroll horizontally without painting a bar).

---

## 7. Duplicate flash animation (`app.css:9495-9504`)

```css
@keyframes multi-select-highlight {
  from {
    color: var(--text-warning);
    --link-color: var(--text-warning);
  }
}

.multi-select-duplicate {
  animation: multi-select-highlight 2000ms ease-in;
}
```

When the user tries to add a value already in the list, JS adds `.multi-select-duplicate` to the existing pill. It flashes orange (`--text-warning`) for 2 s with `ease-in` (slow start, fast finish). The single-keyframe `from` rule means the pill starts orange and tweens to the default color over the duration.

---

## 8. Token resolution (recap from `design-tokens.md` §16)

```
--pill-color:                var(--text-muted)
--pill-color-hover:          var(--text-normal)
--pill-color-remove:         var(--text-faint)
--pill-color-remove-hover:   var(--text-accent)
--pill-decoration:           none
--pill-decoration-hover:     none
--pill-background:           transparent
--pill-background-hover:     transparent
--pill-border-color:         var(--background-modifier-border)
--pill-border-color-hover:   var(--background-modifier-border-hover)
--pill-border-width:         var(--border-width)   /* 1px */
--pill-padding-x:            0.65em
--pill-padding-y:            0.25em
--pill-radius:               2em                    /* fully pill */
--pill-weight:               inherit
```

---

## 9. Reproducer build order

1. `.multi-select-container` is a wrapping inline-flex with 6 px gap. Picks up the shared input chrome (border, hover, focus) from `inputs.md` §1.
2. Each `.multi-select-pill` is a fully-pill (2em radius) with 1 px border. Background transparent, color `--text-muted`. Hover lifts color and border.
3. Pill focus uses an oversized `::after` pseudo-element with combined outer + inset 1 px box-shadow.
4. The input at the end of the list is a contenteditable span sized to fit content, with placeholder rendered via `::before { content: attr(placeholder) }`.
5. Remove button (× icon) sits at the inline-end of each pill — `--text-faint` default, accent on hover. 14 px icon.
6. Duplicate flash: 2 s `ease-in` color tween from warning-orange to default.
