# Editor — Inline Title

> The page title rendered at the top of every markdown note (the file name, displayed as a heading-1-style element). Toggleable via Settings → Editor → Show inline title.

Source: `renderer/app.css:4585-4627`. Tokens: see [`design-tokens.md`](design-tokens.md) §9.

---

## 1. Element

```css
.inline-title {
  color: var(--inline-title-color);                  /* --h1-color = inherit */
  white-space: pre-wrap;
  margin-block-end: var(--inline-title-margin-bottom);  /* 0.5em */
}

.inline-title:not([data-level]) {
  font-size:    var(--inline-title-size);            /* --h1-size = 1.618em */
  font-weight:  var(--inline-title-weight);          /* --h1-weight = 700 */
  line-height:  var(--inline-title-line-height);    /* --h1-line-height = 1.2 */
  font-style:   var(--inline-title-style);          /* normal */
  font-variant: var(--inline-title-variant);        /* normal */
  font-family:  var(--inline-title-font);           /* inherit */
  letter-spacing: -0.015em;                          /* matches h1 */
}

.inline-title h1, .inline-title h2, .inline-title h3,
.inline-title h4, .inline-title h5, .inline-title h6 {
  margin-block-start: 0;
  margin-block-end:   0;
}
```

The inline title looks like a level-1 heading by default — same size, weight, line-height, letter-spacing. The `--inline-title-*` token family aliases the `--h1-*` tokens so themes that customize h1 also customize the inline title. The `not([data-level])` guard ensures the title-as-h1 style only applies when the title isn't already specified at a different heading level.

If the title contains markdown headings (e.g. when the file name is rendered with markdown), those headings get their margins zeroed so they don't add extra space inside the title element.

---

## 2. Visibility (`app.css:4611-4627`)

```css
.hover-popover .inline-title,
.inline-embed   .inline-title { display: none; }

.hover-popover.bases-new-item-popover .inline-title,
.hover-popover .markdown-embed[data-type="heading"] .inline-title { display: block; }

body:not(.show-inline-title) .inline-title:not([data-level]) { display: none; }
body:not(.show-inline-title) .bases-new-item-popover .inline-title { display: block; }
```

Visibility rules:
- Hidden inside hover popovers and inline embeds (the file name is implicit from the link being previewed).
- Two exceptions: bases-new-item-popover always shows; heading-anchor markdown embeds show (so the user knows which file the heading came from).
- Hidden globally when `body` lacks `.show-inline-title` (user setting). Bases new-item still shows even when globally hidden.

---

## 3. RTL bidi (`app.css:4794-4814`)

The inline title (`.inline-title`, `.inline-title h1`) is in the list of mixed-content elements that get `unicode-bidi: plaintext` so each title's direction is auto-detected from its text.

---

## 4. Reproducer build order

1. Render the inline title as an h1-equivalent element with `data-level` unset (so the size/weight rules apply).
2. Use the `--inline-title-*` token family — they alias the `--h1-*` tokens. Don't inline 1.618em / 700 / 1.2 / -0.015em — use the tokens.
3. Hide inside hover popovers and inline embeds; show inside bases-new-item-popover and heading-anchor embeds.
4. Body's `.show-inline-title` flag toggles global visibility.
5. `unicode-bidi: plaintext` for RTL filename support.
