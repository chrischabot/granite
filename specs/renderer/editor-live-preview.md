# Editor — Live Preview

> Live-preview is a mode of source editing where rendered decorations replace the markdown source on lines that are not currently being edited. It is **not** a separate file — it is `.markdown-source-view.is-live-preview`.

For the structural rules see [`editor-source-mode.md`](editor-source-mode.md). For the editor chrome see [`editor-codemirror.md`](editor-codemirror.md). This file is a cross-reference of all live-preview-only behaviors scattered across `app.css`.

---

## 1. Mode discriminator

```
.markdown-source-view.is-live-preview          ← the leaf has live-preview enabled
.markdown-source-view.is-live-preview .cm-active  ← the line containing the cursor (kept raw)
.markdown-source-view.is-live-preview .cm-line:not(.cm-active)  ← decorated lines
```

JS sets `.is-live-preview` on the source view based on user preference. CodeMirror sets `.cm-active` on the line under the cursor.

---

## 2. Live-preview-only token overrides (`app.css:3811-3814`, `8470-8472`, `13811-13814`)

```css
.markdown-source-view.is-live-preview {
  --list-padding-inline-start: var(--list-indent-editing);   /* 0.75em */
  --list-marker-space: 0.25em;
}

.markdown-source-view.mod-cm6.is-live-preview .cm-indent::before {
  margin-inline-start: var(--indentation-guide-editing-indent);   /* 0.85em */
}
```

Lists in live-preview indent slightly so they visually align with reading-mode rendered lists. Indent guides at 0.85em (vs source mode's 0.25em).

---

## 3. List bullet rendering (`app.css:13916-13927`)

```css
.markdown-source-view.mod-cm6.is-live-preview .cm-line.HyperMD-list-line .cm-fold-indicator .collapse-indicator {
  padding-inline-end: 0;
}

.markdown-source-view.mod-cm6.is-live-preview .cm-line.HyperMD-list-line:not(.cm-active):not(.HyperMD-task-line) .cm-fold-indicator .collapse-indicator {
  padding-inline-end: var(--list-bullet-end-padding);          /* 1.3rem */
  inset-inline-end: calc(var(--list-bullet-end-padding) * -1); /* -1.3rem */
}
```

In live-preview, the collapse caret on a non-active list line lives in the bullet column with a 1.3rem right padding offset. Active lines (cursor on them) use the default position.

See `editor-headings-and-lists.md` §6.

---

## 4. Decoration replacement — concept

CodeMirror's `EditorView.decorations` extension replaces ranges of source text with rendered widgets when the line is not active:

| Source text | Rendered widget when inactive | When active |
| --- | --- | --- |
| `**bold**` | `<strong>bold</strong>` (formatting `**` hidden) | full source visible |
| `*italic*` | `<em>italic</em>` | full source visible |
| `[[wikilink]]` | rendered link (formatting hidden) | full source visible |
| `[text](url)` | rendered link | full source visible |
| `![[image.png]]` | rendered image embed | full source visible (file path text) |
| ` ```js\ncode\n``` ` | rendered fenced code with syntax highlighting | code is fully visible (so user can edit) |
| `| col |` table line | rendered cell text only | full markdown row |
| `> [!info]\n> body` callout | rendered `.cm-callout` widget | full source |

The visual effect is that the user sees a "rendered preview" while typing, but as soon as the cursor enters a styled element, the formatting characters reveal so the user can edit them.

Reproducer rule: this is implemented at the CodeMirror plugin level (TS source not in `app.css`). The CSS only handles the **styling** of the decorated state — the swapping logic is JS.

---

## 5. Inactive table alignment row (`app.css:14647-14658`)

```css
.cm-s-obsidian .hmd-inactive-line.HyperMD-table-row-1 {
  color: transparent;
  text-shadow: none;
}

.cm-s-obsidian .hmd-inactive-line.HyperMD-table-row-1 > span {
  background: url(data:image/png;base64,iVBORw0KGgo…) repeat-x 0px center;
}

.cm-s-obsidian .hmd-inactive-line.HyperMD-table-row span.cm-hmd-table-sep {
  color: transparent;
}
```

A small but iconic live-preview behavior: the `|---|:--:|---:|` table alignment row, when inactive, paints transparent and gets a 1-pixel-tall PNG dashed-line repeated horizontally. Result: a clean horizontal separator between header and body. See `editor-tables.md` §2.

---

## 6. Highlighted text in live-preview (`app.css:14967-14971`)

```css
.cm-s-obsidian span.cm-formatting-highlight,
.cm-s-obsidian span.cm-highlight {
  background-color: var(--text-highlight-bg);   /* yellow 40% */
  color: var(--text-normal);
}
```

`==highlights==` paint the same yellow as in reading mode.

---

## 7. Inline-code chain rendering (`app.css:11907-11962`)

In live-preview, inline-code spans are split by CodeMirror into multiple sibling spans (formatting backtick + content + formatting backtick). The CSS at `app.css:11907-11962` reassembles them into a continuous pill — see `editor-code-blocks.md` §2 for the corner-radius dance.

---

## 8. The `.cm-callout` widget

When a callout block has its cursor not on it, CodeMirror replaces the `> [!info] Title\n> body` source with a `.cm-callout` widget. The widget reuses the `.callout` selector internally — see `editor-callouts.md` §11.

---

## 9. Reproducer build order

1. Live-preview is `.markdown-source-view.is-live-preview` — no separate component, just a class on the source view.
2. The decoration logic is in CodeMirror's plugin pipeline. CSS only styles the decorated/non-decorated states; JS decides which spans get decorated.
3. `.cm-active` is the cursor's line. Most "show full markdown" rules trigger on `:not(.cm-active)` for the inactive case.
4. Most editor-content selectors (`.cm-strong`, `.cm-em`, `.cm-link`, `.cm-hashtag`, `.cm-formatting-*`, `.cm-callout`, `.cm-inline-code`, `.HyperMD-table-row`, etc.) work in both source and live-preview modes — the difference is which spans the engine decorates as widgets vs leaves as raw text.
5. List indentation, bullet rendering, and the inactive table alignment line are the headline visual differences from plain source mode. See linked specs for exact values.
