# Editor — Reading Mode

> The fully-rendered view of a markdown note. No interactive editing — purely display. Built on `.markdown-preview-view` plus the shared `.markdown-rendered` rules.

Source: `renderer/app.css`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. Top-level wrappers (`app.css:4633-4664`)

```css
.markdown-reading-view {
  display: flex;
  flex-direction: column;
}

.markdown-preview-view {
  font-size:   var(--font-text-size);                /* 16px */
  font-family: var(--font-text);
  line-height: var(--line-height-normal);            /* 1.5 */
  width: 100%;
  height: 100%;
  padding: var(--file-margins);                       /* 32px 32px */
  position: relative;
  overflow-y: auto;
  overflow-wrap: break-word;
  color: var(--text-normal);
  user-select: text;                                  /* opt back into selection */
  -webkit-user-select: text;
  scrollbar-gutter: stable;
}

.workspace-leaf-content.is-read-mode .markdown-preview-view {
  width: 100%;
  inset-inline-start: 0;
  background-color: var(--background-primary);
}

.markdown-preview-view.is-readable-line-width .markdown-preview-sizer {
  max-width: var(--file-line-width);                  /* 700px */
  margin-left: auto;
  margin-right: auto;
}
```

Reproducer rules:
- The reading view is a flex column. Its scroller is `.markdown-preview-view`.
- 32 × 32 padding (`--file-margins`) all around — these are the page-margins around the document.
- `user-select: text` — counteracts the `<body>`'s `user-select: none`. Reading-mode text is selectable by the user.
- `scrollbar-gutter: stable` — prevents content reflow when the scrollbar appears mid-render.
- When the leaf is dedicated read-mode (`.is-read-mode`), the view fills the leaf and uses `--background-primary`.
- When `.is-readable-line-width`, the inner `.markdown-preview-sizer` caps at 700 px with auto margins.

---

## 2. `.markdown-rendered` shared rules (`app.css:4666-4689`)

```css
.markdown-rendered { tab-size: var(--indent-size); }   /* 4 */

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

`.markdown-rendered` is a class shared by reading mode (`.markdown-preview-view`), live-preview widget contents, hover popovers, and embedded markdown. The common rules ensure:
- Tab characters expand to 4 spaces (`--indent-size: 4`).
- The first/last child of the rendered document loses its outer margin so the document doesn't have double-padding.
- The "pusher" element (a no-op vertical-spacer used by virtualization) is treated correctly when followed by a non-UI div.

Plus all the typed children rules (`p`, `h1-h6`, `ul/ol`, `table`, `pre/code`, `blockquote`, `hr`, etc.) that live elsewhere — see:

- [`typography.md`](typography.md) §3 (headings)
- [`editor-headings-and-lists.md`](editor-headings-and-lists.md) (lists)
- [`editor-tables.md`](editor-tables.md) (tables)
- [`editor-code-blocks.md`](editor-code-blocks.md) (code)
- [`editor-callouts.md`](editor-callouts.md) (callouts)
- [`editor-tags-and-links.md`](editor-tags-and-links.md) (tags + links)
- [`editor-embeds.md`](editor-embeds.md) (embeds)
- [`editor-footnotes.md`](editor-footnotes.md) (footnotes)
- [`editor-properties.md`](editor-properties.md) (frontmatter)

---

## 3. Paragraph (`app.css:14952-14956`)

```css
.markdown-rendered p {
  margin-block-start: var(--p-spacing);   /* 1rem */
  margin-block-end:   var(--p-spacing);
  unicode-bidi: plaintext;                 /* honor each paragraph's own bidi direction */
}
```

Each paragraph has 1 rem top + bottom margin. `unicode-bidi: plaintext` makes the browser auto-detect each paragraph's direction from its content — important for mixed-language documents.

---

## 4. Highlight — `mark` (`app.css:14958-14971`)

```css
.markdown-rendered mark {
  background-color: var(--text-highlight-bg);   /* rgba(255, 208, 0, 0.4) */
  color: var(--text-normal);
}
.markdown-rendered mark .internal-link {
  color: var(--text-normal);
}

/* Source mode equivalents */
.cm-s-obsidian span.cm-formatting-highlight,
.cm-s-obsidian span.cm-highlight {
  background-color: var(--text-highlight-bg);
  color: var(--text-normal);
}
```

`==highlighted==` markdown produces a yellow-40-% wash with normal text color. Source mode uses `.cm-highlight` for the same look. Internal links inside highlights get their color overridden to `--text-normal` to stay legible against the yellow.

---

## 5. Bold and italic in source (`app.css:14973-14987`)

```css
.cm-strong {
  font-weight: calc(var(--font-weight) + var(--bold-modifier));
                                            /* 600 default */
  --link-weight: calc(var(--font-weight) + var(--bold-modifier));
  color: var(--bold-color);                 /* inherit */
}
.cm-em {
  font-style: italic;
  color:       var(--italic-color);         /* inherit */
  font-weight: var(--italic-weight);        /* inherit */
}
.cm-strong.cm-em {
  font-weight: calc(var(--font-weight) + var(--bold-modifier));
}

.cm-s-obsidian span.cm-error { color: var(--text-error); }
```

Source-mode bold/italic styling — derived from the `--bold-modifier: 200` formula, so on variable Inter, bold becomes a smooth 200-weight increase.

---

## 6. `.is-readable-line-width` (`app.css:4660-4664`)

```css
.markdown-preview-view.is-readable-line-width .markdown-preview-sizer {
  max-width: var(--file-line-width);   /* 700px */
  margin-left: auto;
  margin-right: auto;
}
```

When the user toggles "Readable line length" on, `.markdown-preview-sizer` (the inner content wrapper) caps at 700 px. The 32 × 32 page margins remain (they sit on the outer `.markdown-preview-view`), so the actual editable column is 700 px centered with at least 32 px of padding around it.

---

## 7. Search-result `.is-flashing` (`app.css:3224-3230`)

```css
.is-flashing {
  transition: color 0.25s ease, background-color 0.25s ease;
  background-color: var(--text-highlight-bg) !important;   /* yellow */
  color: var(--text-normal);
  mix-blend-mode: var(--highlight-mix-blend-mode);
  border-radius: var(--radius-s);
}
```

When the user jumps to a block link or search result, JS adds `.is-flashing` to the target element. It paints yellow for 250 ms ease, then JS removes the class and the color tweens back. This is how reading mode signals "this is the thing you just navigated to".

---

## 8. Search highlights (`app.css:7822-7848`)

```css
.markdown-rendered .search-highlight > div {
  position: absolute;
  pointer-events: none;
  box-shadow: 0 0 0px 2px var(--text-normal);
  opacity: 0.3;
  mix-blend-mode: var(--highlight-mix-blend-mode);
  border-radius: 2px;
}

.markdown-rendered .search-highlight > div.is-active {
  box-shadow: 0 0 0px 3px var(--text-accent);
  opacity: 1;
}

.cm-s-obsidian span.obsidian-search-match-highlight {
  box-shadow: 0 0 0px 3px var(--text-accent);
  mix-blend-mode: var(--highlight-mix-blend-mode);
  border-radius: 2px;
}

.cm-s-obsidian span.cm-highlight.obsidian-search-match-highlight {
  background-color: var(--text-selection);
}
```

When the user is searching from the right-side panel:
- Reading mode: `.search-highlight > div` paints a 2 px text-color outline (30 % opacity), with the active match getting a 3 px accent outline at full opacity.
- Source mode: `.obsidian-search-match-highlight` paints a 3 px accent outline directly.

---

## 9. Reproducer build order

1. Reading mode is a flex column scroller (`.markdown-preview-view`) with 32 × 32 page margins.
2. Body uses 16 px text font (`--font-text`), 1.5 line height, `--text-normal` color. `user-select: text` overrides body-level selection lock.
3. `scrollbar-gutter: stable` is critical — prevents reflow when scrollbar appears.
4. `.markdown-preview-sizer` caps at 700 px when `is-readable-line-width` is on. Page margins remain on the outer view.
5. Paragraphs: 1 rem block margin, `unicode-bidi: plaintext`.
6. `==highlights==` paint `rgba(255, 208, 0, 0.4)` with `--text-normal` text. Internal links inside highlights override to text-normal.
7. Bold weight = `--font-weight + 200` everywhere — keep the formula.
8. The `.is-flashing` class (added by JS for jump-target indication) tweens for 250 ms ease.
9. Search highlights: outline-only, 30 % opacity for non-active, 3 px accent for active. `mix-blend-mode` ensures readability over varying backgrounds.
10. The `.markdown-rendered` class is shared between reading mode, hover popovers, embedded markdown, and live-preview widget contents — keep its rules in a single block so all consumers stay consistent.
