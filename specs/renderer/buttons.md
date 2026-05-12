# Buttons

> Every clickable affordance that is *not* a tab, menu item, or list row. Three families: `<button>` (text labels with optional CTA color), `.clickable-icon` (square SVG-only buttons), and `.text-icon-button` (icon + label combo). Plus `.input-button` (a pseudo-button that decorates a text input).

Tokens defined in [`design-tokens.md`](design-tokens.md). Sources: `renderer/app.css`.

---

## 1. `<button>` element (`app.css:7361-7473`)

### 1.1 Base

```css
button {
  --text-color: var(--text-normal);
  -webkit-app-region: no-drag;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  font-size:    var(--font-ui-small);          /* 13px */
  border-radius: var(--button-radius);          /* 5px (resolves --input-radius) */
  corner-shape: var(--button-corner-shape);
  border: 0;
  padding: var(--size-4-1) var(--size-4-3);    /* 4px 12px */
  height: var(--input-height);                  /* 30px */
  font-weight: var(--input-font-weight);        /* 400 */
  cursor: var(--cursor);
  font-family: inherit;
  outline: none;
  user-select: none;
  white-space: nowrap;
}

button:not(.clickable-icon) {
  color: var(--text-color);
  background-color: var(--interactive-normal);  /* light: #fff | dark: #363636 */
  box-shadow: var(--input-shadow);
}

button:not(.clickable-icon).mobile-tap {
  background-color: var(--interactive-hover);   /* light: #fafafa | dark: #3f3f3f */
  box-shadow: var(--input-shadow-hover);
}

@media (hover: hover) {
  button:hover {
    background-color: var(--interactive-hover);
    box-shadow: var(--input-shadow-hover);
  }
}

button:focus-visible {
  box-shadow: 0 0 0 3px var(--background-modifier-border-focus);
}

button[disabled],
button[aria-disabled="true"],
button[disabled="true"] {
  cursor: not-allowed;
  opacity: 0.7;
}

@media (forced-colors: active) {
  button { border: 1px ButtonBorder solid; }
}
```

Reproducer rules:
- The `--text-color` is a local CSS variable on `button` itself. Variants override only this, leaving the base structure intact.
- `--input-shadow` and `--input-shadow-hover` are theme-specific multi-layer shadows (see `design-tokens.md` §14-15) — they create the subtle 3D button look in light mode and the inset highlight + drop shadow in dark mode. Do not approximate.
- `:focus-visible` paints a **3 px outer ring** in `--background-modifier-border-focus` (light: `#bdbdbd` / dark: `#555`). This is in addition to (replaces) `--input-shadow`. The ring is 3 px, **not** the 2 px focus thickness used by inputs.
- Disabled state uses `opacity: 0.7` and `cursor: not-allowed` — it does not change colors.

### 1.2 `.mod-loading` spinner state (`app.css:7411-7433`)

```css
button.mod-loading {
  color: transparent;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  pointer-events: none;
}
button.mod-loading::after {
  content: '';
  position: absolute;
  width: 12px; height: 12px;
  top: 0; left: 0; right: 0; bottom: 0;
  margin: auto;
  border: 2px solid transparent;
  border-top-color: var(--text-color);
  border-radius: 50%;
  animation: spin 1s ease infinite;
}
```

Mechanism:
- Label is hidden by `color: transparent` (the button keeps its width).
- A 12 × 12 div centered with `margin: auto` over `top:0; left:0; right:0; bottom:0` paints a 2 px ring with only the **top** edge colored, then animates 360° via `@keyframes spin`. Border color is the local `--text-color`, so on `.mod-cta` the spinner is white and on the default button it's `--text-normal`.

### 1.3 CTA — `.mod-cta` (`app.css:7441-7458`)

```css
button.mod-cta {
  background-color: var(--interactive-accent);   /* dark: --color-accent | light: --color-accent-1 */
  --text-color: var(--text-on-accent);            /* white */
}
button.mod-cta.mobile-tap { background-color: var(--interactive-accent-hover); }
@media (hover: hover) { button.mod-cta:hover { background-color: var(--interactive-accent-hover); } }
button.mod-cta:focus-visible {
  box-shadow: 0 0 0 3px var(--background-modifier-border-focus);
}
```

CTA buttons (the primary affordance in modals) **lose** the `--input-shadow` because their `background-color` is solid accent — the shadow tokens won't fall back; they are simply overridden.

### 1.4 Warning — `.mod-warning` (`app.css:7460-7469`)

```css
button.mod-warning {
  background-color: var(--background-modifier-error);   /* --color-red */
  --text-color: var(--text-on-accent);                   /* white */
}
@media (hover: hover) {
  button.mod-warning:hover { background-color: var(--background-modifier-error-hover); }
}
```

Used for destructive confirmations (e.g. "Delete vault"). Red fill + white text.

### 1.5 Destructive — `.mod-destructive` (`app.css:7471-7473`)

```css
button.mod-destructive { --text-color: var(--text-error); }
```

A subtler destructive: only the text turns red. Background remains `--interactive-normal`. Used for less catastrophic destructive actions (e.g. "Move to trash" alongside "Cancel").

---

## 2. `.clickable-icon` (`app.css:8226-8334`)

The square SVG-only button. Used in: ribbon, view-header actions, tab list/new-tab, settings rows, search clear, status icons, etc.

### 2.1 Base

```css
.clickable-icon {
  -webkit-app-region: no-drag;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--size-2-2) var(--size-2-3);   /* 4px 6px */
  cursor: var(--cursor);
  border-radius: var(--clickable-icon-radius); /* --radius-s = 4px */
  color: var(--icon-color);                    /* --text-muted */
  height: auto;
  corner-shape: var(--corner-shape);
}

.clickable-icon svg {
  opacity: var(--icon-opacity);                /* 0.85 */
  transition: opacity var(--anim-duration-fast) ease-in-out;   /* 140ms */
}
```

Default icon size resolves from `--icon-size` (= `--icon-m` = 18 px) and `--icon-stroke` (= 1.75 px). Each consumer can override via local CSS variables.

### 2.2 Hover, active, has-active-menu (`app.css:8265-8301`)

```css
@media (hover: hover) {
  .clickable-icon:hover {
    box-shadow: none;
    color: var(--icon-color-hover);                       /* --text-muted (same as base — only opacity changes) */
    background-color: var(--background-modifier-hover);    /* rgba(mono-100, 0.067) */
  }
  .clickable-icon:hover svg { opacity: var(--icon-opacity-hover); }   /* 1 */

  .clickable-icon.has-active-menu,
  .clickable-icon:active {
    color: var(--icon-color-focused);                      /* --text-normal */
    background-color: var(--background-modifier-hover);
  }
  .clickable-icon.has-active-menu svg,
  .clickable-icon:active svg { opacity: var(--icon-opacity-hover); }
}

.clickable-icon.is-active {
  color: var(--icon-color-active);                         /* --text-accent */
  background-color: var(--background-modifier-active-hover); /* hsla(--interactive-accent-hsl, 0.1) */
}
.clickable-icon.is-active svg { opacity: var(--icon-opacity-hover); }
@media (hover: hover) {
  .clickable-icon.is-active:hover {
    background-color: var(--background-modifier-active-hover);
  }
}
```

State table:

| Class | `color` | `background-color` | `svg opacity` |
| --- | --- | --- | --- |
| (base) | `--text-muted` | transparent | 0.85 |
| `:hover` | `--text-muted` | `rgba(mono-100, 0.067)` | 1 |
| `.has-active-menu` or `:active` | `--text-normal` | `rgba(mono-100, 0.067)` | 1 |
| `.is-active` (sticky on/off, e.g. toolbar toggle) | `--text-accent` | accent at 10% | 1 |
| `.is-active:hover` | `--text-accent` | accent at 10% (no change) | 1 |
| `[aria-disabled='true']` | `--text-muted` | unset | inherits 0.85 × `opacity: 0.4` outer = ~0.34 |
| `.mobile-tap` (touch) | `--text-muted` | transparent | 1 |
| `.mod-warning` | `--text-error` | transparent | 0.85 |
| `.mod-filled` (svg fill) | (color) | transparent | 0.85 (svg `fill: var(--icon-color)`) |

Disabled (`app.css:8311-8321`):

```css
.clickable-icon[aria-disabled='true'] {
  background-color: unset;
  color: var(--text-muted);
  opacity: 0.4;
}
@media (hover: hover) {
  .clickable-icon[aria-disabled='true']:hover { background-color: unset; }
}
```

Mobile transition (`app.css:8303-8309`):

```css
.is-mobile .clickable-icon { transition: opacity 0.1s ease-in-out; }
.clickable-icon.mobile-tap svg { opacity: var(--icon-opacity-hover); }
```

On mobile, icon opacity transitions in 100 ms (faster than the desktop 140 ms baseline).

### 2.3 `.mod-warning` and `.mod-filled` (`app.css:8323-8329`)

```css
.clickable-icon.mod-warning { color: var(--text-error); }
.clickable-icon.mod-filled svg { fill: var(--icon-color); }
```

`.mod-filled` swaps the SVG paint from stroke to fill — used by icons that are designed as silhouettes rather than line drawings.

### 2.4 Setting-row variant (`app.css:8331-8333`)

```css
.setting-item-control .clickable-icon { padding: var(--size-2-2); }   /* 4px (square) */
```

In settings rows the padding becomes uniform 4 px on all sides (instead of `4px 6px`).

### 2.5 Side-dock ribbon variant (`app.css:8226-8237`)

```css
.clickable-icon.side-dock-ribbon-action .svg-icon,
.mod-left-split .workspace-tab-header-inner-icon .svg-icon,
.mod-right-split .workspace-tab-header-inner-icon .svg-icon {
  --icon-size:   var(--icon-l);                /* 18px */
  --icon-stroke: var(--icon-l-stroke-width);   /* 1.75px */
}

.clickable-icon.side-dock-ribbon-action:active,
.mod-left-split .workspace-tab-header-inner-icon:active,
.mod-right-split .workspace-tab-header-inner-icon:active {
  color: var(--icon-color-focused);
}
```

Ribbon icons and sidebar-tab icons share their sizing — both use `--icon-l` (which is also 18 px). The shared rule keeps them visually aligned.

### 2.6 macOS / iOS more-actions rotation (`app.css:8239-8243`)

```css
.is-ios .lucide-more-vertical,
.mod-macos .lucide-more-vertical {
  transform: rotate(90deg);
}
```

Apple platforms use horizontal `…` (per HIG). The shipped icon is vertical-dots; CSS rotates it 90°.

---

## 3. `.text-icon-button` (`app.css:8335-8435`)

A composite button with an icon and a label inline. Used by view-header actions that need a visible label, by the bases toolbar, and by metadata-property "set" controls.

### 3.1 Base

```css
.text-icon-button {
  -webkit-app-region: no-drag;
  display: inline-flex;
  overflow: hidden;
  align-items: center;
  color: var(--text-muted);
  font-size: var(--font-ui-small);              /* 13px */
  border-radius: var(--button-radius);          /* 5px */
  corner-shape: var(--button-corner-shape);
  padding: var(--size-2-2);                     /* 4px */
  font-weight: var(--input-font-weight);        /* 400 */
  cursor: var(--cursor);
  font-family: inherit;
  gap: var(--size-2-2);                         /* 4px between icon and label */
  user-select: none;
  white-space: nowrap;
  corner-shape: var(--corner-shape);
}
.text-icon-button .flair { margin: 0; }

.text-icon-button.is-active { color: var(--icon-color-active); }   /* --text-accent */

.text-icon-button .text-button-icon {
  display: flex; align-items: center; justify-content: center;
}
.text-icon-button .text-button-label {
  overflow: hidden;
  text-overflow: ellipsis;
  padding-inline-end: var(--size-2-1);           /* 2px */
}
.text-icon-button .mod-aux {
  --icon-size: var(--icon-xs);                   /* 14px — auxiliary chevron */
  color: var(--text-muted);
}
```

DOM:

```
<button class="text-icon-button">
  <span class="text-button-icon">[svg]</span>
  <span class="text-button-label">Label</span>
  <span class="mod-aux">[chevron-down]</span>   <!-- optional -->
</button>
```

### 3.2 Focus / disabled / hover / active (`app.css:8379-8434`)

```css
.text-icon-button:focus-visible {
  box-shadow: 0 0 0 var(--input-border-width-focus) var(--background-modifier-border-focus);
                                                /* 2px ring (note: NOT the 3px button ring) */
  outline: none;
}

.text-icon-button.mobile-tap {
  box-shadow: none;
  opacity: var(--icon-opacity-hover);            /* 1 */
  color: var(--text-normal);
}
.text-icon-button.mobile-tap .text-button-icon { color: var(--icon-color-hover); }

.text-icon-button.is-disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

@media (hover: hover) {
  .text-icon-button.has-active-menu,
  .text-icon-button:hover {
    box-shadow: none;
    opacity: var(--icon-opacity-hover);
    background-color: var(--background-modifier-hover);
    color: var(--text-normal);
  }
  .text-icon-button.has-active-menu .text-button-icon,
  .text-icon-button:hover .text-button-icon { color: var(--icon-color-hover); }
}

.text-icon-button.is-active.has-active-menu,
.text-icon-button.is-active:active {
  color: var(--icon-color-active);
  background-color: var(--background-modifier-active-hover);
}
.text-icon-button.is-active.has-active-menu .text-button-icon,
.text-icon-button.is-active:active .text-button-icon {
  color: var(--icon-color-active);
}

@media (hover: hover) {
  .text-icon-button.is-active:hover {
    color: var(--icon-color-active);
    background-color: var(--background-modifier-active-hover);
  }
  .text-icon-button.is-active:hover .text-button-icon { color: var(--icon-color-active); }
}
```

State table:

| Class | `color` | `background-color` | `.text-button-icon color` |
| --- | --- | --- | --- |
| base | `--text-muted` | transparent | inherits `--text-muted` |
| `:hover` / `.has-active-menu` | `--text-normal` | `rgba(mono-100, 0.067)` | `--text-muted` (via `--icon-color-hover`) |
| `.is-active` | `--text-accent` | transparent | `--text-accent` (inherits) |
| `.is-active.has-active-menu` / `.is-active:active` / `.is-active:hover` | `--text-accent` | accent at 10% | `--text-accent` |
| `.is-disabled` | `--text-muted` (× 0.7 opacity) | transparent | inherits |
| `.mobile-tap` | `--text-normal` | transparent | `--text-muted` |
| `:focus-visible` | (same as base) | transparent | (same) | + 2 px ring |

---

## 4. `.input-button` (`app.css:8478-8491`)

Used as a pseudo-button positioned **after** an input — for instance, the "Add" button next to a tag-add field.

```css
.input-button {
  padding: 6px 14px;
  margin-inline-start: 14px;
  color: var(--text-muted);
  font-size: var(--font-ui-medium);   /* 15px */
  position: relative;
  top: -1px;                          /* nudge up 1px to align with input baseline */
}
@media (hover: hover) {
  .input-button:hover { color: var(--text-normal); }
}
```

It's a flat, no-background label. The 14 px horizontal padding and `top: -1px` are exact — the label visually snaps to the input's center because the input's borders add an asymmetric 1 px to its rendered height.

---

## 5. Cards as buttons (`app.css:7475-7543`)

Some buttons are larger "cards" used for selection grids (e.g. theme picker, vault picker).

```css
.card-container { display: flex; }
.card-container.mod-horizontal { flex-direction: column; }

.card {
  background-color: var(--background-secondary-alt);
  border-radius: 4px;
  border: var(--border-width) solid var(--background-modifier-border);
  margin: 0 10px;
  padding: 15px 30px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.card ul { padding: 0; }
.card .button-container { margin: 10px 0; }
.card-container.mod-horizontal .card { margin: 10px 0; }
.card-container.mod-horizontal .card ul { padding-left: 24px; }
.card li { margin: 5px 0; }

.card.u-clickable { cursor: var(--cursor); }
@media (hover: hover) {
  .card.u-clickable:hover {
    border: var(--border-width) solid var(--interactive-accent);
    background-color: hsla(var(--interactive-accent-hsl), 0.1);
  }
}
.card.is-selected {
  border: var(--border-width) solid var(--interactive-accent);
  background-color: hsla(var(--interactive-accent-hsl), 0.2);
}

.card-title {
  text-align: center;
  font-size: 20px;
  line-height: 30px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.card-description {
  color: var(--text-muted);
  font-size: var(--font-ui-small);
  line-height: 20px;
  flex-grow: 1;
}
```

The card border swaps from `--background-modifier-border` to `--interactive-accent` on hover and selection, and the background gains a 10 % (hover) or 20 % (selected) accent tint.

---

## 6. `.button-container` (`app.css:7357-7359`)

```css
.button-container { margin-top: 20px; }
```

Generic vertical spacing wrapper for groups of buttons (e.g. the row of buttons at the bottom of a modal). Just a 20 px top gap, no horizontal layout — its children flex-row themselves.

---

## 7. Forced-colors (`app.css:7435-7439`)

```css
@media (forced-colors: active) {
  button { border: 1px ButtonBorder solid; }
}
```

Windows high-contrast mode: every button gets a 1 px `ButtonBorder` (system-defined color) so it remains visible without backgrounds.

---

## 8. Reproducer build order

1. `<button>` is the canonical trigger. It defaults to `--interactive-normal` (a low-contrast neutral) plus `--input-shadow` (a subtle 3D effect). Modifiers add semantic backgrounds via `--text-color` and `background-color`.
2. `.clickable-icon` is the **only** way to make a square SVG icon button. Always `padding: 4px 6px`, always `border-radius: --radius-s` (4 px). Override `--icon-size` and `--icon-stroke` locally for size variants.
3. `.text-icon-button` is for icon + label combos. Use a 4 px gap, 4 px padding, and a 2 px focus ring (NOT the 3 px button ring). Active state is accent text without background; pressed/menu-open is accent with 10 % accent fill.
4. `.has-active-menu` is the class set by JS on a button that has an associated open menu. Its visual state should match `:active` but persist as long as the menu is open.
5. The `.mod-loading` spinner reuses `@keyframes spin` (defined globally — see `animations.md`), the same keyframe used by `.loader-spinner` and `.app-container.mod-loading .loader-spinner svg`.
6. Disabled controls always use `cursor: not-allowed; opacity: 0.7`. They should still receive `:focus` (for screen readers) but click handlers should ignore them.
7. **Never** mix `.mod-cta` with `.mod-warning` or `.mod-destructive` — these classes are mutually exclusive.
