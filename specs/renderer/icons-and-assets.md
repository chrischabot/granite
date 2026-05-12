# Icons and Assets

> Every static asset shipped in `renderer/public/` plus the icon system that paints them.

Sources: `renderer/app.css`, `renderer/public/fonts/`, `renderer/public/images/`.

---

## 1. Font assets (`renderer/public/fonts/`)

Seven font files, all referenced from `@font-face` declarations in `app.css:3021-3073` (also documented in [`design-tokens.md`](design-tokens.md) §27 and [`typography.md`](typography.md) §1).

| File (hashed) | Family | Style | Weight | Format |
| --- | --- | --- | --- | --- |
| `70cc7ff27245e82ad414.ttf` | Source Code Pro | normal | normal | TrueType |
| `454577c22304619db035.ttf` | Source Code Pro | italic | normal | TrueType |
| `52ac8f3034507f1d9e53.ttf` | Source Code Pro | normal | bold | TrueType |
| `05b618077343fbbd92b7.ttf` | Source Code Pro | italic | bold | TrueType |
| `c504db5c06caaf7cdfba.woff2` | Inter | normal | 100-900 (variable) | WOFF2 |
| `01dcbad1bac635f9c9cd.woff2` | Inter | italic | 100-900 (variable) | WOFF2 |
| `4bb6ac751d1c5478ff3a.woff2` | Flow Circular | (single) | (single) | WOFF2 |

- **Source Code Pro** — fallback monospace. Used when the OS doesn't have a preferred mono.
- **Inter** — fallback sans (variable axis). Used when the OS doesn't have a preferred UI font. Weight axis spans 100-900 continuously.
- **Flow Circular** — privacy mode font. Glyphs are abstract loops; covers no readable codepoints. Used when `body.is-text-garbled`.

Reproducer rule: keep these exact filenames (the URLs in `app.css` reference them by hash). If reorganizing, update the `@font-face` `src:` values to match.

The sentinel `'??'` family is registered with `unicode-range: U+0` so it provides no glyphs but exists in the CSS font registry — used to make the user-override fallback chain resolve cleanly. See `typography.md` §1.

---

## 2. Image assets (`renderer/public/images/`)

Two SVG files:

### 2.1 `2308ab1944a6bfa5c5b8.svg` — internal-link icon (mirrored)

```xml
<svg fill="none" height="14" stroke="#888" stroke-linecap="round"
     stroke-linejoin="round" stroke-width="9.38%"
     viewBox="0 0 32 32" width="14" xmlns="http://www.w3.org/2000/svg">
  <path transform="translate(32), scale(-1, 1)"
        d="m14 9h-11v20h20v-11m-5-14h10v10m0-10-14 14"/>
</svg>
```

A 14 × 14 outline icon — the small "link" arrow that appears next to internal links in some contexts. The path is the same as the external-link icon below but the `transform="translate(32), scale(-1, 1)"` mirrors it horizontally.

### 2.2 `6155340132a851f6089e.svg` — external-link icon

```xml
<svg xmlns='http://www.w3.org/2000/svg' class='i-external'
     viewBox='0 0 32 32' width='14' height='14'
     fill='none' stroke='#888888' stroke-linecap='round'
     stroke-linejoin='round' stroke-width='9.38%'>
  <path d='M14 9 L3 9 3 29 23 29 23 18 M18 4 L28 4 28 14 M28 4 L14 18'/>
</svg>
```

The square-with-arrow icon used after `<a>` tags pointing to external URLs (Wikipedia-style). Carries class `i-external` so themes can target it.

Both SVGs use:
- `viewBox="0 0 32 32"`, output dimensions `14 × 14`.
- Hardcoded gray stroke `#888`/`#888888` (re-tinted via `currentColor` consumers in CSS).
- `stroke-width: 9.38%` (a percentage of viewBox length — produces visually balanced strokes regardless of zoom).

These are the **only image assets** shipped — every other icon is either:
- Embedded as a CSS data-URI (e.g. checkbox tick, dropdown chevron, search magnifying glass, clear ×).
- Built dynamically from a Lucide SVG via JS (the `<svg class="svg-icon">` pattern below).

---

## 3. The `.svg-icon` element pattern

Most icons in the running app are SVGs constructed by JS at render time, using the Lucide icon set bundled in `app.js`. They render as:

```html
<svg class="svg-icon lucide-<name>"
     xmlns="http://www.w3.org/2000/svg"
     width="..." height="..."
     viewBox="0 0 24 24"
     fill="none" stroke="currentColor"
     stroke-width="..." stroke-linecap="round" stroke-linejoin="round">
  <path d="..."/>
  …
</svg>
```

`stroke="currentColor"` means the icon's color is whatever `color` is set on the parent — so SVG icons retint with the surrounding text without per-icon CSS rules.

### 3.1 Sizing rule (`app.css:8190-8195`)

```css
svg.svg-icon {
  height:        var(--icon-size);    /* default --icon-m = 18px */
  width:         var(--icon-size);
  stroke-width:  var(--icon-stroke);  /* default --icon-m-stroke-width = 1.75px */
}
```

The `--icon-size` and `--icon-stroke` variables cascade — set them on a parent (e.g. `.view-actions { --icon-size: var(--icon-s) }`) to resize all icons inside.

### 3.2 Size variants

| Variable | Size | Stroke | Used for |
| --- | --- | --- | --- |
| `--icon-xs` | 14 px | 2 px | tab status icons, suggestion-flair, menu-item-icon, file-explorer file icons, status-bar-item icons, drag-ghost icon, table drag handle |
| `--icon-s` | 16 px | 2 px | view-actions, vault profile icon, ribbon (via icon-l shared rule), back/forward in titlebar 14×14, etc. |
| `--icon-m` | 18 px | 1.75 px | default, ribbon icons, sidebar tab icons, tab-list / new-tab |
| `--icon-l` | 18 px | 1.75 px | side-dock-ribbon-action, sidebar-toggle-button (also 18) |
| `--icon-xl` | 32 px | 1.25 px | loader-spinner, modal-status-icon overrides |

### 3.3 Color tokens

```
--icon-color:           var(--text-muted)
--icon-color-hover:     var(--text-muted)
--icon-color-active:    var(--text-accent)
--icon-color-focused:   var(--text-normal)
--icon-opacity:         0.85
--icon-opacity-hover:   1
--icon-opacity-active:  1
```

The opacity-on-base + full-on-hover pattern is what gives icons their characteristic "wakes up on hover" feel without color changes.

### 3.4 Shared icon-size selectors

```css
.nav-file-icon .svg-icon,
.suggestion-flair .svg-icon,
.menu-item-icon .svg-icon,
.status-bar-item .svg-icon {
  --icon-size: var(--icon-s);                       /* 16px */
  --icon-stroke: var(--icon-s-stroke-width);
}

.clickable-icon.side-dock-ribbon-action .svg-icon,
.mod-left-split .workspace-tab-header-inner-icon .svg-icon,
.mod-right-split .workspace-tab-header-inner-icon .svg-icon {
  --icon-size: var(--icon-l);                       /* 18px */
  --icon-stroke: var(--icon-l-stroke-width);
}

.view-actions { --icon-size: var(--icon-s); }       /* 16px for view-action icons */
```

These selectors **set** the variables locally so all descendant SVG icons resize.

### 3.5 macOS rotation hack (`app.css:8239-8243`)

```css
.is-ios .lucide-more-vertical,
.mod-macos .lucide-more-vertical { transform: rotate(90deg); }
```

The Lucide `more-vertical` icon (three vertically stacked dots) is rotated 90° on Apple platforms to become horizontal `…` per HIG.

### 3.6 `[aria-label] .svg-icon` (`app.css:10616-10618`)

```css
[aria-label] .svg-icon { pointer-events: none; }
```

SVGs inside aria-labeled elements are click-through so hover events fire on the wrapping element. Without this, hover would lose-and-regain when crossing internal SVG path boundaries — causing the tooltip system to flicker. See `tooltip.md` §5.

---

## 4. CSS-embedded SVGs (data URIs)

Several icons are embedded as `url("data:image/svg+xml,...")` directly in CSS:

| Selector | Icon | Source |
| --- | --- | --- |
| `.dropdown` | chevrons-up-down (light: `stroke=#000`) | `app.css:7916` |
| `.theme-dark .dropdown` | chevrons-up-down (dark: `stroke=#FFF`) | `app.css:7920` |
| `.search-input-container:before` | magnifying glass | `app.css:17784` |
| `.search-input-clear-button:after` | filled-circle with × | `app.css:17821` |
| `input[type=checkbox]:checked:after` | check tick | `app.css:14820` |
| `input[type=radio]:checked::after` | filled circle (dot) | `app.css:14888-` |
| many more | (callout type icons, theme-specific markers) | various |

These are inline because:
- They need to recolor based on theme (the dropdown swap demonstrates this).
- They're tiny (< 200 bytes) and inlining avoids a request.
- They don't change at runtime — no benefit to dynamic generation.

The pattern is consistent: `url("data:image/svg+xml,<svg ...>...</svg>")` — note the `image/svg+xml` MIME, no base64 (URI-encoded raw SVG is shorter for path-based icons).

---

## 5. Lucide icon set

The icons that appear in JS-constructed `<svg class="svg-icon lucide-...">` are from the [Lucide](https://lucide.dev) icon set. Lucide ships with a 24×24 viewBox, `none` fill, `currentColor` stroke, `2px` stroke-width by default.

Obsidian's renderer overrides:
- `width`/`height` to `--icon-size`.
- `stroke-width` to `--icon-stroke` (e.g. 1.75 instead of Lucide's default 2).

Names follow Lucide's `lucide-<kebab-name>` convention, e.g. `lucide-search`, `lucide-chevron-down`, `lucide-x`. Plugin authors extending icons via `addIcon()` register a new `<svg>` template that JS renders inline.

---

## 6. Loader / spinner SVGs

Generated by JS, not shipped as files. The classic spinner is a 24×24 loader icon (Lucide `loader-2` or similar) with `animation: spin 1s ease infinite` (see `animations.md` §3.7). Used by `.loader-spinner`, `button.mod-loading::after`, `.app-container.mod-loading .loader-spinner svg`.

The 9-cube grid spinner (`.loader-cube`) is **not** an SVG — it's a 3 × 3 grid of plain divs colored `--interactive-accent`, animated via `@keyframes sk-cubeGridScaleDelay`.

---

## 7. Asset URL pattern

All assets are referenced relative to `index.html` (which lives in `renderer/`):

- Fonts: `public/fonts/<hash>.<ext>`.
- Images: `public/images/<hash>.svg`.

The 7-character-hex hashes are content hashes from the build pipeline. Reproducer should mimic this structure: ship assets under `public/fonts/` and `public/images/` so the relative URLs in `app.css` resolve.

---

## 8. Reproducer build order

1. Ship the seven font files at the exact URLs listed in §1. Register `@font-face` declarations matching `app.css:3021-3073`. Include the `'??'` sentinel face with `unicode-range: U+0`.
2. Ship the two SVGs at `renderer/public/images/`. Note their hashed filenames are referenced by JS for the `<a class="external-link">` arrow and the corresponding internal-link arrow.
3. Implement the `<svg class="svg-icon">` pattern: `width = height = var(--icon-size)`, `stroke-width = var(--icon-stroke)`, `stroke = currentColor`, `fill = none`. Lucide-compatible 24 × 24 viewBox.
4. Use `--icon-size` cascade — set on parents, never on individual icons.
5. The five sizes (`--icon-xs` 14, `-s` 16, `-m` 18, `-l` 18, `-xl` 32) are the only sanctioned values. All five should be available; consumers pick by need.
6. Color tokens (`--icon-color`, `-hover`, `-active`, `-focused`) are themeable; opacity tokens (0.85 → 1) are theme-agnostic.
7. Inline data-URI SVGs for icons that **must** retint per theme via CSS background-image swaps (dropdown chevrons, etc.). Use plain inline `<svg>` for everything else so `currentColor` works.
8. Apply `[aria-label] .svg-icon { pointer-events: none }` globally so tooltip hover doesn't flicker.
9. macOS / iOS rotation of the more-vertical icon is a single CSS rule — keep it.
10. Loader cubes are 9 same-color divs; loader spinner is a single SVG with `animation: spin 1s ease infinite`. Don't conflate them.
