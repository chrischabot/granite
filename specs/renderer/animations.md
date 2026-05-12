# Animations

> Every `@keyframes` and notable transition in `app.css`. The motion vocabulary is small — durations come from a four-step token scale and easings come from four named curves.

Tokens: see [`design-tokens.md`](design-tokens.md) §2. Source: `renderer/app.css`.

---

## 1. Motion tokens (recap)

```
--anim-duration-none:        0
--anim-duration-superfast:   70ms
--anim-duration-fast:        140ms
--anim-duration-moderate:    300ms
--anim-duration-slow:        560ms

--anim-motion-smooth:  cubic-bezier(0.45, 0.05, 0.55, 0.95)
--anim-motion-delay:   cubic-bezier(0.65, 0.05, 0.36, 1)
--anim-motion-jumpy:   cubic-bezier(0.68, -0.55, 0.27, 1.55)
--anim-motion-swing:   cubic-bezier(0,    0.55, 0.45, 1)
```

These are the **only** sanctioned values. Most components use raw `ease` / `ease-in-out` rather than the named curves; the named curves are exposed for plugins/themes that want a consistent feel.

---

## 2. Keyframes index

Every `@keyframes` block in `app.css`, in line order:

| Name | Lines | What it animates | Used by |
| --- | --- | --- | --- |
| `node-inserted` | 3209-3217 | `outline-color` `#fff → #000` | sentinel for JS to detect newly-inserted matching nodes |
| `blink` | 3442-3446 | `background-color: transparent` at 50% | `.cm-fat-cursor-mark` (vim caret) |
| `sk-cubeGridScaleDelay` | 4408-4421 | `scale3D(1,1,1)` → `scale3D(0,0,1)` at 35% → back | `.loader-cube` |
| `multi-select-highlight` | 9495-9500 | warning-color flash | `.multi-select-duplicate` |
| `increase` | 9783-9791 | `translateX(-5%) scaleX(0.05)` → `translateX(130%) scaleX(1)` | progress-bar indeterminate |
| `decrease` | 9793-9801 | `translateX(-80%) scaleX(0.8)` → `translateX(110%) scaleX(0.1)` | progress-bar indeterminate (paired with `increase`) |
| `pop-down` | 10620-10640 | scale 1 → 1.02 → 1.05 → 1, opacity 0 → 0.7 → 1 | tooltips below trigger |
| `pop-right` | 10642-10662 | same as pop-down with `translateY(-50%)` | tooltips beside trigger |
| `rotation` | 11324-11332 | `rotate(0deg) → rotate(360deg)` | PDF find spinner |
| `hmd-file-uploading-ani` | 14368-14378 | `opacity: 0.4 ↔ 0.7` | upload status pulse |
| `progress-bar` | 17941-17966 | `width 0 → 100% → 0` with `left/right` flip | `.is-loading::before` |
| `spin` | 18450-18458 | `rotate(0 → 360)` | every loader spinner |
| `slideIn` | 22338+ | `translateY(-8px) scale(0.97) opacity 0` → `scaleY(1.02)` at 70% → `1` | (used by feedback-banner / specific surfaces) |

Note: `rotation` and `spin` are duplicates with different names — both are 0→360 rotations. Different consumers picked one or the other; both are kept for backwards compatibility.

---

## 3. Detailed keyframe definitions

### 3.1 `node-inserted` (`app.css:3209-3217`)

```css
@keyframes node-inserted {
  from { outline-color: #fff; }
  to   { outline-color: #000; }
}
.node-insert-event {
  animation-duration: 0.01s;
  animation-name: node-inserted;
}
```

A 10 ms outline-color tween. **Not visually meaningful.** It exists so JS can listen for `animationstart` events on the document root and detect every newly-inserted DOM node that has the `.node-insert-event` class. This is how Obsidian initializes new DOM (e.g. CodeMirror lines, file tree rows) without per-mutation MutationObserver overhead.

Reproducer rule: do not change the duration — JS expects the animation to fire-and-end immediately so the event is reliable.

### 3.2 `blink` (`app.css:3442-3446`)

```css
@keyframes blink { 50% { background-color: transparent; } }

.cm-fat-cursor-mark {
  background-color: rgba(20, 255, 20, 0.5);
  animation: blink 1.06s steps(1) infinite;
}
```

A 1.06 s `steps(1)` blink (instant on/off, no fade). Used by Vim mode's "fat cursor" — a 50/50 duty cycle bright-green block.

### 3.3 `sk-cubeGridScaleDelay` (`app.css:4393-4421`)

```css
@keyframes sk-cubeGridScaleDelay {
  0%, 70%, 100% { transform: scale3D(1, 1, 1); }
  35%           { transform: scale3D(0, 0, 1); }
}

.loader-cube {
  width: 40px; height: 40px;
  margin: 100px auto;
}
.loader-cube .sk-cube {
  width: 33%; height: 33%;
  background-color: var(--interactive-accent);
  float: inline-start;
  animation: sk-cubeGridScaleDelay 1.3s infinite ease-in-out;
}
.loader-cube .sk-cube1 { animation-delay: 0.2s; }
.loader-cube .sk-cube2 { animation-delay: 0.3s; }
.loader-cube .sk-cube3 { animation-delay: 0.4s; }
.loader-cube .sk-cube4 { animation-delay: 0.1s; }
.loader-cube .sk-cube5 { animation-delay: 0.2s; }
.loader-cube .sk-cube6 { animation-delay: 0.3s; }
.loader-cube .sk-cube7 { animation-delay: 0s;   }
.loader-cube .sk-cube8 { animation-delay: 0.1s; }
.loader-cube .sk-cube9 { animation-delay: 0.2s; }
```

The classic 9-cube spinner. Each cube is `33% × 33%` of a `40 × 40` container. The animation pulses each cube to scale 0 at 35% of the cycle (so it disappears) then back to scale 1 at 70%. Each cube has a different `animation-delay`, producing a wave from top-right to bottom-left.

The vertical center column delays in order: `0.4 / 0.2 / 0`, the corners and edges shift accordingly. Reproducer must use these exact delays — the wave is calibrated.

### 3.4 `multi-select-highlight` (`app.css:9495-9504`)

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

Pill flashes warning color (orange) for 2 seconds when the user tries to add a duplicate value. Single keyframe (only `from`) means the pill starts orange and tweens to the default color over 2 s with `ease-in` (slow start, fast finish).

### 3.5 `increase` / `decrease` (`app.css:9783-9801`)

```css
@keyframes increase {
  from { transform: translateX(-5%)  scaleX(0.05); }
  to   { transform: translateX(130%) scaleX(1);    }
}
@keyframes decrease {
  from { transform: translateX(-80%) scaleX(0.8);  }
  to   { transform: translateX(110%) scaleX(0.1);  }
}
```

Used by indeterminate progress bars (e.g. progress-bar component). Two overlapping bar elements: one runs `increase`, the other `decrease`, slightly offset, producing the characteristic Material/Indeterminate pattern of two bars sliding across the track.

### 3.6 `pop-down` and `pop-right` (`app.css:10620-10662`)

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

Tooltip pop-in (200 ms ease-in-out). At 40 % of the duration (80 ms), the tooltip overshoots to scale 1.05; by 100 % it's settled at scale 1. Subtle bounce. See `tooltip.md` §4.

### 3.7 `rotation` and `spin` (`app.css:11324-11332`, `18450-18458`)

```css
@keyframes rotation { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes spin     { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
```

Identical. Used by:
- `.loader-spinner svg { animation: spin 1s ease infinite; }` (`app.css:4329`)
- `.app-container.mod-loading .view-header .loader-spinner svg { animation: spin 0.9s ease infinite; }` (`app.css:3279`)
- `button.mod-loading::after { animation: spin 1s ease infinite; }` (`app.css:7432`)
- `.pdf-find-results-count` (uses `rotation` for its loading spinner — see `view-pdf.md`)

`reduced-motion` users get `animation: none` via `@media (prefers-reduced-motion: …)` — see `app.css:18441-18447` for sync-icon override (similar overrides occur per-component).

### 3.8 `hmd-file-uploading-ani` (`app.css:14368-14378`)

```css
@keyframes hmd-file-uploading-ani {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 0.7; }
}
```

Soft opacity pulse 0.4 ↔ 0.7 for image-uploading placeholders in the editor.

### 3.9 `progress-bar` (`app.css:17941-17966`)

```css
@keyframes progress-bar {
  0%, 5%   { width: 0;    left: 0;  }
  50%      { width: 100%; right: 0; }
  95%, 100%{ width: 0;    right: 0; }
}
```

Used by `.is-loading::before` (`app.css:4427-4435`):

```css
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

A 3 px-tall accent-colored bar grows from `width: 0; left: 0` to full width by mid-cycle, then collapses to `right: 0` before disappearing. Net effect: the bar travels left-to-right across the top of the `.is-loading` element, growing then shrinking. 1 s cycle, 300 ms initial delay, infinite.

### 3.10 `slideIn` (`app.css:22338+`)

```css
@keyframes slideIn {
  0%   { opacity: 0; transform: translateY(-8px) scale(0.97); transform-origin: bottom; }
  70%  { opacity: 1;                              transform: scaleY(1.02); transform-origin: bottom; }
  100% { opacity: 1;                              transform: scale(1);     transform-origin: bottom; }
}
```

Used by feedback banner / specific in-app surfaces. Slides in from above with a slight scale wobble at 70%.

---

## 4. Notable transitions

These are not `@keyframes` but `transition` declarations applied at scale.

| Selector | Property | Duration | Easing | Purpose |
| --- | --- | --- | --- | --- |
| `.app-container.no-transition *` | all | `0` (`!important`) | n/a | Disabled during boot/resize |
| `.workspace` | `padding-left` | `100ms` | `ease-in` | Sidebar collapse |
| `.workspace-ribbon.mod-left.is-collapsed` | `background-color` | `250ms 95ms` | `ease-in-out` | Ribbon collapse fill |
| `.workspace-leaf-resize-handle` | `bg`, `border`, `opacity` | `200ms` | `ease-in-out` | Resize handle reveal |
| `.workspace-fake-target-overlay` / `.workspace-drop-overlay` | all | `100ms` | `ease-in-out` | Drag drop preview |
| `.is-flashing` | `color`, `bg` | `0.25s` | `ease` | Block-link flash |
| `.checkbox-container` | `box-shadow`, `outline`, `border`, `opacity` | `0.15s` | `ease-in-out` | Toggle states |
| `.checkbox-container:after` (thumb) | `transform` | `0.15s` | `ease-in-out` | Slide |
| `.checkbox-container:after` (thumb size) | `width`, `height`, `margin-top`, `left`, `opacity` | `0.1s 0.05s delay` | `ease-in-out` | Press-stretch |
| `input[type=range]::-webkit-slider-thumb` | all | `0.1s` | `linear` | Slider thumb |
| `<input>` text family | `box-shadow`, `border` | `140ms (hover) / 150ms (focus)` | `ease-in-out` | Input chrome |
| `<button>` (etc.) | implicit via `box-shadow` change | (none — no transition specified) | — | (button shadow change is instantaneous unless theme overrides) |
| `.clickable-icon svg` | `opacity` | `var(--anim-duration-fast) = 140ms` | `ease-in-out` | Icon dim/light |
| `.is-mobile .clickable-icon` | `opacity` | `0.1s` | `ease-in-out` | Mobile-faster |
| `.collapse-icon svg.svg-icon` | `transform` | `100ms` | `ease-in-out` | Caret rotate |
| `.tooltip` (animations) | `pop-down` / `pop-right` | `200ms` | `ease-in-out` | Tooltip pop |
| `.is-loading::before` | (animation) `progress-bar` | `1000ms 300ms delay` | `ease-in-out` | Indeterminate bar |
| `.is-mobile .tree-item-self` | `bg`, `color` | `0.1s` | `ease-in-out` | Mobile tap response |
| `.notice` (enter/exit) | (JS-driven) `opacity` + `translateY` | ~300 ms | (JS) | Toast slide-in |

---

## 5. Reduced-motion strategy

Several places guard with `@media (prefers-reduced-motion: …)` (e.g. `app.css:18441-18447`):

```css
@media (prefers-reduced-motion: reduce) {
  .sync-status-icon.mod-spin svg { animation: none; }
}
```

The pattern is: per-component override `animation: none`. There is **no global** `*` reduce-motion rule — each component decides. Reproducer should follow this convention: opt out only the spinning/pulsing animations; keep transitions short but present (transitions for chrome/state changes are usually fine even at reduced motion).

---

## 6. Reproducer build order

1. Use the four duration tokens consistently — `superfast` (70 ms) for icon opacity hints, `fast` (140 ms) for input border/shadow transitions, `moderate` (300 ms) for medium sweeps, `slow` (560 ms) for sidebar/structural movement.
2. The four named easing curves are available but most rules use `ease` or `ease-in-out`. Don't introduce new `cubic-bezier` values — pick one of the four named curves, or fall back to one of the standard CSS easings.
3. The `node-inserted` keyframe is a JS hook, not a visual effect. Keep it at `0.01s`.
4. Spin animations come in two names (`spin`, `rotation`) — pick `spin` for new code; both are kept for backwards compatibility.
5. The `progress-bar` keyframe + `.is-loading::before` rule is the canonical indeterminate bar. Reuse it; do not invent a new one.
6. Toast slide-in is JS-driven (no keyframe). Keep that pattern — JS provides finer control over enter/exit timing tied to the toast manager.
7. Don't use `prefers-reduced-motion: reduce` to disable everything — only opt out infinite/looping animations (spin, blink, hmd-file-uploading-ani, progress-bar).
8. The exact bezier on tooltip pop-in (scale to 1.05 at 40%) is calibrated — themes may simplify but reproducers should keep the four-stop overshoot.
