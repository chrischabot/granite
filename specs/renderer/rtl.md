# RTL — `.mod-rtl` and `.is-rtl`

> When the user's interface language is right-to-left (Arabic, Hebrew, Persian, etc.), `<body>` gains `.mod-rtl` and individual content elements gain `.is-rtl` (or `dir="rtl"`).

Source: `renderer/app.css:4818+` (RTL section), plus scattered `unicode-bidi: plaintext` rules. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. The `.mod-rtl` body class (`app.css:4933-5024`)

```css
.mod-rtl {
  --tab-stacked-text-transform: rotate(180deg);   /* stacked tabs read top-to-bottom in RTL */
}

.mod-rtl.is-mobile {
  --nav-item-padding: var(--size-2-3) var(--size-4-6) var(--size-2-3) var(--size-4-2);
                                                    /* swap padding for RTL mobile nav */
}

/* Some surfaces stay LTR even in RTL UI */
.mod-rtl .community-modal-readme,
.mod-rtl .canvas-wrapper {
  direction: ltr;
}

/* Force RTL on UI elements */
.mod-rtl .workspace-sidedock-vault-profile,
.mod-rtl .modal,
.mod-rtl .notice,
.mod-rtl .prompt,
.mod-rtl .titlebar,
.mod-rtl .tooltip,
.mod-rtl .workspace-tab-container,
.mod-rtl .workspace-tab-header-container,
.mod-rtl .workspace-drawer,
.mod-rtl .mobile-navbar-actions,
.mod-rtl .status-bar,
.mod-rtl .suggestion-container,
.mod-rtl .menu,
.mod-rtl .bases-toolbar-menu,
.mod-rtl .popover {
  direction: rtl;
}

.mod-rtl .workspace-tab-header-inner-title,
.mod-rtl .setting-item-description,
.mod-rtl .setting-item-name,
.mod-rtl input {
  text-align: right;
}

/* Sidebar toggle order swap — sidebar tab icons reverse so toggles must reverse too */
.mod-rtl .sidebar-toggle-button { order: 2; }
.mod-rtl .sidebar-toggle-button.mod-right { order: -1; }

.mod-rtl .canvas-card-menu {
  flex-direction: row-reverse;
}

.mod-rtl .workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container {
  flex-direction: row-reverse;
}

.mod-rtl .workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header-inner {
  flex-direction: row-reverse;
}

.mod-rtl .search-input-container:before,
.mod-rtl .checkbox-container {
  transform: scale(-1, 1);
}
```

`.mod-rtl` does not set `direction: rtl` on `<body>` (which would affect everything). Instead, it explicitly RTLs only chrome surfaces (modals, menus, popovers, status bar, tab containers, etc.) — leaving content surfaces (canvas, community readme) in LTR so they continue to make spatial sense.

---

## 2. Icon mirroring (`app.css:5009-5024`)

```css
.mod-rtl svg.svg-icon:not(.check-small,
  .lucide-binary,
  .lucide-check,
  .lucide-check-square,
  .lucide-clock,
  .lucide-code-2,
  .lucide-square-function,
  .lucide-timer,
  .sidebar-toggle-button-icon) {
  transform: scale(-1, 1);                          /* horizontal flip */
}

[lang="he"] svg.svg-icon:is(.lucide-help-circle, .help) {
  transform: scale(1, 1);                            /* Hebrew exception — circle icons NOT flipped */
}
```

Most directional icons (arrows, chevrons, etc.) are horizontally flipped in RTL. Specific icons that have intrinsic meaning regardless of direction (checkmarks, clocks, code symbols) are excluded.

The Hebrew (`lang="he"`) exception un-flips help/help-circle icons — apparently Hebrew speakers prefer them un-flipped.

---

## 3. Logical properties

The codebase consistently uses **CSS logical properties** (`inset-inline-start`, `inset-inline-end`, `margin-inline-*`, `padding-inline-*`, `border-inline-*`) instead of `left`/`right` versions. These automatically flip in RTL contexts where `direction: rtl` is set.

This means most components don't need explicit RTL overrides — they "just work" because their CSS uses logical properties.

---

## 4. `unicode-bidi: plaintext` (`app.css:4791-4814`)

```css
.bases-toolbar-result-count,
.community-item-desc,
.community-modal-info-desc,
.community-modal-search-summary,
.inline-title, .inline-title h1,
.metadata-property-key-input,
.metadata-input-longtext,
.multi-select-pill-content,
.nav-file-title-content,
.nav-folder-title-content,
.search-result-file-match,
.setting-item-description,
.setting-item-name,
.suggestion-title,
.bases-table-header-name,
.table-cell-wrapper,
.titlebar-text,
.tooltip,
.tree-item-inner,
.view-header-breadcrumb,
.view-header-title,
.workspace-tab-header-inner-title { unicode-bidi: plaintext; }
```

Every element that displays user content (filenames, titles, tag values, etc.) gets `unicode-bidi: plaintext`. This makes the **paragraph-level direction be auto-detected from the content**, regardless of the surrounding UI direction. So a Hebrew file name will display RTL even if the UI is LTR, and vice versa.

This is the load-bearing rule for mixed-language vault support.

---

## 5. Callout direction (`app.css:4913-4930`)

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

Callouts use `:has(:dir(rtl))` to detect when their title is RTL and flip the entire callout to RTL — independent of the surrounding UI direction. The icon is mirrored. Each callout in a nested set is detected independently.

---

## 6. Markdown-rendered RTL (`app.css:4670-4673`)

```css
.markdown-rendered.rtl { direction: rtl; }
```

Markdown notes can be RTL via the `rtl` class on `.markdown-rendered` (set per-note based on a frontmatter setting or auto-detection).

---

## 7. The `--direction` token

When directional flipping is needed in calculations (e.g. transform rotations), `--direction` is set:

- LTR: `--direction: 1`
- RTL: `--direction: -1`

Example use: `.collapse-icon.is-collapsed svg.svg-icon { transform: rotate(calc(var(--direction) * -1 * 90deg)); }` — rotates -90° in LTR (caret points right) or +90° in RTL (caret points left).

---

## 8. Reproducer build order

1. Use **CSS logical properties everywhere**: `inset-inline-start/end`, `margin-inline-start/end`, etc. Avoid `left`/`right` except where physical direction is genuinely needed.
2. `.mod-rtl` body class explicitly sets `direction: rtl` on chrome surfaces (modals, menus, etc.) but **not** on body itself.
3. Apply `unicode-bidi: plaintext` to every user-content element so individual paragraphs auto-detect direction.
4. Mirror most directional icons in RTL via `transform: scale(-1, 1)`. Exclude icons with intrinsic non-directional meaning (check, clock, etc.).
5. Hebrew has a specific un-flip rule for help-circle icons.
6. Callouts detect their own direction via `:has(:dir(rtl))` — independent flipping.
7. Set `--direction: 1` or `-1` on body or affected ancestors so calc-based rotations work.
8. Markdown notes can opt into RTL via `<div class="markdown-rendered rtl">`.
9. Some surfaces stay LTR regardless of UI direction: canvas (spatial), community-readme (rendered markdown imported from external repos that assume LTR).
