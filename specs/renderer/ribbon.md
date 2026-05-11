# Ribbon

> The 44 px-wide left-edge column of action icons. Documented in full in [`app-shell.md`](app-shell.md) §7.

Source: `renderer/app.css:4691-4760`. Tokens: see [`design-tokens.md`](design-tokens.md) §18.

---

## 1. Cross-reference

- **Container** (`.workspace-ribbon.mod-left`): see `app-shell.md` §7.1.
- **Header gap** (`.workspace-ribbon.mod-left:before`): see `app-shell.md` §7.2.
- **Visibility** (`body:not(.show-ribbon)`, `.is-collapsed`): see `app-shell.md` §7.3.
- **Sidebar toggle** (`.sidebar-toggle-button`): see `app-shell.md` §7.4 and [`tabs.md`](tabs.md) §11.
- **Action lists** (`.side-dock-actions`, `.side-dock-settings`): see `app-shell.md` §7.5.
- **Translucent override**: see `app-shell.md` §7.6.

---

## 2. Quick token reference

```
--ribbon-background:           var(--background-secondary)
--ribbon-background-collapsed: var(--background-primary)
--ribbon-width:                44px
--ribbon-padding:              var(--size-4-2) var(--size-4-1) var(--size-4-3)   /* 8px 4px 12px */
```

Ribbon items are `.side-dock-ribbon-action` — `.clickable-icon`s with `--icon-size: var(--icon-l)` (18 px). See [`buttons.md`](buttons.md) §2.5.

The ribbon is `display: none` when `body` lacks `.show-ribbon`; in that case `--ribbon-width: 0px` so the workspace flex layout collapses correctly.

See [`app-shell.md`](app-shell.md) §7 for the full geometry, transition behavior, and translucent-mode handling.
