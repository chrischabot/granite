# Empty State

> The full-leaf "nothing to show" placeholder. Used when a sidebar pane has no items, when a leaf has no file open, when search returns no results, etc.

Source: `renderer/app.css:4044-4136`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. DOM scaffold

```
.empty-state                              ← absolute-positioned full-leaf overlay
  └─ .empty-state-container
       ├─ <icon or graphic>                ← optional
       ├─ .empty-state-title                ← heading text
       └─ .empty-state-action-list
            └─ .empty-state-action          ← clickable text-link action
            └─ .empty-state-action …        ← more actions
```

---

## 2. `.empty-state` container (`app.css:4044-4054`)

```css
.empty-state {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  inset-inline-start: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
```

Fills the leaf, centers content vertically and horizontally. Used as a layer over an otherwise-empty leaf.

---

## 3. `.empty-state-container` (`app.css:4056-4061`)

```css
.empty-state-container {
  max-width:  480px;
  max-height: 280px;
  margin: 20px;
  text-align: center;
}
```

Inner content wrapper, capped at 480 × 280 px with 20 px margin (so it floats clear of the leaf edges). Text-center.

---

## 4. `.empty-state-title` (`app.css:4063-4069`)

```css
.empty-state-title {
  margin: 20px 0;
  font-weight: var(--h2-weight);                    /* 600 */
  font-size:   var(--h2-size);                       /* 1.462em ≈ 23px @ 16 */
  line-height: var(--line-height-tight);             /* 1.3 */
  position: relative;
}
```

Heading sized like an h2 (semibold). 20 px top/bottom margin.

---

## 5. `.empty-state-action-list` and `.empty-state-action` (`app.css:4071-4092`)

```css
.empty-state-action-list {
  font-size:   var(--font-text-size);               /* 16px */
  line-height: var(--line-height-tight);
  color: var(--text-muted);
  margin-top: 20px;                                 /* 20px below the title */
}

.empty-state-action {
  cursor: var(--cursor);
  line-height: 36px;
  color: var(--text-accent);                        /* purple action link */
}

@media (hover: hover) {
  .empty-state-action:hover { color: var(--text-accent-hover); }
}

.empty-state-action.mobile-tap {
  color: var(--text-accent-hover);
}
```

Action list:
- Body text in `--text-muted` (16 px).
- Each action link in `--text-accent` (purple).
- Line-height `36px` so multiple actions stack with comfortable space.
- Hover/tap brightens to `--text-accent-hover`.

---

## 6. `.feedback-banner` (`app.css:4094-4136`)

A related but distinct surface — a callout banner shown on phone (only):

```css
.feedback-banner-container {
  display: none;
  padding-top: var(--size-4-4);                     /* 16px */
  padding-bottom: var(--size-4-5);                   /* 20px */
  padding-right: max(var(--size-4-4), var(--safe-area-inset-right));
  padding-left:  max(var(--size-4-4), var(--safe-area-inset-left));
}

body.is-phone .feedback-banner-container {
  display: block;                                    /* show on phone only */
}

.feedback-banner { position: relative; }

.feedback-banner-title {
  color: var(--text-muted);
  font-weight: var(--font-semibold);                /* 600 */
  font-size: var(--font-ui-small);                  /* 13px */
  margin-bottom: var(--size-4-4);                   /* 16px */
  padding-inline-start: var(--size-4-4);
}

.feedback-banner-content {
  font-size: var(--font-ui-small);
  display: flex;
  flex-direction: column;
  row-gap: var(--size-4-4);                         /* 16px */
  background-color: var(--setting-items-background);
  padding: var(--size-4-4);
  border-radius: var(--setting-items-radius);       /* 12px */
}

.feedback-banner-dismiss-button {
  position: absolute;
  font-weight: var(--font-semibold);
  top: -8px;
  inset-inline-end: var(--size-4-2);
  padding: var(--size-4-2) var(--size-4-1);
  color: var(--interactive-accent);
  font-size: var(--font-ui-smaller);                /* 12px */
}
```

Phone-only banner with:
- 13 px semibold muted title.
- 12 px radius capsule body (matches `.setting-group .setting-items` chrome).
- Dismiss button in accent color, absolute-positioned at top-right with -8 px top (overhanging the banner edge).

---

## 7. Reproducer build order

1. `.empty-state` is an absolute overlay that fills the leaf and centers its content.
2. Container max-width 480 / max-height 280, 20 px margin from leaf edges.
3. Title is h2-style (1.462em / 600).
4. Action links are accent-colored, 36 px line-height. Hover brightens.
5. The pane's "what to do" text is 16 px / muted; each action sits below at 16 px / accent.
6. Feedback banners are phone-only — JS shows them via `body.is-phone .feedback-banner-container { display: block }`.
7. Use `.empty-state` for full-pane empty states; for inline empty rows (e.g. inside settings or lists), use `.list-item.mod-empty` or `.suggestion-empty` instead.
