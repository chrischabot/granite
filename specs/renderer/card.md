# Card

> The selectable card primitive used by theme picker, vault picker, and other grid-of-options surfaces. See also [`buttons.md`](buttons.md) §5 for the full ruleset.

Source: `renderer/app.css:7475-7543`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. DOM and rules

```
.card-container [.mod-horizontal]
  └─ .card [.u-clickable] [.is-selected]
       ├─ .card-title
       ├─ .card-description
       └─ <ul>
            └─ <li> …
```

Full CSS at `app.css:7475-7543`. Summary:

- **Container** (`.card-container`): flex; `.mod-horizontal` switches to flex column.
- **Card** (`.card`): `--background-secondary-alt` background, 4 px radius, 1 px border `--background-modifier-border`, 15 × 30 padding, 10 px sides margin, flex-grow.
- **Hover** (when `.u-clickable`): border switches to `--interactive-accent`, background to 10 % accent.
- **Selected** (`.is-selected`): border `--interactive-accent`, background to 20 % accent.
- **Title**: 20 px / 30 px line-height / muted, centered, 8 px bottom margin.
- **Description**: 13 px / 20 px line-height / muted, flex-grow.
- **Lists inside cards**: `padding: 0` for the ul, 5 px top/bottom margin per li. Horizontal mode pulls 24 px left padding on the ul.

---

## 2. Reproducer build order

1. Cards are selectable rectangles with 4 px radius and 1 px border. Use `--background-secondary-alt` for the fill.
2. Hover and `.is-selected` swap the border to accent and add a 10 % / 20 % accent fill.
3. Title is 20 px centered muted; description is 13 px / 20 px line-height muted.
4. Use `.card-container.mod-horizontal` for stacked layouts (vertical column of cards). Default is horizontal row.
