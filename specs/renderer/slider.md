# Slider

> `<input type="range">` styling. Documented in full in [`inputs.md`](inputs.md) §6 — this file cross-references.

Tokens: see [`design-tokens.md`](design-tokens.md) §20.

---

## 1. Track and thumb dimensions

```
--slider-track-background:    var(--background-modifier-border)   /* light: #e0e0e0 / dark: #363636 */
--slider-track-height:         3px
--slider-thumb-height:         18px
--slider-thumb-width:          18px       /* macOS: 30px (per --mod-macos override) */
--slider-thumb-y:              -6px       /* vertical recenter */
--slider-thumb-radius:         18px       /* circle */
--slider-thumb-border-width:   1px
--slider-thumb-border-color:   var(--background-modifier-border-hover)
--slider-s-thumb-size:         15px        /* "small" variant — exposed but not selector-applied */
--slider-s-thumb-position:    -5px
```

---

## 2. Default rule (recap from `inputs.md`)

```css
input[type='range'] {
  width: 100px;                            /* default — many uses override */
  -webkit-appearance: none;
  background-color: var(--slider-track-background);
  border-radius: var(--slider-track-height);
  height: var(--slider-track-height);
  padding: 0;
  outline: none;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: var(--slider-thumb-height);
  width:  var(--slider-thumb-width);
  border-radius: var(--slider-thumb-radius);
  cursor: default;
  background: #FFF;
  border: var(--slider-thumb-border-width) solid var(--slider-thumb-border-color);
  position: relative;
  top: var(--slider-thumb-y);
  transition: all 0.1s linear;
  box-shadow: 0 1px 1px 0px rgba(0, 0, 0, 0.05),
              0 2px 2px 0px rgba(0, 0, 0, 0.1);
}

input[type='range']::-webkit-slider-thumb:hover,
input[type='range']::-webkit-slider-thumb:active {
  background: white;
  border-color: var(--background-modifier-border-focus);
  box-shadow: 0 1px 2px 0px rgba(0, 0, 0, 0.1),
              0 2px 3px 0px rgba(0, 0, 0, 0.2);
  transition: all 0.1s linear;
}

body:not(.is-mobile) input[type=range]:focus-visible::-webkit-slider-thumb {
  border-color: var(--background-modifier-border-focus);
  box-shadow: 0 1px 2px 0px rgba(0, 0, 0, 0.05),
              0 2px 3px 0px rgba(0, 0, 0, 0.2),
              0 0 0px 2px var(--background-modifier-border-focus);
}
```

See [`inputs.md`](inputs.md) §6 for the full spec including non-`focus-visible` rules and the slider's "no fill on played side" design choice.

---

## 3. Reproducer build order

1. Track is a 3 px pill colored `--background-modifier-border`. **No fill on the played side** — the track is uniform.
2. Thumb is 18 × 18 (or 30 × 18 on macOS) with two-shadow stack at rest, three-shadow stack on focus-visible.
3. `top: -6px` on the thumb recenters it on the 3 px track.
4. Hover/active swaps border to focus-color and deepens the shadow.
5. The "small" thumb variant (`--slider-s-thumb-*`) is exposed for plugin authors and used by Bases / canvas controls — not bound to a selector by default.
6. Inside graph controls (`view-graph.md` §4), sliders take 100 % width.
