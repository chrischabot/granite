# Settings — Horizontal Tabs Primitive

> The horizontal sibling of the vertical-tabs primitive. Used when settings/options are short enough to fit in a top tab bar (e.g. mobile settings, certain plugin option modals).

Source: `renderer/app.css:10232-10298`. Tokens: see [`design-tokens.md`](design-tokens.md). The vertical primitive is in [`settings-vertical-tabs.md`](settings-vertical-tabs.md).

---

## 1. DOM scaffold

```
.modal.mod-form … (or any modal)
  └─ .horizontal-tab-header
  │    └─ .horizontal-tab-nav-item [.is-active]
  │         ├─ .vertical-tab-nav-item-icon       ← reuses vertical's icon class!
  │         └─ (text label)
  └─ .horizontal-tab-content                       ← scrollable pane
       └─ … content …
```

Note the icon class is shared with vertical tabs: `.vertical-tab-nav-item-icon` works for both. The hover/active rules combine both selectors.

---

## 2. Header

```css
.horizontal-tab-header {
  display: flex;
}
```

Just a flex row of nav items.

---

## 3. Nav items — shared with vertical (`app.css:10236-10298`)

```css
.horizontal-tab-nav-item,
.vertical-tab-nav-item {
  padding: var(--size-4-1) var(--size-4-2);        /* 4px 8px */
  margin-bottom: 0;
  user-select: none;
  cursor: var(--cursor);
  font-size: calc(var(--font-ui-small) + 1px);     /* 14px */
  border-radius: var(--radius-s);                   /* 4px */
  corner-shape: var(--corner-shape);
}

body:not(.is-phone) .horizontal-tab-nav-item.is-active,
body:not(.is-phone) .vertical-tab-nav-item.is-active {
  background-color: var(--background-modifier-hover);
}

.horizontal-tab-nav-item:hover .vertical-tab-nav-item-icon,
.vertical-tab-nav-item:hover .vertical-tab-nav-item-icon,
.horizontal-tab-nav-item.is-active .vertical-tab-nav-item-icon,
.vertical-tab-nav-item.is-active .vertical-tab-nav-item-icon {
  color: var(--text-normal);
}

.horizontal-tab-nav-item.mobile-tap,
.vertical-tab-nav-item.mobile-tap {
  --icon-color: var(--text-normal);
  background-color: var(--background-modifier-hover);
  color: var(--text-normal);
}

@media (hover: hover) {
  .horizontal-tab-nav-item:hover,
  .vertical-tab-nav-item:hover {
    background-color: var(--background-modifier-hover);
  }
}
```

Same as vertical: 14 px text, 4 × 8 padding, 4 px radius. Active = `--background-modifier-hover`.

---

## 4. Content (`app.css:10299-10306`)

```css
.horizontal-tab-content,
.vertical-tab-content {
  background-color: var(--background-primary);
  padding-inline-start: var(--size-4-12);          /* 48px */
  padding-inline-end:   var(--size-4-12);
  container-type: inline-size;
}
```

Content pane reuses the vertical's chrome — 48 px sides, container-type for responsive nested items.

---

## 5. When used

Horizontal tabs appear in:
- Mobile settings (the desktop's vertical sidebar collapses to a top horizontal nav-bar — see [`settings-mobile.md`](settings-mobile.md)).
- Some plugin option modals that don't have enough sections to warrant a sidebar.
- The "Restricted mode" modal which has a few tabs.

---

## 6. Reproducer build order

1. Use the same `.horizontal-tab-nav-item` class as `.vertical-tab-nav-item`. Most rules use both selectors to share styling.
2. Header is just a flex row; no `.horizontal-tab-header-group` equivalent (groups are vertical-only).
3. Content pane is identical to vertical's content pane — 48 px sides, container-query host.
4. Active state is `--background-modifier-hover`, same as vertical.
5. Mobile uses horizontal tabs as the primary settings layout — vertical collapses to it on `.is-phone` (see `settings-mobile.md`).
