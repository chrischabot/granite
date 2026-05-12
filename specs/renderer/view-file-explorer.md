# View — File Explorer

> The left-sidebar pane that lists every folder and file in the vault. Built on top of `tree-item.md` primitives plus `nav-*` token family for sizing/colors.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css`.

---

## 1. DOM scaffold

```
.workspace-leaf-content[data-type="file-explorer"]
  └─ .view-content
       └─ .nav-files-container [.show-unsupported]
            ├─ .nav-folder.mod-root
            │    └─ .nav-folder-children
            │         ├─ .nav-folder [.is-collapsed]
            │         │    ├─ .nav-folder-title (.tree-item-self.mod-collapsible …)
            │         │    │    ├─ .collapse-icon (caret)
            │         │    │    └─ .nav-folder-title-content
            │         │    └─ .nav-folder-children
            │         │         └─ … (recurse) …
            │         └─ .nav-file
            │              └─ .nav-file-title (.tree-item-self.is-clickable …)
            │                   ├─ .nav-file-icon                ← optional file-type icon
            │                   ├─ .nav-file-title-content
            │                   └─ .nav-file-tag                  ← optional small extension tag (e.g. ".pdf")
            └─ .nav-buttons-container [.has-separator]
                 └─ .nav-action-button.clickable-icon …
```

The pane has its own search header (`.nav-header`) when configured, plus a footer of nav-action buttons (new-file, new-folder, sort, etc.).

---

## 2. `.nav-files-container` (`app.css:16904-16915`)

```css
.nav-files-container {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--size-4-1) var(--size-4-3) var(--size-4-6) var(--size-4-3);
                                /* 4px 12px 24px 12px */
  padding-bottom: max(var(--safe-area-inset-bottom), var(--size-4-6));
                                /* iOS safe-area or 24px */
  scroll-padding-block: var(--size-4-2);   /* 8px scroll-into-view buffer */
}

.nav-files-container:not(.show-unsupported) .is-unsupported {
  display: none;
}
```

The container takes all remaining sidebar height. 4 px top padding (so the first row sits close to the search header above), 24 px bottom padding (so the last row clears the action buttons below), 12 px sides.

`.show-unsupported` is a body-flag that toggles visibility of files Obsidian can't preview (binaries, etc.). Default is hidden.

---

## 3. `.nav-file-icon` (`app.css:16917-16924`)

```css
.nav-file-icon {
  display: inline-flex;
  align-items: center;
  margin-inline-end: var(--size-2-3);    /* 6px */
  position: relative;
  color: var(--icon-color);              /* --text-muted */
  opacity: var(--icon-opacity);          /* 0.85 */
}
```

The file-type icon (e.g. `.pdf`, `.png`, `.canvas` icons). For `.md` files the icon is hidden (see tab rules — same logic applies via JS adding the icon only for non-markdown files).

---

## 4. `.nav-file-tag` — extension badge (`app.css:16926-16952`)

```css
.nav-file-tag {
  background-color: var(--nav-tag-background);   /* transparent */
  border-radius:    var(--nav-tag-radius);        /* 4px */
  color:            var(--nav-tag-color);         /* --text-faint */
  font-size: 9px;
  font-weight: var(--nav-tag-weight);             /* 600 */
  letter-spacing: 0.05em;
  line-height: var(--line-height-normal);         /* 1.5 */
  margin-inline-start: auto;                       /* push to inline-end */
  padding: 0 var(--size-4-1);                      /* 0 4px */
  text-transform: uppercase;
  align-self: center;
}

@media (hover: hover) {
  .tree-item-self:hover .nav-file-tag {
    color: var(--nav-tag-color-hover);             /* --text-muted */
  }
}

.tree-item-self.is-active .nav-file-tag {
  color: var(--nav-tag-color-active);              /* --text-muted */
}

.tree-item-self.is-being-dragged .nav-file-tag {
  color: var(--text-normal);                       /* white-on-accent during drag */
}
```

The tag is the small `PDF` / `PNG` / `CANVAS` label that appears on the right side of file rows for non-markdown files. 9 px uppercase semibold with 0.05em letter-spacing, faint by default, lifts to muted on hover, normal text-color when the file is being dragged.

`margin-inline-start: auto` pushes it to the row's right edge (using flex auto-margin rather than separate flex-grow children).

---

## 5. Title content (`app.css:16954-16965`)

```css
.nav-file-title-content,
.nav-folder-title-content {
  display: inline-block;
  overflow-wrap: anywhere;
  overflow: hidden;
  white-space: var(--nav-item-white-space);   /* pre */
}

.nav-file-title-content:not([contenteditable="true"]),
.nav-folder-title-content:not([contenteditable="true"]) {
  text-overflow: ellipsis;
}
```

The title is normally a single line (`white-space: pre`) with ellipsis truncation. When `contenteditable="true"` is set (during rename), ellipsis disappears so the user can scroll.

`overflow-wrap: anywhere` lets long file names with no spaces break at any character (e.g. UUIDs, hashes).

---

## 6. Drag-over state on folders (`app.css:16967-16978`)

```css
.nav-folder.is-being-dragged-over {
  border-radius: var(--radius-s);                       /* 4px */
  background: hsla(var(--interactive-accent-hsl), 0.1); /* 10% accent fill */
}
.nav-folder.is-being-dragged-over > .nav-folder-title {
  color: var(--nav-item-color-highlighted);
}
.nav-folder.is-being-dragged-over > .nav-folder-title .collapse-icon {
  color: var(--nav-item-color-highlighted);
}
```

When the user drags a file over a folder in the explorer, the folder gets a 10 % accent wash + accent-colored title and caret. This is a **whole-folder** highlight — distinct from the per-row drag-over state on `.tree-item-self.is-being-dragged-over`.

---

## 7. Token resolution

The file explorer uses the `nav-*` token family heavily — these tokens (defined in `design-tokens.md` §11) are themed:

| Token | Default | Light resolution | Dark resolution |
| --- | --- | --- | --- |
| `--nav-item-color` | `--text-muted` | `#5c5c5c` | `#b3b3b3` |
| `--nav-item-color-hover` | `--text-normal` | `#222222` | `#dadada` |
| `--nav-item-color-active` | `--text-normal` | (same) | (same) |
| `--nav-item-color-selected` | `--text-normal` | (same) | (same) |
| `--nav-item-color-highlighted` | `--text-accent` | `#7c52ed` | `#9c83f3` |
| `--nav-item-background-hover` | `--background-modifier-hover` | `rgba(0,0,0,0.067)` | `rgba(255,255,255,0.067)` |
| `--nav-item-background-active` | `--background-modifier-hover` | (same) | (same) |
| `--nav-item-background-selected` | `hsla(var(--color-accent-hsl), 0.15)` | 15 % purple | 15 % purple |
| `--nav-item-padding` | `4px 8px 4px 24px` | (same) | (same) |
| `--nav-item-margin-bottom` | `2px` | (same) | (same) |
| `--nav-item-children-padding-start` | `4px` | (same) | (same) |
| `--nav-item-children-margin-start` | `12px` | (same) | (same) |
| `--nav-collapse-icon-color` | `--text-faint` | `#ababab` | `#666666` |
| `--nav-collapse-icon-color-collapsed` | `--text-faint` | (same) | (same) |
| `--nav-heading-color` | `--text-normal` | (theme) | (theme) |
| `--nav-heading-weight` | `--font-medium` (500) | (same) | (same) |
| `--nav-tag-background` | `transparent` | (same) | (same) |
| `--nav-tag-color` | `--text-faint` | (theme) | (theme) |
| `--nav-tag-weight` | `600` | (same) | (same) |
| `--nav-indentation-guide-color` | `rgba(mono-100, 0.12)` | `rgba(0,0,0,0.12)` | `rgba(255,255,255,0.12)` |

---

## 8. Indent geometry

Each `.nav-folder-children` adds:
- `12 px` (margin-inline-start) + `4 px` (padding-inline-start) + `1 px` border (the indent guide line).
- = **17 px** visible indent per level (with the line at the leading edge).

The default `.tree-item-self` padding is `4px 8px 4px 24px` — the 24 px left padding is what holds the icon + collapse-caret. Children inherit this padding plus the additional 16 px from the wrapper, giving the 16-per-level indent visible to the user.

---

## 9. Translucent override (`app.css:6304-6306`)

```css
.is-translucent:not(.is-fullscreen) {
  --nav-collapse-icon-color: rgba(var(--mono-rgb-100), 0.3);
  --nav-collapse-icon-color-collapsed: rgba(var(--mono-rgb-100), 0.3);
  --divider-color: rgba(0, 0, 0, 0.15);
}
```

In translucent mode, the collapse caret colors lighten to 30 % so they're visible against the wallpaper background.

---

## 10. Action buttons footer (`app.css:9380-9394`)

```css
.nav-buttons-container {
  flex-wrap: wrap;
  gap: var(--size-2-1);   /* 2px */
}

.nav-buttons-container.has-separator {
  border-bottom: 1px solid var(--background-modifier-border);
  padding-bottom: var(--size-2-3);   /* 6px */
  margin-bottom: var(--size-4-2);    /* 8px */
}

.nav-buttons-container .nav-action-button.is-active {
  color: var(--icon-color-focused);              /* --text-normal */
  background-color: var(--background-modifier-hover);
}
```

The button row at the top of the file explorer (e.g. "New file", "New folder", "Sort", "Toggle collapse"). Wrapped flex with 2 px gap; optional 1 px separator above (with 6 px padding-bottom + 8 px margin-bottom).

`.nav-action-button.is-active` uses the same active styling as `.clickable-icon.is-active` — accent-text + 10 % accent fill.

---

## 11. Reproducer build order

1. The file explorer renders into `.workspace-leaf-content[data-type="file-explorer"]` — JS dispatches by `data-type`.
2. Outer container is `.nav-files-container` — `flex-grow: 1; overflow-y: auto; padding: 4px 12px 24px`. iOS safe-area aware.
3. Each folder is a `.nav-folder` containing a `.nav-folder-title` (the row, which **is** a `.tree-item-self.mod-collapsible`) and a `.nav-folder-children` (the indented body).
4. Each file is a `.nav-file` containing a `.nav-file-title` (`.tree-item-self.is-clickable`).
5. Inside the title:
   - For folders: `.collapse-icon` + `.nav-folder-title-content`.
   - For files: optional `.nav-file-icon` + `.nav-file-title-content` + optional `.nav-file-tag`.
6. The `.nav-file-tag` (extension badge) is 9 px uppercase semibold with 0.05em letter-spacing. It uses `margin-inline-start: auto` to glue itself to the right edge.
7. Folder drag-over highlights the **whole folder** (10 % accent fill on `.nav-folder`), not just the row — distinct from the per-row drag-over state.
8. Keep the indent geometry exact: 12 px + 4 px + 1 px = 17 px (with line) per level, on top of the row's own 24 px left padding.
9. Translucent windows lighten the caret color to 30 % opacity.
10. The action-button row at the top wraps with 2 px gap; optional separator below adds 1 px border + 6 px / 8 px spacing.
