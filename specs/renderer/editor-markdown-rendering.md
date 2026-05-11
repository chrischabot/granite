# Editor — Markdown Rendering

> The shared rules under `.markdown-rendered` — applied in reading mode, hover popovers, embedded markdown, and live-preview widget contents. This is a cross-reference doc; the per-element rules live in their own files.

Source: `renderer/app.css:4666-4689`, plus typed children rules throughout. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. The `.markdown-rendered` class

`.markdown-rendered` is added by JS to any element rendering markdown content. Consumers:

- **Reading mode**: `.markdown-preview-view .markdown-rendered`.
- **Hover popovers**: `.popover.hover-popover .markdown-rendered`.
- **Embedded markdown**: `.markdown-embed .markdown-rendered`.
- **Inline embeds**: `.inline-embed .markdown-rendered`.
- **CodeMirror widgets** (live-preview): `.cm-callout .markdown-rendered`, `.cm-table-widget .markdown-rendered`.

The shared rules ensure that markdown looks identical wherever it's rendered.

---

## 2. Shared baseline (`app.css:4666-4689`)

```css
.markdown-rendered {
  tab-size: var(--indent-size);                  /* 4 */
}

.markdown-rendered.rtl { direction: rtl; }

.markdown-rendered > :first-child { margin-top: 0; }
.markdown-rendered > :last-child  { margin-bottom: 0; }

.markdown-rendered > .markdown-preview-section > .markdown-preview-pusher + div:not(.mod-ui) > :first-child,
.markdown-rendered > .markdown-preview-section > .mod-ui + div:not(.mod-ui) > :first-child {
  margin-top: 0;
}

.markdown-rendered > .markdown-preview-section > div:last-child > :last-child {
  margin-bottom: 0;
}
```

Common to all markdown surfaces:
- Tab characters expand to 4 spaces.
- The first/last child of the rendered document loses its margin (so the parent's padding works without double-spacing).
- Special margin handling for "pusher" elements (used by virtualization) and "UI" sections that aren't part of the document content.

---

## 3. Per-element specs (cross-reference)

Each markdown element has its own dedicated spec file:

| Element | Spec file |
| --- | --- |
| Headings (h1-h6) | [`typography.md`](typography.md) §3 |
| Paragraphs | [`editor-reading-mode.md`](editor-reading-mode.md) §3 |
| Bold / italic / strikethrough | [`typography.md`](typography.md) §5, [`editor-source-mode.md`](editor-source-mode.md) |
| Highlight (`==text==`) | [`editor-reading-mode.md`](editor-reading-mode.md) §4 |
| Lists (ul / ol / task-list) | [`editor-headings-and-lists.md`](editor-headings-and-lists.md) |
| Tables | [`editor-tables.md`](editor-tables.md) |
| Inline code / fenced code blocks | [`editor-code-blocks.md`](editor-code-blocks.md) |
| Callouts | [`editor-callouts.md`](editor-callouts.md) |
| Blockquotes | (token: `--blockquote-*` — `design-tokens.md` §4) |
| Horizontal rules | (token: `--hr-*` — `design-tokens.md` §9) |
| Tags | [`editor-tags-and-links.md`](editor-tags-and-links.md) §1-§2 |
| Internal / external links | [`editor-tags-and-links.md`](editor-tags-and-links.md) §3-§4 |
| Embeds (`![[...]]`) | [`editor-embeds.md`](editor-embeds.md) |
| Footnotes (`[^1]`) | [`editor-footnotes.md`](editor-footnotes.md) |
| Properties (frontmatter) | [`editor-properties.md`](editor-properties.md) |
| Inline title (page title) | [`editor-inline-title.md`](editor-inline-title.md) |
| Math (KaTeX / MathJax) | (rendered via MathJax library — minimal CSS overrides) |
| Mermaid diagrams | (rendered via Mermaid library — see `editor-code-blocks.md` §6) |

---

## 4. Audio / video / image (`app.css:6600-6610`, `editor-embeds.md`)

```css
.workspace-leaf-content img:not([width]),
.workspace-leaf-content audio,
.workspace-leaf-content video {
  max-width: 100%;
}

.workspace-leaf-content .image-container,
.workspace-leaf-content .audio-container,
.workspace-leaf-content .video-container {
  text-align: center;
}
```

When markdown contains direct media references (not embeds), the elements are constrained to leaf width with centered alignment.

---

## 5. Selection (`::selection`)

Selection inside `.markdown-rendered` uses `::selection { background-color: var(--text-selection); }` — the same accent-tinted selection used in the editor.

---

## 6. Reproducer build order

1. Add `.markdown-rendered` to any element rendering markdown.
2. The class itself does very little — most rules are scoped to `.markdown-rendered <element>` (paragraph, heading, table, etc.).
3. Set `tab-size: 4` and zero out outer-edge margins (`> :first-child { margin-top: 0 }`, `> :last-child { margin-bottom: 0 }`).
4. Use `.markdown-rendered.rtl` to flip direction for RTL notes.
5. Cross-reference the per-element specs for full token-driven styling.
6. Surface-specific overrides (popover, embed, etc.) live in `hover-popover.md`, `editor-embeds.md` — they often override font-size or padding without touching the element rules.
