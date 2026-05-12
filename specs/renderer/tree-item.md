# Tree Item

> The fundamental row primitive used by file explorer, bookmarks, tags, outline, search results, and any nested-list pane in the sidebar. Every row has the shape `[indent guide] [collapse caret?] [icon?] [label] [flair?]` with hover/active/selected states driven by the `nav-item-*` token family.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css:10664-10852`.

---

## 1. DOM scaffold

```
.tree-item [.is-collapsed]
  ├─ .tree-item-self [.is-clickable] [.is-active] [.is-selected] [.is-cut]
  │     [.is-being-renamed] [.is-being-dragged] [.is-being-dragged-over]
  │     [.has-active-menu] [.has-focus] [.mod-collapsible] [.mobile-tap]
  │    ├─ .collapse-icon                ← caret (only when .mod-collapsible)
  │    ├─ .tree-item-icon                ← optional leading icon (e.g. file type)
  │    ├─ .tree-item-inner
  │    │    ├─ .tree-item-inner-text
  │    │    └─ .tree-item-inner-subtext  ← optional sub-text
  │    └─ .tree-item-flair-outer
  │         └─ .tree-item-flair          ← badge (e.g. file count)
  └─ .tree-item-children                  ← only if not collapsed
       └─ .tree-item …                    ← recurse
```

---

## 2. `.tree-item-self` — the row (`app.css:10664-10717`)

```css
.tree-item-self {
  align-items: baseline;
  display: flex;
  border-radius: var(--nav-item-radius);   /* 4px */
  corner-shape: var(--corner-shape);
  color:        var(--nav-item-color);     /* --text-muted */
  font-size:    var(--nav-item-size);      /* 13px */
  line-height:  var(--line-height-tight);  /* 1.3 */
  font-weight:  var(--nav-item-weight);    /* inherit (400) */
  margin-bottom: var(--nav-item-margin-bottom);   /* 2px */
  padding:      var(--nav-item-padding);   /* 4px 8px 4px 24px */
  position: relative;
}

.is-mobile .tree-item-self {
  transition:
    background-color 0.1s ease-in-out,
    color            0.1s ease-in-out;
}

.tree-item-self:before { content: '\200B'; }   /* zero-width space — establishes baseline */

.tree-item-self.mod-collapsible {
  padding: var(--nav-item-parent-padding);  /* same as default */
}

.tree-item-self.is-cut {
  opacity: 0.5;            /* dimmed during cut-paste */
}

.tree-item-self.is-being-dragged-over {
  color: var(--nav-item-color-highlighted);              /* --text-accent */
  background: hsla(var(--interactive-accent-hsl), 0.1);  /* 10% accent fill */
}
.tree-item-self.is-being-dragged-over .collapse-icon {
  color: var(--nav-item-color-highlighted);
}

.tree-item-self.mobile-tap {
  color:       var(--nav-item-color-hover);     /* --text-normal */
  font-weight: var(--nav-item-weight-hover);    /* inherit */
  background-color: var(--nav-item-background-hover);    /* --background-modifier-hover */
}

.tree-item-self.has-active-menu {
  box-shadow: 0 0 0 2px var(--background-modifier-border-focus);
                                              /* 2px gray ring while context menu is open */
}

.tree-item-self.is-being-renamed {
  flex-grow: 1;
  white-space: normal;
  box-shadow: 0 0 0 2px var(--background-modifier-border-focus);
}

.tree-item-self.is-being-renamed [contenteditable="true"],
.tree-item-self.is-being-renamed .tree-item-inner {
  cursor: text;
  flex-grow: 1;
}

.tree-item-self.is-being-renamed:focus-within {
  color: var(--nav-item-color-active);
  box-shadow: 0 0 0 2px var(--interactive-accent);   /* 2px accent ring while editing */
}
```

### 2.1 Clickable / active / selected (`app.css:10734-10763`)

```css
.tree-item-self.is-clickable { cursor: var(--cursor); }

@media (hover: hover) {
  body:not(.is-grabbing) .tree-item-self.is-clickable:hover {
    color:       var(--nav-item-color-hover);
    background-color: var(--nav-item-background-hover);
    font-weight: var(--nav-item-weight-hover);
  }
}

body:not(.is-grabbing) .tree-item-self.is-active:hover,
.tree-item-self.is-active {
  color:       var(--nav-item-color-active);
  background-color: var(--nav-item-background-active);
  font-weight: var(--nav-item-weight-active);
}

body:not(.is-grabbing) .tree-item-self.is-selected:hover,
.tree-item-self.is-selected {
  color:       var(--nav-item-color-selected);
  background-color: var(--nav-item-background-selected);
}

body:not(.is-grabbing) .tree-item-self.is-being-dragged:hover,
.tree-item-self.is-being-dragged {
  color: var(--text-on-accent);
  background-color: var(--interactive-accent);
}
body:not(.is-grabbing) .tree-item-self.is-being-dragged:hover .tree-item-icon,
.tree-item-self.is-being-dragged .tree-item-icon {
  color: var(--text-on-accent);
}
```

State table:

| Class | `color` | `background-color` |
| --- | --- | --- |
| (base) | `--text-muted` | transparent |
| `.is-clickable:hover` | `--text-normal` | `--background-modifier-hover` |
| `.is-active` | `--text-normal` | `--background-modifier-hover` |
| `.is-selected` | `--text-normal` | `hsla(--color-accent-hsl, 0.15)` (15 % accent) |
| `.is-being-dragged-over` | `--text-accent` | `hsla(--color-accent-hsl, 0.1)` (10 % accent) |
| `.is-being-dragged` | `--text-on-accent` (white) | `--interactive-accent` (solid) |
| `.is-cut` | (inherited) × `opacity: 0.5` | (inherited) |
| `.has-active-menu` / `.is-being-renamed` | (inherited) | (inherited) + 2 px gray ring |
| `.is-being-renamed:focus-within` | `--text-normal` | (inherited) + 2 px accent ring |

The hover/active/selected hierarchy: hover < active < selected (selected wins because it carries an accent fill).

The `body:not(.is-grabbing)` qualifier on hover prevents tree items from changing color while the user is dragging — the drag overlay handles that.

### 2.2 Focus ring on `.has-focus` (`app.css:10770-10776`)

```css
body:not(.is-phone) .workspace-leaf.mod-active .tree-item-self.has-focus {
  box-shadow: 0 0 0 2px var(--background-modifier-border-focus);
}
body:not(.is-phone) .workspace-leaf.mod-active .tree-item-self.has-focus:focus-within {
  box-shadow: 0 0 0 2px var(--interactive-accent);
}
```

`.has-focus` is JS-managed: it marks the row that arrow-keys are currently navigating. Two-step ring:
- `.has-focus` alone → 2 px gray ring (`--background-modifier-border-focus`).
- `.has-focus:focus-within` → 2 px accent ring (when the row's contenteditable label has DOM focus, i.e. mid-rename).

Only fires when the parent leaf is `.mod-active` and not on phone.

---

## 3. `.tree-item-icon` (`app.css:10778-10797`)

```css
.tree-item-self .tree-item-icon {
  position: absolute;
  margin-inline-start: calc(-1 * var(--size-4-5));   /* -20px — pulls into the indent gutter */
  width: var(--size-4-4);                            /* 16px */
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: var(--icon-opacity);                       /* 0.85 */
  color: var(--icon-color);                           /* --text-muted */
  flex: 0 0 auto;
}
.tree-item-self .tree-item-icon:before { content: '\200b'; }   /* baseline anchor */

.tree-item-self .tree-item-icon .svg-icon:not(.right-triangle) {
  --icon-size: var(--icon-xs);                        /* 14px */
  --icon-stroke: var(--icon-s-stroke-width);          /* 2px */
}
```

Geometry:
- The icon is **absolutely positioned**, pulled `-20px` into the row's left padding gutter (default padding is `4px 8px 4px 24px`, so `-20px` puts the icon at the row's left edge).
- The 14 px icon centers in a 16 px box.
- A non-`.right-triangle` SVG uses 14 px size + 2 px stroke. `.right-triangle` is the collapse caret which uses different dimensions (see `.collapse-icon` in `buttons.md` / `editor-headings-and-lists.md`).

The `\200B` zero-width space ensures the icon's baseline aligns with the text baseline (otherwise the empty flex container would have no intrinsic height to align).

---

## 4. `.tree-item-flair` and `.tree-item-flair-outer` (`app.css:10799-10818`)

```css
.tree-item-flair-outer {
  padding-inline-start: var(--size-4-1);   /* 4px */
  margin-inline-start: auto;               /* push to the inline-end of the row */
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.tree-item-flair {
  font-size: var(--font-ui-smaller);       /* 12px */
  color: var(--text-faint);
  line-height: 1;
  border-radius: var(--radius-s);          /* 4px */
}

@media (hover: hover) {
  .tree-item-self:hover .tree-item-flair { color: var(--text-muted); }
                                            /* lift from --text-faint to --text-muted on row hover */
}
```

Flair is a small badge (e.g. unread-count, file count in folder) on the right edge of the row. The `margin-inline-start: auto` on the outer wraps "push to right" because the flex-row otherwise packs everything to the left.

---

## 5. `.tree-item-inner` (`app.css:10820-10833`)

```css
.tree-item-inner {
  overflow: hidden;
  white-space: pre-wrap;
}

.tree-item-inner-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-item-inner-subtext {
  color: var(--text-faint);
  font-size: 85%;        /* 11.05px when parent is 13px */
}
```

The inner wraps the row label. Default is `pre-wrap` (preserving spaces, breaking on whitespace). The sub-text is a smaller, fainter line — used by file explorer for subfolder names or by the bookmarks pane for path hints.

---

## 6. `.tree-item-children` — nested rows (`app.css:10835-10839`)

```css
.tree-item-children {
  padding-inline-start: var(--nav-item-children-padding-start, var(--nav-item-children-padding-left));
                                          /* 4px */
  margin-inline-start: var(--nav-item-children-margin-start, var(--nav-item-children-margin-left));
                                          /* 12px */
  border-inline-start: var(--nav-indentation-guide-width) solid var(--nav-indentation-guide-color);
                                          /* 1px solid rgba(mono-100, 0.12) */
}
```

The indentation guide:
- 12 px margin-inline-start + 4 px padding-inline-start = each level is indented **16 px**.
- A 1 px line at `rgba(mono-100, 0.12)` (12 % faint) sits at the inline-start edge of the children block — this is the visible "tree" line.
- The `--nav-item-children-padding-left` and `-margin-left` are **legacy** tokens (LTR-only naming); the modern `-start` versions take precedence via `var(name, fallback)`.

---

## 7. `.drop-indicator` — drag-into-tree marker (`app.css:10841-10852`)

```css
.drop-indicator {
  position: absolute;
  left: 0;
  width: 100%;
  height: 0;
  border: 2px solid var(--interactive-accent);
  pointer-events: none;
}
.drop-indicator:not(.is-active) { display: none; }
```

A 2 px-tall horizontal line, fully accent-colored, that JS positions between rows during a tree drag to indicate the drop slot. `display: none` until JS sets `.is-active`.

---

## 8. `.collapse-icon` — the caret (referenced; full definition in `buttons.md` §-)

The collapse caret is a separate primitive `.collapse-icon` with the following essentials (`app.css:8102-8121`):

```css
.collapse-icon { display: flex; align-items: center; }
.collapse-icon:before { content: "\200B"; }
.collapse-icon svg.svg-icon {
  color: var(--nav-collapse-icon-color);
  stroke-width: 4px;
  width: 10px;
  height: 10px;
  transition: transform 100ms ease-in-out;
}
.collapse-icon.is-collapsed svg.svg-icon {
  transform: rotate(calc(var(--direction) * -1 * 90deg));
                                          /* rotates -90° in LTR / +90° in RTL */
}
```

Mechanism:
- Caret is a 10 × 10 SVG (typically a chevron-down).
- Open state: pointing down.
- Collapsed state: rotated -90° (LTR) or +90° (RTL) so it points right (LTR) or left (RTL).
- 100 ms ease-in-out rotation animation.
- `--direction` is set on the document root by JS based on `dir` attribute.

The hover-show pattern (collapse caret only visible on hover) is via `.fold-gutter` / `.collapse-indicator` rules at `app.css:8067-8100`:

```css
.cm-fold-indicator .collapse-indicator,
.cm-gutterElement .collapse-indicator,
.collapse-indicator,
.fold-gutter { opacity: 0; }

h1:hover .collapse-indicator,
h2:hover .collapse-indicator, …,
.collapse-indicator:hover,
.is-collapsed .collapse-indicator,
.cm-gutterElement:hover .collapse-indicator,
.cm-line:hover .cm-fold-indicator .collapse-indicator,
.fold-gutter.is-collapsed,
.fold-gutter:hover,
.metadata-properties-heading:hover .collapse-indicator { opacity: 1; }
```

—the indicator is **invisible by default** and reveals only when the row is hovered or already collapsed.

---

## 9. Reproducer build order

1. `.tree-item-self` is the row. Always `display: flex; align-items: baseline; padding: 4px 8px 4px 24px`.
2. The 24 px left padding is the indent gutter; the icon (when present) absolutely positions itself at `margin-inline-start: -20px` to land flush with the row's left edge (4 px from the leaf chrome).
3. `.tree-item-icon` is a 16 × 16 box with a 14 px SVG centered. Color is `--text-muted` at 0.85 opacity. NO hover override; the icon dims/lights via the flair-color rule on row-hover.
4. `.tree-item-children` recurses with 12 px margin + 4 px padding + 1 px guide line — total visual indent per level is 16 px.
5. The state class hierarchy is precise:
   - `.is-active` (the currently-open file in this pane).
   - `.is-selected` (multi-select for paste/move/delete; can coexist with `.is-active`).
   - `.is-being-dragged-over` (drop target highlight).
   - `.is-being-dragged` (the row being dragged — only visible on the ghost copy).
   - `.is-cut` (clipboard-cut state, dim).
   - `.has-active-menu` (a context menu is open on this row — gray ring).
   - `.is-being-renamed` (label is contenteditable — gray ring → accent ring on focus-within).
   - `.has-focus` (keyboard nav target).
   - `.mod-collapsible` (has children that can collapse).
6. The `.tree-item-flair` lives in `.tree-item-flair-outer` with `margin-inline-start: auto` to push it to the right edge.
7. The collapse caret is a separate `.collapse-icon` primitive — its rotation animation is 100 ms ease-in-out, driven by the `.is-collapsed` modifier.
8. `.drop-indicator` is a 2 px accent-colored line absolutely positioned by JS during tree drag operations. It is `display: none` until `.is-active` is set.
9. The `body:not(.is-grabbing)` qualifier on hover rules is critical — without it tree rows would rapidly highlight/dehighlight as the user drags through them.
