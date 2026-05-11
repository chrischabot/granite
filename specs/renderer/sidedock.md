# Sidedock

> The left and right sidebar containers. The "sidedock" terminology refers to the docked sidebar panels that hold trees, search, and other panes.

Source: `renderer/app.css`. Most rules live in [`app-shell.md`](app-shell.md), [`tabs.md`](tabs.md) (sidebar tabs), and [`view-file-explorer.md`](view-file-explorer.md) (the most common content).

---

## 1. Containers

```
.workspace-split.mod-left-split [.is-sidedock-collapsed]
  ├─ .workspace-tabs                               ← order: 2 (rendered second)
  │    ├─ .workspace-tab-header-container
  │    │    └─ .workspace-tab-header (.is-active)
  │    └─ .workspace-leaf
  │         └─ .workspace-leaf-content[data-type="…"]
  └─ .workspace-sidedock-vault-profile             ← order: 1 (rendered third due to flex order)
       (vault name + switcher chevron)
```

Same structure on the right (`.mod-right-split`) but without the vault profile (only the left sidebar has the profile).

---

## 2. Cross-reference

- **`.workspace-split.mod-left-split` / `.mod-right-split`**: see [`app-shell.md`](app-shell.md) §8.
- **Sidebar tabs (icon-only)**: see [`tabs.md`](tabs.md) §7.
- **Vault profile**: see [`app-shell.md`](app-shell.md) §13.
- **`.workspace-sidedock-empty-state`** (when no panes are pinned): see [`app-shell.md`](app-shell.md) §9.
- **Resize handle** (vertical, on the inner edge of each sidebar): see [`app-shell.md`](app-shell.md) §9.2.

---

## 3. `.workspace-sidedock-empty-state` (`app.css:6954-6957`)

```css
.workspace-sidedock-empty-state {
  font-size: var(--font-ui-small);   /* 13px */
  padding: 20px 30px;
}
```

Shown when a sidedock has no pinned panes — a simple 13 px text message at 20 × 30 px padding.

---

## 4. Sidebar visibility states

The workspace gains classes to track sidebar state:

- `.is-left-sidedock-open` — left sidebar is expanded.
- `.is-right-sidedock-open` — right sidebar is expanded.
- `.workspace-split.mod-left-split.is-sidedock-collapsed` — sidebar is collapsed.
- `.workspace-split.mod-right-split.is-sidedock-collapsed` — sidebar is collapsed.

JS animates the split's `flex-basis` between 0 and the user's saved width.

The sidebar-toggle-button SVG inner-rectangle width animates between `8.33%` (closed) and `24%` (open) — see `tabs.md` §11.

---

## 5. Reproducer build order

1. Sidebars are top-level children of `.workspace-split.mod-root`. Use `.mod-left-split` / `.mod-right-split`.
2. Each contains `.workspace-tabs` (the icon-only tab strip + active leaf) and (left only) `.workspace-sidedock-vault-profile` (the vault switcher).
3. JS sets `.is-sidedock-collapsed` to hide and `flex-basis: 0` for animation.
4. The toggle button (in the ribbon for left, in the workspace tab header for right) toggles state and animates the SVG inner rectangle width.
5. When collapsed in translucent mode, the sidebar contents become `visibility: hidden` (kept in DOM for re-show) — see `app-shell.md` §8.3.
6. The empty state is `13px / 20px 30px` — used when no panes are pinned to the sidedock.
