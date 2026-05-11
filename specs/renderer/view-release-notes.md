# View — Release Notes

> The "What's new" pane that opens after an update, showing the changelog for the new version. Renders as markdown.

Source: `renderer/app.css:4766-4778`, `7546-7577`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. `.release-notes-view` (`app.css:4766-4778`)

```css
.release-notes-view {
  padding: var(--file-margins);                /* 32px 32px */
}

.release-notes-view .markdown-preview-view {
  overflow: visible;                            /* allow content to overflow into outer scroll */
}

.release-notes-view .is-readable-line-width {
  max-width: var(--file-line-width);            /* 700px */
  margin-left: auto;
  margin-right: auto;
}
```

The release notes pane reuses the markdown-preview-view chrome but with:
- 32 × 32 page margins applied to the wrapper (not the inner preview).
- The preview's own scroll is disabled (`overflow: visible`) — the outer pane handles scrolling.
- `is-readable-line-width` caps at 700 px.

---

## 2. `.changelog-item` (`app.css:7546-7577`)

A single change-log entry with a tagged label prefix:

```css
.changelog-item {
  margin: var(--size-4-2) 0;                    /* 8px top/bottom */
  font-size: var(--font-ui-medium);              /* 15px */
  line-height: var(--line-height);               /* (token used elsewhere — falls through to body) */
}

.changelog-item:before {
  content: attr(data-label);                    /* the label text comes from the DOM attribute */
  width: 50px;
  border-radius: var(--radius-m);                /* 8px */
  font-size: var(--font-ui-small);              /* 13px */
  display: inline-block;
  text-align: center;
  margin-right: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  line-height: 22px;
}

.changelog-item.mod-success:before {
  background-color: var(--background-modifier-success);   /* --color-green */
  color: var(--text-on-accent);                            /* white */
}

.changelog-item.mod-failed:before {
  background-color: var(--background-modifier-error);      /* --color-red */
  color: var(--text-on-accent);
}

.changelog-item.mod-highlighted:before {
  background-color: var(--interactive-accent);             /* purple */
  /* (text color inherits from item — typically remains visible) */
}
```

Each `.changelog-item` has a 50 × 22 px tagged label (e.g. "ADDED", "FIXED", "NEW") rendered via `::before` content from `data-label`. 8 px corner radius, uppercase, 1 px letter-spacing, 13 px font.

Three variants:
- `.mod-success` — green background, white text. Typically used for new features / fixes.
- `.mod-failed` — red background, white text. Used for known issues / removed features.
- `.mod-highlighted` — accent background. Used for headline changes.

The label is followed by 14 px right margin before the body text.

---

## 3. Reproducer build order

1. The release-notes view is just a markdown-preview wrapped in a 32 × 32 padded scroll container.
2. Each entry uses `.changelog-item` with `data-label="<TEXT>"` (e.g. `data-label="NEW"`). The label renders via CSS `::before` — no need for a separate span.
3. Three semantic modifiers paint the label background: success (green), failed (red), highlighted (accent).
4. Label is uppercase 13 px with 1 px letter-spacing — keeps the tag readable at small size.
