# Checkbox

> Two distinct controls share the name:
>
> 1. **`<input type="checkbox">` / `<input type="radio">`** — the small square (or circle) check used in markdown task-list items, modal "Don't ask again" boxes, and form fields.
> 2. **`.checkbox-container`** — actually a **toggle switch** (slider). See [`toggle.md`](toggle.md) for that. Despite the class name being "checkbox-container", it's a toggle. Confusingly, in the markdown editor the task list checkboxes use `.task-list-item-checkbox` which IS a square `<input type=checkbox>`.

This file documents `<input type=checkbox>` and `<input type=radio>` only. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. `<input type="checkbox">` and `<input type="radio">` shared base (`app.css:14771-14805`)

```css
input[type="radio"],
input[type=checkbox] {
  -webkit-appearance: none;
  appearance: none;
  border-radius:        var(--checkbox-radius);     /* --radius-s = 4px */
  border: 1px solid     var(--checkbox-border-color); /* --text-faint */
  flex-shrink: 0;
  padding: 0;
  margin: 0;
  margin-inline-end: 6px;
  width:  var(--checkbox-size);                      /* --font-text-size = 16px */
  height: var(--checkbox-size);
  position: relative;
  transition: box-shadow 0.15s ease-in-out;
}

input[type="radio"][disabled=true],
input[type=checkbox][disabled=true] {
  pointer-events: none;
}

input[type="radio"]:hover,
input[type=checkbox]:hover,
input[type="radio"]:active,
input[type=checkbox]:active,
input[type="radio"]:focus,
input[type=checkbox]:focus {
  outline: 0;
  border-color: var(--checkbox-border-color-hover); /* --text-muted */
}

input[type="radio"]:focus-visible,
input[type=checkbox]:focus-visible {
  box-shadow: 0 0 0 2px var(--background-modifier-border-focus);
}
```

State summary:

| Class | `border-color` | `box-shadow` |
| --- | --- | --- |
| (base) | `--text-faint` | (none) |
| `:hover` / `:active` / `:focus` | `--text-muted` | (none) |
| `:focus-visible` | `--text-muted` | `0 0 0 2px --background-modifier-border-focus` |
| `[disabled=true]` | (no change) | `pointer-events: none` |

Geometry:
- 16 × 16 px (default — same as `--font-text-size`).
- 1 px border, 4 px corner radius (squarer than buttons or inputs).
- `appearance: none` strips the OS-native chrome; the rest is custom.
- 6 px `margin-inline-end` so labels align cleanly to the right.

---

## 2. Checked state — the tick (`app.css:14807-14826`)

```css
input[type="radio"]:checked:after,
input[type=checkbox]:checked:after {
  content: "";
  top: -1px;
  inset-inline-start: -1px;          /* compensate for the 1px border */
  position: absolute;
  width:  var(--checkbox-size);      /* 16px */
  height: var(--checkbox-size);
  display: block;
  background-color: var(--checkbox-marker-color);   /* --background-primary (the tick is page color) */
  -webkit-mask-position: 52% 52%;
  -webkit-mask-size: 65%;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-image: url("data:image/svg+xml; utf8, <svg ...><path d='M8.1,14.04 L4.5,10.54 C4.33,10.35 4.33,10.04 4.52,9.84 L5.25,9.14 C5.45,8.95 5.77,8.95 5.97,9.14 L8.47,11.59 L14.03,6.14 C14.23,5.95 14.55,5.95 14.75,6.14 L15.48,6.84 C15.67,7.04 15.67,7.35 15.48,7.54 L8.83,14.04 C8.63,14.23 8.30,14.23 8.10,14.04'/></svg>");
}

input[type="radio"]:checked,
input[type=checkbox]:checked {
  background-color: var(--checkbox-color);          /* --interactive-accent */
  border-color:     var(--checkbox-color);
}
@media (hover: hover) {
  input[type="radio"]:checked:hover,
  input[type=checkbox]:checked:hover {
    background-color: var(--checkbox-color-hover);   /* --interactive-accent-hover */
    border-color:     var(--checkbox-color-hover);
  }
}
```

Mechanism:
- When checked, the box turns accent-colored (background + border).
- A `::after` pseudo-element is positioned over the entire box, painted with `--background-primary` (page color) and **masked** with the tick SVG. The mask cuts the page-color down to just the check shape, producing a tick that visually "punches through" the accent fill.
- Mask size is 65 % — the tick occupies the inner 65 % of the box, centered at 52/52 (very slightly off-center to feel optically balanced).
- The tick SVG path is hand-tuned in viewBox `0 0 12 8` — explicitly drawn for this size.

The `top: -1px; inset-inline-start: -1px` offsets compensate for the border so the after-element exactly overlaps the box including its border.

---

## 3. Indeterminate state (`app.css:14838-14851`)

```css
input[type="radio"][data-indeterminate="true"]:not(:checked):after,
input[type=checkbox][data-indeterminate="true"]:not(:checked):after {
  content: "";
  position: absolute;
  top: calc(var(--checkbox-size) / 2 - 2px);   /* center vertically: 16/2 - 2 = 6 */
  width: calc(var(--checkbox-size) - 6px);     /* 16 - 6 = 10 px */
  left: 0; right: 0;
  margin: 0 auto;
  height: 2px;
  display: block;
  border-radius: 2px;
  background-color: var(--text-normal);
}
```

The indeterminate state (set via the `[data-indeterminate="true"]` attribute by JS — *not* the native HTMLInputElement.indeterminate) renders a horizontal dash:
- 10 × 2 px bar centered (8 px gap left+right, 6 px from top).
- Color is `--text-normal` (NOT accent — indeterminate is meant to be a neutral signifier).
- Box border stays at the unchecked color.

This is the standard "some children are checked, some aren't" indicator used in nested checklist UIs.

---

## 4. `<input type="radio">` overrides (`app.css:14879-14902`)

```css
input[type="radio"] {
  border-radius: 50%;            /* circular instead of square */
}
input[type="radio"]:checked {
  background-color: var(--interactive-accent);
  border-color:     var(--interactive-accent);
}
input[type="radio"]:checked::after {
  -webkit-mask-size: 50%;        /* smaller dot */
  -webkit-mask-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 16 16'><circle cx='8' cy='8' r='6'/></svg>");
                                  /* approximate — the actual SVG is shorter, encoding a filled circle */
}
```

(The radio's `:checked::after` mask actually overrides only the `mask-size` and `mask-image`, inheriting position from the checkbox rules.)

Reproducer note: the same `--checkbox-marker-color` is used for the radio dot — the dot is page-color masked over the accent fill, identical mechanism.

---

## 5. `.task-list-item-checkbox` (markdown task lists) (`app.css:14853-14876`)

```css
.task-list-item-checkbox {
  width:  var(--checkbox-size);   /* 16px */
  height: var(--checkbox-size);
}
.markdown-preview-view .task-list-item-checkbox {
  position: relative;
  top: 0.2em;                      /* nudge down to align with text baseline */
  margin-inline-end: 0.6em;        /* 9.6px at 16px font */
}

ul > li.task-list-item { list-style: none; }   /* hide the bullet — checkbox replaces it */

ul > li.task-list-item > p > .task-list-item-checkbox,
ul > li.task-list-item > .task-list-item-checkbox {
  margin-inline-start: calc(var(--checkbox-size) * -1.5);   /* -24px = pull into bullet position */
}

ul > li.task-list-item[data-task="x"],
ul > li.task-list-item[data-task="X"] {
  text-decoration: var(--checklist-done-decoration);   /* line-through */
  color:           var(--checklist-done-color);         /* --text-muted */
}
```

Markdown task lists are `- [ ]` and `- [x]` — Obsidian renders the `[ ]` as a `<input type=checkbox class="task-list-item-checkbox">`:
- Pulled left by `margin-inline-start: calc(--checkbox-size * -1.5) = -24px` so it occupies the bullet's slot.
- Vertically nudged `top: 0.2em` to align with text baseline.
- When `data-task="x"` or `"X"`, the entire `<li>` gets `text-decoration: line-through` and muted color.

---

## 6. `.metadata-input-checkbox` (`app.css:12838+`)

```css
input[type=checkbox].metadata-input-checkbox { … }
```

A subtype used inside Properties — same shape, possibly different padding. (Specific values are defined alongside the metadata block — see `editor-properties.md` for full context.)

---

## 7. Forced colors (`app.css` — applied to `.checkbox-container` only, not directly to `<input type=checkbox>`)

There is no specific `forced-colors: active` override for `<input type=checkbox>` in `app.css` — Obsidian relies on the browser's `appearance: none` + custom rendering working in high-contrast mode by default, falling back to the platform.

---

## 8. Reproducer build order

1. `<input type="checkbox">` and `<input type="radio">` share the same base rule. Strip `appearance` to get a clean square.
2. The check mark is a **mask-image** of a hand-drawn SVG (viewBox 0 0 12 8) painted in `--checkbox-marker-color` (page color). The mask punches the tick through the accent fill.
3. The `[data-indeterminate="true"]` attribute is JS-managed (NOT the standard `HTMLInputElement.indeterminate` property) — set it via `setAttribute('data-indeterminate', 'true')`.
4. Radio inputs override only `border-radius: 50%` and the mask shape; the checked-state mechanism is identical.
5. Task-list checkboxes get a special `-24px` inline-start margin so they slot into the bullet position. The `data-task` attribute on the `<li>` carries the original markdown character; CSS reads it for the strike-through state.
6. Focus ring is **2 px** for inputs (matches `<input>` family), not 3 px (which is buttons/dropdowns).
7. Border-color transition is 150 ms ease-in-out — same family as text inputs.
