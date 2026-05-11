# View — Outgoing Links

> The sidebar pane that shows the links going **out** from the current note. Sibling to backlinks.

Documented in full in [`view-backlinks.md`](view-backlinks.md) — outgoing-links and backlinks share the chrome.

Source: `renderer/app.css:14993-15054`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. Cross-reference

The two pane types share **all** their CSS — they differ only in JS data sourcing (which links to show) and in the `padding-top` value:

```css
.outgoing-link-pane { padding-top: var(--size-4-3); }   /* 12px */
.backlink-pane     { padding-top: var(--size-4-1); }    /* 4px — backlinks have more content */

.backlink-pane,
.outgoing-link-pane {
  overflow-y: auto;
  flex: 1 0 0;
  padding-inline-start: var(--size-4-3);
  padding-inline-end:   var(--size-4-3);
  padding-bottom: max(var(--safe-area-inset-bottom), var(--size-4-8));
}
```

See [`view-backlinks.md`](view-backlinks.md) §2 for the full chrome and section-header styling.

---

## 2. DOM scaffold

```
.workspace-leaf-content[data-type="outgoing-link"]
  └─ .view-content
       └─ .outgoing-link-pane
            ├─ .nav-header
            ├─ .tree-item-self                    ← "External links" / "Unresolved links" section
            ├─ .search-result-container
            └─ … more sections …
```

Reuses the same `.search-result-*` chrome from `view-search.md` for individual matches.

---

## 3. Reproducer build order

Identical to `view-backlinks.md` — see that file for full details. The only difference is `padding-top: 12px` (vs backlinks' 4 px) and the JS that populates content from the current note's outgoing links rather than incoming ones.
