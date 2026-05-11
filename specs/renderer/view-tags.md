# View — Tags

> The sidebar pane that lists every tag in the vault, grouped hierarchically (e.g. `#project/work` nests under `#project`), with a count of files using each tag.

Source: `renderer/app.css:18928-18959`, plus shared tree-item primitives. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. DOM scaffold

```
.workspace-leaf-content[data-type="tag"]
  └─ .view-content
       ├─ .nav-header
       │    └─ .search-input-container          ← filter tags
       └─ .tag-container
            └─ .tree-item
                 ├─ .tree-item-self.tag-pane-tag (.is-active …)
                 │    ├─ .collapse-icon          (only on parent tags)
                 │    ├─ .tree-item-icon         ← optional tag icon
                 │    ├─ .tree-item-inner
                 │    │    ├─ .tag-pane-tag-parent   ← parent prefix (hidden in nested children)
                 │    │    └─ .tag-pane-tag-text     ← the tag text
                 │    └─ .tag-pane-tag-count        ← count of files using this tag
                 └─ .tree-item-children
                      └─ .tree-item.tag-pane-tag …    (recurse)
```

---

## 2. `.tag-container` (`app.css:18945-18950`)

```css
.tag-container {
  font-size: var(--font-ui-small);                    /* 13px */
  padding: var(--size-4-3) var(--size-4-3) var(--size-4-8);
                                                       /* 12px sides + top, 32px bottom */
  padding-bottom: max(var(--safe-area-inset-bottom), var(--size-4-8));
  overflow: auto;
}
```

Standard scrollable column with iOS safe-area awareness. 13 px font (UI-small) for compact list display.

---

## 3. `.tag-pane-tag` (`app.css:18928-18943`)

```css
.tag-pane-tag.is-active {
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);                       /* white */
}

.tag-pane-tag.is-active .tag-pane-tag-count {
  background-color: var(--background-modifier-hover);
  color: var(--text-normal);
}

@media (hover: hover) {
  .tag-pane-tag.is-active:hover {
    background-color: var(--interactive-accent);     /* same — don't change on hover */
    color: var(--text-on-accent);
  }
}

.tree-item-children .tag-pane-tag .tag-pane-tag-parent {
  display: none;                                       /* hide parent prefix in nested rows */
}

body:not(.is-phone) .workspace-leaf.mod-active .tree-item.has-focus > .tag-pane-tag {
  border-radius: var(--radius-s);                     /* 4px */
  box-shadow: 0 0 0 2px var(--background-modifier-border-focus);
                                                       /* 2px outer focus ring */
}
```

Reproducer rules:
- Active tag (currently filtered): solid accent background with white text. Hover keeps the same — the accent fill IS the active marker.
- The tag count (small badge on the right) inverts when its parent is active: gets `--background-modifier-hover` background and `--text-normal` text — readable as a contrast pill against the accent.
- Inside `.tree-item-children` (nested tags), `.tag-pane-tag-parent` is hidden — children show only the leaf segment of the tag (e.g. `#project/work` shows as `work` when nested under `#project`).
- Keyboard focus uses 2 px gray outer ring + 4 px radius.

---

## 4. The count badge — `.tag-pane-tag-count`

The count is a small UI element on the right side of each tag row. By default it inherits the tree-item-flair styling (see `tree-item.md` §4) — `--text-faint` on base, `--text-muted` on hover. When the parent `.tag-pane-tag` is `.is-active`, the count gets its inverted appearance (per the rule above).

---

## 5. Reproducer build order

1. The tags pane is a `.tag-container` with `font-size: 13px; padding: 12px 12px 32px`. Scrollable.
2. Each tag is a `.tree-item.tag-pane-tag` — uses standard tree-item chrome.
3. Nested tags (children of a parent tag) hide their `.tag-pane-tag-parent` prefix span — JS renders the prefix in the DOM but CSS suppresses its display via the `.tree-item-children .tag-pane-tag .tag-pane-tag-parent { display: none }` selector.
4. Active tag: solid `--interactive-accent` background, white text. The count badge inverts — `--background-modifier-hover` bg with `--text-normal` text — to remain legible.
5. Hover doesn't lighten the active state.
6. Keyboard focus: 2 px box-shadow ring with 4 px radius.
7. Filter input at the top filters the list — uses `.search-input-container` (see `view-search.md` §2).
