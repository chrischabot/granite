# View — Backlinks & Outgoing Links

> Two paired sidebar panes built on the same chrome:
>
> - **Backlinks** (`.backlink-pane`) — files that link **to** the current note. Includes both linked mentions and unlinked mentions.
> - **Outgoing links** (`.outgoing-link-pane`) — files the current note links **out to**.
>
> Plus the **embedded backlinks** (`.embedded-backlinks`) section that appears at the bottom of a note's reading view when the user has it enabled.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css:14993-15102`.

---

## 1. DOM scaffold

```
.workspace-leaf-content[data-type="backlink"] / [data-type="outgoing-link"]
  └─ .view-content
       └─ .backlink-pane / .outgoing-link-pane
            ├─ .nav-header
            │    └─ .search-input-container       ← optional filter input
            ├─ .tree-item-self                     ← "Linked mentions" / "Unlinked mentions" section header
            ├─ .search-result-container            ← matches grouped by file
            │    └─ … (uses same .search-result chrome as global search) …
            └─ .tree-item-self                     ← "Unlinked mentions" header
                 └─ .search-result-container
```

The pane reuses the **search-result** primitives (`.search-result`, `.search-result-file-matches`, `.search-result-file-match`, `.search-result-file-matched-text`) from `view-search.md`.

---

## 2. Both panes — shared shell (`app.css:14993-15054`)

```css
.outgoing-link-pane { padding-top: var(--size-4-3); }   /* 12px top */
.backlink-pane     { padding-top: var(--size-4-1); }    /* 4px top — backlinks have more content */

.backlink-pane,
.outgoing-link-pane {
  overflow-y: auto;
  flex: 1 0 0;
  padding-inline-start: var(--size-4-3);                 /* 12px */
  padding-inline-end:   var(--size-4-3);
  padding-bottom: max(var(--safe-area-inset-bottom), var(--size-4-8));
                                                          /* 32px or iOS safe-area */
}

.backlink-pane .search-result-container,
.outgoing-link-pane .search-result-container {
  padding: var(--size-4-1) 1px var(--size-4-4);          /* 4px 1px 16px */
}
```

Each pane is a flex-grow scrollable column. The 1 px horizontal padding on the result-container leaves room for keyboard-focus rings (`.has-focus` 2 px box-shadow) without horizontal clipping.

### 2.1 Section headers (`app.css:15018-15054`)

```css
.backlink-pane > .tree-item-self,
.outgoing-link-pane > .tree-item-self {
  color: var(--nav-heading-color);                /* --text-normal */
  padding-inline-start: var(--size-4-2);           /* 8px */
}
.backlink-pane > .tree-item-self .tree-item-inner,
.outgoing-link-pane > .tree-item-self .tree-item-inner {
  font-weight: var(--nav-heading-weight);         /* 500 */
}

.backlink-pane > .tree-item-self.is-clickable.is-collapsed,
.outgoing-link-pane > .tree-item-self.is-clickable.is-collapsed {
  color: var(--nav-heading-color-collapsed);      /* --text-faint */
}

@media (hover: hover) {
  .backlink-pane > .tree-item-self.is-clickable.is-collapsed:hover,
  .outgoing-link-pane > .tree-item-self.is-clickable.is-collapsed:hover {
    color: var(--nav-heading-color-collapsed-hover);   /* --text-muted */
  }
}

.backlink-pane > .tree-item-self .collapse-icon,
.outgoing-link-pane > .tree-item-self .collapse-icon {
  display: none;                                   /* no caret on the section headers */
}

@media (hover: hover) {
  .backlink-pane > .tree-item-self:hover,
  .outgoing-link-pane > .tree-item-self:hover {
    color: var(--nav-heading-color-hover);        /* --text-normal */
    font-weight: var(--nav-heading-weight-hover); /* 500 */
  }
}
```

The two top-level rows ("Linked mentions" / "Unlinked mentions") are styled as `.tree-item-self` headers — bold (500), normal-color when expanded, faint when collapsed (no caret displayed; the row itself is the toggle).

---

## 3. Embedded backlinks (`app.css:15057-15102`)

The compact backlinks section at the bottom of a note's reading view:

```css
.embedded-backlinks {
  border-top: 1px solid var(--background-modifier-border);
}

.markdown-preview-view .embedded-backlinks {
  margin-top: 3em;
}

.embedded-backlinks .backlink-pane {
  padding: 0;
}

.embedded-backlinks .backlink-pane .search-empty-state,
.embedded-backlinks .backlink-pane .tree-item-self {
  font-size: max(var(--font-ui-small), var(--font-smaller));
                                                  /* whichever is larger */
  align-items: center;
}

.embedded-backlinks .backlink-pane > .tree-item-self {
  font-size: max(var(--font-ui-small), 1em);
  width: fit-content;
}

.embedded-backlinks .backlink-pane > .tree-item-self .tree-item-inner {
  margin-inline-end: var(--size-2-3);              /* 6px */
}

.embedded-backlinks .backlink-pane .tree-item-flair {
  font-size: max(var(--font-ui-small), var(--font-smallest));
}

.embedded-backlinks .nav-header {
  padding: var(--size-4-3) 0 0 0;                  /* 12px top */
  position: relative;
}
```

The `font-size: max(...)` pattern picks whichever of two tokens is larger — defensive in case `--font-ui-small` is overridden smaller than the relative em-token. The embedded version:
- Has a 1 px top divider above it.
- Leaves 3 em margin-top so it stands clearly apart from the note content.
- Drops the pane's outer padding (the parent reading view supplies it).
- Shrinks per-result text to mix UI-size and em-relative size.

---

## 4. State summary

| Class | Effect |
| --- | --- |
| (base) on `.backlink-pane`/`.outgoing-link-pane` | scrollable, 12 px sides, ≥ 32 px bottom |
| `.tree-item-self` direct child of pane | section header — 500 weight, no caret |
| `.tree-item-self.is-collapsed` direct child | faint color, hover lifts to muted |
| nested `.tree-item` (file rows) | use standard tree-item rules from `tree-item.md` |
| `.search-result-file-match` inside | use search-result rules from `view-search.md` |
| `.embedded-backlinks` wrapper | bottom-of-page section in reading view |

---

## 5. Reproducer build order

1. The two pane types **share** chrome — one CSS rule for both. Differ only in `padding-top`: backlinks 4 px, outgoing 12 px.
2. Re-use the search-result chrome (snippet cards, match highlights) for the actual results — see `view-search.md` §3.
3. Section headers ("Linked mentions" / "Unlinked mentions") are `.tree-item-self` direct children of the pane. They get heading-weight (500), no visible caret.
4. The `.embedded-backlinks` variant strips the pane's outer padding, gets a 1 px top divider, sits 3em below content. Nested fonts use `max(--font-ui-small, --font-smaller)` to keep readability under theme overrides.
5. Each pane's content is `flex: 1 0 0` — fills the leaf height and scrolls.
6. iOS safe-area at the bottom: `padding-bottom: max(--safe-area-inset-bottom, 32px)`.
