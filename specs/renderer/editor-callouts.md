# Editor — Callouts

> Markdown callouts (`> [!info] Title`) — colored side-blocks with an icon, type-keyed coloring, and optional collapse.

Tokens: see [`design-tokens.md`](design-tokens.md) §5. Source: `renderer/app.css:4909-4930`, `11721-11890`.

---

## 1. DOM scaffold (rendered preview)

```
<div class="callout [.is-collapsible] [.is-collapsed]" data-callout="info">
  <div class="callout-title">
    <div class="callout-icon"><svg class="svg-icon lucide-info">…</svg></div>
    <div class="callout-title-inner">Note title</div>
    <div class="callout-fold"><svg class="svg-icon">…</svg></div>   <!-- only if collapsible -->
  </div>
  <div class="callout-content">
    <p>Body paragraph…</p>
  </div>
</div>
```

In the live-preview / source editor, the wrapper class is `.cm-callout` (CodeMirror's widget) — same internal structure.

---

## 2. Per-type variables (`app.css:11721-11812`)

Every callout sets two locals based on `data-callout`:

```
--callout-color:  rgb-triplet token
--callout-icon:   Lucide icon name (consumed by JS, not CSS)
```

Default (no recognized type):

```
--callout-color: var(--callout-default);    /* color-blue-rgb */
--callout-icon:  lucide-pencil;
```

| `data-callout=` (aliases) | `--callout-color` | `--callout-icon` |
| --- | --- | --- |
| `note` (default) | `--callout-default` (blue) | `lucide-pencil` |
| `abstract`, `summary`, `tldr` | `--callout-summary` (cyan) | `lucide-clipboard-list` |
| `info` | `--callout-info` (blue) | `lucide-info` |
| `todo` | `--callout-todo` (blue) | `lucide-check-circle-2` |
| `important` | `--callout-important` (cyan) | `lucide-flame` |
| `tip`, `hint` | `--callout-tip` (cyan) | `lucide-flame` |
| `success`, `check`, `done` | `--callout-success` (green) | `lucide-check` |
| `question`, `help`, `faq` | `--callout-question` (orange) | `help-circle` |
| `warning`, `caution`, `attention` | `--callout-warning` (orange) | `lucide-alert-triangle` |
| `failure`, `fail`, `missing` | `--callout-fail` (red) | `lucide-x` |
| `danger`, `error` | `--callout-error` (red) | `lucide-zap` |
| `bug` | `--callout-bug` (red) | `lucide-bug` |
| `example` | `--callout-example` (purple) | `lucide-list` |
| `quote`, `cite` | `--callout-quote` (`158, 158, 158`) | `quote-glyph` |

The colors are RGB **triplets**, not full colors — used at use-site with `rgb(var(--callout-color))` for solid color and `rgba(var(--callout-color), <a>)` for tints.

---

## 3. Bases / table inheritance (`app.css:11726-11734`)

```css
@supports (color: color-mix(in srgb, white 50%, black)) {
  .callout {
    --bases-table-header-background: transparent;
    --bases-table-header-background-hover: rgba(var(--callout-color), 0.1);
    --bases-embed-border-color:
      color-mix(in srgb, rgb(var(--callout-color)) 25%, var(--background-primary) 50%);
    --bases-table-border-color:
      color-mix(in srgb, rgb(var(--callout-color)) 25%, var(--background-primary) 50%);
    --table-border-color:
      color-mix(in srgb, rgb(var(--callout-color)) 25%, var(--background-primary) 50%);
  }
}
```

When a Bases table is **embedded inside a callout**, its borders re-tint to a 25 % blend of the callout color into the page background. This makes embedded tables visually belong to their callout. The `@supports` guard ensures fallback for browsers without `color-mix` (Chromium ≥ 111).

---

## 4. `.callout` body (`app.css:11814-11824`)

```css
.callout {
  overflow: hidden;
  border-style: solid;
  border-color: rgba(var(--callout-color), var(--callout-border-opacity));
                                              /* 25% per-type color */
  border-width: var(--callout-border-width);  /* 0px by default */
  border-radius: var(--callout-radius);       /* --radius-s = 4px */
  margin: 1em 0;
  mix-blend-mode: var(--callout-blend-mode);  /* darken in light, lighten in dark */
  background-color: rgba(var(--callout-color), 0.1);
                                              /* 10% per-type tint */
  padding: var(--callout-padding);            /* 12px 12px 12px 24px */
}

.callout.is-collapsible .callout-title { cursor: var(--cursor); }
```

Reproducer rules:
- The fill is **always** the type color at 10 % opacity. The blend mode (darken in light, lighten in dark) ensures the tint reads correctly against either page color without changing the alpha.
- The border is `0px` by default — themes can opt into a visible border by raising `--callout-border-width`.
- 1 em vertical margin between callouts and surrounding text.
- The 24 px left padding holds the icon column (12 px × 12 px icon at 12 px from the left edge — consumed in the `.callout-title` flex).

---

## 5. `.callout-title` (`app.css:11830-11838`)

```css
.callout-title {
  padding: var(--callout-title-padding);   /* 0 */
  display: flex;
  gap: var(--size-4-1);                    /* 4px between icon, title, fold */
  font-size: var(--callout-title-size);    /* inherit (= body 16px in reading mode) */
  color: rgb(var(--callout-color));        /* solid type color */
  line-height: var(--line-height-tight);   /* 1.3 */
  align-items: flex-start;
}
```

Title row: icon + text + (optional) fold caret. Title text is **solid** type color (not tinted). 4 px gap between elements.

---

## 6. `.callout-icon` (`app.css:11850-11862`)

```css
.callout-icon {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}
.callout-icon .svg-icon { color: rgb(var(--callout-color)); }
.callout-icon::after { content: "\200B"; }    /* zero-width-space baseline anchor */
```

The icon is a Lucide SVG named by `--callout-icon` (set by JS — CSS provides the variable, JS reads it via `getComputedStyle` and renders the named icon). Icon color matches the title color.

---

## 7. `.callout-title-inner` (`app.css:11864-11868`)

```css
.callout-title-inner {
  --font-weight: var(--callout-title-weight);   /* base + 200 = 600 */
  font-weight: var(--font-weight);
  color: var(--callout-title-color);             /* inherit */
}
```

The title text is bold (600). Note the two-step `--font-weight` re-application — same trick as headings (typography.md §3.1) to propagate weight to descendants like links.

---

## 8. `.callout-content` (`app.css:11840-11848`)

```css
.callout-content {
  overflow-x: auto;
  padding: var(--callout-content-padding);     /* 0 */
  background-color: var(--callout-content-background);  /* transparent */
}

.callout-content .callout {
  margin-top: 20px;
}
```

Body content. `overflow-x: auto` so wide content (tables, long code) gets a horizontal scrollbar instead of breaking the callout. Nested callouts get extra 20 px top margin to separate them.

---

## 9. `.callout-fold` — collapse caret (`app.css:11870-11890`)

```css
.callout-fold {
  display: flex;
  align-items: center;
  padding-inline-end: var(--size-4-2);    /* 8px */
}
.callout-fold::after { content: "\200B"; }
.callout-fold .svg-icon {
  /* (continues — caret styling) */
}
```

The fold caret only appears on `.is-collapsible` callouts. JS adds `.is-collapsed` to hide `.callout-content` and rotate the caret. Animation is the same 100 ms ease-in-out as `.collapse-icon` (see `tree-item.md` §8).

---

## 10. RTL support (`app.css:4913-4930`)

```css
@supports selector(:has(*)) {
  .cm-callout:has(.callout .callout-title .callout-title-inner:dir(rtl)),
  .callout:has(> .callout-title .callout-title-inner:dir(rtl)) {
    direction: rtl;
  }
  .cm-callout:has(.callout .callout-title .callout-title-inner:dir(rtl)) > .callout-title,
  .callout:has(> .callout-title .callout-title-inner:dir(rtl)) > .callout-title {
    direction: rtl;
    --direction: -1;
  }
  .cm-callout:has(.callout .callout-title .callout-title-inner:dir(rtl)) > .callout-title .callout-icon svg.svg-icon,
  .callout:has(> .callout-title .callout-title-inner:dir(rtl)) > .callout-title .callout-icon svg.svg-icon {
    transform: scale(-1, 1);
  }
}
```

When the callout's title text is RTL (e.g. Hebrew/Arabic), the entire callout flips direction. The icon is mirrored (`scale(-1, 1)`). Each callout in a nested set is detected independently — text direction can switch within nested callouts. Requires `:has()` support (Chromium ≥ 105).

---

## 11. Live-preview (`.cm-callout`)

In the source editor's live-preview mode, callouts render as a CM6 widget styled with `.cm-callout`. The internal structure mirrors `.callout` so the same CSS applies. JS swaps between source-text rendering and widget rendering based on cursor proximity — the user-typed `> [!info] Title\n> Body` syntax shows as raw markdown when the cursor is inside it, and as the styled callout when the cursor moves away.

---

## 12. Reproducer build order

1. The callout's `data-callout` attribute drives **both** the color and the icon. Set `--callout-color` (RGB triplet) and `--callout-icon` (Lucide name) per type.
2. Default fill is `rgba(var(--callout-color), 0.1)` (10 % type-color tint). Blend mode `darken` in light, `lighten` in dark, so the tint reads correctly on either background.
3. Title row: 4 px-gap flex with solid-color icon + bold (`base + 200 = 600`) title text.
4. Body wrapper has `overflow-x: auto` so wide tables/code don't break the callout.
5. Nested callouts inside `.callout-content` get 20 px top margin.
6. The fold caret rotates 100 ms ease-in-out — same animation as the file-explorer caret.
7. The `--callout-icon` variable is read by JS, not CSS — JS replaces the inner `<svg>` based on the variable's value. Reproducer must do the same: list of valid Lucide names, map each to its SVG path data, render at the icon column.
8. RTL detection uses `:has(:dir(rtl))` — keep both the `.cm-callout` and `.callout` selectors so source and preview both flip cleanly.
9. Bases tables inside a callout retint borders via `color-mix` — preserve the 25 % blend formula.
10. Callout colors are RGB triplets (e.g. `8, 109, 221`) — apply alpha at use-site via `rgba()` or `rgb()`.
