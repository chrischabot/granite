# Scrollbars

> Two presentations: **OS-default scrollbars** (the browser's native scrollbar — used when `body.styled-scrollbars` is **not** set) and **styled scrollbars** (Obsidian's custom thin overlay scrollbars). The user toggles via Settings → Appearance → "Show scrollbars".

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css`.

---

## 1. The default — OS-native scrollbars

When `body.styled-scrollbars` is **not** set, no scrollbar styling is applied — the browser draws OS-native scrollbars at full width. macOS shows overlay scrollbars by default; Windows/Linux show channel scrollbars.

The only baseline rule from `app.css` is:

```css
@media print {
  ::-webkit-scrollbar { display: none; }      /* app.css:3170-3172 */
}
```

— scrollbars hidden in print only.

A few specific surfaces hide their own scrollbars even when OS scrollbars are active, because the surface scrolls but a visible scrollbar would be visually disruptive:

```css
/* View-header title — scrolls horizontally during rename, but no scrollbar */
.view-header-title::-webkit-scrollbar { display: none; }   /* app.css:4562-4564 */

/* Tab rail — scrolls horizontally as tabs overflow, but no scrollbar */
.workspace-tab-header-container-inner::-webkit-scrollbar,
.workspace-tab-header-container-inner::-webkit-scrollbar-thumb {
  display: none;                                            /* app.css:6731-6734 */
}

/* Multi-select pill input — no scrollbar */
.multi-select-input::-webkit-scrollbar { display: none; }   /* app.css:9485-9487 */

/* Graph controls panel */
.graph-controls::-webkit-scrollbar,
.graph-controls::-webkit-scrollbar-thumb { display: none; } /* app.css:17298-17299 */

/* Search params panel */
.search-params::-webkit-scrollbar,
.search-params::-webkit-scrollbar-thumb { display: none; }  /* app.css:18267-18268 */

/* Help modal options container */
.help-options-container::-webkit-scrollbar { display: none; } /* app.css:20324 */

/* Open-vault chooser */
.open-vault-options-container::-webkit-scrollbar { display: none; } /* app.css:20347 */

/* Screenshot mode — hide scrollbars everywhere */
body.is-screenshotting *::-webkit-scrollbar { display: none; }   /* app.css:20800 */
```

These are **always-active** scrollbar suppressions, independent of the styled/native toggle.

---

## 2. Styled scrollbars (`app.css:9892-9930`)

When `body.styled-scrollbars` is set:

```css
body.styled-scrollbars ::-webkit-scrollbar {
  background-color: var(--scrollbar-bg);    /* rgba(mono-100, 0.05) — set, then immediately overridden */
  width:  var(--scrollbar-width);            /* 12px (Android: 5px) */
  height: var(--scrollbar-height);           /* 12px (Android: 5px) */
  -webkit-border-radius: var(--scrollbar-radius);   /* --radius-l = 12px (Android: 0) */
  background-color: transparent;             /* the "real" final value — track is invisible */
}

body.styled-scrollbars ::-webkit-scrollbar-track {
  background-color: transparent;
}

body.styled-scrollbars ::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb-bg);   /* rgba(mono-100, 0.1) */
  -webkit-border-radius: var(--scrollbar-radius); /* 12px */
  background-clip: padding-box;
  border: 2px solid transparent;
  border-width: var(--scrollbar-border-width);   /* 3px 3px 3px 2px */
  min-height: 45px;
}

body.styled-scrollbars ::-webkit-scrollbar-thumb:active {
  -webkit-border-radius: var(--scrollbar-radius);
}

body.styled-scrollbars ::-webkit-scrollbar-thumb:hover,
body.styled-scrollbars ::-webkit-scrollbar-thumb:active {
  background-color: var(--scrollbar-active-thumb-bg);   /* rgba(mono-100, 0.2) */
}

body.styled-scrollbars ::-webkit-scrollbar-corner {
  background: transparent;
}
```

### 2.1 Geometry breakdown

Tokens (from `design-tokens.md` §18):

| Token | Default | Android (`app.css:9885-9890`) |
| --- | --- | --- |
| `--scrollbar-width` | `12px` | `5px` |
| `--scrollbar-height` | `12px` | `5px` |
| `--scrollbar-border-width` | `3px 3px 3px 2px` (top, right, bottom, left) | `0px` |
| `--scrollbar-radius` | `var(--radius-l)` → `12px` | `0` |
| `--scrollbar-bg` | `rgba(var(--mono-rgb-100), 0.05)` | (same) |
| `--scrollbar-thumb-bg` | `rgba(var(--mono-rgb-100), 0.1)` | (same) |
| `--scrollbar-active-thumb-bg` | `rgba(var(--mono-rgb-100), 0.2)` | (same) |

Effective thumb size:
- Track is 12 × 12 (12 px on the long axis × 12 px wide).
- Thumb has `border: 3px 3px 3px 2px solid transparent` with `background-clip: padding-box`. So the thumb's painted region is **inside** that border — effectively `12 - 3 - 3 = 6 px` wide (perpendicular to scroll axis) and `12 - 2 = 10 px` long inset from the **leading** edge.
- The transparent border acts as a **gutter** between the thumb's color and the surrounding content. This is how Obsidian achieves "thin floating thumb in a thicker channel" without a visible track.
- `background-clip: padding-box` is what makes the border-as-gutter trick work — without it the border would be opaque.
- Min thumb length: 45 px (so even very long content has a draggable thumb).

### 2.2 Color resolution

The thumb is painted with `rgba(var(--mono-rgb-100), 0.1)`:
- In **light** theme, `--mono-rgb-100: 0, 0, 0` → `rgba(0, 0, 0, 0.1)` — a faint black.
- In **dark** theme, `--mono-rgb-100: 255, 255, 255` → `rgba(255, 255, 255, 0.1)` — a faint white.

Hover/active doubles to `0.2` opacity. The thumb is **always semi-transparent over content** — there is no opaque scrollbar track.

### 2.3 Min-height of 45 px

This is critical: `min-height: 45px` ensures the thumb is always tall enough to grab. Without it, very long content produces a sub-pixel thumb that is impossible to use on a trackpad.

---

## 3. Scrollbar-corner (`app.css:9922-9924`)

```css
body.styled-scrollbars ::-webkit-scrollbar-corner { background: transparent; }
```

When both vertical and horizontal scrollbars are present, the corner where they meet is transparent (instead of the OS default gray square).

---

## 4. Firefox / fallback (`app.css:9926-9930`)

```css
@supports not selector(::-webkit-scrollbar) {
  body.styled-scrollbars {
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb-bg) var(--scrollbar-bg);
                                      /* thumb, track */
  }
}
```

For browsers that don't support `::-webkit-scrollbar` (Firefox), use the standard `scrollbar-width: thin` plus `scrollbar-color`. Obsidian's renderer is Electron-based (Chromium), so this is exercised only by Firefox-based plugin previews or spec testing — but the rule is shipped for resilience.

---

## 5. The `.is-translucent` and `.is-mobile` cases

There are no special rules for translucent windows or mobile beyond the `.is-android` token override at `app.css:9885-9890`. iOS keeps the standard 12 px tokens (overlay scrollbars are an iOS-native UX expectation; users hide them via the OS toggle or Settings).

---

## 6. Scroll mask gradients (informational — handled per-component)

Several surfaces add a gradient mask to fade content as it scrolls (so chrome above the scroll area doesn't visually clip):

- `--menu-scroll-mask: linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.1) 48px)` (token only — applied where menus have overflowing content).
- `--bases-table-header-sort-mask: linear-gradient(to left, transparent var(--size-4-6), black var(--size-4-6))` (Bases table header sort indicators).

These are not scrollbar styling per se — they are `-webkit-mask-image` applied to the scroll **container** to fade content near the chrome edge. Document where used in their respective component specs.

---

## 7. Reproducer build order

1. Default behavior: render OS-native scrollbars. Hide them only on the specific surfaces listed in §1 (tab rail, view-header title, multi-select input, graph controls, search params, help options, open-vault options).
2. When `body.styled-scrollbars` is set, apply the `::-webkit-scrollbar` rules. The track is invisible (`background: transparent` overrides the earlier non-transparent declaration on the same selector — second declaration wins).
3. Thumb is `rgba(mono-100, 0.1)` — a 10 % wash of the inverse-of-background. Hover/active doubles to 20 %.
4. The `border: 3px 3px 3px 2px solid transparent` on the thumb plus `background-clip: padding-box` produces a thinner colored region inside a transparent gutter — this is the "floating thumb" effect. Do not approximate with a smaller `width` — the gutter is essential for the visual.
5. `min-height: 45px` on the thumb is non-negotiable.
6. On Android, override the four tokens to `5px` width/height, `0` border, `0` radius — gives a thinner sharp scrollbar that matches Material Design conventions.
7. The `@supports not selector(::-webkit-scrollbar)` fallback uses the standardized `scrollbar-width: thin` + `scrollbar-color: thumb track` — keep it for Firefox fallback even though the renderer uses Chromium.
8. `body.is-screenshotting *::-webkit-scrollbar { display: none }` — when JS adds `is-screenshotting` for clean screenshots, **all** scrollbars (styled or native) are hidden. This is a hard override.
