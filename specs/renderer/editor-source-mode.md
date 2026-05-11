# Editor — Source Mode (and Live-Preview)

> Source mode is plain-text editing of the markdown source. Live-preview is source mode with rendering decorations applied to lines that don't have the cursor on them. Both are the same `.markdown-source-view` element with different modifiers.

Source: `renderer/app.css`. Tokens: see [`design-tokens.md`](design-tokens.md). The CodeMirror chrome itself is documented in [`editor-codemirror.md`](editor-codemirror.md).

---

## 1. Mode discrimination

```
.markdown-source-view              ← always present in markdown leaves
   ├─ (no .is-live-preview)        ← plain source mode
   └─ .is-live-preview              ← live-preview mode
.markdown-source-view.mod-cm6       ← always — identifies the CM6-based editor
.markdown-source-view.mod-cm6.is-readable-line-width   ← capped width
.markdown-source-view.mod-cm6.is-replacing             ← find-and-replace bar visible
.markdown-source-view.mod-cm6.is-searching             ← find bar visible
```

The `is-live-preview` modifier is set by JS based on the user's preference (Settings → Editor → Default editing mode → Live preview).

---

## 2. Plain source mode (without `.is-live-preview`) (`app.css:3573-3575`)

```css
.markdown-source-view:not(.is-live-preview) {
  --p-spacing: 0rem;
}
```

Just one line of override: paragraph block-margin collapses to 0. Source mode reads as a flat text view — the user sees exactly the markdown source, line by line, with **no** rendering decorations applied.

Other tokens that take effect:

```
--list-padding-inline-start: var(--list-indent-source);   /* 0 — bullets flush left */
--list-marker-space: 0;
```

(See `editor-headings-and-lists.md` §4.)

---

## 3. Live-preview mode — `.is-live-preview` (`app.css:3811-3814`, `8470-8472`, `13811-13814`, `13916-13927`)

```css
.markdown-source-view.is-live-preview {
  --list-padding-inline-start: var(--list-indent-editing);   /* 0.75em */
  --list-marker-space: 0.25em;
}

.markdown-source-view.mod-cm6.is-live-preview .cm-indent::before {
  margin-inline-start: var(--indentation-guide-editing-indent);   /* 0.85em */
}

.markdown-source-view.mod-cm6.is-live-preview .cm-line.HyperMD-list-line .cm-fold-indicator .collapse-indicator {
  padding-inline-end: 0;
}

.markdown-source-view.mod-cm6.is-live-preview .cm-line.HyperMD-list-line:not(.cm-active):not(.HyperMD-task-line) .cm-fold-indicator .collapse-indicator {
  padding-inline-end: var(--list-bullet-end-padding);          /* 1.3rem */
  inset-inline-end: calc(var(--list-bullet-end-padding) * -1); /* -1.3rem */
}
```

In live-preview:
- List markers move to 0.75em indent so they align with the rendered preview's geometry.
- Indent guides shift to 0.85em margin (vs source mode's 0.25em).
- The collapse caret on non-active list lines lives in the bullet column with a 1.3rem right padding offset (so it doesn't shift the visual when the bullet is hidden).
- Task lines (`.HyperMD-task-line`) keep the default position.

The defining feature of live-preview is **decoration replacement**: when the cursor is on a line, the markdown source shows raw text. When the cursor leaves the line (and the line isn't currently being edited), CM6 replaces parts of the source with rendered widgets:

- `**bold**` → `<strong>bold</strong>` (the `**` markers hide unless the cursor is on the line).
- `[[link]]` → rendered link (the `[[` and `]]` markers hide).
- `![[image.png]]` → rendered image embed.
- ` ```language\ncode\n``` ` → rendered fenced code block (with syntax highlighting).
- `| col1 | col2 |` table lines → rendered `.cm-table-widget` (see `editor-tables.md` §3).
- `> [!info] Title\n> body` callout block → rendered `.cm-callout` (see `editor-callouts.md`).

The decoration logic is in CodeMirror's `EditorView` config — JS wires up decorations based on the parsed markdown AST.

---

## 4. Inactive vs active line markers (`app.css:13830-13848`)

```css
.cm-s-obsidian .cm-formatting-list { color: var(--list-marker-color); }
.cm-s-obsidian .is-collapsed ~ .cm-formatting-list { color: var(--list-marker-color-collapsed); }

.cm-line.HyperMD-list-line { tab-size: var(--list-indent); }

.markdown-source-view ol > li,
.markdown-source-view ul > li,
.markdown-preview-view ol > li,
.markdown-preview-view ul > li,
.mod-cm6 .HyperMD-list-line.cm-line {
  padding-top:    var(--list-spacing);
  padding-bottom: var(--list-spacing);
}
```

Cursor-line affordances depend on `.cm-active`:
- `.cm-active.HyperMD-list-line` — visible markdown source (markers + numbers shown raw).
- `.HyperMD-list-line:not(.cm-active)` — bullet rendered as a custom dot (`.list-bullet:after` — see `editor-headings-and-lists.md` §5).

CodeMirror sets `.cm-active` on the line containing the cursor, removes it from all other lines. This is how live-preview "hides" formatting characters dynamically as the cursor moves.

---

## 5. Inactive table line — special handling (`app.css:14647-14658`)

```css
.cm-s-obsidian .hmd-inactive-line.HyperMD-table-row-1 {
  color: transparent;
  text-shadow: none;
}

.cm-s-obsidian .hmd-inactive-line.HyperMD-table-row-1 > span {
  background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAQAAAAziH6sAAAADklEQVR42mOc+Z9x5n8ACTkDM4ikM1IAAAAASUVORK5CYII=) repeat-x 0px center;
}

.cm-s-obsidian .hmd-inactive-line.HyperMD-table-row span.cm-hmd-table-sep {
  color: transparent;
}
```

When a table alignment line (the `|:--|:-:|--:|` row) is inactive:
- Text becomes transparent.
- A 1-pixel-tall PNG is repeated horizontally as the background, drawing a clean dashed line.
- The `|` separators (`.cm-hmd-table-sep`) also go transparent.

This is the trick that gives live-preview tables their clean separator-line look without removing the markdown source. See `editor-tables.md` §2.

---

## 6. `is-readable-line-width` (`app.css:3597-3613`)

```css
.markdown-source-view.mod-cm6.is-readable-line-width .cm-sizer    { max-width: var(--file-line-width); margin-left: auto; margin-right: auto; }
.markdown-source-view.mod-cm6.is-readable-line-width .cm-content  { max-width: var(--file-line-width); }
.markdown-source-view.mod-cm6.is-readable-line-width .cm-line     { max-width: var(--file-line-width); }
.markdown-source-view.mod-cm6.is-readable-line-width .cm-line.HyperMD-table-row { max-width: 100%; }
```

When `Settings → Editor → Readable line length` is on, the editor is capped to 700 px (`--file-line-width`). Tables explicitly opt out so they can be wider than the content line.

---

## 7. Selection (cross-reference)

Source-mode selection styling is documented in `editor-codemirror.md` §6. The summary: `--text-selection` (light: 20 % accent / dark: 33 % accent) tints all selected text — `::selection`, `.cm-selection`, `.cm-selectionBackground`.

---

## 8. Reproducer build order

1. The leaf wrapper is `.markdown-source-view.mod-cm6` for both modes. Add `.is-live-preview` for live-preview.
2. Plain source mode: `--p-spacing: 0` collapses paragraph margins. Lists flush-left.
3. Live-preview: lists at 0.75em indent, indent guides at 0.85em margin. Decoration replacement happens via CodeMirror's `EditorView` plugin — JS detects which AST ranges are "off the cursor" and replaces them with rendered widgets.
4. The `.cm-active` class on the cursor's line is the gate for "show full markdown source vs. rendered". Every formatting-character rule should hide (or dim) when the line is **not** `.cm-active` and reveal when it is.
5. Table alignment row in live-preview: a tiny base64 PNG dashed line replaces the syntax characters when the row is inactive. Don't try to redraw this with CSS gradients — the original PNG is calibrated.
6. Tables explicitly opt out of `is-readable-line-width` so they can be as wide as needed.
7. Find/replace bar appears at the **top** of the source-view via `flex-direction: column-reverse` on `.is-searching` / `.is-replacing` (see `editor-document-search.md`).
