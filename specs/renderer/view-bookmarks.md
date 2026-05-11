# View — Bookmarks

> The sidebar pane that lists user-pinned files, folders, headings, blocks, searches, and groups. Built almost entirely on `.tree-item` primitives.

Source: `renderer/app.css`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. DOM scaffold

```
.workspace-leaf-content[data-type="bookmarks"]
  └─ .view-content
       ├─ .nav-header
       │    ├─ .nav-buttons-container          ← "New bookmark", "New group", search, sort, more
       │    └─ .search-input-container          ← optional filter input
       └─ .tree-list-action                     ← root list of bookmarks
            └─ .tree-item [.tree-item-folder]   ← bookmark or group
                 ├─ .tree-item-self            (.is-clickable .is-active …)
                 │    ├─ .collapse-icon         (only on groups)
                 │    ├─ .tree-item-icon        ← bookmark-type icon (file, heading, block, search…)
                 │    ├─ .tree-item-inner
                 │    │    ├─ .tree-item-inner-text
                 │    │    └─ .tree-item-inner-subtext  ← optional path / context hint
                 │    └─ .tree-item-flair-outer
                 └─ .tree-item-children          (only on groups)
                      └─ .tree-item …            (recurse)
```

There is no bespoke styling specific to bookmarks beyond what `.tree-item-self` and `.nav-*` provide. JS attaches a Lucide icon per bookmark type to `.tree-item-icon`.

---

## 2. Tree list helpers

The bookmark pane uses a few utility classes for the action row at the top:

```css
.tree-list-action { /* the outer scrollable container */ }
.tree-list-header { /* optional sticky header above the list */ }
.tree-list-title  { /* group-title styling — uses --nav-heading-* tokens */ }
.tree-list        { /* an inner ul-like container */ }
```

(These are referenced sparingly elsewhere — the bookmarks pane is the primary consumer.)

---

## 3. Bookmark item icons

Each bookmark type maps to a Lucide icon (set by JS in `.tree-item-icon`):

- **File**: `lucide-file` or `lucide-file-text`.
- **Folder**: `lucide-folder`.
- **Heading**: `lucide-heading-1` / `-2` / `-3` based on level.
- **Block**: `lucide-square-stack`.
- **Graph**: `lucide-network`.
- **Search**: `lucide-search`.
- **Group**: `lucide-folder` (custom collapse-caret behavior).

Icons follow `.tree-item-icon` rules — 14 px (`--icon-xs`) inside a 16 px-wide column at `margin-inline-start: -20px`. See `tree-item.md` §3.

---

## 4. State summary

All states (`.is-active`, `.is-selected`, `.is-being-dragged-over`, `.has-active-menu`, `.is-cut`, `.is-being-renamed`) come from `.tree-item-self` (see `tree-item.md` §2).

For groups (collapsible bookmarks): the `.tree-item-self.mod-collapsible` modifier engages the same padding as default rows. The `.collapse-icon` rotates 90° when collapsed.

---

## 5. Drag-and-drop

Bookmarks support reorder via drag — uses `.drag-reorder-ghost` (see `drag-and-drop.md` §1.4). Drop slots between rows show `.drop-indicator` (2 px accent line). Folders showing `.is-being-dragged-over` get the 10 % accent fill highlight from `.tree-item-self.is-being-dragged-over`.

---

## 6. Reproducer build order

1. The bookmark pane is just a tree of `.tree-item` rows. No bookmark-specific CSS.
2. Each item carries a Lucide icon in `.tree-item-icon` — JS renders the SVG based on the bookmark type.
3. Optional sub-text (`.tree-item-inner-subtext`) appears below the title at 85 % size, faint color — used to show the file path or context.
4. Reorder via drag + drop indicator. Folders can be drop targets.
5. Top action row uses `.nav-header` + `.nav-buttons-container` — same primitives as file explorer's footer (which uses these classes for similar actions).
6. The pane's outer scroll container reuses `.nav-files-container` styling or its own `.tree-list-action` — both just provide a flex-grow scrollable column.
