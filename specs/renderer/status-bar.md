# Status Bar

> The floating bottom-right capsule showing word counts, sync status, plugin indicators. Documented in full in [`app-shell.md`](app-shell.md) §12.

Source: `renderer/app.css:6045-6127`. Tokens: see [`design-tokens.md`](design-tokens.md) §20.

---

## 1. Cross-reference

- **Container** (`.status-bar`): see `app-shell.md` §12.1.
- **Items** (`.status-bar-item`, `.mod-clickable`, `.plugin-editor-status`, `.plugin-sync`): see `app-shell.md` §12.2.
- **Empty items hidden**: see `app-shell.md` §12.2.
- **Screenshot mode hides bar**: see `app-shell.md` §12.1.

---

## 2. Quick token reference

```
--status-bar-background:    var(--background-secondary)
--status-bar-border-color:  var(--divider-color)
--status-bar-border-width:  var(--border-width) 0 0 var(--border-width)   /* top + left only */
--status-bar-font-size:     var(--font-ui-smaller)                         /* 12px */
--status-bar-text-color:    var(--text-muted)
--status-bar-position:      fixed
--status-bar-radius:        var(--radius-m) 0 0 0                           /* 8px tl only */
```

The status bar is **floating** — `position: fixed; bottom: 0; right: 0`. Only its top and left edges have a 1 px border, and only its top-left corner is rounded (8 px). This produces the characteristic "tab" silhouette that hangs off the bottom-right of the window.

Z-index is `--layer-status-bar` (15) — sits above leaf content but below modals.

`font-variant-numeric: tabular-nums` ensures number displays (word counts, etc.) don't shift width as values change.

See [`app-shell.md`](app-shell.md) §12 for the full layout, item structure, and segment behavior.
