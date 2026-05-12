# Design Tokens

> Every CSS custom property declared at the root of `renderer/app.css`, with its default value, its light/dark theme resolution, and the source line. **All other spec files reference these tokens by name** — never inline a hex value when a token expands to it.

The token system has three layers:

1. **Primitive layer** — raw values: `--color-base-00` … `--color-base-100`, `--color-red-rgb`, `--accent-h/s/l`, `--mono-rgb-0`, `--mono-rgb-100`, font-weight numerals, easing curves, durations, sizes.
2. **Semantic layer** — name says intent: `--background-primary`, `--text-muted`, `--interactive-accent`, `--border-width`. These resolve to primitives via `var()`.
3. **Component layer** — name says where it's used: `--ribbon-background`, `--menu-shadow`, `--metadata-property-radius`. These resolve to semantic or primitive tokens.

Themes (`.theme-light`, `.theme-dark`) override only the **primitive** color layer (and a handful of semantic shadows). Components consume the semantic layer, which means re-theming reaches every component automatically. **OS modifiers** (`.mod-macos`, `.mod-windows`, `.mod-linux`) override a few component tokens. **Mobile flags** (`.is-mobile`, `.is-phone`, `.is-tablet`) live mostly in selectors, not tokens.

Source: `renderer/app.css` lines noted after each token. Lines refer to the unmodified file as shipped.

---

## 0. Theme resolution flow

```
.theme-dark / .theme-light
   ↓ define primitives
        --color-base-00 .. --color-base-100        ← grey scale
        --color-red, --color-orange, ...           ← hue scale
        --color-red-rgb (RGB triplet for alpha use)
        --mono-rgb-0, --mono-rgb-100               ← inverted black/white
        --color-accent / -1 / -2                   ← derived from --accent-h/s/l
   ↓ resolved by body { ... }
        --background-primary  →  var(--color-base-00)
        --text-normal         →  var(--color-base-100)
        --interactive-accent  →  var(--color-accent-1)
        ...
   ↓ consumed by component tokens
        --ribbon-background   →  var(--background-secondary)
        ...
   ↓ consumed by selectors
        .workspace-ribbon { background-color: var(--ribbon-background); ... }
```

The accent hue is **not** themed — both themes use `--accent-h: 258; --accent-s: 88%; --accent-l: 66%;` (`app.css:2844-2846`). The accent's _derived_ stops differ slightly between themes (see §13).

---

## 1. Heading font weight (root level)

Defined on `:root` so themes (which apply to body) cannot override them. (`app.css:2023-2030`)

| Token | Default | When `font-variation-settings: normal` supported (`app.css:2033-2042`) |
| --- | --- | --- |
| `--h1-weight` | `700` | `700` |
| `--h2-weight` | `600` | `680` |
| `--h3-weight` | `600` | `660` |
| `--h4-weight` | `600` | `640` |
| `--h5-weight` | `600` | `620` |
| `--h6-weight` | `600` | `600` |

Reproducer rule: probe `@supports (font-variation-settings: normal)` before computing heading weights. Variable-axis Inter is shipped (see §27), so the variable values are what runs in the desktop app.

---

## 2. Animation tokens (`app.css:2046-2054`)

| Token | Value |
| --- | --- |
| `--anim-duration-none` | `0` |
| `--anim-duration-superfast` | `70ms` |
| `--anim-duration-fast` | `140ms` |
| `--anim-duration-moderate` | `300ms` |
| `--anim-duration-slow` | `560ms` |
| `--anim-motion-smooth` | `cubic-bezier(0.45, 0.05, 0.55, 0.95)` |
| `--anim-motion-delay` | `cubic-bezier(0.65, 0.05, 0.36, 1)` |
| `--anim-motion-jumpy` | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` |
| `--anim-motion-swing` | `cubic-bezier(0, 0.55, 0.45, 1)` |

These are the only sanctioned durations and easings. Hand-coded values are rare and called out in the relevant component spec when they exist.

---

## 3. Bases (database view) tokens (`app.css:2056-2109`)

```
--bases-header-border-width:           0 0 var(--border-width) 0;
--bases-header-height:                 40px;
--bases-header-padding-start:          2px;
--bases-header-padding-end:            2px;
--bases-toolbar-label-display:         block;
--bases-toolbar-badge-display:         none;
--bases-embed-border-width:            0px;
--bases-embed-border-color:            var(--background-modifier-border);
--bases-embed-border-radius:           var(--radius-s);                   /* → 4px */
--bases-filter-menu-width:             520px;
--bases-group-heading-property-size:   var(--font-ui-smaller);            /* → 12px */
--bases-group-heading-property-weight: var(--font-normal);                /* → 400 */
--bases-group-heading-property-color:  var(--text-muted);
--bases-group-heading-value-size:      var(--font-smaller);               /* → 0.875em */
--bases-group-heading-value-weight:    var(--font-semibold);              /* → 600 */
--bases-group-heading-property-display:block;
--bases-table-container-border-width:  var(--border-width);               /* → 1px */
--bases-table-container-border-radius: var(--radius-s);                   /* → 4px */
--bases-table-group-background:        var(--background-primary-alt);
--bases-table-header-weight:           var(--font-weight);                /* → 400 (themed) */
--bases-table-header-color:            var(--text-muted);
--bases-table-header-icon-display:     flex;
--bases-table-header-background:       var(--background-primary);
--bases-table-header-background-hover: var(--background-modifier-hover);
--bases-table-header-sort-mask:        linear-gradient(to left, transparent var(--size-4-6), black var(--size-4-6));
--bases-table-summary-background:      var(--background-primary);
--bases-table-summary-background-hover:var(--background-modifier-hover);
--bases-table-border-color:            var(--table-border-color);
--bases-table-column-border-width:     var(--border-width);               /* → 1px */
--bases-table-group-gap:               10px;
--bases-table-row-border-width:        var(--border-width);               /* → 1px */
--bases-table-row-background-hover:    var(--table-row-background-hover);
--bases-table-row-height:              30px;
--bases-table-font-size:               var(--font-smaller);
--bases-table-column-max-width:        300;       /* unitless — used as `<n>px` via JS */
--bases-table-column-min-width:        40;        /* unitless */
--bases-table-cell-radius-active:      2px;
--bases-table-cell-shadow-active:      0 0 0 2px var(--background-modifier-border-focus);
--bases-table-cell-radius-focus:       2px;
--bases-table-cell-shadow-focus:       0 0 0 2px var(--interactive-accent);
--bases-table-cell-background-active:  var(--background-primary);
--bases-table-cell-background-disabled:var(--background-primary-alt);
--bases-table-cell-background-selected:var(--table-selection);
--bases-cards-background:              var(--background-primary);
--bases-cards-border-width:            var(--border-width);
--bases-cards-container-background:    transparent;
--bases-cards-corner-shape:            var(--corner-shape);                /* → round */
--bases-cards-cover-background:        var(--background-primary-alt);
--bases-cards-font-size:               var(--font-smaller);
--bases-cards-line-height:             24px;
--bases-cards-radius:                  var(--radius-m);                    /* → 8px */
--bases-cards-scale:                   1;
--bases-cards-shadow-hover:            0 0 0 1px var(--background-modifier-border-hover);
--bases-cards-shadow:                  0 0 0 1px var(--background-modifier-border);
```

---

## 4. Blockquote (`app.css:2111-2115`)

```
--blockquote-border-thickness:  2px;
--blockquote-border-color:      var(--interactive-accent);
--blockquote-font-style:        normal;
--blockquote-color:             inherit;
--blockquote-background-color:  transparent;
```

---

## 5. Bold / Border / Button / Blur / Callout / Canvas / Caret / Checkbox / Code / Collapse / Cursor / Dialog / Divider / Drag

```
/* Bold (app.css:2117-2119) */
--bold-modifier:  200;                                    /* added to base font weight */
--bold-color:     inherit;
--bold-weight:    calc(var(--font-weight) + var(--bold-modifier));   /* → 600 by default */

/* Borders (app.css:2121) */
--border-width:   1px;

/* Buttons (app.css:2123-2124) */
--button-radius:        var(--input-radius);                 /* → 5px */
--button-corner-shape:  var(--corner-shape);                 /* → round */

/* Blurs (app.css:2126-2136) — frosted glass */
--blur-background:  color-mix(in srgb, var(--background-primary) var(--blur-opacity-s), transparent)
                    linear-gradient(var(--background-primary),
                      color-mix(in srgb, var(--background-primary) var(--blur-opacity-s), transparent));
--blur-opacity-s:   65%;
--blur-opacity-m:   90%;
--blur-brightness:  1.15;
--blur-saturation:  1.5;
--blur-radius-s:    6px;
--blur-radius-m:    10px;
--blur-radius-l:    16px;
--blur-s:           blur(var(--blur-radius-s)) saturate(var(--blur-saturation)) brightness(var(--blur-brightness));
--blur-m:           blur(var(--blur-radius-m)) saturate(var(--blur-saturation)) brightness(var(--blur-brightness));
--blur-l:           blur(var(--blur-radius-l)) saturate(var(--blur-saturation)) brightness(var(--blur-brightness));

/* Callouts (app.css:2138-2162) */
--callout-border-width:        0px;
--callout-border-opacity:      0.25;
--callout-padding:             var(--size-4-3) var(--size-4-3) var(--size-4-3) var(--size-4-6);
                              /* → 12px 12px 12px 24px */
--callout-radius:              var(--radius-s);                 /* → 4px */
--callout-blend-mode:          var(--highlight-mix-blend-mode); /* light: darken | dark: lighten */
--callout-title-color:         inherit;
--callout-title-padding:       0;
--callout-title-size:          inherit;
--callout-title-weight:        calc(var(--font-weight) + var(--bold-modifier));
--callout-content-padding:     0;
--callout-content-background:  transparent;
/* Type → RGB triplet (always RGB so opacity can be applied at use-site) */
--callout-bug:        var(--color-red-rgb);
--callout-default:    var(--color-blue-rgb);
--callout-error:      var(--color-red-rgb);
--callout-example:    var(--color-purple-rgb);
--callout-fail:       var(--color-red-rgb);
--callout-important:  var(--color-cyan-rgb);
--callout-info:       var(--color-blue-rgb);
--callout-question:   var(--color-orange-rgb);
--callout-success:    var(--color-green-rgb);
--callout-summary:    var(--color-cyan-rgb);
--callout-tip:        var(--color-cyan-rgb);
--callout-todo:       var(--color-blue-rgb);
--callout-warning:    var(--color-orange-rgb);
--callout-quote:      158, 158, 158;                        /* fixed — not themed */

/* Canvas (app.css:2164-2175) */
--canvas-background:            var(--background-primary);
--canvas-card-label-color:      var(--text-faint);
--canvas-color-1:               var(--color-red-rgb);
--canvas-color-2:               var(--color-orange-rgb);
--canvas-color-3:               var(--color-yellow-rgb);
--canvas-color-4:               var(--color-green-rgb);
--canvas-color-5:               var(--color-cyan-rgb);
--canvas-color-6:               var(--color-purple-rgb);
--canvas-controls-radius:       var(--radius-s);                  /* → 4px */
--canvas-controls-icon-size:    var(--icon-s);                    /* → 16px */
--canvas-controls-icon-stroke:  var(--icon-s-stroke-width);       /* → 2px */
--canvas-dot-pattern:           var(--color-base-30);

/* Caret (app.css:2177) */
--caret-color: var(--text-normal);

/* Checkbox (app.css:2179-2188) */
--checkbox-radius:              var(--radius-s);                  /* → 4px */
--checkbox-size:                var(--font-text-size);            /* → 16px */
--checkbox-marker-color:        var(--background-primary);        /* the tick */
--checkbox-color:               var(--interactive-accent);
--checkbox-color-hover:         var(--interactive-accent-hover);
--checkbox-border-color:        var(--text-faint);
--checkbox-border-color-hover:  var(--text-muted);
--checkbox-margin-inline-start: 0.85em;
--checklist-done-decoration:    line-through;
--checklist-done-color:         var(--text-muted);

/* Code (app.css:2190-2207) */
--code-white-space:        pre-wrap;
--code-border-width:       0px;
--code-border-color:       var(--background-modifier-border);
--code-bracket-background: var(--background-modifier-hover);
--code-radius:             var(--radius-s);                       /* → 4px */
--code-size:               var(--font-smaller);                   /* → 0.875em */
--code-background:         var(--background-primary-alt);
--code-normal:             var(--text-normal);
--code-comment:            var(--text-faint);
--code-function:           var(--color-yellow);
--code-important:          var(--color-orange);
--code-keyword:            var(--color-pink);
--code-operator:           var(--color-red);
--code-property:           var(--color-cyan);
--code-punctuation:        var(--text-muted);
--code-string:             var(--color-green);
--code-tag:                var(--color-red);
--code-value:              var(--color-purple);

/* Collapse icons (app.css:2209-2210) */
--collapse-icon-color:           var(--text-faint);
--collapse-icon-color-collapsed: var(--text-accent);

/* Cursor (app.css:2212-2213) */
--cursor:      default;
--cursor-link: pointer;

/* Dialog (app.css:2215-2217) */
--dialog-width:      560px;
--dialog-max-width:  80vw;
--dialog-max-height: 85vh;

/* Divider (app.css:2219-2223) */
--divider-color:           var(--background-modifier-border);
--divider-color-hover:     var(--interactive-accent);
--divider-width:           1px;
--divider-width-hover:     3px;
--divider-vertical-height: calc(100% - var(--header-height));     /* → 100% - 40px */

/* Drag (app.css:2225-2226) */
--drag-ghost-background: rgba(0, 0, 0, 0.85);
--drag-ghost-text-color: #fff;
```

---

## 6. Dropdown / Embed / File-layout / Header height (`app.css:2228-2261`)

```
--dropdown-background-blend-mode: hard-light;
--dropdown-background-position:   var(--inset-end) var(--dropdown-icon-inset) top 50%, 0 0;
--dropdown-background-size:       var(--dropdown-icon-width) auto, 100%;
--dropdown-icon-width:            1em;
--dropdown-icon-inset:            0.5em;
--dropdown-padding:               0 var(--dropdown-padding-end) 0 var(--dropdown-padding-start);
--dropdown-padding-start:         0.8em;
--dropdown-padding-end:           1.9em;

--embed-max-height:               4000px;
--embed-canvas-max-height:        400px;
--embed-background:               inherit;
--embed-border-start:             2px solid var(--interactive-accent);
--embed-border-end:               none;
--embed-border-top:               none;
--embed-border-bottom:            none;
--embed-padding:                  0 0 0 var(--size-4-6);          /* → 0 0 0 24px */
--embed-font-style:               inherit;
--embed-block-shadow-hover:       0 0 0 1px var(--background-modifier-border),
                                  inset 0 0 0 1px var(--background-modifier-border);

--file-line-width:           700px;
--file-folding-offset:       24px;
--file-margins:              var(--file-margins-y) var(--file-margins-x);
--file-margins-x:            var(--size-4-8);                     /* → 32px */
--file-margins-y:            var(--size-4-8);                     /* → 32px */
--file-header-font:          var(--font-interface);
--file-header-font-size:     var(--font-ui-small);                /* → 13px */
--file-header-font-weight:   400;
--file-header-background:    var(--background-primary);
--file-header-background-focused: var(--background-primary);
--file-header-border:        var(--border-width) solid transparent;
--file-header-justify:       center;

--header-height:             40px;
```

---

## 7. Font-size / Flair / Font-weight scale (`app.css:2263-2284`)

```
/* Relative (em-based) text sizes */
--font-smallest: 0.8em;
--font-smaller:  0.875em;
--font-small:    0.933em;

/* Flair badges */
--flair-background: var(--interactive-normal);
--flair-color:      var(--text-normal);

/* UI font sizes (px-based) */
--font-ui-smaller: 12px;
--font-ui-small:   13px;
--font-ui-medium:  15px;
--font-ui-large:   20px;

/* Font-weight scale */
--font-weight:     var(--font-normal);                            /* → 400 */
--font-thin:       100;
--font-extralight: 200;
--font-light:      300;
--font-normal:     400;
--font-medium:     500;
--font-semibold:   600;
--font-bold:       700;
--font-extrabold:  800;
--font-black:      900;
```

---

## 8. Footnote / Graph / Heading (`app.css:2286-2353`)

```
/* Footnote */
--footnote-divider-color-active:    var(--metadata-divider-color-focus);
--footnote-divider-color:           var(--metadata-divider-color);
--footnote-divider-width:           var(--border-width);          /* → 1px */
--footnote-gap:                     var(--size-4-1);              /* → 4px */
--footnote-id-color-no-occurrences: var(--text-faint);
--footnote-id-color:                var(--text-muted);
--footnote-id-delimiter:            ".";
--footnote-input-background-active: var(--metadata-input-background-active);
--footnote-input-background:        var(--metadata-input-background);
--footnote-line-height:             var(--line-height-normal);    /* → 1.5 */
--footnote-padding-block:           var(--size-2-3);              /* → 6px */
--footnote-padding-inline:          var(--size-2-3);              /* → 6px */
--footnote-radius:                  var(--radius-s);              /* → 4px */
--footnote-size:                    var(--font-smaller);          /* → 0.875em */

/* Graph view */
--graph-controls-width:     240px;
--graph-text:               var(--text-normal);
--graph-line:               var(--color-base-35, var(--background-modifier-border-focus));
--graph-node:               var(--text-muted);
--graph-node-unresolved:    var(--text-faint);
--graph-node-focused:       var(--text-accent);
--graph-node-tag:           var(--color-green);
--graph-node-attachment:    var(--color-yellow);

/* Headings */
--heading-formatting:   var(--text-faint);
--heading-spacing:      calc(var(--p-spacing) * 2.5);             /* → 2.5rem */
--h1-color: inherit; --h2-color: inherit; --h3-color: inherit;
--h4-color: inherit; --h5-color: inherit; --h6-color: inherit;
--h1-font:  inherit; ...
--h1-letter-spacing: -0.015em;
--h2-letter-spacing: -0.011em;
--h3-letter-spacing: -0.008em;
--h4-letter-spacing: -0.005em;
--h5-letter-spacing: -0.002em;
--h6-letter-spacing:  0em;
--h1-line-height: 1.2;
--h2-line-height: 1.2;
--h3-line-height: 1.3;
--h4-line-height: 1.4;
--h5-line-height: var(--line-height-normal);                       /* → 1.5 */
--h6-line-height: var(--line-height-normal);                       /* → 1.5 */
--h1-size: 1.618em;
--h2-size: 1.462em;
--h3-size: 1.318em;
--h4-size: 1.188em;
--h5-size: 1.076em;
--h6-size: 1em;
--h1-style: normal; ... --h6-style: normal;
--h1-variant: normal; ... --h6-variant: normal;
```

The heading scale ratio from h6→h1 is `1, 1.076, 1.188, 1.318, 1.462, 1.618` — golden-ratio adjacent.

---

## 9. HR / Icon / Indent / Inline-title / Inputs / Italic (`app.css:2355-2411`)

```
/* Horizontal rule */
--hr-color:     var(--background-modifier-border);
--hr-thickness: 2px;

/* Icons */
--icon-size:               var(--icon-m);                          /* → 18px */
--icon-stroke:             var(--icon-m-stroke-width);             /* → 1.75px */
--icon-xs:                 14px;
--icon-s:                  16px;
--icon-m:                  18px;
--icon-l:                  18px;
--icon-xl:                 32px;
--icon-xs-stroke-width:    2px;
--icon-s-stroke-width:     2px;
--icon-m-stroke-width:     1.75px;
--icon-l-stroke-width:     1.75px;
--icon-xl-stroke-width:    1.25px;
--icon-color:              var(--text-muted);
--icon-color-hover:        var(--text-muted);
--icon-color-active:       var(--text-accent);
--icon-color-focused:      var(--text-normal);
--icon-opacity:            0.85;
--icon-opacity-hover:      1;
--icon-opacity-active:     1;
--clickable-icon-radius:   var(--radius-s);                        /* → 4px */

/* Indent */
--indent-size:                       4;
--indent-unit:                       0.5625em;
--indentation-guide-width:           var(--border-width);          /* → 1px */
--indentation-guide-width-active:    var(--border-width);          /* → 1px */
--indentation-guide-color:           rgba(var(--mono-rgb-100), 0.12);
--indentation-guide-color-active:    rgba(var(--mono-rgb-100), 0.3);
--indentation-guide-editing-indent:  0.85em;
--indentation-guide-reading-indent:  -0.85em;
--indentation-guide-source-indent:   0.25em;

/* Inline title (page title at top of editor) */
--inline-title-color:          var(--h1-color);
--inline-title-font:           var(--h1-font);
--inline-title-line-height:    var(--h1-line-height);
--inline-title-size:           var(--h1-size);
--inline-title-style:          var(--h1-style);
--inline-title-variant:        var(--h1-variant);
--inline-title-weight:         var(--h1-weight);
--inline-title-margin-bottom:  0.5em;

/* Inputs */
--input-height:               30px;
--input-padding:              var(--size-4-1) var(--size-4-2);     /* → 4px 8px */
--input-radius:               5px;
--input-corner-shape:         var(--corner-shape);                 /* → round */
--input-font-weight:          var(--font-normal);                  /* → 400 */
--input-border-width:         var(--border-width);                 /* → 1px */
--input-border-width-focus:   2px;
--input-placeholder-color:    var(--text-faint);
--input-date-separator:       var(--text-faint);
--input-icon-inset:           var(--size-4-1);                     /* → 4px */

/* Italic */
--italic-color:  inherit;
--italic-weight: inherit;
```

---

## 10. Z-index scale — "layers" (`app.css:2413-2422`)

```
--layer-cover:         5
--layer-sidedock:      10
--layer-status-bar:    15
--layer-popover:       30
--layer-slides:        45
--layer-modal:         50
--layer-notice:        60
--layer-menu:          65
--layer-tooltip:       70
--layer-dragged-item:  80
```

These are the **only** sanctioned z-index values. Any selector with `z-index: <number>` outside this scale is suspicious.

---

## 11. Line-height / Link / List / Nav (`app.css:2424-2492`)

```
/* Line heights */
--line-height-normal: 1.5;
--line-height-tight:  1.3;

/* Links */
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

/* Lists */
--list-indent:           calc(var(--indent-unit) * var(--indent-size));   /* → 0.5625em × 4 = 2.25em */
--list-indent-editing:   0.75em;
--list-indent-source:    0;
--list-spacing:          0.075em;
--list-marker-color:               var(--text-faint);
--list-marker-color-hover:         var(--text-muted);
--list-marker-color-collapsed:     var(--text-accent);
--list-bullet-border:    none;
--list-bullet-radius:    50%;
--list-bullet-size:      0.3em;
--list-bullet-transform: none;
--list-numbered-style:   decimal;
--list-bullet-end-padding: 1.3rem;

/* Nav (file explorer & sidebar trees) */
--nav-item-size:                  var(--font-ui-small);                  /* → 13px */
--nav-item-radius:                var(--radius-s);                       /* → 4px */
--nav-item-color:                 var(--text-muted);
--nav-item-color-hover:           var(--text-normal);
--nav-item-color-active:          var(--text-normal);
--nav-item-color-selected:        var(--text-normal);
--nav-item-color-highlighted:     var(--text-accent);
--nav-item-background-hover:      var(--background-modifier-hover);
--nav-item-background-active:     var(--background-modifier-hover);
--nav-item-background-selected:   hsla(var(--color-accent-hsl), 0.15);
--nav-item-padding:               var(--size-4-1) var(--size-4-2) var(--size-4-1) var(--size-4-6);
                                  /* → 4px 8px 4px 24px */
--nav-item-parent-padding:        var(--nav-item-padding);
--nav-item-margin-bottom:         var(--size-2-1);                       /* → 2px */
--nav-item-children-padding-start:var(--size-2-2);                       /* → 4px */
--nav-item-children-margin-start: var(--size-4-3);                       /* → 12px */
--nav-item-weight:                inherit;
--nav-item-weight-hover:          inherit;
--nav-item-weight-active:         inherit;
--nav-item-white-space:           pre;
--nav-indentation-guide-width:    var(--indentation-guide-width);
--nav-indentation-guide-color:    var(--indentation-guide-color);
--nav-collapse-icon-color:           var(--collapse-icon-color);
--nav-collapse-icon-color-collapsed: var(--text-faint);
--nav-heading-color:                       var(--text-normal);
--nav-heading-color-hover:                 var(--text-normal);
--nav-heading-color-collapsed:             var(--text-faint);
--nav-heading-color-collapsed-hover:       var(--text-muted);
--nav-heading-weight:                      var(--font-medium);           /* → 500 */
--nav-heading-weight-hover:                var(--font-medium);
--nav-tag-background:        transparent;
--nav-tag-radius:            var(--radius-s);                            /* → 4px */
--nav-tag-color:             var(--text-faint);
--nav-tag-color-hover:       var(--text-muted);
--nav-tag-color-active:      var(--text-muted);
--nav-tag-weight:            var(--font-semibold);                       /* → 600 */
```

---

## 12. Menu / Metadata / Modal (`app.css:2494-2561`)

```
/* Menu */
--menu-padding:           var(--size-2-3);                               /* → 6px */
--menu-shadow:            var(--shadow-s);
--menu-radius:            var(--radius-m);                               /* → 8px */
--menu-corner-shape:      var(--corner-shape);                           /* → round */
--menu-background:        var(--background-secondary);
--menu-border-color:      var(--background-modifier-border-hover);
--menu-border-width:      var(--border-width);                           /* → 1px */
--menu-backdrop-filter:   none;
--menu-scroll-mask:       linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.1) 48px);

/* Metadata (Properties) */
--metadata-background:               transparent;
--metadata-display-reading:          block;
--metadata-display-editing:          block;
--metadata-max-width:                none;
--metadata-padding:                  var(--size-4-2) 0;                  /* → 8px 0 */
--metadata-border-color:             var(--background-modifier-border);
--metadata-border-radius:            0;
--metadata-border-width:             0;
--metadata-divider-color:            var(--background-modifier-border);
--metadata-divider-color-hover:      transparent;
--metadata-divider-color-focus:      transparent;
--metadata-divider-width:            0;
--metadata-gap:                      3px;
--metadata-property-padding:         0;
--metadata-property-radius:          6px;
--metadata-property-radius-hover:    6px;
--metadata-property-radius-focus:    6px;
--metadata-property-corner-shape:        var(--corner-shape);
--metadata-property-corner-shape-hover:  var(--corner-shape);
--metadata-property-corner-shape-focus:  var(--corner-shape);
--metadata-property-background:           transparent;
--metadata-property-background-hover:     transparent;
--metadata-property-background-active:    var(--background-modifier-hover);
--metadata-property-box-shadow-hover:     0 0 0 var(--border-width) var(--background-modifier-border-hover);
--metadata-property-box-shadow-focus:     0 0 0 2px var(--background-modifier-border-focus);
--metadata-label-background:              transparent;
--metadata-label-background-hover:        transparent;
--metadata-label-background-active:       var(--background-modifier-hover);
--metadata-label-font:                    var(--font-interface);
--metadata-label-font-size:               var(--font-smaller);            /* → 0.875em */
--metadata-label-font-weight:             inherit;
--metadata-label-text-color:              var(--text-muted);
--metadata-label-text-color-hover:        var(--text-muted);
--metadata-label-width:                   9em;
--metadata-input-height:        calc(var(--font-text-size) * 1.75);       /* → 28px (16×1.75) */
--metadata-input-text-color:    var(--text-normal);
--metadata-input-font:          var(--font-interface);
--metadata-input-font-size:     var(--font-smaller);
--metadata-input-background:           transparent;
--metadata-input-background-hover:     transparent;
--metadata-input-background-active:    var(--background-modifier-hover);
--metadata-input-longtext-lines:       3;
--metadata-input-padding:              var(--size-4-1) var(--size-4-2);   /* → 4px 8px */
--metadata-sidebar-label-font-size:    var(--font-ui-small);              /* → 13px */
--metadata-sidebar-input-font-size:    var(--font-ui-small);              /* → 13px */

/* Modal */
--modal-background:              var(--background-primary);
--modal-width:                   90vw;
--modal-header-height:           auto;
--modal-height:                  85vh;
--modal-max-width:               1100px;
--modal-max-height:              1000px;
--modal-max-width-narrow:        800px;
--modal-shadow:                  none;
--modal-border-width:            var(--border-width);                     /* → 1px */
--modal-border-color:            var(--color-base-40, var(--background-modifier-border-focus));
--modal-radius:                  var(--radius-l);                         /* → 12px */
--modal-community-sidebar-width: 280px;
```

---

## 13. Color mappings — semantic resolution (`app.css:2842-2884`)

These resolve _from_ the primitive layer. Defined on `body` so themes (which set primitives on `.theme-light` / `.theme-dark`) propagate.

```
/* Accent (HSL inputs — both themes) */
--accent-h: 258;
--accent-s: 88%;
--accent-l: 66%;

/* Backgrounds */
--background-primary:                var(--color-base-00);
--background-primary-alt:            var(--color-base-10);
--background-secondary:              var(--color-base-20);
--background-modifier-hover:         rgba(var(--mono-rgb-100), 0.067);
--background-modifier-active-hover:  hsla(var(--interactive-accent-hsl), 0.1);
--background-modifier-border:        var(--color-base-30);
--background-modifier-border-hover:  var(--color-base-35);
--background-modifier-border-focus:  var(--color-base-40);
--background-modifier-error-rgb:     var(--color-red-rgb);
--background-modifier-error:         var(--color-red);
--background-modifier-error-hover:   var(--color-red);
--background-modifier-success-rgb:   var(--color-green-rgb);
--background-modifier-success:       var(--color-green);
--background-modifier-message:       rgba(0, 0, 0, 0.9);

/* Form fields */
--background-modifier-form-field:        var(--color-base-00);          /* dark theme overrides — see §15 */
--background-modifier-form-field-hover:  var(--background-modifier-form-field);

/* Text */
--text-normal:        var(--color-base-100);
--text-muted:         var(--color-base-70);
--text-faint:         var(--color-base-50);
--text-on-accent:     white;
--text-on-accent-inverted: black;
--text-error:         var(--color-red);
--text-warning:       var(--color-orange);
--text-success:       var(--color-green);
--text-selection:     hsla(var(--color-accent-hsl), 0.2);                /* dark overrides to 0.33 */
--text-highlight-bg-rgb: 255, 208, 0;
--text-highlight-bg:  rgba(var(--text-highlight-bg-rgb), 0.4);
--text-accent:        var(--color-accent);                                /* dark overrides to color-accent-1 */
--text-accent-hover:  var(--color-accent-2);

/* Interactive */
--interactive-normal:        var(--color-base-00);                        /* dark: --color-base-30 */
--interactive-hover:         var(--color-base-10);                        /* dark: --color-base-35 */
--interactive-accent-hsl:    var(--color-accent-hsl);
--interactive-accent:        var(--color-accent-1);                       /* dark: --color-accent */
--interactive-accent-hover:  var(--color-accent-2);                       /* dark: --color-accent-1 */
```

---

## 14. Light theme primitives (`app.css:2892-2938`)

```
.theme-light {
  color-scheme: light;
  --highlight-mix-blend-mode: darken;

  --mono-rgb-0:   255, 255, 255;
  --mono-rgb-100: 0, 0, 0;

  --color-red-rgb:    233, 49, 71;        --color-red:    #e93147;
  --color-orange-rgb: 236, 117, 0;        --color-orange: #ec7500;
  --color-yellow-rgb: 224, 172, 0;        --color-yellow: #e0ac00;
  --color-green-rgb:  8, 185, 78;         --color-green:  #08b94e;
  --color-cyan-rgb:   0, 191, 188;        --color-cyan:   #00bfbc;
  --color-blue-rgb:   8, 109, 221;        --color-blue:   #086ddd;
  --color-purple-rgb: 120, 82, 238;       --color-purple: #7852ee;
  --color-pink-rgb:   213, 57, 132;       --color-pink:   #d53984;

  --color-base-00:  #ffffff;
  --color-base-05:  #fcfcfc;
  --color-base-10:  #fafafa;
  --color-base-20:  #f6f6f6;
  --color-base-25:  #e3e3e3;
  --color-base-30:  #e0e0e0;
  --color-base-35:  #d4d4d4;
  --color-base-40:  #bdbdbd;
  --color-base-50:  #ababab;
  --color-base-60:  #707070;
  --color-base-70:  #5c5c5c;
  --color-base-100: #222222;

  --color-accent-hsl: var(--accent-h), var(--accent-s), var(--accent-l);
  --color-accent:     hsl(var(--accent-h), var(--accent-s), var(--accent-l));
  --color-accent-1:   hsl(calc(var(--accent-h) - 1), calc(var(--accent-s) * 1.01), calc(var(--accent-l) * 1.075));
  --color-accent-2:   hsl(calc(var(--accent-h) - 3), calc(var(--accent-s) * 1.02), calc(var(--accent-l) * 1.15));

  --background-secondary-alt:        var(--color-base-05);
  --background-modifier-box-shadow:  rgba(0, 0, 0, 0.1);
  --background-modifier-cover:       rgba(220, 220, 220, 0.4);

  --input-shadow:        inset 0 0 0 1px rgba(0,0,0,0.12),
                         0 2px 3px 0 rgba(0,0,0,0.05),
                         0 1px 1.5px 0 rgba(0,0,0,0.03),
                         0 1px 2px 0 rgba(0,0,0,0.04),
                         0 0 0 0 transparent;
  --input-shadow-hover:  inset 0 0 0 1px rgba(0,0,0,0.17),
                         0 2px 3px 0 rgba(0,0,0,0.1),
                         0 1px 1.5px 0 rgba(0,0,0,0.03),
                         0 1px 2px 0 rgba(0,0,0,0.04),
                         0 0 0 0 transparent;
  --shadow-edges:  0 0 transparent;
  --shadow-xs:     0 1px 6px rgba(0,0,0,0.015), 0 4px 24px rgba(0,0,0,0.065), var(--shadow-edges);
  --shadow-s:      0px 1px 2px rgba(0,0,0,0.028), 0px 3.4px 6.7px rgba(0,0,0,0.042), 0px 15px 30px rgba(0,0,0,0.07);
  --shadow-l:      0px 1.8px 7.3px rgba(0,0,0,0.071), 0px 6.3px 24.7px rgba(0,0,0,0.112), 0px 15px 30px rgba(0,0,0,0.1);
}
```

Resolved derived accent (light):

| Token | HSL inputs | Computed |
| --- | --- | --- |
| `--color-accent` | `hsl(258, 88%, 66%)` | `#7c52ed` |
| `--color-accent-1` | `hsl(257, 88.88%, 70.95%)` | `#8c6df0` |
| `--color-accent-2` | `hsl(255, 89.76%, 75.9%)` | `#9c83f3` |

---

## 15. Dark theme primitives (`app.css:2940-2996`)

```
.theme-dark {
  color-scheme: dark;
  --highlight-mix-blend-mode: lighten;

  --mono-rgb-0:   0, 0, 0;
  --mono-rgb-100: 255, 255, 255;

  --color-red-rgb:    251, 70, 76;       --color-red:    #fb464c;
  --color-orange-rgb: 233, 151, 63;      --color-orange: #e9973f;
  --color-yellow-rgb: 224, 222, 113;     --color-yellow: #e0de71;
  --color-green-rgb:  68, 207, 110;      --color-green:  #44cf6e;
  --color-cyan-rgb:   83, 223, 221;      --color-cyan:   #53dfdd;
  --color-blue-rgb:   2, 122, 255;       --color-blue:   #027aff;
  --color-purple-rgb: 168, 130, 255;     --color-purple: #a882ff;
  --color-pink-rgb:   250, 153, 205;     --color-pink:   #fa99cd;

  --color-base-00:  #1e1e1e;
  --color-base-05:  #212121;
  --color-base-10:  #242424;
  --color-base-20:  #262626;
  --color-base-25:  #2a2a2a;
  --color-base-30:  #363636;
  --color-base-35:  #3f3f3f;
  --color-base-40:  #555555;
  --color-base-50:  #666666;
  --color-base-60:  #999999;
  --color-base-70:  #b3b3b3;
  --color-base-100: #dadada;

  --color-accent-hsl: var(--accent-h), var(--accent-s), var(--accent-l);
  --color-accent:     hsl(var(--accent-h), var(--accent-s), var(--accent-l));
  --color-accent-1:   hsl(calc(var(--accent-h) - 3), calc(var(--accent-s) * 1.02), calc(var(--accent-l) * 1.15));
  --color-accent-2:   hsl(calc(var(--accent-h) - 5), calc(var(--accent-s) * 1.05), calc(var(--accent-l) * 1.29));

  --blur-background:    color-mix(in srgb, var(--interactive-normal) var(--blur-opacity-s), transparent)
                        linear-gradient(var(--interactive-normal),
                          color-mix(in srgb, var(--interactive-normal) var(--blur-opacity-s), transparent));

  --background-modifier-form-field: var(--color-base-25);
  --background-secondary-alt:       var(--color-base-30);
  --interactive-normal:             var(--color-base-30);
  --interactive-hover:              var(--color-base-35);
  --text-accent:                    var(--color-accent-1);
  --interactive-accent:             var(--color-accent);
  --interactive-accent-hover:       var(--color-accent-1);
  --background-modifier-box-shadow: rgba(0, 0, 0, 0.3);
  --background-modifier-cover:      rgba(10, 10, 10, 0.4);
  --raised-mask-background:         transparent;
  --text-selection:                 hsla(var(--interactive-accent-hsl), 0.33);

  --input-shadow:       inset 0 0.5px 0.5px 0.5px rgba(255,255,255,0.09),
                        0 2px 4px 0 rgba(0,0,0,0.15),
                        0 1px 1.5px 0 rgba(0,0,0,0.1),
                        0 1px 2px 0 rgba(0,0,0,0.2),
                        0 0 0 0 transparent;
  --input-shadow-hover: inset 0 0.5px 1px 0.5px rgba(255,255,255,0.16),
                        0 2px 3px 0 rgba(0,0,0,0.3),
                        0 1px 1.5px 0 rgba(0,0,0,0.2),
                        0 1px 2px 0 rgba(0,0,0,0.4),
                        0 0 0 0 transparent;
  --shadow-xs:          0 1px 6px rgba(0,0,0,0.045), 0 4px 24px rgba(0,0,0,0.195), var(--shadow-edges);
  --shadow-s:           0px 1px 2px rgba(0,0,0,0.121), 0px 3.4px 6.7px rgba(0,0,0,0.179), 0px 15px 30px rgba(0,0,0,0.3);
  --shadow-l:           0px 1.8px 7.3px rgba(0,0,0,0.071), 0px 6.3px 24.7px rgba(0,0,0,0.112), 0px 30px 90px rgba(0,0,0,0.2);
  --pdf-shadow:         0 0 0 1px var(--background-modifier-border);
  --pdf-thumbnail-shadow: 0 0 0 1px var(--background-modifier-border);
}
```

Resolved derived accent (dark):

| Token | HSL inputs | Computed |
| --- | --- | --- |
| `--color-accent` | `hsl(258, 88%, 66%)` | `#7c52ed` |
| `--color-accent-1` | `hsl(255, 89.76%, 75.9%)` | `#9c83f3` |
| `--color-accent-2` | `hsl(253, 92.4%, 85.14%)` | `#b8a7f6` |

Note: `--color-accent-1` in light = `--color-accent-2` shifted; in dark, they are shifted further. The intent is that `--text-accent` reads a touch lighter in dark mode (`#9c83f3`) than in light (`#7c52ed`).

---

## 16. Multi-select pill / Paragraph / PDF (`app.css:2563-2587`)

```
/* Pill */
--pill-color:                var(--text-muted);
--pill-color-hover:          var(--text-normal);
--pill-color-remove:         var(--text-faint);
--pill-color-remove-hover:   var(--text-accent);
--pill-decoration:           none;
--pill-decoration-hover:     none;
--pill-background:           transparent;
--pill-background-hover:     transparent;
--pill-border-color:         var(--background-modifier-border);
--pill-border-color-hover:   var(--background-modifier-border-hover);
--pill-border-width:         var(--border-width);                /* → 1px */
--pill-padding-x:            0.65em;
--pill-padding-y:            0.25em;
--pill-radius:               2em;
--pill-weight:               inherit;

/* Paragraph */
--p-spacing:        1rem;
--p-spacing-empty:  0rem;

/* PDF */
--pdf-background:         var(--background-primary);
--pdf-page-background:    var(--background-primary);
--pdf-shadow:             0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.1);  /* dark overrides */
--pdf-spread-shadow:      0 0 0 1px rgba(0,0,0,0.05);
--pdf-sidebar-background: var(--background-primary);
--pdf-thumbnail-shadow:   0 0 0 1px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.2);  /* dark overrides */
```

---

## 17. Popover / Prompt / Radius / Raised (`app.css:2589-2618`)

```
/* Popover (file hover preview) */
--popover-width:        450px;
--popover-height:       400px;
--popover-max-height:   95vh;
--popover-pdf-width:    450px;
--popover-pdf-height:   400px;
--popover-font-size:    var(--font-text-size);                /* → 16px */

/* Prompt (quick switcher / command palette) */
--prompt-background:      var(--background-primary);
--prompt-backdrop-filter: none;
--prompt-input-height:    40px;
--prompt-width:           700px;
--prompt-max-width:       80vw;
--prompt-max-height:      70vh;
--prompt-border-width:    var(--border-width);
--prompt-border-color:    var(--color-base-40, var(--background-modifier-border-focus));

/* Radius */
--corner-shape: round;
--radius-s:     4px;
--radius-m:     8px;
--radius-l:     12px;
--radius-xl:    16px;

/* Raised (suggestion / floating UI shells) */
--raised-background:        var(--blur-background);
--raised-blur:              var(--blur-s);
--raised-shadow:            var(--shadow-xs);
--raised-mask-display:      block;
--raised-mask-border-width: 0;
--raised-mask-background:   linear-gradient(to bottom left, white, transparent, white) border-box no-repeat;
--raised-mask:              linear-gradient(white, white) padding-box,
                            linear-gradient(white, white) border-box;
--raised-mask-composite:    exclude, add;
```

---

## 18. Ribbon / Scrollbar / Search (`app.css:2620-2637`)

```
--ribbon-background:           var(--background-secondary);
--ribbon-background-collapsed: var(--background-primary);
--ribbon-width:                44px;
--ribbon-padding:              var(--size-4-2) var(--size-4-1) var(--size-4-3);
                              /* → 8px 4px 12px */

--scrollbar-width:             12px;
--scrollbar-height:            12px;
--scrollbar-border-width:      3px 3px 3px 2px;
--scrollbar-radius:            var(--radius-l);                          /* → 12px */
--scrollbar-active-thumb-bg:   rgba(var(--mono-rgb-100), 0.2);
--scrollbar-bg:                rgba(var(--mono-rgb-100), 0.05);
--scrollbar-thumb-bg:          rgba(var(--mono-rgb-100), 0.1);

--search-clear-button-color:   var(--text-muted);
--search-clear-button-size:    13px;
--search-icon-color:           var(--text-muted);
--search-icon-size:            18px;
--search-result-background:    var(--background-primary);
```

---

## 19. Setting groups / Layout sizing (`app.css:2639-2662`)

```
/* Setting groups */
--setting-group-heading-color:   var(--text-normal);
--setting-group-heading-size:    var(--font-ui-medium);                  /* → 15px */
--setting-group-heading-weight:  var(--font-semibold);                   /* → 600 */
--setting-items-background:      var(--background-primary-alt);
--setting-items-padding:         var(--size-4-5);                        /* → 20px */
--setting-items-radius:          var(--radius-l);                        /* → 12px */
--setting-items-border-width:    0;
--setting-items-border-color:    var(--background-modifier-border);

/* Layout sizing scales */
--size-2-1: 2px;
--size-2-2: 4px;
--size-2-3: 6px;
--size-4-1: 4px;
--size-4-2: 8px;
--size-4-3: 12px;
--size-4-4: 16px;
--size-4-5: 20px;
--size-4-6: 24px;
--size-4-8: 32px;
--size-4-9: 36px;
--size-4-10: 40px;
--size-4-12: 48px;
--size-4-16: 64px;
--size-4-18: 72px;
```

The naming convention: `--size-N-K` ≈ `K * (4/N)px`, so:

- `--size-2-K` is on a 2-base scale: `K * 2`.
- `--size-4-K` is on a 4-base scale: `K * 4`.

---

## 20. Sidebar / Slider / Status bar (`app.css:2664-2706`)

```
--sidebar-markdown-font-size:           calc(var(--font-text-size) * 0.9);   /* → 14.4px */
--sidebar-tab-text-display:             none;
--sidebar-left-toggle-inner-width:      8.33%;
--sidebar-right-toggle-inner-width:     8.33%;
--sidebar-left-toggle-inner-width-open: 24%;
--sidebar-right-toggle-inner-width-open:24%;

--slider-thumb-border-width:  var(--border-width);             /* → 1px */
--slider-thumb-border-color:  var(--background-modifier-border-hover);
--slider-thumb-height:        18px;
--slider-thumb-width:         18px;                            /* macOS overrides to 30px */
--slider-thumb-y:             -6px;
--slider-thumb-radius:        var(--slider-thumb-height);      /* → 18px */
--slider-s-thumb-size:        15px;
--slider-s-thumb-position:    -5px;
--slider-track-background:    var(--background-modifier-border);
--slider-track-height:        3px;

--status-bar-background:    var(--background-secondary);
--status-bar-border-color:  var(--divider-color);
--status-bar-border-width:  var(--border-width) 0 0 var(--border-width);    /* → top + left */
--status-bar-font-size:     var(--font-ui-smaller);            /* → 12px */
--status-bar-text-color:    var(--text-muted);
--status-bar-position:      fixed;
--status-bar-radius:        var(--radius-m) 0 0 0;             /* → 8px tl */

--suggestion-background:      var(--background-primary);
--suggestion-backdrop-filter: none;

/* Sync user avatar palette */
--sync-avatar-color-current-user: transparent;
--sync-avatar-color-1: var(--color-red);
--sync-avatar-color-2: var(--color-orange);
--sync-avatar-color-3: var(--color-yellow);
--sync-avatar-color-4: var(--color-green);
--sync-avatar-color-5: var(--color-cyan);
--sync-avatar-color-6: var(--color-blue);
--sync-avatar-color-7: var(--color-purple);
--sync-avatar-color-8: var(--color-pink);

/* Color input swatches */
--swatch-radius: 14px;
--swatch-height: 22px;
--swatch-width:  22px;
--swatch-shadow: inset 0 0 0 1px rgba(var(--mono-rgb-100), 0.15);
```

---

## 21. Tabs (`app.css:2708-2741`)

```
/* Workspace tabs (top of pane) */
--tab-background-active:                   var(--background-primary);
--tab-text-color:                          var(--text-faint);
--tab-text-color-active:                   var(--text-muted);
--tab-text-color-focused:                  var(--text-muted);
--tab-text-color-focused-active:           var(--text-muted);
--tab-text-color-focused-highlighted:      var(--text-accent);
--tab-text-color-focused-active-current:   var(--text-normal);
--tab-font-size:                           var(--font-ui-small);          /* → 13px */
--tab-font-weight:                         inherit;
--tab-container-background:                var(--background-secondary);
--tab-divider-color:                       var(--background-modifier-border-hover);
--tab-outline-color:                       var(--divider-color);
--tab-outline-width:                       1px;
--tab-curve:                               6px;       /* tab-shape outer-corner radius */
--tab-radius:                              var(--radius-s);                /* → 4px */
--tab-radius-active:                       6px 6px 0 0;
--tab-width:                               200px;
--tab-max-width:                           320px;

/* Mobile tab switcher */
--tab-switcher-menubar-background:        linear-gradient(to top, var(--background-secondary), transparent);
--tab-switcher-background:                var(--background-secondary);
--tab-switcher-preview-radius:            var(--radius-xl);                /* → 16px */
--tab-switcher-preview-background-shadow: 0 4px 30px 2px rgba(0,0,0,0.2);
--tab-switcher-preview-shadow:            0 0 0 1px rgba(var(--mono-rgb-100), 0.05);
--tab-switcher-preview-shadow-active:     0 0 0 2px var(--color-accent);

/* Stacked tabs (vertical title rotation) */
--tab-stacked-pane-width:     700px;
--tab-stacked-header-width:   var(--header-height);    /* → 40px */
--tab-stacked-font-size:      var(--font-ui-small);    /* → 13px */
--tab-stacked-font-weight:    400;
--tab-stacked-text-align:     start;
--tab-stacked-text-transform: rotate(0deg);
--tab-stacked-text-writing-mode: vertical-lr;
--tab-stacked-shadow:         -8px 0 8px 0 rgba(0,0,0,0.05);
```

---

## 22. Tables (`app.css:2743-2780`)

```
--table-background:               transparent;
--table-border-width:             1px;
--table-border-color:             var(--background-modifier-border);
--table-white-space:              break-spaces;
--table-header-background:        var(--table-background);
--table-header-background-hover:  inherit;
--table-header-border-width:      var(--table-border-width);
--table-header-border-color:      var(--table-border-color);
--table-header-font:              inherit;
--table-header-size:              var(--table-text-size);
--table-header-weight:            calc(var(--font-weight) + var(--bold-modifier));    /* → 600 */
--table-header-color:             var(--text-normal);
--table-line-height:              var(--line-height-tight);                            /* → 1.3 */
--table-text-size:                var(--font-text-size);                               /* → 16px */
--table-text-color:               inherit;
--table-column-min-width:         6ch;
--table-column-max-width:         none;
--table-column-alt-background:    var(--table-background);
--table-column-first-border-width:var(--table-border-width);
--table-column-last-border-width: var(--table-border-width);
--table-row-background-hover:     var(--table-background);
--table-row-alt-background:       var(--table-background);
--table-row-alt-background-hover: var(--table-background);
--table-row-last-border-width:    var(--table-border-width);
--table-selection:                hsla(var(--color-accent-hsl), 0.1);
--table-selection-blend-mode:     var(--highlight-mix-blend-mode);
--table-selection-border-color:   var(--interactive-accent);
--table-selection-border-width:   2px;
--table-selection-border-radius:  4px;
--table-cell-vertical-alignment:  top;
--table-drag-handle-background:        transparent;
--table-drag-handle-background-active: var(--table-selection-border-color);
--table-drag-handle-color:             var(--text-faint);
--table-drag-handle-color-active:      var(--text-on-accent);
--table-drop-indicator-half-width:     2px;
--table-add-button-background:         transparent;
--table-add-button-border-width:       var(--table-border-width);
--table-add-button-border-color:       var(--background-modifier-border);
```

---

## 23. Tags (`app.css:2782-2796`)

```
--tag-size:               var(--font-smaller);                /* → 0.875em */
--tag-color:              var(--text-accent);
--tag-color-hover:        var(--text-accent);
--tag-decoration:         none;
--tag-decoration-hover:   none;
--tag-background:         hsla(var(--interactive-accent-hsl), 0.1);
--tag-background-hover:   hsla(var(--interactive-accent-hsl), 0.2);
--tag-border-color:       hsla(var(--interactive-accent-hsl), 0.15);
--tag-border-color-hover: hsla(var(--interactive-accent-hsl), 0.15);
--tag-border-width:       0px;
--tag-padding-x:          0.65em;
--tag-padding-y:          0.25em;
--tag-radius:             2em;
--tag-corner-shape:       round;
--tag-weight:             inherit;
```

---

## 24. Window frame (`app.css:2798-2806`)

```
--traffic-lights-offset-x:        var(--header-height);     /* → 40px (macOS only) */
--traffic-lights-offset-y:        var(--header-height);     /* → 40px */
--titlebar-background:            var(--background-secondary);
--titlebar-background-focused:    var(--background-secondary-alt);
--titlebar-border-width:          0px;
--titlebar-border-color:          var(--background-modifier-border);
--titlebar-text-color:            var(--text-muted);
--titlebar-text-color-focused:    var(--text-normal);
--titlebar-text-weight:           var(--font-bold);                 /* → 700 */
```

---

## 25. Toggles (`app.css:2807-2818`)

```
/* Default (Linux/Windows look) */
--toggle-border-width:    2px;
--toggle-width:           40px;                          /* macOS overrides → 44 */
--toggle-radius:          18px;                          /* macOS overrides → 24 */
--toggle-thumb-color:     white;
--toggle-thumb-radius:    18px;                          /* macOS overrides → 24 */
--toggle-thumb-height:    18px;                          /* macOS overrides → 16 */
--toggle-thumb-width:     18px;                          /* macOS overrides → 26 */

/* Smaller toggle (used inline e.g. settings rows) */
--toggle-s-border-width:  2px;
--toggle-s-width:         34px;                          /* macOS overrides → 36 */
--toggle-s-thumb-height:  15px;                          /* macOS overrides → 12 */
--toggle-s-thumb-width:   15px;                          /* macOS overrides → 20 */
```

`.mod-macos` adds `--toggle-thumb-opacity-active: 0.6` (`app.css:3005`).

---

## 26. Touch targets / Vault profile / Workspace (`app.css:2820-2841`)

```
--touch-size-xxs:  24px;    --touch-radius-xxs: 24px;
--touch-size-xs:   30px;    --touch-radius-xs:  30px;
--touch-size-s:    40px;    --touch-radius-s:   40px;
--touch-size-m:    44px;    --touch-radius-m:   44px;
--touch-size-l:    52px;    --touch-radius-l:   52px;
--touch-size-xl:   60px;    --touch-radius-xl:  60px;

--vault-profile-display:          flex;
--vault-profile-order:            2;
--vault-profile-actions-display:  flex;
--vault-profile-font-size:        var(--font-ui-small);          /* → 13px */
--vault-profile-font-weight:      var(--font-medium);            /* → 500 */
--vault-profile-color:            var(--text-normal);
--vault-profile-color-hover:      var(--vault-profile-color);

--workspace-background-translucent: rgba(var(--mono-rgb-0), 0.6);
                                  /* light: rgba(255,255,255,0.6) | dark: rgba(0,0,0,0.6) */
```

---

## 27. Font face declarations (`app.css:3021-3078`)

```
/* Source Code Pro — 4 faces */
@font-face { font-family: 'Source Code Pro';
             font-weight: normal; font-style: normal;  font-display: swap;
             src: url(public/fonts/70cc7ff27245e82ad414.ttf); }
@font-face { font-family: 'Source Code Pro';
             font-weight: normal; font-style: italic;  font-display: swap;
             src: url(public/fonts/454577c22304619db035.ttf); }
@font-face { font-family: 'Source Code Pro';
             font-weight: bold;   font-style: normal;  font-display: swap;
             src: url(public/fonts/52ac8f3034507f1d9e53.ttf); }
@font-face { font-family: 'Source Code Pro';
             font-weight: bold;   font-style: italic;  font-display: swap;
             src: url(public/fonts/05b618077343fbbd92b7.ttf); }

/* Flow Circular — used by .is-text-garbled (privacy mode) */
@font-face { font-family: 'Flow Circular'; font-display: swap;
             src: url(public/fonts/4bb6ac751d1c5478ff3a.woff2); }

/* Inter Variable */
@font-face { font-family: "Inter"; font-style: normal; font-weight: 100 900; font-display: swap;
             src: url(public/fonts/c504db5c06caaf7cdfba.woff2); }
@font-face { font-family: "Inter"; font-style: italic; font-weight: 100 900; font-display: swap;
             src: url(public/fonts/01dcbad1bac635f9c9cd.woff2); }

/* Sentinel face — registered to '??' so theme overrides resolve to fallback */
@font-face { font-family: '??'; unicode-range: U+0; }
```

The sentinel `'??'` family is intentional. Each user-overridable family name (`--font-interface-override`, `--font-text-override`, `--font-print-override`, `--font-monospace-override`) is initialized to `'??'` (a font that exists but covers no glyphs). When a theme/user has not set an override, the next entry in the font stack is used. The `unicode-range: U+0` means the face matches but provides no glyphs — the renderer falls through to the next family for every codepoint.

```
/* (app.css:3080-3096) */
body {
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
  --font-text-size:          16px;
  --font-mermaid:            var(--font-text);
}
```

---

## 28. macOS overrides (`app.css:2998-3009`)

```
.mod-macos {
  --slider-thumb-width:           30px;
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

There are no `.mod-windows` or `.mod-linux` token overrides in `app.css`; those classes drive selector-based behavior elsewhere.

---

## 29. Iframe color-scheme (`app.css:3011-3013`)

```
iframe { color-scheme: normal; }
```

Iframes (e.g. embeds in editor) explicitly opt out of dark color scheme so unstyled iframe content keeps its own appearance.

---

## 30. Print overrides (`app.css:3015-3019`, `3098-3177`)

`@media print`:

- `.theme-dark { --highlight-mix-blend-mode: darken; }` — invert the blend choice for paper.
- Hide `.titlebar`, `.app-container`, `.progress-bar`, `.popover`, `.markdown-embed-link`, `.suggestion-container`, `.cm-tooltip.cm-tooltip-autocomplete`, `iframe`, `webview`, `::-webkit-scrollbar`, and `body > :not(.print)`.
- `.print .markdown-preview-view { -webkit-print-color-adjust: exact; color: initial; height: unset !important; }`.
- Body falls through to `var(--font-print)` family.

Reproducer: media-query gating must reproduce these rules byte-for-byte. The selector `body > :not(.print)` is essential — print injects a sibling `.print` div that is the only thing rendered.

---

## 31. Body baseline (`app.css:3179-3236`)

```
* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  height: 100%; width: 100%;
  overscroll-behavior: none;
}

body {
  text-rendering:           optimizeLegibility;
  font-family:              var(--font-interface);
  line-height:              var(--line-height-tight);            /* → 1.3 */
  font-size:                var(--font-ui-medium);               /* → 15px */
  background-color:         var(--background-primary);
  color:                    var(--text-normal);
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0);
  overflow: hidden; overflow: clip;
  contain: strict;
  user-select: none;
  -webkit-user-select: none;
  caret-color: var(--caret-color);
}

body.is-translucent { background-color: transparent; }

body [contenteditable="true"], body [contenteditable=""] {
  user-select: text; -webkit-user-select: text;
}

body.is-grabbing,
body.is-grabbing *:not(.workspace-leaf-resize-handle) {
  cursor: grabbing !important;     /* + -moz-/-webkit- prefixes */
}

body.is-grabbing iframe:not(.is-controlled),
body.is-grabbing webview { pointer-events: none; }
```

**Critical reproducer rules:**

- The body is `user-select: none` by default; only contenteditable elements opt back in. This is what makes the entire UI feel "app-like" — text in chrome doesn't accidentally select.
- `contain: strict` on body — viewport-isolated layout. Painting/layout cannot leak outside body.
- `overscroll-behavior: none` — kills rubber-band scrolling at viewport.
- `-webkit-tap-highlight-color: rgba(255,255,255,0)` — kills the iOS tap-flash overlay.

---

## 32. Global keyframes referenced from `body` baseline (`app.css:3209-3217`)

```
@keyframes node-inserted { from { outline-color: #fff; } to { outline-color: #000; } }
.node-insert-event { animation-duration: 0.01s; animation-name: node-inserted; }
```

This is a sentinel: a 0.01s animation that fires on every newly inserted matching node. JavaScript listens for `animationstart` on the root and dispatches initialization for any element with class `node-insert-event`. **Reproducer: subscribe to `animationstart` on the document root and fan out to JS handlers.** This is how Obsidian wires up newly-inserted DOM without per-mutation MutationObserver overhead.

```
.is-flashing {
  transition: color 0.25s ease, background-color 0.25s ease;
  background-color: var(--text-highlight-bg) !important;     /* → rgba(255,208,0,0.4) */
  color: var(--text-normal);
  mix-blend-mode: var(--highlight-mix-blend-mode);
  border-radius: var(--radius-s);                            /* → 4px */
}
```

`.is-flashing` is added to nodes that should briefly highlight (block-link target hit, search result jump). 250ms ease in, 250ms ease out (when the class is removed JS).

---

## 33. App-container baseline (`app.css:3256-3284`)

```
.app-container {
  display:        flex;
  height:         100%;
  width:          100%;
  flex-direction: column;
}
.app-container.no-transition * { transition: none !important; }
.app-container.mod-loading .clickable-icon { pointer-events: none; touch-action: none; }
.app-container.mod-loading .view-header .loader-spinner {
  --icon-size:   var(--icon-l);
  --icon-stroke: var(--icon-l-stroke-width);
  margin: var(--size-4-3) var(--size-4-2);
}
.app-container.mod-loading .view-header .loader-spinner svg {
  animation: spin 0.9s ease infinite;
}
body:not(.is-mobile) .app-container { position: relative; }

.horizontal-main-container {
  width: 100%;
  display: flex;
  overflow: hidden;
  flex: 1 0 0;
}

:focus { outline: none; }            /* default focus ring suppressed; components draw their own */
```

**Reproducer rule:** the entire desktop app structure is a single `.app-container` (flex column) containing — in order — `.titlebar`, `.horizontal-main-container` (flex row growing to remaining height), and the status-bar (positioned). The `.horizontal-main-container` holds `.workspace-ribbon`, the workspace, and any docked sidebars. See `app-shell.md`.

---

## 34. The garbled-text mode (`app.css:3297-3300`)

```
.is-text-garbled * {
  font-family: 'Flow Circular', sans-serif !important;
  line-height: 1.45em !important;
}
```

When body has `is-text-garbled`, every descendant uses the Flow Circular font (a font of looping abstract glyphs). This is the **screenshot-safe / privacy mode** for streaming demos. Toggleable from the command palette.

---

## 35. Token usage rules for reproducers

When reproducing a component:

- **Always** read the relevant token, never copy a derived hex into a selector.
- **Always** keep the resolution chain. For example, the file explorer hover background must be written as `var(--nav-item-background-hover)`, which itself resolves to `var(--background-modifier-hover)`, which resolves to `rgba(var(--mono-rgb-100), 0.067)`. Cutting the chain breaks themability.
- **RGB-triplet variants** exist (e.g. `--color-red-rgb`) so opacity can be applied at use-site via `rgba(var(--color-red-rgb), 0.4)`. Use them whenever the design calls for an alpha variant.
- **HSL accent** is split into `--accent-h`, `--accent-s`, `--accent-l` so the user's accent picker only writes those three. Derived stops `--color-accent`, `-1`, `-2` recompute automatically. Never inline a derived accent stop.

---

End of design tokens. Component specs reference these by name throughout.
