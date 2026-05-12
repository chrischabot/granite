# Editor — CodeMirror Chrome

> The structural CSS that wraps the CodeMirror 6 editor instance: container shape, scroller, content sizing, line, gutters, cursor, selection. Everything **above** markdown rendering lives here. Markdown-specific decoration (headings, lists, callouts, code blocks) is in their own files.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css` (CodeMirror layer addressed via `.cm-s-obsidian` and `.markdown-source-view.mod-cm6`).

The shipped CodeMirror is a customized build of CodeMirror 6 — see `lib/codemirror/codemirror.js`. The CSS rules below are the renderer's overlay on top of CM6's defaults.

---

## 1. Editor identity classes

Two classes work in combination:

- `.cm-s-obsidian` — applied to the CM editor root by Obsidian's CodeMirror config. All token / cursor / selection styling lives behind this.
- `.markdown-source-view.mod-cm6` — the leaf-level wrapper that holds the editor. Used for layout-and-sizing rules.

A markdown leaf in source mode looks like:

```
.workspace-leaf-content[data-type='markdown']
  └─ .view-content
       └─ .markdown-source-view.mod-cm6 [.is-live-preview] [.is-readable-line-width] [.is-replacing] [.is-searching]
            ├─ .document-search-container … (when active)
            └─ .cm-editor.cm-s-obsidian [.cm-focused]
                 └─ .cm-scroller
                      └─ .cm-sizer
                           ├─ .cm-contentContainer
                           │    └─ .cm-content [contenteditable=true]
                           │         ├─ .cm-line …
                           │         └─ … widgets …
                           ├─ .cm-gutters
                           │    └─ .cm-gutter …
                           └─ .cm-cursorLayer / .cm-selectionLayer
```

---

## 2. `.markdown-source-view` baseline (`app.css:3484-3487`)

```css
.markdown-source-view {
  font-size:   var(--font-text-size);    /* 16px */
  font-family: var(--font-text);
}
```

The source view inherits the **text** font and 16 px size — same as the markdown reading view. This is what makes editor and reading mode look like the same document.

```css
.workspace-leaf-content.is-read-mode .markdown-source-view {
  z-index: 0;
}

.markdown-source-view:not(.is-live-preview) {
  --p-spacing: 0rem;            /* tighten paragraph spacing in source mode */
}
```

Reading-mode-active leaves keep the source view at z-index 0 so layered hover popovers don't sandwich the editor incorrectly. In **plain source mode** (`.markdown-source-view` without `.is-live-preview`), the paragraph spacing token collapses to 0 so the editor reads as a flat text view.

---

## 3. `.markdown-source-view.mod-cm6` flex chain (`app.css:3577-3651`)

```css
.markdown-source-view.mod-cm6 {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.markdown-source-view.mod-cm6 .cm-editor {
  flex: 1 1;
  min-height: 0;                   /* lets the editor shrink below content height */
}
.markdown-source-view.mod-cm6 .cm-editor.cm-focused {
  outline: none;                    /* CM6's default focus outline removed */
}

.markdown-source-view.mod-cm6 .cm-scroller {
  font-family: var(--font-text);
  line-height: var(--line-height-normal);   /* 1.5 */
  scrollbar-gutter: stable;
}

.markdown-source-view.mod-cm6 .cm-sizer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  min-height: 100%;
}

.markdown-source-view.mod-cm6 .cm-contentContainer {
  flex: 1 1 auto;
  display: flex;
  align-items: stretch;
  overflow-x: visible;
}

.markdown-source-view.mod-cm6 .cm-content {
  flex-basis: unset !important;
  width: 0;                         /* lets flex bound it horizontally */
  caret-color: var(--caret-color);
  min-height: unset;
  padding: 0;
}

.is-mobile.is-ios .markdown-source-view.mod-cm6 .cm-content {
  -webkit-user-modify: read-write;  /* iOS-specific contenteditable hack */
}

.markdown-source-view.mod-cm6 .cm-content > * {
  margin: 0 !important;             /* zero out CM6 default line margins */
  display: block;
}

.markdown-source-view.mod-cm6 .cm-content > .image-embed {
  display: flex;
}

.markdown-source-view.mod-cm6 .cm-content > [contenteditable=false] {
  contain: paint !important;        /* every embed is a paint container — perf */
}

.markdown-source-view.mod-cm6 .cm-line > * {
  text-indent: 0;
}
```

Reproducer rules:
- The flex chain is `markdown-source-view (column) > cm-editor (flex:1) > cm-scroller > cm-sizer (column) > cm-contentContainer (flex:1) > cm-content (width:0 !important)`.
- The `width: 0` on `.cm-content` (combined with `!important flex-basis: unset`) is what allows CM6's content to **shrink** to fit the container instead of expanding to its natural width — without this the editor gets a horizontal scrollbar in narrow leaves.
- `min-height: 0` on `.cm-editor` is critical for vertical shrinking.
- `scrollbar-gutter: stable` on `.cm-scroller` reserves space for the scrollbar even when not visible — prevents content reflow when scrollbar appears mid-typing.
- `contain: paint` on every embed (any `[contenteditable=false]` widget inside `.cm-content`) isolates them from the editor's repaint when typing — major perf win for documents with many embeds.
- Line children (`.cm-line > *`) get `text-indent: 0` so list-bullet indents and list-line decorations align cleanly.

---

## 4. Readable-line-width (`app.css:3597-3613`)

```css
.markdown-source-view.mod-cm6.is-readable-line-width .cm-sizer {
  max-width: var(--file-line-width);   /* 700px */
  margin-left: auto;
  margin-right: auto;
}
.markdown-source-view.mod-cm6.is-readable-line-width .cm-content {
  max-width: var(--file-line-width);
}
.markdown-source-view.mod-cm6.is-readable-line-width .cm-line {
  max-width: var(--file-line-width);
}
.markdown-source-view.mod-cm6.is-readable-line-width .cm-line.HyperMD-table-row {
  max-width: 100%;                      /* tables ignore the line-width cap */
}
```

When `Settings → Editor → Readable line length` is on, the editor's sizer, content, and lines are all capped at `--file-line-width` (700 px). Tables explicitly opt out so wide tables don't get scrollbars.

---

## 5. Cursor (`app.css:3407-3411`)

```css
.cm-s-obsidian .cm-cursor,
.cm-s-obsidian .cm-dropCursor {
  border-left-color: var(--caret-color);   /* --text-normal */
}
```

The text caret uses `--caret-color` (which resolves to `--text-normal`). The drop cursor (the visual indicator when the user drags text into the editor) shares the same color.

CM6's default caret is a `border-left` on a 1 px wide invisible div; only the color is overridden.

### 5.1 Vim mode "fat cursor" (`app.css:3413-3446`)

```css
.cm-fat-cursor-mark {
  background-color: rgba(20, 255, 20, 0.5);   /* fixed bright green */
  animation: blink 1.06s steps(1) infinite;
}

.cm-animate-fat-cursor {
  width: auto;
  border: 0;
  animation: blink 1.06s steps(1) infinite;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

@keyframes blink {
  50% { background-color: transparent; }
}
```

Vim mode (`vim.js` add-on) uses a "fat cursor" — a block that highlights the current character. There are two flavors:
- `.cm-fat-cursor-mark` — the bright-green block (50 % opacity over text). Fixed color, not theme-dependent.
- `.cm-animate-fat-cursor` — the active variant that paints with `--interactive-accent` and inverts text to `--text-on-accent`.

Both blink at 1.06 s with `steps(1)` (instant on/off, no fade). The 1.06 s period (slightly off the standard 1 s) reduces visual interference with the eye's blink rate.

---

## 6. Selection (`app.css:3583-3595`)

```css
.markdown-source-view.mod-cm6 ::selection {
  background-color: var(--text-selection);
}
.markdown-source-view.mod-cm6 .cm-line .cm-selection,
.markdown-source-view.mod-cm6 .cm-line .cm-inline-code .cm-selection {
  background-color: var(--text-selection);
}
.markdown-source-view.mod-cm6 .cm-selectionBackground,
.markdown-source-view.mod-cm6 .cm-editor > .cm-scroller > .cm-selectionLayer > .cm-selectionBackground {
  background-color: var(--text-selection);
}
```

Three rules cover three distinct DOM paths:
1. `::selection` for native browser-selected text inside `.cm-line` (when CM hasn't taken control).
2. `.cm-selection` markers inside lines and inline-code — for inline-decorated selections.
3. `.cm-selectionBackground` divs in the `.cm-selectionLayer` (CM6's overlay system).

All three use the same `--text-selection` token:
- Light: `hsla(--color-accent-hsl, 0.2)` — 20 % accent.
- Dark: `hsla(--interactive-accent-hsl, 0.33)` — 33 % accent (overridden in `.theme-dark`).

---

## 7. Gutter (`app.css:3670-3679`)

```css
.markdown-source-view.mod-cm6 .cm-gutters {
  flex: 0 0 auto;
  background-color: transparent;
  color: var(--text-faint) !important;
  border-right: none !important;          /* override CM6 default border */
  margin-inline-end: var(--file-folding-offset);   /* 24px */
  font-size: var(--font-ui-smaller);     /* 12px */
  z-index: 1;
  font-variant: tabular-nums;             /* aligned line numbers */
}

.markdown-source-view.mod-cm6 .cm-line > * { text-indent: 0; }
```

The line-number / fold gutter:
- Transparent background (no separator from content).
- Faint color (12 % gray-equivalent).
- 12 px font with tabular numerals (so numbers don't shift width).
- 24 px gap between gutter and content (`--file-folding-offset`) — the room for fold-indicators to live.
- `z-index: 1` so gutter sits above lines (otherwise long content can scroll past gutter).
- `border-right: none !important` removes CM6's default 1 px gutter divider.

---

## 8. Tab character display (`app.css:3448-3451`)

```css
.cm-tab {
  display: inline-block;
  text-decoration: inherit;
}
```

CM6 wraps tab characters in `<span class="cm-tab">` so they get a stable inline-block layout (otherwise the cursor jumps unpredictably across mixed-tab/space lines).

---

## 9. Token color helpers (`app.css:3453-3472`)

```css
.cm-negative      { color: var(--text-error); }
.cm-positive      { color: var(--text-success); }
.cm-strikethrough { text-decoration: line-through; }
.cm-invalidchar   { color: var(--text-error); }
.cm-searching     { background-color: rgba(255, 255, 0, 0.4); }
```

These are CM6 standard token classes:
- `.cm-negative` — diff-deletion, decrement
- `.cm-positive` — diff-addition, increment
- `.cm-strikethrough` — `~~struck-through~~` markdown
- `.cm-invalidchar` — control characters, malformed unicode
- `.cm-searching` — find-bar match highlighting (yellow at 40 % — fixed color, not theme-dependent)

Most other token colors (heading, list, link, code, etc.) are defined in their respective component files.

---

## 10. Hacks for CM6 quirks (`app.css:3474-3482`)

```css
.cm-force-border { padding-right: 0.1px; }   /* forces a border-box on a node */
.cm-tab-wrap-hack:after { content: ''; }     /* see issue #2901 — fixes tab-wrapping in some configurations */
```

These are intentional one-line hacks, kept for stability. Reproducer must include them verbatim — removing them surfaces obscure CM6 layout bugs.

---

## 11. Cursor color flow

Tracing the resolution:

1. `.cm-content { caret-color: var(--caret-color); }` — sets the OS-level caret color for typing.
2. `--caret-color: var(--text-normal)` (`design-tokens.md` §5).
3. `.cm-cursor { border-left-color: var(--caret-color); }` — CM6's custom caret rendering uses the same.

So both native caret and CM6's overlay caret use `--text-normal`. Themes can override `--caret-color` independently if they want a colored caret.

---

## 12. Reproducer build order

1. The CM6 editor root must carry **both** `.cm-editor` and `.cm-s-obsidian` — the second is what triggers all the Obsidian token styling.
2. The leaf wrapper `.markdown-source-view.mod-cm6` is a flex column containing the search-bar (when active) and the `.cm-editor`. The editor must be `flex: 1 1; min-height: 0` so it can shrink.
3. `.cm-content { width: 0 !important }` is the load-bearing rule for horizontal sizing — it tells flex "I have no intrinsic width, fit me to my parent". Without this, editor width drifts.
4. `.cm-content > [contenteditable=false]` (every widget) gets `contain: paint !important`. This is the single largest performance lever — keep it.
5. Selection is uniformly `--text-selection`. The token differs per theme (20 % accent in light, 33 % in dark).
6. Caret uses `--caret-color` resolving to `--text-normal`. Vim's fat cursor uses fixed bright green or `--interactive-accent`.
7. Gutter is **transparent**, faint-color, 12 px tabular-nums, 24 px gap on the inline-end. No default border.
8. Readable-line-width caps `.cm-sizer`, `.cm-content`, and `.cm-line` to 700 px max-width with auto margins. Tables explicitly opt out.
9. Search and replace bars sit at the top of the source view via a `flex-direction: column-reverse` flip on `.markdown-source-view.is-searching` / `.is-replacing`. (See `editor-document-search.md` for full details.)
10. Don't strip the `.cm-force-border` and `.cm-tab-wrap-hack` rules — they fix bugs that re-emerge without them.
