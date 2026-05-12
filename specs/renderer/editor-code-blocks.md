# Editor — Code Blocks

> Inline code (single backticks), fenced code blocks (triple backticks), code copy button, syntax highlighting via Prism, plus the source-mode CodeMirror styling for `.cm-inline-code` and `.HyperMD-codeblock`.

Tokens: see [`design-tokens.md`](design-tokens.md) §5. Source: `renderer/app.css`.

---

## 1. Inline code — reading mode (`app.css:11896-11905`)

```css
.markdown-rendered code {
  color: var(--code-normal);                    /* --text-normal */
  font-family: var(--font-monospace);
  background-color: var(--code-background);    /* --background-primary-alt */
  border-radius: var(--code-radius);             /* 4px */
  font-size: var(--code-size);                   /* 0.875em */
  padding: 0.15em 0.3em;
  border: var(--code-border-width) solid var(--code-border-color);
                                                  /* 0px solid --background-modifier-border */
  -webkit-box-decoration-break: clone;            /* each wrapped line gets its own box */
}
```

Inline code:
- Monospace, 87.5 % of body size.
- 4 px corner radius.
- Tinted-paper background (`--background-primary-alt`) — slightly different from the page so it stands out.
- 0 px border by default (themes can opt in).
- `-webkit-box-decoration-break: clone` — when inline code wraps across lines, each fragment gets its own background and corner radii (otherwise they'd share a single rect).

---

## 2. Inline code — source mode (`.cm-inline-code`) (`app.css:11907-11962`)

In CodeMirror, inline code is wrapped in `.cm-inline-code` spans. The renderer makes them look like the rendered version while keeping the surrounding backticks visible (with separate styling).

```css
.cm-s-obsidian span.cm-inline-code {
  color: var(--code-normal);
  font-size: var(--code-size);
  background-color: var(--code-background);
  vertical-align: baseline;
  -webkit-box-decoration-break: clone;
}
```

### 2.1 Nested rules for backtick fragments

The inline code is split by CodeMirror into multiple sibling spans: a `.cm-formatting` opening backtick, the content (one or more `.cm-inline-code`), then a closing `.cm-formatting`. The renderer must paint these as **one continuous pill**:

```css
/* The opening formatting span (left backtick) */
.cm-s-obsidian .cm-inline-code.cm-formatting {
  border-start-start-radius: var(--code-radius);
  border-start-end-radius:   0;
  border-end-start-radius:   var(--code-radius);
  border-end-end-radius:     0;
  padding: 0.15em 0;
  border-width: var(--code-border-width) 0 var(--code-border-width) var(--code-border-width);
                                              /* top + left + bottom; no right */
}

/* The closing formatting span (right backtick) */
.cm-s-obsidian .cm-inline-code:not(.cm-formatting) + .cm-formatting.cm-inline-code {
  border-start-start-radius: 0;
  border-start-end-radius:   var(--code-radius);
  border-end-start-radius:   0;
  border-end-end-radius:     var(--code-radius);
  padding-inline-end: 0;
  border-width: var(--code-border-width) var(--code-border-width) var(--code-border-width) 0;
                                              /* top + right + bottom; no left */
}

/* Middle content (between the formatting spans) */
.cm-s-obsidian .cm-inline-code.cm-formatting ~ .cm-inline-code:not(.cm-formatting) {
  border-radius: 0;
  padding: 0.15em 0;
  border-left: none;
  border-right: none;
}

/* Default content with full pill (when there's no formatting wrap) */
.cm-s-obsidian .cm-inline-code:not(.cm-formatting) {
  border-radius: var(--code-radius);
  padding: 0.15em 0.3em;
  border-width: var(--code-border-width);
}

.cm-s-obsidian .cm-inline-code {
  border-color: var(--code-border-color);
  border-style: solid;
}

/* Indented code (4-space) inside inline-code: no extra background */
.cm-s-obsidian span.cm-inline-code span.cm-inline-code.cm-hmd-indented-code {
  background-color: transparent;
}

.cm-s-obsidian span.cm-inline-code span.cm-inline-code:not(.cm-formatting):not(.cm-hmd-indented-code):not(.obsidian-search-match-highlight) {
  background-color: var(--code-background);
  vertical-align: baseline;
}

/* Hidden tokens (collapsed by editor when cursor is far) */
.cm-s-obsidian span.cm-inline-code span.cm-inline-code.hmd-hidden-token {
  font-size: 0;
}
```

The result: even though CodeMirror splits the code into multiple spans, the user sees a single seamless pill with rounded outer corners and zero inter-span gaps.

---

## 3. Fenced code blocks — reading mode (`app.css:11964-12007`)

```css
.markdown-rendered pre {
  position: relative;
  padding: var(--size-4-3) var(--size-4-4);    /* 12px 16px */
  min-height: 38px;
  background-color: var(--code-background);   /* --background-primary-alt */
  border-radius: var(--code-radius);            /* 4px */
  white-space: var(--code-white-space);         /* pre-wrap */
  border: var(--code-border-width) solid var(--code-border-color);
                                                 /* 0px solid by default */
  overflow-x: auto;
}

.markdown-rendered pre code {
  border: none;                                 /* drop the inline-code chrome inside <pre> */
  padding: 0;
  background-color: transparent;
}

.markdown-rendered li > pre {
  margin: 0;                                    /* tight in lists */
}

/* Copy-code button - only visible on hover */
.markdown-rendered pre:not(:hover) > button.copy-code-button {
  display: none;
}

.markdown-rendered button.copy-code-button {
  margin: 6px;
  padding: 6px 8px;
  height: auto;
  background-color: transparent;
  box-shadow: none;
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);            /* 12px */
  font-family: var(--font-interface);
  position: absolute;
  top: 0;
  inset-inline-end: 0;
}

@media (hover: hover) {
  .markdown-rendered button.copy-code-button:hover {
    background-color: var(--background-modifier-hover);
  }
}
```

Reproducer rules:
- Pre is the outer container; the inner `<code>` (which `<pre><code>` wraps by markdown convention) is **stripped** of its own background/border/padding so the pre's chrome wins.
- 12 × 16 padding.
- `min-height: 38px` so even single-line code blocks read as blocks (not as inline-code boxes).
- `pre-wrap` so long code wraps within the block (the user toggles this in settings).
- `overflow-x: auto` for non-wrappable content.
- The copy button is `position: absolute; top: 0; inset-inline-end: 0; margin: 6px; padding: 6px 8px`. Hidden by default, revealed on `pre:hover`.

---

## 4. Source-mode fenced code (`.HyperMD-codeblock`)

The fenced code block in source mode is wrapped in `.cm-line.HyperMD-codeblock`. Each line gets:

- `font-family: var(--font-monospace)` (CodeMirror config).
- `background-color: var(--code-background)`.
- Rounded corners only on the first/last line of the block (the `.HyperMD-codeblock-begin` / `-end` modifier classes).
- The opening/closing ` ``` ` delimiters use `--text-faint` like other formatting characters.

(The exact selectors live in CodeMirror's `obsidian.less` build — too many to enumerate here, but the design intent is "match the rendered look closely while keeping the fence markers visible".)

---

## 5. Prism syntax highlighting (`app.css:12136+`)

`.cm-s-obsidian` consumes Prism token classes for source-mode highlighting; `.markdown-rendered .language-*` consumes them in reading mode. The full set of token color tokens:

```
--code-normal:       var(--text-normal)        /* default */
--code-comment:      var(--text-faint)
--code-function:     var(--color-yellow)
--code-important:    var(--color-orange)
--code-keyword:      var(--color-pink)
--code-operator:     var(--color-red)
--code-property:     var(--color-cyan)
--code-punctuation:  var(--text-muted)
--code-string:       var(--color-green)
--code-tag:          var(--color-red)
--code-value:        var(--color-purple)
```

Mapping to Prism token classes (see `app.css:12136-13170` for the full list):

| Prism class | Color token |
| --- | --- |
| `.token.comment`, `.token.prolog`, `.token.doctype`, `.token.cdata` | `--code-comment` |
| `.token.punctuation` | `--code-punctuation` |
| `.token.namespace` | (opacity 0.7) |
| `.token.property`, `.token.tag`, `.token.boolean`, `.token.number`, `.token.constant`, `.token.symbol`, `.token.deleted` | `--code-property` |
| `.token.selector`, `.token.attr-name`, `.token.string`, `.token.char`, `.token.builtin`, `.token.inserted` | `--code-string` |
| `.token.operator`, `.token.entity`, `.token.url`, `.language-css .token.string`, `.style .token.string` | `--code-operator` |
| `.token.atrule`, `.token.attr-value`, `.token.keyword` | `--code-keyword` |
| `.token.function`, `.token.class-name` | `--code-function` |
| `.token.regex`, `.token.important`, `.token.variable` | `--code-important` |
| `.token.bold` | `font-weight: bold` |
| `.token.italic` | `font-style: italic` |
| `.token.entity` | `cursor: help` |

(The exhaustive selector list lives at `app.css:12136-13170`. Reproducer can copy that block verbatim — it's a long but mechanical dictionary.)

---

## 6. Mermaid diagrams (`app.css:12009-12100ish`)

```css
.theme-dark .mermaid > svg {
  /* dark-theme overrides for Mermaid diagram colors */
}
```

Mermaid diagrams render as SVGs inside `.mermaid` blocks. Theme-dark overrides paint them with theme-appropriate colors. Mermaid is loaded from `lib/mermaid.min.js`.

---

## 7. The `.cm-table-widget` (CodeMirror table widget) (`app.css:3697-3795`)

The source editor renders markdown tables as a widget so they can be interactively edited:

```css
.markdown-source-view.mod-cm6 .cm-table-widget {
  /* the widget container - similar styling to rendered tables */
  /* with extra states for selection, drag handles, etc. */
}
.markdown-source-view.mod-cm6 .cm-table-widget.is-loading { /* … */ }
.markdown-source-view.mod-cm6 .cm-table-widget .table-wrapper { /* … */ }
.markdown-source-view.mod-cm6 .cm-table-widget tr { /* … */ }
.markdown-source-view.mod-cm6 .cm-table-widget th,
.markdown-source-view.mod-cm6 .cm-table-widget td { /* … */ }
/* selection states */
.markdown-source-view.mod-cm6 .cm-table-widget th.is-selected .table-cell-wrapper,
.markdown-source-view.mod-cm6 .cm-table-widget td.is-selected .table-cell-wrapper { /* … */ }
.markdown-source-view.mod-cm6 .cm-table-widget th.is-selected::after,
.markdown-source-view.mod-cm6 .cm-table-widget td.is-selected::after { /* … */ }
/* drag/drop state */
.markdown-source-view.mod-cm6 .cm-table-widget.has-selection { /* … */ }
.markdown-source-view.mod-cm6 .cm-table-widget.has-selection .cm-content { /* … */ }
.markdown-source-view.mod-cm6 .cm-table-widget.has-selection .cm-selectionLayer,
.markdown-source-view.mod-cm6 .cm-table-widget.has-selection .cm-cursorLayer { /* … */ }
.markdown-source-view.mod-cm6 .cm-table-widget.is-selected { /* … */ }
.markdown-source-view.mod-cm6 .cm-table-widget.is-selected table::after { /* … */ }
```

(Full selectors at `app.css:3691-3795` — see `editor-tables.md` for table-specific details.)

---

## 8. Reproducer build order

1. Inline code is **always** monospace + 87.5 % size + tinted background + 4 px radius. `box-decoration-break: clone` so wrapped fragments tile correctly.
2. Source-mode inline code: split rendering across `.cm-formatting` open + content + `.cm-formatting` close spans. Match the four corner-radius patterns above so they look like a continuous pill.
3. Fenced code: `<pre>` is the chrome (12 × 16 padding, 4 px radius, tinted bg, `pre-wrap` whitespace). `<code>` inside is stripped of its own chrome.
4. Copy button is `position: absolute; top: 0; inset-inline-end: 0; margin: 6px; padding: 6px 8px`. Hidden until `pre:hover`. 12 px font using interface family.
5. Prism token classes are mapped to the `--code-*` color tokens via the dictionary at `app.css:12136-13170`. Treat the whole block as a single dependency — copy verbatim.
6. The CodeMirror table widget reuses the rendered-table styling but adds selection/drag/has-selection states. See `editor-tables.md` for table chrome.
7. Mermaid is loaded as a plugin lib; only theme-dark overrides need to be specified for it.
