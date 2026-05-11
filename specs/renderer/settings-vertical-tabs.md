# Settings — Vertical Tabs Primitive

> The vertical-tabs layout primitive used by the Settings modal and the Community Plugins / Themes browsers.

Source: `renderer/app.css:10236-10362`. Tokens: see [`design-tokens.md`](design-tokens.md). The full Settings-specific behavior is in [`settings-modal.md`](settings-modal.md); this file is the reusable primitive.

---

## 1. DOM scaffold

```
.vertical-tabs-container
  ├─ .vertical-tab-header
  │    └─ .vertical-tab-header-group [.is-collapsed]
  │         ├─ .vertical-tab-header-group-title
  │         └─ .vertical-tab-header-group-items [data-section="<id>"]
  │              └─ .vertical-tab-nav-item [.is-active]
  │                   ├─ .vertical-tab-nav-item-icon
  │                   ├─ .vertical-tab-nav-item-title
  │                   └─ .vertical-tab-nav-item-chevron
  └─ .vertical-tab-content-container
       └─ .vertical-tab-content                          (scrollable pane)
            ├─ h1 (hidden) | h2 | h3 | h4
            └─ … content …
```

Already documented in `settings-modal.md` §3-§5; this is a cross-reference.

---

## 2. Container (`app.css:10307-10314`)

```css
.vertical-tabs-container {
  display: flex;
}

.vertical-tab-header {
  padding: var(--size-4-3);                        /* 12px */
  background-color: var(--modal-sidebar-background);
}
```

Two-column flex: header on the left, content on the right.

---

## 3. Tab nav items — shared with horizontal tabs (`app.css:10236-10298`)

`.vertical-tab-nav-item` shares its styling with `.horizontal-tab-nav-item`:

| Property | Value |
| --- | --- |
| `padding` | `4px 8px` |
| `font-size` | `calc(var(--font-ui-small) + 1px)` = 14 px |
| `border-radius` | `4px` |
| `cursor` | `var(--cursor)` |
| Hover bg | `var(--background-modifier-hover)` |
| Active bg | `var(--background-modifier-hover)` (same as hover) |
| Mobile-tap | `var(--background-modifier-hover)` + `--text-normal` |

Vertical-specific:

```css
.vertical-tab-nav-item { display: flex; }
.vertical-tab-nav-item-chevron { display: none; }   /* hidden on desktop */

.vertical-tab-nav-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-s);
  margin-inline-end: var(--size-4-2);             /* 8px gap before title */
  flex-shrink: 0;
  color: var(--text-muted);
}

.vertical-tab-nav-item-title {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Each tab is a flex row: `[icon] [title-grow] [chevron]`. The chevron is hidden on desktop (mobile shows it as an "open" caret).

---

## 4. Header groups (`app.css:10316-10341`)

```css
.vertical-tab-header-group-items {
  display: flex;
  flex-direction: column;
  --icon-size:   var(--icon-s);                    /* 16px */
  --icon-stroke: var(--icon-s-stroke-width);
}

.vertical-tab-header-group-items[data-section="community-plugins"] .vertical-tab-nav-item-icon {
  display: none;                                    /* community plugins are text-only */
}

body:not(.is-phone) .vertical-tab-header-group-items {
  gap: var(--size-2-1);                             /* 2px between items */
}

.vertical-tab-header-group-title {
  font-size:   var(--font-ui-smaller);             /* 12px */
  color:       var(--text-faint);
  font-weight: var(--font-semibold);                /* 600 */
  padding: var(--size-4-2);                         /* 8px */
  user-select: none;
}

.vertical-tab-header-group {
  padding: var(--size-4-3) 0;                       /* 12px top/bottom */
}
```

Groups are vertical-stacked sections, each with a 12 px-faint title and a flex column of items (2 px gap on non-phone).

The `[data-section="community-plugins"]` selector hides icons specifically for community-plugin entries — those are text-only because plugin names are too varied for a consistent icon set.

---

## 5. Content pane (`app.css:10299-10362`)

```css
.horizontal-tab-content,
.vertical-tab-content {
  background-color: var(--background-primary);
  padding-inline-start: var(--size-4-12);          /* 48px */
  padding-inline-end:   var(--size-4-12);
  container-type: inline-size;
}

.vertical-tab-content-container {
  overflow: hidden;
  flex-grow: 1;
}

.vertical-tab-content {
  overflow-y: auto;
  height: 100%;
  padding-top: var(--size-4-8);                    /* 32px */
  padding-bottom: var(--size-4-16);                /* 64px */
}

.vertical-tab-content h1 { display: none; }         /* h1 is the page title (in tab nav) */
.vertical-tab-content h2 {
  font-size:   var(--font-ui-medium);              /* 15px */
  font-weight: var(--font-semibold);                /* 600 */
}

@media (forced-colors: active) {
  .horizontal-tab-nav-item,
  .vertical-tab-nav-item {
    --interactive-accent: SelectedItem;
  }
}
```

Content pane:
- `--background-primary` background (page color).
- 48 px horizontal padding, 32 px top, 64 px bottom (deep bottom so the last item isn't flush against the modal footer).
- `container-type: inline-size` enables `@container (max-width: 340px)` rules in `.setting-item` (see `settings-modal.md` §6).
- h1 hidden (the section title is in the tab nav). h2 normalized to 15 px / 600 — overrides the markdown heading scale.
- High-contrast mode swaps the active tab's accent for `SelectedItem` system color.

---

## 6. Reproducer build order

1. Build the primitive once and reuse for Settings, Community Plugins, Community Themes.
2. Container is a flex row: header (fixed width, 25 % up to 250 px) | content (grows).
3. Tab items are 14 px text, 4 × 8 padded, 4 px radius. Active = `--background-modifier-hover`.
4. Group titles are 12 px semibold faint, 8 px padded.
5. Content pane: `--background-primary`, 48 px sides, 32 px top, 64 px bottom. h1 hidden; h2 = 15 px / 600.
6. `container-type: inline-size` enables responsive layout for nested setting-items.
7. `[data-section]` attribute on the items container drives section-specific overrides (e.g. icon hiding for community plugins).
8. Mobile shows `.vertical-tab-nav-item-chevron`; desktop hides it.
