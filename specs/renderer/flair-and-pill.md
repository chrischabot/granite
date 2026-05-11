# Flair and Pill

> Two small inline labels:
>
> - **`.flair`** — a small uppercase tag-style badge (e.g. "PRO", "BETA", "NEW", "INSTALLED"). Stand-alone primitive.
> - **`.multi-select-pill`** — the pill in a multi-select input. See [`multi-select.md`](multi-select.md) for the full spec.

This file documents `.flair`. `.multi-select-pill` follows the same `--pill-*` token family — see `multi-select.md` for details.

Source: `renderer/app.css:8043-8065`. Tokens: see [`design-tokens.md`](design-tokens.md) §7 (Flair section).

---

## 1. `.flair` (`app.css:8043-8056`)

```css
.flair {
  background-color: var(--flair-background);          /* --interactive-normal */
  border-radius: var(--radius-s);                      /* 4px */
  corner-shape: var(--corner-shape);
  color: var(--flair-color);                           /* --text-normal */
  font-size: 10px;
  letter-spacing: 0.05em;
  margin-inline-start: var(--size-4-2);                /* 8px */
  padding: var(--size-2-1) var(--size-2-2);            /* 2px 4px */
  position: relative;
  text-transform: uppercase;
  white-space: nowrap;
  vertical-align: middle;
}
```

Default flair:
- Tiny (10 px) uppercase label with 0.05em letter-spacing.
- 4 px corner radius.
- Default fill is `--interactive-normal` (light: white / dark: `#363636`); default text `--text-normal`.
- Vertically centered against adjacent text.
- 8 px margin-inline-start from prior content.
- Tight padding: 2 × 4 px.

---

## 2. Variants (`app.css:8058-8065`)

```css
.flair.mod-flat {
  vertical-align: top;
}

.flair.mod-pop {
  --flair-background: var(--interactive-accent);     /* purple */
  --flair-color:      var(--text-on-accent);          /* white */
}
```

- `.mod-flat` switches `vertical-align` from `middle` to `top` — used when the flair sits next to a multi-line block instead of inline text.
- `.mod-pop` paints the flair in the accent color with white text — used for highlighted badges (e.g. "NEW" or pro-version markers).

---

## 3. Usage examples

Throughout the renderer, `.flair` is used in:
- `.community-item .flair` — overrides to a 10 %-accent background (`--background-modifier-active-hover`) with accent text. See `settings-community-plugins.md` §4.
- `.suggestion-flair` — the optional badge on suggestion items. Default chrome.
- `.tree-item-flair` — file count or unread count on tree rows. Inherits `.flair` defaults.
- `.suggestion-item.mod-complex .suggestion-flair` — overrides to muted color with `--icon-opacity`.
- `.text-icon-button .flair` — sits inline next to a button label.
- `.changelog-item:before` — the colored label tag at the start of changelog entries (NOT a `.flair`, but visually similar).

---

## 4. `.tree-item-flair` cross-reference

Tree-item flair (file/unread counts in the file explorer) follows separate rules at `app.css:10799-10818`:

```css
.tree-item-flair-outer {
  padding-inline-start: var(--size-4-1);
  margin-inline-start: auto;                          /* push to row's inline-end */
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.tree-item-flair {
  font-size: var(--font-ui-smaller);                 /* 12px */
  color: var(--text-faint);
  line-height: 1;
  border-radius: var(--radius-s);
}

@media (hover: hover) {
  .tree-item-self:hover .tree-item-flair { color: var(--text-muted); }
}
```

(Already documented in `tree-item.md` §4. The `.tree-item-flair` is **larger** (12 px vs `.flair`'s 10 px) and is **not** uppercase.)

---

## 5. Reproducer build order

1. `.flair` is a 10 px uppercase 0.05em-letterspaced label with 4 px radius and 2 × 4 padding.
2. Default colors: `--interactive-normal` background (low-contrast neutral) + `--text-normal` text. Tokens are `--flair-background` and `--flair-color`.
3. Two modifiers:
   - `.mod-flat` — top-aligns vertically.
   - `.mod-pop` — accent fill with white text.
4. Consumers may locally re-bind `--flair-background` and `--flair-color` for context-specific colors (e.g. `.community-item .flair` uses 10 %-accent fill).
5. `.tree-item-flair` is a different primitive (12 px, non-uppercase, count-style) — don't conflate.
6. `.multi-select-pill` uses the `--pill-*` token family (different from `--flair-*`) — see `multi-select.md`.
