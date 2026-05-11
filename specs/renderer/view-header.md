# View Header

> The 40 px chrome strip above each workspace leaf — shows the file/view title, breadcrumbs, and per-view action buttons. Documented in full in [`app-shell.md`](app-shell.md) §11.

Source: `renderer/app.css:4449-4565`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. Cross-reference

- **Container** (`.view-header`): see `app-shell.md` §11.1.
- **Title content** (`.view-header-left`, `.view-header-title-container`, `.view-header-title-parent`, `.view-header-breadcrumb`, `.view-header-breadcrumb-separator`, `.view-header-title`): see `app-shell.md` §11.2.
- **`.view-content`**: see `app-shell.md` §11.3.
- **Nav buttons** (`.view-header-nav-buttons`): see `app-shell.md` §11.4.
- **Highlighted state** (`.is-highlighted`): see `app-shell.md` §11.1.
- **Sidebar leaves hide their header**: see `app-shell.md` §11.1.
- **Webviewer overrides**: see [`view-webviewer.md`](view-webviewer.md) §4.

---

## 2. Quick layout reference

```
.view-header                                            ← 40px tall, padding 0 12px
  ├─ .view-header-left                                  ← icons, nav buttons
  ├─ .view-header-title-container                       ← centered breadcrumb + title
  │    ├─ .view-header-title-parent                     ← breadcrumb chain
  │    │    ├─ .view-header-breadcrumb                  ← clickable segment
  │    │    └─ .view-header-breadcrumb-separator        ← "/" separator
  │    └─ .view-header-title                            ← file name
  └─ .view-actions                                      ← right-side action buttons
```

---

## 3. Quick token reference

```
--header-height:                  40px
--file-header-font:               var(--font-interface)
--file-header-font-size:          var(--font-ui-small)        /* 13px */
--file-header-font-weight:        400
--file-header-background:         var(--background-primary)
--file-header-background-focused: var(--background-primary)
--file-header-border:             var(--border-width) solid transparent
--file-header-justify:            center
```

Title is centered horizontally, 13 px regular, transparent border (themes can override).

When `body.is-focused` AND the leaf is `.mod-active`, the title color brightens from `--text-muted` to `--text-normal`. The view-header's background also swaps to `--file-header-background-focused` (which defaults to the same as base — themes can differentiate).

Sidebar leaves (`.mod-left-split`, `.mod-right-split`) explicitly hide their `.view-header` (`display: none`) — only main-area leaves show the header.

Phone hides the header by default unless `body.show-view-header` is set.

See [`app-shell.md`](app-shell.md) §11 for the full ruleset including `:focus-within` rename behavior, breadcrumb hover states, and ellipsis logic.
