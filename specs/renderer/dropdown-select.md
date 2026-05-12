# Dropdown / Select / Combobox

> Three closely-related controls that share styling: native `<select>`, the styled `.dropdown` class (any element painted as a select), and `.combobox-button` (a select-like trigger that opens a search-filterable suggestion list rather than a native menu). All three use the same underlying token.

Tokens: see [`design-tokens.md`](design-tokens.md). Sources: `renderer/app.css`.

---

## 1. Shared base — `select`, `.combobox-button`, `.dropdown` (`app.css:7851-7913`)

```css
select,
.combobox-button,
.dropdown {
  -webkit-app-region: no-drag;
  height: var(--input-height);                  /* 30px */
  font-size: var(--font-ui-small);              /* 13px */
  font-family: inherit;
  font-weight: var(--input-font-weight);        /* 400 */
  color: var(--text-normal);
  line-height: var(--line-height-tight);        /* 1.3 */
  max-width: 100%;
  box-sizing: border-box;
  margin: 0;
  border: 0;
  box-shadow: var(--input-shadow);              /* THE button shadow stack — different from inputs */
  border-radius: var(--input-radius);           /* 5px */
  corner-shape: var(--input-corner-shape);
  -webkit-appearance: none;
  appearance: none;
  background-color: var(--dropdown-background); /* light: --interactive-normal (white) | dark: --interactive-normal (#363636) */
  padding: var(--dropdown-padding);             /* 0 1.9em 0 0.8em */
  background-repeat: no-repeat, repeat;
  background-position: var(--dropdown-background-position);
                                                 /* var(--inset-end) var(--dropdown-icon-inset) top 50%, 0 0 */
  background-size: var(--dropdown-background-size);
                                                 /* var(--dropdown-icon-width) auto, 100% */
  background-blend-mode: hard-light;
  corner-shape: var(--corner-shape);
}

@media (hover: hover) {
  select:hover,
  .combobox-button:hover,
  .dropdown:hover {
    box-shadow: var(--input-shadow-hover);
    background-color: var(--dropdown-background-hover);
  }
}

select.mobile-tap,
.combobox-button.mobile-tap,
.dropdown.mobile-tap {
  box-shadow: var(--input-shadow-hover);
  background-color: var(--dropdown-background-hover);
}

select:focus-visible,
.combobox-button:focus-visible,
.dropdown:focus-visible {
  box-shadow: 0 0 0 3px var(--background-modifier-border-focus);   /* 3px ring — like a button, NOT 2px like inputs */
  outline: none;
}

@media (forced-colors: active) {
  select,
  .dropdown { border: 1px ButtonBorder solid; }
}
```

Resolved `--dropdown-*` tokens (see `design-tokens.md` §6):

| Token | Value |
| --- | --- |
| `--dropdown-background` | resolves to `--interactive-normal` (light: `#fff`, dark: `#363636`) |
| `--dropdown-background-hover` | resolves to `--interactive-hover` (light: `#fafafa`, dark: `#3f3f3f`) |
| `--dropdown-background-position` | `var(--inset-end) var(--dropdown-icon-inset) top 50%, 0 0` |
| `--dropdown-background-size` | `1em auto, 100%` |
| `--dropdown-background-blend-mode` | `hard-light` |
| `--dropdown-padding` | `0 1.9em 0 0.8em` |

The `--inset-end` token resolves directionally per `direction: ltr/rtl` — in LTR it's `right`, in RTL it's `left`. The arrow is positioned `0.5em` from the inline-end edge, vertically centered.

`background-blend-mode: hard-light` blends the SVG arrow with the dropdown background — meaningful only when the SVG colors are gray; the blend mode flips the arrow tint per theme without needing two separate SVGs in light vs dark (but the `.theme-dark` rule below replaces the SVG anyway).

Reproducer rules:
- These controls share the **button** shadow tokens (`--input-shadow`) and the **button** focus ring (3 px), unlike `<input>` elements which use the input shadow stack and a 2 px ring.
- Same height as inputs (30 px).
- Padding is asymmetric — extra room (`1.9em` vs `0.8em`) on the inline-end side for the arrow.

---

## 2. `.dropdown` arrow icon (`app.css:7915-7921`)

```css
.dropdown {
  background-image: url("data:image/svg+xml,…stroke=%27%23000%27 opacity=%270.9%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 %3E%3Cpath d=%27m7 15 5 5 5-5%27/%3E%3Cpath d=%27m7 9 5-5 5 5%27/%3E%3C/svg%3E");
}
.theme-dark .dropdown {
  background-image: url("data:image/svg+xml,…stroke=%27%23FFF%27 opacity=%270.6%27 stroke-width=%272%27…%3E%3Cpath d=%27m7 15 5 5 5-5%27/%3E%3Cpath d=%27m7 9 5-5 5 5%27/%3E%3C/svg%3E");
}
```

The arrow is a **chevrons-up-down** Lucide icon, 24 × 24 viewBox, two paths:

- Bottom chevron: `m7 15 5 5 5-5` (down arrow).
- Top chevron: `m7 9 5-5 5 5` (up arrow).

Stroke widths are 2 px, line caps round, line joins round. The light-mode SVG uses `stroke=#000; opacity=0.9`; dark-mode uses `stroke=#FFF; opacity=0.6`. There is no separate filled variant — just stroke.

Reproducer literal copy (light):
```html
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
     fill="none" stroke="#000" opacity="0.9" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="m7 15 5 5 5-5"/>
  <path d="m7 9 5-5 5 5"/>
</svg>
```

---

## 3. `<option>` (`app.css:7923-7927`)

```css
.dropdown option {
  font-weight: normal;
  background-color: var(--background-primary);
}
```

This is one of the few places that touches `<option>` — Obsidian relies on browser-rendered native option lists for performance. Setting `font-weight: normal` ensures bold-by-default browsers don't render selected options bold. Setting `background-color: --background-primary` keeps the option list panel matching the page in light mode (in dark mode the OS-level select renderer inherits anyway).

---

## 4. Combobox container (`app.css:7929-7947`)

A `.combobox` wraps a search-filterable suggestion list. Used as e.g. dropdown for "Set property to value" in the metadata UI.

```css
.combobox:not(.has-input-focus) .suggestion-item.is-selected {
  background-color: transparent;     /* don't paint selection until input has focus */
}

.combobox .search-input-container {
  --search-icon-color: var(--text-faint);
  margin-top: 2px;
}

.combobox .search-input-container input[type=search] {
  border: 0;
  box-shadow: none;
  background-color: transparent;     /* inherits parent surface */
}

.combobox .suggestion-item {
  font-size: var(--font-ui-small);   /* 13px */
  padding: var(--size-2-3) var(--size-4-2) var(--size-2-3) var(--size-4-2);
                                     /* 6px 8px 6px 8px */
}
```

DOM:

```
.combobox.suggestion-container [.has-input-focus]
  ├─ .search-input-container
  │    ├─ <input type="search" placeholder="…">
  │    └─ .search-input-clear-button
  └─ .suggestion-item.is-selected | .suggestion-item …
```

Reproducer rules:
- The combobox gets a special un-painted selection style **before** the input is focused. This prevents the popover from looking like it's already showing an active selection until the user starts typing.
- The internal `<input type="search">` has its native chrome stripped (no border, no shadow, no background) — it inherits the suggestion-container styling.

---

## 5. `.combobox-button` (`app.css:7949-8023`)

The `.combobox-button` is the **trigger** that, when clicked, opens a `.combobox` suggestion popover. It looks like a select but is actually any element (commonly a `<button>` or `<div>`).

```css
.combobox-button {
  --dropdown-padding: 0 var(--size-2-3) 0 var(--size-4-2);
                                                  /* 0 6px 0 8px (overrides the shared 0 1.9em 0 0.8em) */
  display: flex;
  align-items: center;
  gap: var(--size-2-2);                          /* 4px */
  min-height: var(--input-height);               /* 30px */
  overflow: hidden;
  white-space: nowrap;
  border-style: solid;
  border-color: var(--background-modifier-border);
}
```

Note the `border-style: solid` and `border-color`, but no `border-width`! The width comes from the shared rule's `border: 0`. The combobox-button uses `border` only for the side that touches a sibling combobox-button (when two appear in a row), establishing a 1 px divider between them. The `:last-child { border-inline-end-width: 0 }` rule (below) explicitly removes the border on the last button in a row.

```css
.combobox-button .combobox-button-icon {
  --icon-size:   var(--icon-s);                  /* 16px */
  --icon-stroke: var(--icon-s-stroke-width);     /* 2px */
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

.combobox-button .combobox-button-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-inline-end: auto;                       /* push chevron + clear to the inline-end */
}
.combobox-button .combobox-button-label:empty:before {
  content: attr(placeholder);
  color: var(--input-placeholder-color);         /* --text-faint */
  pointer-events: none;
}

.combobox-button .combobox-clear-button {
  --icon-size:   var(--icon-xs);                 /* 14px */
  --icon-stroke: var(--icon-xs-stroke-width);
  color: var(--text-muted);
  display: flex;
  align-items: center;
}
.combobox-button:not(.mod-clearable) .combobox-clear-button { display: none; }

.combobox-button .combobox-button-chevron {
  --icon-size:   var(--icon-xs);                 /* 14px */
  --icon-stroke: var(--icon-xs-stroke-width);
  align-items: center;
  display: flex;
}

.combobox-button:last-child { border-inline-end-width: 0; }

.combobox-button.has-focus,
.combobox-button:focus-visible {
  background-color: var(--metadata-label-background-active);   /* --background-modifier-hover */
  box-shadow: 0 0 0 3px var(--background-modifier-border-focus);
}

.combobox-button.mod-error {
  box-shadow: inset 0 0 0 var(--border-width) var(--background-modifier-error);
                                                  /* 1px inset red error border */
}
```

DOM:

```
<button class="combobox-button [.mod-clearable] [.mod-error] [.has-focus]" placeholder="Choose…">
  <span class="combobox-button-icon">[svg]</span>      ← optional left icon
  <span class="combobox-button-label">Selected text</span>
  <span class="combobox-clear-button">[x]</span>        ← only visible if .mod-clearable
  <span class="combobox-button-chevron">[chevron-down]</span>
</button>
```

Behaviors:
- When the label is empty, a placeholder string from `placeholder=""` is rendered via `::before` content. CSS-only — no JS needed.
- `.has-focus` is set by JS while the suggestion popover is open. Both `.has-focus` and `:focus-visible` use the same combined visual: hover background + 3 px focus ring.
- `.mod-error` paints a 1 px **inset** red border that doesn't shift the layout — used for invalid metadata field values.
- `.mod-clearable` exposes the inline `×` clear button.

### 5.1 Mobile (`app.css:8015-8023`)

```css
.is-mobile .combobox-button {
  --dropdown-padding: 0 var(--size-4-4) 0 var(--size-4-4);   /* 0 16px 0 16px — much fatter */
  gap: var(--size-4-2);                                       /* 8px */
}
.is-mobile .combobox-clear-button {
  --icon-size:   var(--icon-s);                               /* 16px (bigger touch target) */
  --icon-stroke: var(--icon-s-stroke-width);
}
```

On mobile, the inner padding doubles to 16 px and the gap doubles to 8 px so the row meets touch-target sizing (≥ 44 px effective).

### 5.2 Phone-only combobox suggestion sizing (`app.css:8025-8041`)

```css
.is-phone .combobox.suggestion-container {
  max-height: calc(100vh - var(--view-header-height) - var(--safe-area-inset-top));
}
.is-phone .combobox.suggestion-container.has-input-focus {
  max-height: unset;
  height: calc(100vh - var(--view-header-height) - var(--safe-area-inset-top));
                                              /* claim full height when keyboard-input is focused */
}
.is-phone .combobox .search-input-container {
  margin: var(--size-4-1) var(--size-4-3);    /* 4px 12px */
}
.is-phone .combobox .search-input-container input[type=search] {
  border-radius: var(--radius-l);             /* 12px — pill on phone */
  background-color: var(--background-modifier-form-field);
}
```

On phones the combobox suggestion list takes the **whole** viewport below the view-header when its input is focused (so the OS keyboard doesn't crowd it). The internal search field switches from rectangular to fully-pill (`--radius-l` = 12 px).

---

## 6. State summary

| Element | Hover | Focus-visible | Active / open menu |
| --- | --- | --- | --- |
| `select`, `.dropdown` | `box-shadow: --input-shadow-hover; bg: --dropdown-background-hover` | `box-shadow: 0 0 0 3px --background-modifier-border-focus` | (native open behavior) |
| `.combobox-button` | (same shared rules) | + `bg: --background-modifier-hover` (via `--metadata-label-background-active`) | `.has-focus` = same as focus-visible |
| `.combobox-button.mod-error` | (override) | `box-shadow: inset 0 0 0 1px --background-modifier-error` (overrides ring) | — |

---

## 7. Reproducer build order

1. Use **one** rule for `select`, `.combobox-button`, `.dropdown` covering the shared geometry, shadow, padding, and arrow position.
2. The arrow SVG is light/dark theme-specific via `.theme-dark .dropdown { background-image: ... }`. Encode both URLs as data URIs to avoid a font request.
3. Combobox-button is a flex container: `[icon] [label-with-margin-inline-end:auto] [clear-button] [chevron]`. The label's `margin-inline-end: auto` is what splits left content from right content.
4. Empty labels show their `placeholder=""` attribute via `::before` content — purely CSS, no JS state to track.
5. `.has-focus` is a JS-managed flag for "menu is currently open"; treat it as identical to `:focus-visible` visually.
6. Mobile and phone overrides nearly double the padding/gap to meet HIG touch targets — keep them, don't reuse the desktop spacing.
7. The combobox **suggestion popover** itself is a `.suggestion-container` (see `suggestion-and-prompt.md`); the combobox is just one consumer of it.
8. Never use `<select>` for the metadata UI — the metadata "set value" trigger always uses a combobox so the popover supports filtering. `<select>` shows up only in settings panels where filtering would be excessive.
