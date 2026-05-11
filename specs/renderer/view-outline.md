# View — Outline

> The sidebar pane that lists the headings of the currently active markdown note as a nested tree. Click a heading to jump to it.

Source: `renderer/app.css`. Built almost entirely on `.tree-item` primitives. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. DOM scaffold

```
.workspace-leaf-content[data-type="outline"]
  └─ .view-content
       └─ .outline                           ← top-level container
            └─ .tree-item [.is-collapsed]   ← one per heading
                 ├─ .tree-item-self.is-clickable [.is-active]
                 │    ├─ .collapse-icon       (only when has nested headings)
                 │    └─ .tree-item-inner
                 │         └─ .tree-item-inner-text   ← the heading's text
                 └─ .tree-item-children
                      └─ .tree-item …        (recurse for sub-headings)
```

There is no bespoke styling for the outline beyond what `.tree-item-self` provides. The tree's nesting depth maps directly to heading levels: `<h1>` is depth 0, `<h2>` is depth 1, etc.

---

## 2. Heading-level visual hint

Outline rows do not have explicit per-level coloring or sizing in the default theme — they all use `.tree-item-self` chrome. Themes can add per-level styling via attribute selectors like `[data-level="2"]` if JS exposes them.

The active heading (the one currently visible / nearest the viewport top) gets `.is-active` — `--text-normal` color + `--background-modifier-hover` fill (per `tree-item.md` §2.1).

---

## 3. Sticky update

JS updates the `.is-active` row as the user scrolls the editor — the heading whose section is currently in view (or at the top of the viewport) becomes active. This produces a "live tracker" feel: the outline highlights what the user is reading.

---

## 4. Indent geometry

Each level of nesting uses `.tree-item-children` indentation (12 px margin + 4 px padding + 1 px guide line — see `tree-item.md` §6). Heading levels map 1:1 to indent levels.

---

## 5. Reproducer build order

1. The outline is a tree of `.tree-item` rows. Each `.tree-item-self` is `.is-clickable` and clicking jumps to the heading.
2. JS tracks the active heading and toggles `.is-active` accordingly.
3. Indent geometry is provided by `tree-item.md` rules — no outline-specific CSS.
4. The pane reuses `.nav-header` for any optional filter input at the top.
5. There is no special view-specific selector — `.outline` is the only specific class, used as the outer wrapper.
