# Inputs

> Every text-entering surface: `<input type="text|search|email|password|number|date|datetime-local|range|color">`, `<textarea>`, `.metadata-input-text` (the inline-input variant in properties), and the composite `.search-input-container` with its clear and decorator buttons. Toggles, checkboxes, and dropdowns are in their own files.

Tokens: see [`design-tokens.md`](design-tokens.md). Sources: `renderer/app.css`.

---

## 1. The shared base — text-like inputs (`app.css:8493-8609`)

A single rule covers every text-shaped input *plus* `<textarea>` and `.multi-select-container`:

```css
textarea,
.multi-select-container,
input.metadata-input-text,
input[type='date'],
input[type='datetime-local'],
input[type='text'],
input[type='search'],
input[type='email'],
input[type='password'],
input[type='number'] {
  -webkit-app-region: no-drag;
  background:    var(--background-modifier-form-field);
                          /* light: #ffffff | dark: #2a2a2a (--color-base-25) */
  border:        var(--input-border-width) solid var(--background-modifier-border);
                          /* 1px solid (light: #e0e0e0 / dark: #363636) */
  color:         var(--text-normal);
  font-family:   inherit;
  padding:       var(--input-padding);    /* 4px 8px */
  font-size:     var(--font-ui-small);    /* 13px */
  border-radius: var(--input-radius);     /* 5px */
  corner-shape:  var(--input-corner-shape);
  outline: none;
}

input[type='text'],
input[type='search'],
input[type='email'],
input[type='password'],
input[type='number'] {
  height: var(--input-height);            /* 30px */
}
```

Note: the `--background-modifier-form-field` token is theme-different. In **light** mode it is `var(--color-base-00)` (pure white), keeping inputs flush with the page background. In **dark** mode it is `var(--color-base-25)` (`#2a2a2a`), a step **darker** than the page background (`--color-base-00` = `#1e1e1e` is darker still — wait, in dark, `--color-base-25` is `#2a2a2a` which is *lighter* than `--color-base-00 = #1e1e1e`). Confirmed: dark inputs are a touch lighter than their page background, so they read as raised pills.

### 1.1 Hover (`app.css:8515-8531`)

```css
@media (hover: hover) {
  textarea:hover,
  .multi-select-container:hover,
  input.metadata-input-text:hover,
  input[type='date']:hover,
  input[type='datetime-local']:hover,
  input[type='text']:hover,
  input[type='search']:hover,
  input[type='email']:hover,
  input[type='password']:hover,
  input[type='number']:hover {
    background-color: var(--background-modifier-form-field-hover);   /* same as base in light; same in dark */
    border-color:     var(--background-modifier-border-hover);
                          /* light: #d4d4d4 | dark: #3f3f3f */
    transition:
      box-shadow var(--anim-duration-fast) ease-in-out,    /* 140ms */
      border     var(--anim-duration-fast) ease-in-out;
  }
}
```

Hover only intensifies the border to `--background-modifier-border-hover`. No box-shadow change (the input has no `box-shadow` in its base state — *unlike* `<button>` which has `--input-shadow`).

### 1.2 Active and focus (`app.css:8533-8588`)

```css
textarea:active,
.multi-select-container:active,
input.metadata-input-text:active,
input[type='date']:active,
input[type='datetime-local']:active,
input[type='text']:active,
input[type='search']:active,
input[type='email']:active,
input[type='password']:active,
input[type='number']:active,
textarea:focus,
.multi-select-container:focus,
input.metadata-input-text:focus,
input[type='date']:focus,
input[type='datetime-local']:focus,
input[type='text']:focus,
input[type='search']:focus,
input[type='email']:focus,
input[type='password']:focus,
input[type='number']:focus {
  border-color: var(--background-modifier-border-focus);
                          /* light: #bdbdbd | dark: #555 */
  transition:
    box-shadow 0.15s ease-in-out,
    border     0.15s ease-in-out;
}

/* Same selectors plus :focus-visible */
… :focus-visible {
  box-shadow: 0 0 0 var(--input-border-width-focus) var(--background-modifier-border-focus);
                          /* 2px ring */
}
```

State summary:

| State | `border-color` | `box-shadow` | Transition |
| --- | --- | --- | --- |
| base | `--background-modifier-border` | (none) | — |
| `:hover` | `--background-modifier-border-hover` | (none) | 140 ms |
| `:active` / `:focus` | `--background-modifier-border-focus` | (none) | 150 ms |
| `:focus-visible` | `--background-modifier-border-focus` | `0 0 0 2px --background-modifier-border-focus` | 150 ms |

The 2 px focus ring (vs the 3 px ring on `<button>`) is intentional — input rings are tighter to keep adjacent fields visually separate.

### 1.3 Placeholder (`app.css:8590-8601`)

```css
textarea::placeholder,
.multi-select-container::placeholder,
input.metadata-input-text::placeholder,
input[type='date']::placeholder,
input[type='datetime-local']::placeholder,
input[type='text']::placeholder,
input[type='search']::placeholder,
input[type='email']::placeholder,
input[type='password']::placeholder,
input[type='number']::placeholder {
  color: var(--input-placeholder-color);   /* --text-faint */
}
```

---

## 2. `<textarea>` (`app.css:8611-8616`)

```css
textarea {
  line-height: var(--line-height-tight);                 /* 1.3 */
  border-radius: var(--textarea-radius, var(--input-radius));   /* 5px (override-able) */
  padding:       var(--textarea-padding, var(--input-padding)); /* 4px 8px */
}
```

`--textarea-radius` and `--textarea-padding` are **override-only** tokens (not declared in the body root): some places redefine them locally to give a textarea its own padding. The `var(name, fallback)` syntax keeps the default identical to a single-line input.

---

## 3. `<input type="search">` and `<input type="number">` (`app.css:8618-8626`)

```css
input[type="search"]::-webkit-search-decoration,
input[type="search"]::-webkit-search-cancel-button {
  display: none;
  pointer-events: none;
}
input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
```

The native search-engine icon and the cancel `×` are removed (Obsidian draws its own clear button — see §5). Number-input spin buttons are removed entirely; values are typed manually.

---

## 4. `<input type="date">` and `<input type="datetime-local">` (`app.css:8628-8687`)

```css
input[type='date'],
input[type='datetime-local'] {
  font-variant-numeric: tabular-nums;     /* aligned digits for stable widths */
  position: relative;
}

input[type='date']::-webkit-datetime-edit-text,
input[type='datetime-local']::-webkit-datetime-edit-text {
  color: var(--input-date-separator);     /* --text-faint */
  padding-inline-end: 0;
}

input[type='date']:not([disabled="true"])::-webkit-calendar-picker-indicator,
input[type='datetime-local']:not([disabled="true"])::-webkit-calendar-picker-indicator {
  position: absolute;
  left: var(--size-4-1);                  /* 4px */
  right: auto;                             /* moves indicator from default right edge to LEFT edge */
  opacity: 0.5;
}

/* Empty-state placeholder coloring for the M / D / Y subfields */
input[type='date'].is-empty::-webkit-datetime-edit-month-field,
input[type='datetime-local'].is-empty::-webkit-datetime-edit-month-field,
input[type='date'].is-empty::-webkit-datetime-edit-day-field,
input[type='datetime-local'].is-empty::-webkit-datetime-edit-day-field,
input[type='date'].is-empty::-webkit-datetime-edit-year-field,
input[type='datetime-local'].is-empty::-webkit-datetime-edit-year-field {
  color: var(--input-placeholder-color);   /* --text-faint */
}
input[type='date'].is-empty:focus-within::-webkit-datetime-edit-month-field,
input[type='datetime-local'].is-empty:focus-within::-webkit-datetime-edit-month-field,
input[type='date'].is-empty:focus-within::-webkit-datetime-edit-day-field,
input[type='datetime-local'].is-empty:focus-within::-webkit-datetime-edit-day-field,
input[type='date'].is-empty:focus-within::-webkit-datetime-edit-year-field,
input[type='datetime-local'].is-empty:focus-within::-webkit-datetime-edit-year-field {
  color: var(--text-normal);
}

/* Subfield active/focus highlight */
input[type='date']::-webkit-datetime-edit-month-field:active,
input[type='datetime-local']::-webkit-datetime-edit-month-field:active,
input[type='date']::-webkit-datetime-edit-month-field:focus,
input[type='datetime-local']::-webkit-datetime-edit-month-field:focus,
input[type='date']::-webkit-datetime-edit-day-field:active,
input[type='datetime-local']::-webkit-datetime-edit-day-field:active,
input[type='date']::-webkit-datetime-edit-day-field:focus,
input[type='datetime-local']::-webkit-datetime-edit-day-field:focus,
input[type='date']::-webkit-datetime-edit-year-field:active,
input[type='datetime-local']::-webkit-datetime-edit-year-field:active,
input[type='date']::-webkit-datetime-edit-year-field:focus,
input[type='datetime-local']::-webkit-datetime-edit-year-field:focus {
  background-color: var(--text-selection);
  color: var(--text-normal);
  cursor: text;
}

/* Desktop-only: leave 24px on the left for the calendar indicator */
body:not(.is-ios):not(.is-android) input[type='date']:not([disabled="true"]),
body:not(.is-ios):not(.is-android) input[type='datetime-local']:not([disabled="true"]) {
  padding-left: var(--size-4-6);    /* 24px */
}
```

Reproducer notes:
- The calendar picker indicator is **moved from the right (Chromium default) to the left** at `4px` from the start, with `opacity: 0.5`. Desktop inputs reserve `padding-left: 24px` to make room.
- `.is-empty` (set by JS when the input has no value) uses placeholder color for all three subfields. When the user focuses an empty input it lights up to normal text (so they can type).
- Focusing a subfield paints `--text-selection` background — looks like the user is already mid-selection.
- iOS and Android keep their native calendar-picker placement.

---

## 5. Search input container (`app.css:5536-5635`)

The composite "input with search icon, clear button, and right decorator" pattern. DOM:

```
.search-input-container[.mod-hotkey] [.global-search-input-container]
  ├─ <input type="search" placeholder="…">
  ├─ .input-right-decorator [.clickable-icon] [.is-active]
  ├─ .search-input-clear-button     ← × that clears the field
  └─ .search-input-suggest-button   ← optional: opens completion popover
```

CSS:

```css
.input-right-decorator {
  position: absolute;
  transform: translateY(-50%);
  top: 50%;
  inset-inline-end: var(--input-icon-inset);   /* 4px */
}
.input-right-decorator.clickable-icon {
  padding: var(--size-2-1) var(--size-2-2);    /* 2px 4px */
}
.input-right-decorator.clickable-icon.is-active {
  background-color: transparent;               /* don't paint accent fill on inline decorator */
}

.search-input-container.mod-hotkey .clickable-icon {
  padding: var(--size-2-1);                    /* 2px (compact) */
}

/* Hide the clear button when the placeholder is showing (i.e. empty) */
.search-input-container input:placeholder-shown ~ .search-input-clear-button {
  display: none;
}
.search-input-container input:not(:placeholder-shown) {
  padding-inline-end: 28px;                    /* leave room for the × */
}
.global-search-input-container.search-input-container input:not(:placeholder-shown) {
  padding-inline-end: 56px;                    /* room for × AND a second decorator */
}
.search-input-container input:not(:placeholder-shown) ~ .input-right-decorator {
  inset-inline-end: calc(var(--input-icon-inset) + 28px);   /* push decorator left of the × */
}
```

Layout pattern:
- The `<input>` is the only child that takes full width. Other children are absolute-positioned.
- The clear button (`.search-input-clear-button`) is hidden via `:placeholder-shown` (CSS-only — no JS to toggle visibility).
- When the input has content, padding-inline-end grows to 28 px (or 56 px in global search where there is also a sub-suggest button) and the right decorator shifts further left so they don't overlap.

Color tokens used by the search container icons:

```
--search-icon-color:        var(--text-muted);     /* the magnifying-glass on the left */
--search-icon-size:         18px;
--search-clear-button-color:var(--text-muted);     /* the × */
--search-clear-button-size: 13px;
--search-result-background: var(--background-primary);
```

---

## 6. Range slider — `<input type="range">` (`app.css:8689-8738`)

```css
input[type='range'] {
  width: 100px;                            /* default — many uses override */
  -webkit-appearance: none;
  background-color: var(--slider-track-background);   /* --background-modifier-border */
  border-radius:    var(--slider-track-height);       /* 3px */
  height:           var(--slider-track-height);       /* 3px */
  padding: 0;
  outline: none;
}

input[type='range']::-webkit-slider-runnable-track {
  height: 6px;
  -webkit-appearance: none;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height:        var(--slider-thumb-height);          /* 18px (macOS: 18 × 30 due to width override) */
  width:         var(--slider-thumb-width);           /* 18px (macOS: 30px) */
  border-radius: var(--slider-thumb-radius);          /* 18px */
  cursor: default;
  background: #FFF;
  border: var(--slider-thumb-border-width) solid var(--slider-thumb-border-color);
                                                       /* 1px solid --background-modifier-border-hover */
  position: relative;
  top: var(--slider-thumb-y);                          /* -6px (vertical centering compensation) */
  transition: all 0.1s linear;
  box-shadow:
    0 1px 1px 0px rgba(0, 0, 0, 0.05),
    0 2px 2px 0px rgba(0, 0, 0, 0.1);
}

input[type='range']::-webkit-slider-thumb:hover,
input[type='range']::-webkit-slider-thumb:active {
  background: white;
  border-color: var(--background-modifier-border-focus);
  box-shadow:
    0 1px 2px 0px rgba(0, 0, 0, 0.1),
    0 2px 3px 0px rgba(0, 0, 0, 0.2);
  transition: all 0.1s linear;
}

body:not(.is-mobile) input[type=range]:focus { box-shadow: none; }
body:not(.is-mobile) input[type=range]:focus::-webkit-slider-thumb {
  box-shadow:
    0 1px 2px 0px rgba(0, 0, 0, 0.05),
    0 2px 3px 0px rgba(0, 0, 0, 0.2);
}
body:not(.is-mobile) input[type=range]:focus-visible::-webkit-slider-thumb {
  border-color: var(--background-modifier-border-focus);
  box-shadow:
    0 1px 2px 0px rgba(0, 0, 0, 0.05),
    0 2px 3px 0px rgba(0, 0, 0, 0.2),
    0 0 0px 2px var(--background-modifier-border-focus);
}
```

Reproducer rules:
- The track is a 3 × 100 px pill colored `--background-modifier-border`. There is **no fill on the played side** — the track is uniform.
- The thumb is 18 × 18 (or 30 × 18 on macOS via `--slider-thumb-width: 30px`) with two-layer drop shadow. On hover/active the border switches to focus color and the shadow deepens. `top: -6px` compensates for the thumb being twice as tall as the track so it stays vertically centered.
- The `:focus-visible` thumb gains a 2 px focus ring on top of the existing two-shadow stack — three shadow layers total.

For the smaller "S" variant (`--slider-s-thumb-size: 15px; --slider-s-thumb-position: -5px`) — Obsidian doesn't apply this via a class; it's exposed for plugin authors and used by Bases/canvas controls.

---

## 7. Color input — `<input type="color">` (`app.css:8740-8772`)

```css
input[type="color"] {
  -webkit-appearance: none;
  width: calc(var(--swatch-width) + 4px);   /* 26px */
  background-color: transparent;
  border: none;
  cursor: var(--cursor);
  padding: 0;
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
input[type="color"]::-webkit-color-swatch {
  border: 0px;
  box-shadow: var(--swatch-shadow);             /* inset 0 0 0 1px rgba(mono-100, 0.15) */
  border-radius: var(--swatch-radius);          /* 14px */
  height: var(--swatch-height);                  /* 22px */
  width:  var(--swatch-width);                   /* 22px */
  align-self: center;
}
@media (hover: hover) {
  input[type="color"]::-webkit-color-swatch:hover {
    box-shadow:
      inset 0 0 0 1px rgba(var(--mono-rgb-100), 0.25),
      0 0 0 var(--input-border-width-focus) var(--background-modifier-border-hover);
                                                /* 2px outer ring on hover */
  }
}
input[type="color"]:focus-visible::-webkit-color-swatch,
input[type="color"]:focus::-webkit-color-swatch {
  box-shadow:
    var(--swatch-shadow),
    0 0 0 var(--input-border-width-focus) var(--background-modifier-border-focus);
}
```

Renders as a 22 × 22 px circle (radius 14) with a 1 px inset hairline. Hover adds a 2 px outer ring in the lighter `--background-modifier-border-hover`; focus uses the heavier `--background-modifier-border-focus`.

---

## 8. `.formula-editor` (`app.css:8778-8824`)

A specialized input that wraps a CodeMirror editor for inline math/formula expressions.

```css
.formula-editor-container { width: 100%; }

.formula-editor {
  padding: 0;
  border-radius: var(--textarea-radius, var(--input-radius));   /* 5px */
  background-color: var(--interactive-normal);
  border: var(--input-border-width) solid var(--background-modifier-border);
  display: flex;
  align-items: center;
  min-height: var(--input-height);   /* 30px */
  width: 100%;
}

@media (hover: hover) {
  .formula-editor:hover {
    border-color: var(--background-modifier-border-hover);
    transition:
      box-shadow var(--anim-duration-fast) ease-in-out,
      border     var(--anim-duration-fast) ease-in-out;
  }
}
.formula-editor:active,
.formula-editor:focus,
.formula-editor:focus-within {
  border-color: var(--background-modifier-border-focus);
  transition: box-shadow 0.15s ease-in-out, border 0.15s ease-in-out;
}
.formula-editor:active,
.formula-editor:focus,
.formula-editor:focus-visible,
.formula-editor:focus-within {
  box-shadow: 0 0 0 var(--input-border-width-focus) var(--background-modifier-border-focus);
}
.formula-editor::placeholder { color: var(--input-placeholder-color); }
.formula-editor .cm-editor   { flex: 1 1 auto; }
.formula-editor .cm-content  { caret-color: var(--caret-color); }
```

The hover/focus chrome mirrors the regular input rule, but `:focus-within` is also wired up so the wrapper paints the ring when **any descendant** in the embedded CodeMirror has focus (the `<input>` rules use only `:focus`, which doesn't propagate to ancestors).

---

## 9. Setting progress bar (`app.css:5638-5651`)

A fill-width linear progress bar used in settings (e.g. download progress).

```css
.setting-progress-bar {
  width: 100%;
  height: var(--size-4-2);                     /* 8px */
  border-radius: var(--radius-s);              /* 4px */
  background-color: var(--background-secondary);
  box-shadow: inset 0 0 0 1px var(--background-modifier-border);
}
.setting-progress-bar-inner {
  width: 0;                                    /* JS animates to target % */
  height: 100%;
  border-radius: var(--radius-s);
  background-color: var(--interactive-accent);
}
```

8 px tall pill with 1 px inset hairline border. The inner fill grows from 0 to its target percent — the user-facing transition (if any) is set by JS.

---

## 10. `.is-loading` thin progress bar (`app.css:4423-4435`)

```css
.is-loading { position: relative; }
.is-loading:before {
  content: ' ';
  position: absolute;
  top: 0;
  width: 0;
  height: 3px;
  background-color: var(--interactive-accent);
  animation: 1000ms ease-in-out 300ms infinite progress-bar;
}
```

Indeterminate top-edge progress: a 3 px tall bar painted via `::before` that animates `width` over a `progress-bar` keyframe (1 000 ms duration, 300 ms delay before first cycle, infinite). The `progress-bar` keyframe is defined elsewhere (see `animations.md`).

---

## 11. Reproducer build order

1. Use the **shared base rule** for every text-shaped input plus `<textarea>` and `.multi-select-container`. Identical font, padding, borders, radii. The `--background-modifier-form-field` token differs between themes — light keeps it pure white, dark sets it to `--color-base-25` so inputs read as raised.
2. Hover: only border thickens to `--background-modifier-border-hover`. No shadow change. Animate over 140 ms.
3. Focus: border to `--background-modifier-border-focus`. `:focus-visible` *adds* a 2 px outer ring. Animate over 150 ms.
4. Placeholder colour is `--text-faint` everywhere. Disabled inputs keep base colors but get `opacity: 0.7` (rule applied at the consumer site, not in the base rule).
5. Date inputs override the calendar-indicator position (left) and reserve 24 px left padding on desktop. The `.is-empty` class must be set/cleared by JS based on whether the value is empty.
6. Search inputs use `:placeholder-shown` to hide the clear button — no JS toggle. Pad-inline-end grows to 28 px when content is present (plus 56 px in global search container).
7. Range inputs draw their thumb with a TWO-shadow stack at rest, THREE-shadow stack on focus-visible. `top: -6px` recenters the thumb on the 3 px track.
8. Color inputs replace the native swatch with a 22 × 22 circle. Hover/focus add an outer ring **on top of** the inset 1 px hairline.
9. Formula editor uses `:focus-within` (not just `:focus`) because the focus is on a descendant CodeMirror.
10. The thin-blue progress bar (`.is-loading`) and the chunky pill (`.setting-progress-bar`) are different components — do not conflate.
