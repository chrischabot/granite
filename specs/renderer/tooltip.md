# Tooltip

> The hover hint that appears when an element with `aria-label="…"` (and no `--no-tooltip: true`) is hovered, focused, or long-pressed. JS reads `aria-label`, mounts a `.tooltip` div, and positions it relative to the trigger.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css:10521-10614`, `10620-10662`.

---

## 1. DOM scaffold

```
<body …>
  …
  <div class="tooltip [.mod-top|.mod-right|.mod-left] [.mod-error] [.mod-wide]">
    <div class="tooltip-arrow"></div>
    Tooltip text
  </div>
</body>
```

The tooltip mounts as a direct body child, **not** inside the trigger. JS removes it on mouseout/blur.

By default, the tooltip is positioned **below** the trigger (which is why the no-modifier base case uses `pop-down` animation and an arrow at the top). `.mod-top` flips it above; `.mod-right` and `.mod-left` flip it to the side.

Triggers opt out of tooltips via `--no-tooltip: true` (e.g. stacked tab headers in `tabs.md` §10).

---

## 2. `.tooltip` (`app.css:10522-10542`)

```css
.tooltip {
  animation: pop-down 200ms forwards ease-in-out;
  box-shadow: 0 2px 8px var(--background-modifier-box-shadow);
                                  /* light: rgba(0,0,0,0.1) | dark: rgba(0,0,0,0.3) */
  background-color: var(--background-modifier-message);
                                  /* rgba(0, 0, 0, 0.9) — fixed, not theme */
  border-radius: var(--radius-s); /* 4px */
  color: #FAFAFA;                  /* fixed near-white */
  font-size: var(--font-ui-smaller);   /* 12px */
  font-weight: var(--font-medium);     /* 500 */
  left: 50%;
  line-height: var(--line-height-tight);  /* 1.3 */
  max-width: 300px;
  padding: var(--size-4-1) var(--size-4-2);   /* 4px 8px */
  position: fixed;
  text-align: center;
  transform: translateX(-50%);
  z-index: var(--layer-tooltip);   /* 70 — above modals, menus, and notices */
  pointer-events: none;            /* never receives clicks */
  white-space: pre-wrap;
  word-break: normal;
  overflow-wrap: anywhere;
}
```

Reproducer rules:
- Like notices, the tooltip uses **fixed colors** (`rgba(0,0,0,0.9)` background + `#FAFAFA` text). Both themes show a dark bubble for legibility/recognition.
- 4 px radius (small — tooltips are tighter than menus or notices).
- 12 px font, 500 weight — slightly smaller and a touch heavier than UI body text.
- 4 px × 8 px padding.
- z-index 70 — the highest standard layer except for `--layer-dragged-item` (80). Tooltips draw over **everything** including modals.
- `pointer-events: none` — the tooltip never intercepts clicks, so the user can click through it.

### 2.1 Position variants (`app.css:10544-10563`)

```css
.tooltip.mod-right {
  animation: pop-right 200ms forwards ease-in-out;
  transform: translateY(-50%);
}
.tooltip.mod-left {
  animation: pop-right 200ms forwards ease-in-out;     /* same animation, JS handles directional offset */
  transform: translateY(-50%);
}
.tooltip.mod-error {
  width: 200px;
  background-color: var(--background-modifier-error);  /* red */
  color: var(--text-on-accent);                        /* white */
}
.tooltip.mod-wide {
  max-width: 450px;
  width: 400px;
}
```

- `.mod-right` / `.mod-left` switch from horizontal-centering (`translateX(-50%)`) to vertical-centering (`translateY(-50%)`). JS sets `top` and `left` accordingly.
- `.mod-error` paints in red — used for validation errors (e.g. invalid file rename).
- `.mod-wide` is for tooltips with longer text (e.g. plugin descriptions).
- `.mod-top` is implied via the arrow rule but the tooltip doesn't override `transform` — it stays `translateX(-50%)`. JS positions it.

---

## 3. `.tooltip-arrow` — the speech-bubble pointer (`app.css:10566-10614`)

The arrow is built using **CSS-triangle technique** (border + transparent border to make a triangle).

### 3.1 Default (tooltip below trigger, arrow at top of bubble)

```css
.tooltip .tooltip-arrow {
  position: absolute;
  top: -5px;                             /* sit just above the bubble */
  left: 50%;
  width: 0;
  margin-left: -5px;                     /* center the 10px-wide triangle */
  border-bottom: 5px solid var(--background-modifier-message);  /* the visible side */
  border-right: 5px solid transparent;
  border-left: 5px solid transparent;
  content: " ";
  font-size: 0;
  line-height: 0;
}
```

Triangle geometry: 10 px wide × 5 px tall, point upward.

### 3.2 `.mod-right` (tooltip to the right of trigger, arrow on the left side)

```css
.tooltip.mod-right .tooltip-arrow {
  top: calc(50% - 5px);
  left: -5px;
  border-right: 5px solid var(--background-modifier-message);  /* points left */
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}
```

### 3.3 `.mod-left` (tooltip to the left of trigger, arrow on the right side)

```css
.tooltip.mod-left .tooltip-arrow {
  top: calc(50% - 5px);
  left: calc(100% + 5px);                /* sit just past the right edge of the bubble */
  border-left: 5px solid var(--background-modifier-message);   /* points right */
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}
```

### 3.4 `.mod-top` (tooltip above trigger, arrow on the bottom)

```css
.tooltip.mod-top .tooltip-arrow {
  top: calc(100%);
  border-top: 5px solid var(--background-modifier-message);
  border-bottom: 5px solid transparent;
}
```

(The `.mod-top` rule is partial — it only changes `top` and the visible border. The `left`, `border-right`, `border-left` from the default cascade through.)

### 3.5 `.mod-error` arrow color overrides (`app.css:10602-10614`)

```css
.tooltip.mod-error .tooltip-arrow { border-bottom-color: var(--background-modifier-error); }
.tooltip.mod-error.mod-right .tooltip-arrow {
  border-right-color: var(--background-modifier-error);
  border-bottom: 5px solid transparent;
}
.tooltip.mod-error.mod-left .tooltip-arrow {
  border-left-color: var(--background-modifier-error);
  border-bottom: 5px solid transparent;
}
```

The error-tooltip arrow paints red instead of dark gray.

---

## 4. Pop-in animations (`app.css:10620-10662`)

```css
@keyframes pop-down {
  0%   { opacity: 0;   transform: translateX(-50%) scale(1);    }
  20%  { opacity: 0.7; transform: translateX(-50%) scale(1.02); }
  40%  { opacity: 1;   transform: translateX(-50%) scale(1.05); }
  100% { opacity: 1;   transform: translateX(-50%) scale(1);    }
}

@keyframes pop-right {
  0%   { opacity: 0;   transform: translateY(-50%) scale(1);    }
  20%  { opacity: 0.7; transform: translateY(-50%) scale(1.02); }
  40%  { opacity: 1;   transform: translateY(-50%) scale(1.05); }
  100% { opacity: 1;   transform: translateY(-50%) scale(1);    }
}
```

Both animations are 200 ms ease-in-out:
- Frame 0: invisible at scale 1.
- Frame 20: 70 % opacity at scale 1.02 (a 2 % overshoot).
- Frame 40: 100 % opacity at scale 1.05 (a 5 % bounce peak).
- Frame 100: settled at scale 1.

This gives tooltips a subtle "pop" — they grow past their final size and shrink back. The `forwards` fill-mode keeps the final frame applied so tooltips don't reset to invisible after the animation.

---

## 5. `[aria-label] .svg-icon` (`app.css:10616-10618`)

```css
[aria-label] .svg-icon { pointer-events: none; }
```

Any SVG inside an aria-labeled element opts out of pointer events — this prevents the SVG itself from being the hover target so `mouseenter` / `mouseleave` events fire on the wrapping element, not on the SVG path. Without this, hover would lose-and-regain when crossing SVG path boundaries, causing the tooltip to flicker.

---

## 6. Reproducer build order

1. JS reads `aria-label="…"` from any element. On `mouseenter` (or `focus`, or long-press on touch), JS waits ~500 ms (debounce), creates a `<div class="tooltip">…</div>` with a `.tooltip-arrow` child, appends to body, and positions via inline `top`/`left`. On `mouseleave`/`blur`, JS removes the element.
2. The tooltip class set:
   - default = no modifier → arrow on top, position below trigger.
   - `.mod-top` → arrow on bottom, position above.
   - `.mod-right` → arrow on left, position to the right.
   - `.mod-left` → arrow on right, position to the left.
   - `.mod-error` → red bubble, used for validation hints.
   - `.mod-wide` → 400 px wide.
3. Position selection: prefer below; flip to top if below would clip viewport bottom; flip to right/left when the trigger is in a horizontally-narrow context (e.g. ribbon icons → mod-right; right ribbon → mod-left).
4. The arrow is **always** a 10 × 5 CSS triangle; only the border color and orientation change.
5. The bubble color is **fixed** `rgba(0,0,0,0.9)` — not themed. Text is `#FAFAFA`. This is shared with `.notice`.
6. The `pop-down` / `pop-right` keyframes have an overshoot at 40 % (scale 1.05) — keep this; flat-scale animations look cheap by comparison.
7. `pointer-events: none` on `.tooltip` and `[aria-label] .svg-icon` are both critical: the first prevents tooltip flicker when the tooltip would overlap the cursor; the second prevents flicker from SVG sub-paths breaking the hover state.
8. Triggers can opt out via the CSS variable `--no-tooltip: true` — JS reads `getComputedStyle(trigger).getPropertyValue('--no-tooltip')`. Setting this is preferable to removing the `aria-label` because aria still serves screen readers.
