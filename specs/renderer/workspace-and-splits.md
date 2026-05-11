# Workspace and Splits

> The leaf, split, and workspace layout primitives. Documented in full in [`app-shell.md`](app-shell.md) §8 and §9.

Source: `renderer/app.css:6398-6610`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. Cross-reference

- **`.workspace`**: see `app-shell.md` §8.1.
- **`.workspace-split`** + `.mod-vertical/-horizontal/-root/-left-split/-right-split`: see `app-shell.md` §8.2.
- **`.workspace-leaf`** + `.is-highlighted` + `contain: strict`: see `app-shell.md` §9.1.
- **Resize handles** (`.workspace-leaf-resize-handle`): see `app-shell.md` §9.2.
- **Drop overlays** (`.workspace-drop-overlay`, `.workspace-fake-target-overlay`, `.workspace-fake-target-container`): see `app-shell.md` §9.3 and [`drag-and-drop.md`](drag-and-drop.md) §2.
- **`.workspace-leaf-content`** + `data-type` selectors: see `app-shell.md` §10.
- **`.workspace-tabs`** + `.mod-stacked`: see [`tabs.md`](tabs.md) §3 and §10.
- **`.workspace-sidedock-empty-state`**: see `app-shell.md` §9.

---

## 2. Tree summary

```
.app-container
  └─ .horizontal-main-container
       ├─ .workspace-ribbon.mod-left
       └─ .workspace
            └─ .workspace-split.mod-root
                 ├─ .workspace-split.mod-left-split
                 │    └─ .workspace-tabs
                 │         └─ .workspace-leaf …
                 ├─ (root content tree of nested splits / tabs / leaves)
                 └─ .workspace-split.mod-right-split
                      └─ .workspace-tabs
                           └─ .workspace-leaf …
```

Three top-level splits inside `.mod-root`: left sidebar, root content, right sidebar. The root content can be arbitrarily nested via `.workspace-split.mod-vertical` (row) and `.mod-horizontal` (column).

---

## 3. Quick reference

- `.workspace`: `display: flex; flex: 1 0 0; transition: padding-left 100ms ease-in`.
- `.workspace-split`: `display: flex; background-color: var(--tab-container-background)` (sidebar) or `var(--background-primary)` (root).
- `.workspace-split.mod-vertical > *`: `flex: 1 0 0; width: 0` so children share row space evenly.
- `.workspace-split.mod-horizontal > *`: `flex: 1 0 0; height: 0` for column space.
- `.workspace-split.mod-left-split` / `.mod-right-split`: `flex: 0 0 auto` so they don't grow with the workspace.
- `.workspace-leaf`: `contain: strict !important; isolation: isolate` — every leaf is its own layout/paint boundary and stacking context.
- Resize handles: 3 px hit-region with 1 px visible divider, `transition: background-color 200ms ease-in-out`.

See [`app-shell.md`](app-shell.md) §8-§9 for the full geometry and modifier semantics.
