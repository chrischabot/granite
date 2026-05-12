# Toggle

> The on/off slider. Despite the class name, this is **`.checkbox-container`** — a sliding pill, not an HTML checkbox. The actual `<input type="checkbox">` inside it is `position: absolute; opacity: 0;` and exists only to carry state for the form layer and assistive tech.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css:10372-10519`.

---

## 1. DOM scaffold

```
<div class="checkbox-container [.is-enabled] [.mod-small]">
  <input type="checkbox" tabindex="0">
</div>
```

The wrapper div is the visual element. The inner `<input>` is invisible (used for state + form participation + a11y). Click events are typically handled on the wrapper; JS adds/removes `.is-enabled`.

---

## 2. Default size — small toggle

The default `.checkbox-container` (no `.mod-small` modifier needed — it's already small) uses the **`--toggle-s-*`** token family.

```css
.checkbox-container {
  -webkit-app-region: no-drag;
  cursor: var(--cursor);
  background-color: var(--background-modifier-border-hover);
                                            /* light: #d4d4d4 | dark: #3f3f3f */
  border-radius: var(--toggle-radius);     /* 18px (Linux/Win); macOS: 24px */
  display: inline-block;
  flex-shrink: 0;
  position: relative;
  user-select: none;
  box-shadow:
    inset 0 4px 10px rgba(0, 0, 0, 0.07),
    inset 0 0 1px rgba(0, 0, 0, 0.21);
                                            /* subtle inner shadow + 1px hairline */
  transition:
    box-shadow 0.15s ease-in-out,
    outline    0.15s ease-in-out,
    border     0.15s ease-in-out,
    opacity    0.15s ease-in-out;
  outline: 0 solid var(--background-modifier-border-focus);
                                            /* sets up outline color so :focus-visible can show */
  width:  var(--toggle-s-width);            /* 34px (mac: 36px) */
  height: calc(var(--toggle-s-thumb-height) + var(--toggle-s-border-width) * 2);
                                            /* 15 + 2*2 = 19px (mac: 12 + 2*2 = 16px) */
}

.checkbox-container input[type='checkbox'] {
  position: absolute;
  opacity: 0;
  left: 0;
                                            /* hidden but still present for forms/a11y */
}

@media (hover: hover) {
  .checkbox-container:hover {
    box-shadow:
      inset 0 6px 20px rgba(0, 0, 0, 0.14),
      inset 0 0 1px rgba(0, 0, 0, 0.28);
                                            /* deepen the inner shadow on hover */
  }
}

.checkbox-container.is-enabled {
  background-color: var(--interactive-accent);
}

.checkbox-container:focus-visible {
  outline: var(--toggle-s-border-width) solid var(--background-modifier-border-focus);
                                            /* 2px outer focus ring */
}
```

### 2.1 Track + thumb

```css
.checkbox-container:before {
  content: '';
  display: block;
  position: absolute;
  top: 0; left: 0; bottom: 0; right: 0;
  opacity: 0;                                /* unused at this layer; reserved for theme overrides */
}

.checkbox-container:after {
  pointer-events: none;
  content: '';
  display: block;
  position: absolute;
  background-color: var(--toggle-thumb-color);    /* white */
  border-radius:    var(--toggle-thumb-radius);   /* 18px (mac: 24) */
  transition:
    transform   0.15s ease-in-out,
    width       0.1s ease-in-out 0.05s,
    height      0.1s ease-in-out 0.05s,
    margin-top  0.1s ease-in-out 0.05s,
    left        0.1s ease-in-out 0.05s,
    opacity     0.1s ease-in-out 0.05s;
  left: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
                                            /* drop shadow on the thumb */
}

.checkbox-container:after {
  width:  var(--toggle-s-thumb-width);      /* 15px (mac: 20px) */
  height: var(--toggle-s-thumb-height);     /* 15px (mac: 12px) */
  margin: var(--toggle-s-border-width) 0 0 0;   /* 2px top — keeps thumb inside the 19px track */
  transform: translate3d(var(--toggle-s-border-width), 0, 0);
                                            /* off state: thumb at left + 2px inset */
}

.checkbox-container.is-enabled:after {
  transform: translate3d(
    calc(var(--toggle-s-width) - var(--toggle-s-thumb-width) - var(--toggle-s-border-width)),
    0, 0);
                                            /* on state: thumb at right edge minus thumb width minus 2px */
}

.checkbox-container:active:after {
  opacity: var(--toggle-thumb-opacity-active);   /* 0.6 on macOS, undefined elsewhere → 1 */
  width:  calc(var(--toggle-s-thumb-width)  + var(--toggle-s-border-width) * 2);
  height: calc(var(--toggle-s-thumb-height) + var(--toggle-s-border-width) * 2);
                                            /* +4px on each side — thumb stretches when pressed */
  margin-top: 0;                            /* compensate for the +2px stretch */
}
```

State table (Linux/Windows defaults):

| State | Track bg | Thumb position | Thumb size | Thumb opacity |
| --- | --- | --- | --- | --- |
| off | `#d4d4d4` / `#3f3f3f` | `translateX(2px)` | 15 × 15 | 1 |
| off `:hover` | (same — only inset shadow deepens) | (same) | (same) | 1 |
| on (`.is-enabled`) | `--interactive-accent` (purple) | `translateX(34-15-2 = 17px)` | 15 × 15 | 1 |
| on `:hover` | (same) | (same) | (same) | 1 |
| `:active` (any state) | (same) | (same) | 19 × 19 (stretched) | 1 (mac: 0.6) |
| `:focus-visible` | (same) | (same) | (same) + 2 px outer ring | (same) |

Reproducer rules:
- The thumb's `transform: translate3d(...)` is what slides — animated 150 ms ease-in-out.
- The thumb **grows** when pressed (`:active`) — width and height increase by `2 × border-width` (4 px). This is the squish-on-press affordance. Animated 100 ms ease-in-out, **delayed 50 ms** so the squish triggers on click rather than chasing fast hovers.
- macOS adds `--toggle-thumb-opacity-active: 0.6` so the thumb fades during press. Other platforms keep opacity 1.
- The track has **two** inset shadows: a 4 px (or 6 px on hover) inner top-shadow that simulates depth, plus a 1 px hairline shadow that adds a subtle outer edge. Both use `rgba(0, 0, 0, …)` so they read on both light and dark themes.

---

## 3. Modal-context size — large toggle (`app.css:10449-10478`)

Inside a `.modal`, the toggle scales up to use the **`--toggle-*`** (without the `-s`) token family, which on macOS becomes a 44 × 24 pill.

```css
.modal .checkbox-container {
  width:  var(--toggle-width);                /* 40px (mac: 44px) */
  height: calc(var(--toggle-thumb-height) + var(--toggle-border-width) * 2);
                                              /* 18 + 2*2 = 22px (mac: 16 + 2*2 = 20px) */
}

.modal .checkbox-container:focus-visible {
  outline: var(--toggle-border-width) solid var(--background-modifier-border-focus);
                                              /* 2px ring */
}

.modal .checkbox-container:after {
  width:  var(--toggle-thumb-width);          /* 18px (mac: 26px) */
  height: var(--toggle-thumb-height);         /* 18px (mac: 16px) */
  margin: var(--toggle-border-width) 0 0 0;   /* 2px top */
  transform: translate3d(var(--toggle-border-width), 0, 0);
}

.modal .checkbox-container.is-enabled:after {
  transform: translate3d(
    calc(var(--toggle-width) - var(--toggle-thumb-width) - var(--toggle-border-width)),
    0, 0);
                                              /* on state: 40 - 18 - 2 = 20px */
}

.modal .checkbox-container.is-enabled:active:after { left: -4px; }
                                              /* extra leftward jiggle when pressing the on-state */

.modal .checkbox-container:active:after {
  opacity: var(--toggle-thumb-opacity-active);
  width:  calc(var(--toggle-thumb-width)  + var(--toggle-border-width) * 4);
                                              /* +8px on press in modals — bigger squish */
  height: calc(var(--toggle-thumb-height) + var(--toggle-border-width) * 4);
  margin-top: calc(var(--toggle-border-width) * -1);
                                              /* -2px to compensate for the +4 stretch */
}
```

Notes:
- Modal toggles use a **bigger press-stretch** (`+4 × border-width = 8px` instead of `+2 × border-width = 4px`).
- When pressing an `is-enabled` modal toggle, an additional `left: -4px` makes the thumb visibly recoil leftward — extra "tactile" feedback for an action that will turn off when released.

---

## 4. Explicit `.mod-small` (`app.css:10480-10505`)

Defined for symmetry — `.mod-small` redeclares the small-toggle dimensions even when **outside** a modal where they would already apply by default. This makes the small look explicitly available everywhere by adding `.mod-small`.

```css
.checkbox-container.mod-small {
  width: var(--toggle-s-width);
  height: calc(var(--toggle-s-thumb-height) + var(--toggle-s-border-width) * 2);
}
.checkbox-container.mod-small:focus-visible {
  outline: var(--toggle-s-border-width) solid var(--background-modifier-border-focus);
}
.checkbox-container.mod-small:after {
  width: var(--toggle-s-thumb-width);
  height: var(--toggle-s-thumb-height);
  margin: var(--toggle-s-border-width) 0 0 0;
  transform: translate3d(var(--toggle-s-border-width), 0, 0);
}
.checkbox-container.mod-small.is-enabled:after {
  transform: translate3d(
    calc(var(--toggle-s-width) - var(--toggle-s-thumb-width) - var(--toggle-s-border-width)),
    0, 0);
}
.checkbox-container.mod-small:active:after {
  opacity: var(--toggle-thumb-opacity-active);
  width:  calc(var(--toggle-s-thumb-width)  + var(--toggle-s-border-width) * 2);
  height: calc(var(--toggle-s-thumb-height) + var(--toggle-s-border-width) * 2);
  margin-top: 0;
}
```

---

## 5. Forced-colors mode (`app.css:10507-10519`)

```css
@media (forced-colors: active) {
  .checkbox-container { outline: 1px ButtonBorder solid; }
  .checkbox-container:after { outline: 1px ButtonBorder solid; }
  .checkbox-container.is-enabled { background-color: SelectedItem; }
}
```

Windows high-contrast: the track and thumb both gain explicit `ButtonBorder` outlines so they remain visible. The on-state uses the system `SelectedItem` color.

---

## 6. macOS overrides (`app.css:2998-3009` — referenced by tokens)

```
.mod-macos {
  --slider-thumb-width:           30px;   /* not relevant for toggle */
  --toggle-width:                 44px;
  --toggle-radius:                24px;
  --toggle-thumb-radius:          24px;
  --toggle-thumb-height:          16px;
  --toggle-thumb-width:           26px;
  --toggle-thumb-opacity-active:  0.6;
  --toggle-s-width:               36px;
  --toggle-s-thumb-height:        12px;
  --toggle-s-thumb-width:         20px;
}
```

macOS toggles look more like the iOS native toggle:
- Default (modal-context) = 44 × 20 pill, thumb 26 × 16 (more horizontal capsule).
- Small = 36 × 16 pill, thumb 20 × 12.
- Press fades thumb to 60 % opacity.

---

## 7. Reproducer build order

1. `.checkbox-container` is the canonical Obsidian toggle. The hidden `<input type=checkbox>` inside is **for form participation only** — never style it; it's `opacity: 0`.
2. JS toggles `.is-enabled` on click. There is no `:checked` selector path here — the wrapper class is the source of truth.
3. The thumb is a `::after` pseudo-element. Sliding is via `transform: translate3d(...)` (always 3D for hardware acceleration).
4. The press-stretch (`:active:after { width/height: +4 or +8px }`) is delayed 50 ms — keep this delay; without it the stretch chases mouse-position changes during fast hover.
5. The two-shadow inset on the track is what gives the toggle its "depressed" look. On hover, both inset shadows deepen (4 → 6, 0.07 → 0.14, 0.21 → 0.28).
6. macOS toggles are ~1.1 × wider and 0.9 × shorter than Linux/Win, with rounder thumbs. Use `.mod-macos` selectors or — preferably — the token system; the same selector works.
7. Modal toggles use the larger token family. JS does not switch tokens; CSS does via `.modal .checkbox-container` descendant selector.
8. The `:focus-visible` outline is the focus ring — note this is **outline**, not box-shadow (different from buttons/inputs which use box-shadow). Outline is offset outside the rounded track — it tracks the rounding because outline respects border-radius in modern Chromium.
