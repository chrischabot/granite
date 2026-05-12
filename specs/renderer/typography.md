# Typography

> Font stacks, type scale, weights, line heights, letter-spacing — every text-shaping decision the renderer makes.

Tokens: see [`design-tokens.md`](design-tokens.md). Sources: `renderer/app.css`.

---

## 1. Font stacks

Defined on `body` (`app.css:3080-3096`):

```
--font-default:           ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui,
                          "Segoe UI", "Google Sans Flex", Roboto, "Inter Variable", "Inter",
                          "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
--font-monospace-default: ui-monospace, SFMono-Regular, "Cascadia Mono", "Roboto Mono",
                          "DejaVu Sans Mono", "Liberation Mono", Menlo, Monaco, "Consolas",
                          "Source Code Pro", monospace;

--font-interface-override: '??';
--font-interface-theme:    '??';
--font-interface:          var(--font-interface-override), var(--font-interface-theme),
                           var(--default-font, '??'), var(--font-default);

--font-text-override:      '??';
--font-text-theme:         '??';
--font-text:               var(--font-text-override), var(--font-text-theme), var(--font-default);

--font-print-override:     '??';
--font-print:              var(--font-print-override), var(--font-text-override),
                           var(--font-text-theme), 'Arial';

--font-monospace-override: '??';
--font-monospace-theme:    '??';
--font-monospace:          var(--font-monospace-override), var(--font-monospace-theme),
                           var(--font-monospace-default);

--font-text-size: 16px;
--font-mermaid:   var(--font-text);
```

There are **three** orthogonal font roles:

| Token | What it controls | Default fallback chain |
| --- | --- | --- |
| `--font-interface` | UI chrome (buttons, menus, status bar, tab labels) | `--font-default` |
| `--font-text` | Editor body — both source mode and rendered markdown | `--font-default` |
| `--font-monospace` | Code blocks, inline code, kbd, math, properties | `--font-monospace-default` |
| `--font-print` | Print preview / export | `--font-text` then `'Arial'` |

The user's choice of UI font goes in `--font-interface-override`; their text font goes in `--font-text-override`; theme overrides set `*-theme` variants. Both are initialized to the sentinel `'??'` family (registered with `unicode-range: U+0` so it covers no glyphs and CSS falls through to the next family). See `design-tokens.md` §27.

Reproducer rule: a re-implementation must register the `'??'` font face, otherwise the override-chain CSS won't fall through correctly when the user has not picked a font.

---

## 2. Type sizes — "UI" vs "text"

Two distinct type scales:

**UI (px-based — for chrome):**
```
--font-ui-smaller: 12px        /* status bar, hotkey hint, tooltip */
--font-ui-small:   13px        /* tab labels, view header, settings rows, menu items */
--font-ui-medium:  15px        /* body of body, modal content, settings descriptions */
--font-ui-large:   20px        /* modal title */
```

**Text (em-based — for the editor):**
```
--font-text-size:  16px         /* body baseline */
--font-smallest:   0.8em        /* small annotations */
--font-smaller:    0.875em      /* code, footnotes, table-header label */
--font-small:      0.933em      /* sub-labels */
```

Reading-mode markdown body (`app.css:4638-4640`):
```
.markdown-preview-view {
  font-size:   var(--font-text-size);   /* 16px */
  font-family: var(--font-text);
  line-height: var(--line-height-normal); /* 1.5 */
}
```

Body baseline (`app.css:3192-3203`):
```
body {
  font-family: var(--font-interface);
  line-height: var(--line-height-tight);  /* 1.3 */
  font-size:   var(--font-ui-medium);     /* 15px */
}
```

Reproducer rule:
- The body uses **UI** family + **15 px** + **1.3 line height**.
- The markdown editor (preview & source) overrides to **text** family + **16 px** + **1.5 line height**.
- These are two distinct typographic systems intentionally — chrome stays compact at 13/15 px, content reads at 16 px with longer leading.

---

## 3. Heading scale

Tokens (`design-tokens.md` §8):

| Heading | Size | Line height | Letter spacing | Weight (variable / non-variable) |
| --- | --- | --- | --- | --- |
| h1 | `1.618em` (~25.9 px @ 16) | `1.2` | `-0.015em` | `700 / 700` |
| h2 | `1.462em` (~23.4 px) | `1.2` | `-0.011em` | `680 / 600` |
| h3 | `1.318em` (~21.1 px) | `1.3` | `-0.008em` | `660 / 600` |
| h4 | `1.188em` (~19.0 px) | `1.4` | `-0.005em` | `640 / 600` |
| h5 | `1.076em` (~17.2 px) | `1.5` | `-0.002em` | `620 / 600` |
| h6 | `1em`     (16 px) | `1.5` | `0em` | `600 / 600` |

The size ratio approximates the golden section (1.618). Letter-spacing tightens progressively at larger sizes — h1's `-0.015em` is the most aggressive. Line-height loosens from h1's tight `1.2` to h5/h6's normal `1.5`.

The non-variable weights are `700 / 600 / 600 / 600 / 600 / 600` — there is no graduation across the scale. With variable Inter (the shipped font), JS detects `@supports (font-variation-settings: normal)` and switches to the graduated weights `700 / 680 / 660 / 640 / 620 / 600`, producing a visible weight-fall from h1 to h6.

### 3.1 Heading rules (`app.css:13299-13415`)

Each level uses the same template:

```css
hN, .markdown-rendered hN {
  --font-weight: var(--hN-weight);
  font-variant: var(--hN-variant);   /* normal */
  letter-spacing: var(--hN-letter-spacing);
  line-height: var(--hN-line-height);
  font-size: var(--hN-size);
  color: var(--hN-color);             /* inherit */
  font-weight: var(--font-weight);
  font-style: var(--hN-style);        /* normal */
  font-family: var(--hN-font);        /* inherit */
}
hN a, .markdown-rendered hN a {
  --link-weight: var(--hN-weight);
}
```

The two-step `--font-weight` declaration (set, then re-applied) is so that **descendants** which read `--font-weight` (links, tags, etc.) inherit the heading weight rather than the body weight.

Heading margin (top + bottom) (`app.css:13299-13307`):

```css
h1, h2, h3, h4, h5, h6 {
  margin-block-start: var(--p-spacing);   /* 1rem */
  margin-block-end:   var(--p-spacing);   /* 1rem */
}
```

Headings get **1 rem** of vertical margin on each side. The `--heading-spacing` token (`calc(--p-spacing * 2.5)` = 2.5 rem) is exposed for themes that want larger gaps but is not applied by the default rule.

### 3.2 Heading formatting markers (`app.css:13417-13418`)

```css
.cm-formatting-header { color: var(--text-faint); }
```

In source mode, the `# ` `## ` etc. prefixes are dimmed via `--text-faint`. The number of `#` characters is unchanged — only the color is dimmed.

### 3.3 Source-mode heading line padding (`app.css:13421-13427`)

```css
.cm-s-obsidian .cm-line.HyperMD-header { padding-top: var(--p-spacing); }
.cm-s-obsidian .cm-line.HyperMD-header + .cm-line:not(.HyperMD-header):not(:has(>br:only-child)) {
  padding-top: var(--p-spacing-empty);
}
```

Source-mode markdown uses `padding-top` (rather than `margin-top`) on `.cm-line` because CodeMirror manages its own line-spacing geometry. Heading lines get `1rem` top padding; the line *after* a heading (if non-empty and not a `<br>`-only line) gets `0rem` to suppress double-spacing.

---

## 4. Inline-title (`app.css:4585-4623`)

The page title (the file name shown above the editor):

```css
.inline-title {
  color: var(--inline-title-color);
  white-space: pre-wrap;
  margin-block-end: var(--inline-title-margin-bottom);   /* 0.5em */
}
.inline-title:not([data-level]) {
  font-size:   var(--inline-title-size);                  /* --h1-size = 1.618em */
  font-weight: var(--inline-title-weight);                /* --h1-weight = 700 */
  line-height: var(--inline-title-line-height);           /* 1.2 */
  font-style:  var(--inline-title-style);
  font-variant:var(--inline-title-variant);
  font-family: var(--inline-title-font);
  letter-spacing: -0.015em;                               /* explicit, even though h1 sets the same */
}
.inline-title h1, .inline-title h2, …, .inline-title h6 {
  margin-block-start: 0;
  margin-block-end:   0;
}
.hover-popover .inline-title,
.inline-embed   .inline-title { display: none; }

.hover-popover.bases-new-item-popover .inline-title,
.hover-popover .markdown-embed[data-type="heading"] .inline-title { display: block; }

body:not(.show-inline-title) .inline-title:not([data-level]) { display: none; }
body:not(.show-inline-title) .bases-new-item-popover .inline-title { display: block; }
```

The inline title looks like an h1 by default — same size, weight, letter-spacing, line-height. Any heading inside the inline-title (e.g. when the title is rendered with markdown) loses its margin so it inlines cleanly.

`body:not(.show-inline-title)` hides the title (Settings → Editor → Show inline title toggle). Bases new-item popovers always show their title regardless.

---

## 5. Paragraph and bold/italic

```css
/* p (app.css:14952-14956) */
.markdown-rendered p {
  margin-block-start: var(--p-spacing);   /* 1rem */
  margin-block-end:   var(--p-spacing);
  unicode-bidi: plaintext;                 /* honor each paragraph's own direction */
}

/* bold token resolution (design-tokens.md §5) */
--bold-modifier: 200;
--bold-weight:   calc(var(--font-weight) + var(--bold-modifier));   /* 600 by default */
--bold-color:    inherit;

/* italic */
--italic-color:  inherit;
--italic-weight: inherit;

/* CodeMirror source mode (app.css:14973-14987) */
.cm-strong {
  font-weight: calc(var(--font-weight) + var(--bold-modifier));
  --link-weight: calc(var(--font-weight) + var(--bold-modifier));
  color: var(--bold-color);
}
.cm-em {
  font-style: italic;
  color: var(--italic-color);
  font-weight: var(--italic-weight);
}
.cm-strong.cm-em { font-weight: calc(var(--font-weight) + var(--bold-modifier)); }
```

Reproducer rule:
- Bold weight is **derived**: `font-weight + 200`. The 200 modifier means that whatever the surrounding context's weight is, bold becomes 200 heavier. For variable fonts this gives smooth weight transitions; for non-variable fonts this rounds to the nearest available weight.
- Italic is plain CSS italic — color and weight inherit unless a theme overrides.
- Source mode strong+em both apply at the appropriate weight (italic doesn't scale weight back down).

---

## 6. Link tokens (`design-tokens.md` §11)

```
--link-color:                       var(--text-accent);
--link-color-hover:                 var(--text-accent-hover);
--link-decoration:                  underline;
--link-decoration-hover:            underline;
--link-decoration-thickness:        auto;
--link-weight:                      var(--font-weight);
--link-external-color:              var(--text-accent);
--link-external-color-hover:        var(--text-accent-hover);
--link-external-decoration:         underline;
--link-external-decoration-hover:   underline;
--link-external-filter:             none;
--link-unresolved-color:            var(--text-accent);
--link-unresolved-opacity:          0.7;
--link-unresolved-filter:           none;
--link-unresolved-decoration-style: solid;
--link-unresolved-decoration-color: hsla(var(--interactive-accent-hsl), 0.3);
```

- Default links (internal links to existing notes) — accent text + underline.
- External links — same default, but theme can apply `--link-external-filter` (e.g. desaturate).
- Unresolved (broken) links — same accent at 70 % opacity, underline color softens to 30 % accent.

---

## 7. `<kbd>` element (`app.css:10883-10890`)

```css
kbd {
  color:            var(--code-normal);    /* --text-normal */
  font-family:      var(--font-monospace);
  background-color: var(--code-background);/* --background-primary-alt */
  border-radius:    var(--radius-s);       /* 4px */
  font-size:        var(--code-size);      /* 0.875em */
  padding: 0.1em 0.25em;
}
```

Keyboard keys in markdown (`<kbd>⌘ T</kbd>`) render as small monospace labels with the code background. No border, just a background pill.

---

## 8. Garbled mode (`app.css:3297-3300`)

```css
.is-text-garbled * {
  font-family: 'Flow Circular', sans-serif !important;
  line-height: 1.45em !important;
}
```

When body has `.is-text-garbled`, every descendant uses Flow Circular — a font of looping abstract glyphs. Privacy/screenshot-safe mode. Toggleable from the command palette. Note line-height bumps to 1.45em to compensate for the slightly larger Flow Circular x-height.

---

## 9. Body text rendering (`app.css:3192-3199`)

```css
body {
  text-rendering: optimizeLegibility;
  …
}
```

The whole renderer uses `optimizeLegibility` text-rendering — kerning + ligatures enabled at the cost of a slight perf hit. This is what makes Inter's contextual ligatures (e.g. `→`, `==`, `=>`) render correctly at body sizes.

---

## 10. RTL bidi (`app.css:4786-4814`)

Several elements get explicit `unicode-bidi: plaintext` so each runs of text is auto-detected per-line as LTR or RTL based on its own characters:

```css
.bases-toolbar-result-count, .community-item-desc, .community-modal-info-desc,
.community-modal-search-summary, .inline-title, .inline-title h1,
.metadata-property-key-input, .metadata-input-longtext,
.multi-select-pill-content, .nav-file-title-content, .nav-folder-title-content,
.search-result-file-match, .setting-item-description, .setting-item-name,
.suggestion-title, .bases-table-header-name, .table-cell-wrapper,
.titlebar-text, .tooltip, .tree-item-inner, .view-header-breadcrumb,
.view-header-title, .workspace-tab-header-inner-title { unicode-bidi: plaintext; }
```

(These are mixed-content elements where the user might paste text in either direction.)

---

## 11. Reproducer build order

1. Register the `'??'` sentinel font face with `unicode-range: U+0` and ship Inter (variable) + Source Code Pro (regular/italic/bold/bold-italic) + Flow Circular as `@font-face` declarations.
2. Body baseline = `--font-interface` family, **15 px** UI medium, **1.3** tight line-height.
3. Markdown body (reading + source modes) overrides to `--font-text`, **16 px**, **1.5** normal line-height.
4. Six-step heading scale with golden-ratio sizes, graduated letter-spacing (-0.015 → 0), graduated line-heights (1.2 → 1.5), graduated weights via variable font.
5. Bold weight = base + 200 (`--bold-modifier`). Use this exact formula so themes can shift weight by changing only `--font-weight`.
6. Inline title is styled as an h1 (1.618 em, 700 weight, -0.015 em letter-spacing).
7. Links use `--text-accent` color and underline; unresolved links use 70 % opacity with a 30 %-opacity underline.
8. Kbd is monospace + code background.
9. The Flow Circular garbled mode is `* { font-family: 'Flow Circular' !important; line-height: 1.45em !important; }` — global override for screenshot privacy.
10. `unicode-bidi: plaintext` on every user-content element ensures RTL text in folders, titles, comments, etc. renders correctly without pre-detection.
