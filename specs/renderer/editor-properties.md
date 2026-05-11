# Editor — Properties (Metadata)

> The frontmatter Properties panel that appears at the top of every markdown note. Renders YAML frontmatter fields as editable rows with type-specific inputs (text, number, date, datetime, list, checkbox, multi-select).

Tokens: see [`design-tokens.md`](design-tokens.md) §12. Source: `renderer/app.css:12712-12936`.

---

## 1. DOM scaffold

```
.metadata-container [.is-collapsed]
  ├─ .metadata-properties-heading [.has-active-menu]
  │    ├─ .collapse-indicator             ← left of heading
  │    └─ .metadata-properties-title       ← "Properties" label
  ├─ .metadata-properties
  │    └─ .metadata-property [.has-focus] [.is-selected]
  │         ├─ .metadata-property-icon
  │         ├─ .metadata-property-key       ← key column (e.g. "tags")
  │         │    └─ .metadata-property-key-input
  │         └─ .metadata-property-value     ← value column
  │              └─ <input> / .multi-select-container / .metadata-input-longtext / etc.
  ├─ .metadata-show-source-button          ← "Edit raw YAML"
  ├─ .metadata-add-button                   ← "Add property"
  └─ .metadata-error-container              ← only if frontmatter parse failed
       ├─ .metadata-error-title
       └─ .metadata-error-cta
```

---

## 2. `.metadata-container` (`app.css:12712-12733`)

```css
.metadata-container {
  --input-height: var(--metadata-input-height);   /* calc(--font-text-size * 1.75) = 28px */
  border-radius: var(--metadata-border-radius);   /* 0 */
  background-color: var(--metadata-background);   /* transparent */
  border-color: var(--metadata-border-color);     /* --background-modifier-border */
  border-style: solid;
  border-width: var(--metadata-border-width);     /* 0 */
  padding: var(--metadata-padding);                /* 8px 0 */
  color: var(--text-muted);
  position: relative;
  max-width: var(--metadata-max-width);            /* none */
  margin-block-end: 2rem;                          /* 32px gap below before content */
}

.markdown-source-view .metadata-container,
.markdown-preview-view .metadata-container {
  transform: translateX(calc(var(--size-4-1) * -1 * var(--direction)));
                                                    /* -4px LTR / +4px RTL */
}

.is-mobile .metadata-container {
  transform: none;                                  /* mobile keeps it flush */
}
```

The properties container:
- Locally re-binds `--input-height` to `--metadata-input-height` (28 px, smaller than the standard 30 px). This propagates to all inputs inside.
- 8 px vertical padding, 0 sides.
- 32 px bottom margin so there's air between Properties and the note body.
- The 4 px transform-X nudges the panel left (LTR) / right (RTL) so the property keys visually align with the editor's left margin (the indent compensates for the icon column).

---

## 3. Heading (`.metadata-properties-heading`) (`app.css:12771-12811`)

```css
.metadata-properties-heading {
  display: inline-block;
  padding: var(--size-4-1);                        /* 4px */
  margin-bottom: var(--size-4-2);                  /* 8px */
  position: relative;
  line-height: 1.2;
}

.is-mobile .metadata-properties-heading { padding: var(--size-4-1) 0; }

/* Pseudo-element absolute background — used by focus-ring */
.metadata-properties-heading:before {
  content: '';
  border-radius: var(--metadata-property-radius);  /* 6px */
  corner-shape: var(--metadata-property-corner-shape);
  position: absolute;
  display: inline-block;
  left: 0; right: 0; top: 0; bottom: 0;
}

.metadata-properties-heading:focus:before {
  box-shadow: 0 0 0 2px var(--background-modifier-border-focus);
}

.metadata-properties-heading .collapse-indicator {
  position: absolute;
  inset-inline-start: -22px;                       /* 22px to the left of the heading */
  padding: 0 6px;
}

.metadata-properties-title {
  user-select: none;
  font-size: max(var(--font-ui-small), 1em);       /* 13px or 1em — whichever is larger */
  color: var(--text-normal);
  font-weight: var(--font-medium);                  /* 500 */
  font-family: var(--font-interface);
}
```

The "Properties" label is 500-weight UI text. The collapse caret sits 22 px to the left so it lives in the gutter alongside the editor's outline.

The `:before` rule serves as a focus-ring host — when the heading itself has DOM focus (e.g. tabbed to it), the pseudo-element shows a 2 px gray ring around the entire heading area. The actual heading text stays unstyled.

---

## 4. Properties list and rows (`app.css:12752-12769`, `12866-12925`)

```css
.metadata-properties {
  display: flex;
  flex-direction: column;
  gap: var(--metadata-gap);                        /* 3px */
}

.metadata-properties .metadata-input-longtext {
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--metadata-input-longtext-lines);   /* 3 */
}
.metadata-properties .metadata-input-longtext:not(:empty) {
  display: -webkit-box;
}
.metadata-properties .metadata-input-longtext:focus {
  -webkit-line-clamp: unset;
}

.metadata-property {
  --input-border-width: 0;
  --input-border-width-focus: 0;
  --input-radius: 0;
  position: relative;
  display: flex;
  align-items: start;
  padding: var(--metadata-property-padding);       /* 0 */
  border-radius: var(--metadata-property-radius);  /* 6px */
  corner-shape: var(--metadata-property-corner-shape);
  overflow: hidden;
  background-color: var(--metadata-property-background);   /* transparent */
  box-shadow: var(--metadata-property-box-shadow);          /* none by default */
}

@media (hover: hover) {
  .metadata-property:hover {
    --metadata-divider-color: var(--metadata-divider-color-hover);
    background-color: var(--metadata-property-background-hover);   /* transparent */
    box-shadow:        var(--metadata-property-box-shadow-hover);
                                              /* 0 0 0 1px --background-modifier-border-hover */
    border-radius:     var(--metadata-property-radius-hover);
    corner-shape:      var(--metadata-property-corner-shape-hover);
  }
}

.metadata-property.has-focus,
.metadata-property:focus-within {
  --metadata-divider-color: var(--metadata-divider-color-focus);
  background-color: var(--metadata-property-background-hover);
  box-shadow:        var(--metadata-property-box-shadow-focus);
                                              /* 0 0 0 2px --background-modifier-border-focus */
  border-radius:     var(--metadata-property-radius-focus);
  corner-shape:      var(--metadata-property-corner-shape-focus);
}

.metadata-property-icon {
  cursor: var(--cursor);
  color: var(--icon-color);
  display: flex;
  align-items: center;
  padding: var(--size-4-1) 0;                    /* 4px 0 */
  height: var(--input-height);                    /* 28px */
  -webkit-user-select: none;
}

.metadata-property-icon:before {
  content: "\200B";                               /* baseline anchor */
  width: var(--size-4-1);                         /* 4px */
}

@media (hover: hover) {
  .metadata-property-icon:hover .svg-icon {
    color: var(--icon-color-focused);              /* --text-normal */
  }
}

.metadata-property-icon[aria-disabled='true'] {
  color: var(--text-muted);
  opacity: 0.4;
}
```

Reproducer rules:
- Property rows are flex with `align-items: start` so the icon + key + value all top-align (multi-line values keep the icon at the top).
- Inputs inside a row have **zero border** locally — the row's box-shadow becomes the visual border, applied at the row level so it surrounds key + value.
- 6 px corner radius (slightly larger than the standard 5 px input — properties read as larger "buttons").
- Hover paints a 1 px box-shadow border in `--background-modifier-border-hover`.
- Focus (or `.has-focus` from JS) paints a **2 px** ring in `--background-modifier-border-focus`. Both states keep `background-color: transparent` (the `--metadata-property-background-hover` token resolves to transparent by default — themes can opt in).
- The icon column uses 28 px height to match `--input-height` for vertical alignment with text inputs.

---

## 5. Selection state (`app.css:12747-12750`)

```css
.metadata-container.is-collapsed .metadata-property { display: none; }

.metadata-container:focus-within .metadata-property.is-selected {
  color: var(--nav-item-color-selected);                  /* --text-normal */
  background-color: var(--nav-item-background-selected);  /* hsla(--color-accent-hsl, 0.15) */
}
```

When the container has DOM focus (`:focus-within`) and a property has `.is-selected` (e.g. user keyboard-navigated to it), the row paints a 15 % accent fill — same as selected items in `tree-item.md`.

---

## 6. Inputs inside properties (`app.css:12838-12858`, `12926-12930`)

```css
input[type=checkbox].metadata-input-checkbox {
  margin: var(--input-padding);                  /* 4px 8px */
}

.metadata-input-text {
  background-color: transparent;
  width: 100%;
  min-height: var(--input-height);                /* 28px */
  border-width: 0px;                              /* row provides the visual border */
  resize: none;
  overflow-y: hidden;
}

.metadata-input-text::-webkit-date-and-time-value { text-align: start; }

.metadata-input-text.mod-date {
  padding-inline-end: 0;
  width: auto;
}

.is-mobile.is-ios .metadata-input-text.mod-datetime.is-empty::before,
.is-mobile.is-ios .metadata-input-text.mod-date.is-empty::before {
  content: attr(placeholder);
  color: var(--text-faint);
}

.metadata-input-number {
  background-color: transparent;
  width: 100%;
  border-width: 0px;
}
```

- Text inputs are **transparent** (the row's hover/focus background shows through).
- Border width is zeroed.
- Date inputs on iOS get a manual placeholder via `::before` because the native date picker doesn't render placeholder text.

---

## 7. `.metadata-input-longtext` (`app.css:12758-12769`)

A multi-line property field that clamps to 3 lines by default and expands on focus:

```css
.metadata-properties .metadata-input-longtext {
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--metadata-input-longtext-lines);   /* 3 */
}
.metadata-properties .metadata-input-longtext:not(:empty) {
  display: -webkit-box;
}
.metadata-properties .metadata-input-longtext:focus {
  -webkit-line-clamp: unset;
}
```

`-webkit-line-clamp` truncates after 3 lines with an ellipsis. On focus the clamp is removed so the user sees the full content while editing.

---

## 8. Add buttons (`app.css:12735-12741`)

```css
.metadata-container .metadata-show-source-button,
.metadata-container .metadata-add-button {
  padding-inline-start: var(--size-2-3);          /* 6px */
  margin-top: 0.5em;
  font-size: var(--metadata-label-font-size);     /* --font-smaller = 0.875em */
  font-family: var(--metadata-label-font);        /* --font-interface */
}
```

Action links beneath the properties list. Smaller font, interface font family.

---

## 9. Frontmatter error container (`app.css:12691-12710`, `12813-12836`)

```css
.markdown-rendered .frontmatter.mod-failed { position: relative; }
.markdown-rendered .frontmatter.mod-failed .mod-error {
  color: var(--text-error);
  font-size: var(--font-smaller);
}
.markdown-rendered .frontmatter.mod-failed:after {
  content: '';
  position: absolute;
  top: 0; inset-inline-end: 0;
  width: 100%; height: 100%;
  background-color: var(--background-modifier-error);
  opacity: 0.3;
  mix-blend-mode: var(--highlight-mix-blend-mode);
}

.metadata-error-container {
  border-radius: var(--callout-radius);          /* 4px */
  padding: var(--size-4-1) var(--size-4-2);      /* 4px 8px */
  background-color: rgba(var(--callout-error), 0.1);
}

.metadata-error-title {
  color: var(--text-error);
  font-size: max(var(--font-ui-small), 1em);
  font-weight: var(--font-medium);                /* 500 */
}

.metadata-error-cta {
  cursor: var(--cursor);
  color: var(--text-accent);
  font-size: var(--font-ui-small);
  font-weight: var(--font-medium);
  margin-left: auto;
}
.metadata-error-cta.mobile-tap,
.metadata-error-cta:hover { color: var(--text-accent-hover); }
```

When YAML parsing fails, the raw frontmatter renders with a 30 %-error overlay (red wash via `mix-blend-mode`), plus a `.metadata-error-container` shows the error message and a CTA to fix it.

---

## 10. Reproducer build order

1. The container locally rebinds `--input-height: 28px` (smaller than chrome inputs) so all properties read as compact.
2. Each `.metadata-property` is a flex row, `align-items: start`. The row-level box-shadow provides the visual border — inputs themselves have `border-width: 0`.
3. Hover: 1 px box-shadow in `--background-modifier-border-hover`. Focus: 2 px box-shadow in `--background-modifier-border-focus`. 6 px corner radius.
4. The collapse caret on the heading is `inset-inline-start: -22px` (lives in the gutter to the left).
5. Long text values clamp to 3 lines with ellipsis; focus expands.
6. Frontmatter parse errors paint a 30 %-error wash over the raw YAML and show an error-container with `--text-accent` CTA.
7. Selected rows use `--nav-item-background-selected` (15 % accent) when the container has focus-within — same selection language as the file explorer.
