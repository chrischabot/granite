# Settings Modal

> The Settings → vertical-tabs split modal. Vault settings, editor settings, appearance, hotkeys, themes, plugins. The modal uses `.mod-sidebar-layout` plus `.mod-settings`.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css:5100-5300`, `10300-10370`.

---

## 1. DOM scaffold

```
.modal-container
  └─ .modal-bg
  └─ .modal.mod-settings.mod-sidebar-layout
       ├─ .modal-close-button
       └─ .modal-content
            └─ .vertical-tabs-container
                 ├─ .vertical-tab-header
                 │    ├─ .vertical-tab-header-group [.is-collapsed]
                 │    │    ├─ .vertical-tab-header-group-title  (e.g. "Editor")
                 │    │    └─ .vertical-tab-header-group-items [data-section="…"]
                 │    │         └─ .vertical-tab-nav-item [.is-active]
                 │    │              ├─ .vertical-tab-nav-item-icon
                 │    │              ├─ .vertical-tab-nav-item-title
                 │    │              └─ .vertical-tab-nav-item-chevron
                 │    └─ … more groups …
                 └─ .vertical-tab-content-container
                      └─ .vertical-tab-content                         ← scrollable pane
                           ├─ h2                                       ← section title
                           ├─ .setting-item .setting-item-heading
                           ├─ .setting-item                            ← row
                           │    ├─ .setting-item-info
                           │    │    ├─ .setting-item-name
                           │    │    └─ .setting-item-description
                           │    └─ .setting-item-control
                           │         └─ <input>/<button>/<select>/.checkbox-container/...
                           ├─ .setting-group                            ← optional grouped block
                           │    ├─ .setting-group-search                ← optional search inside group
                           │    └─ .setting-items                       ← capsule wrapper
                           │         └─ .setting-item …
                           └─ … more sections …
```

---

## 2. `.modal.mod-settings` (`app.css:5100-5115`)

```css
.modal.mod-settings {
  background-color: var(--settings-background, var(--modal-background));
                                  /* defaults to --background-primary; theme can override */
}

.modal.mod-settings .vertical-tab-header {
  flex: 0 0 25%;
  min-width: 180px;
  max-width: 250px;
  overflow: auto;
  border-inline-end: var(--border-width) solid var(--divider-color);
}

.modal.mod-settings .modal-content {
  margin-top: 0;
  overflow: hidden;
}

.modal.mod-plugin-options .modal-content {
  margin: var(--size-4-6) 0;          /* 24px top/bottom for plugin-options modals */
}

.modal.mod-form {
  max-width: 400px;                    /* form-style modals are narrower */
}
```

The header (left sidebar of tabs) is **flex: 0 0 25%**, capped between 180 px and 250 px, with a 1 px right divider. The content area takes the rest.

---

## 3. `.vertical-tabs-container` and `.vertical-tab-header` (`app.css:10307-10341`)

```css
.vertical-tabs-container {
  display: flex;
}

.vertical-tab-header {
  padding: var(--size-4-3);                 /* 12px */
  background-color: var(--modal-sidebar-background);
                                              /* falls through to default --background-primary */
}

.vertical-tab-header-group-items {
  display: flex;
  flex-direction: column;
  --icon-size:   var(--icon-s);              /* 16px */
  --icon-stroke: var(--icon-s-stroke-width);
}

.vertical-tab-header-group-items[data-section="community-plugins"] .vertical-tab-nav-item-icon {
  display: none;                              /* hide icons for community plugin entries */
}

body:not(.is-phone) .vertical-tab-header-group-items {
  gap: var(--size-2-1);                       /* 2px between items */
}

.vertical-tab-header-group-title {
  font-size:   var(--font-ui-smaller);       /* 12px */
  color:       var(--text-faint);
  font-weight: var(--font-semibold);          /* 600 */
  padding: var(--size-4-2);                   /* 8px */
  user-select: none;
}

.vertical-tab-header-group {
  padding: var(--size-4-3) 0;                 /* 12px top/bottom between groups */
}
```

Layout:
- The tab header is `flex: 0 0 25%` (from `.modal.mod-settings`) — 12 px padded, with `--background-primary` background (or override).
- Tab groups are vertical-stacked with 12 px top/bottom internal padding.
- Group titles are 12 px semibold faint — section labels like "Plugins" / "Community plugins".
- Items inside a group are 2 px-gap flex column (on non-phone).
- Community plugins get no icons (the section is text-only).

---

## 4. `.vertical-tab-nav-item` (`app.css:10236-10264`)

(Defined alongside `.horizontal-tab-nav-item` — see `settings-horizontal-tabs.md`.)

```css
.horizontal-tab-nav-item,
.vertical-tab-nav-item {
  padding: var(--size-4-1) var(--size-4-2);    /* 4px 8px */
  margin-bottom: 0;
  user-select: none;
  cursor: var(--cursor);
  font-size: calc(var(--font-ui-small) + 1px);  /* 14px */
  border-radius: var(--radius-s);                /* 4px */
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

.vertical-tab-nav-item {
  display: flex;
}

.vertical-tab-nav-item-chevron { display: none; }   /* desktop hides; mobile shows */

.vertical-tab-nav-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-s);
  margin-inline-end: var(--size-4-2);          /* 8px gap */
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

Each tab is 14 px (one px above standard UI-small), 4 × 8 padded, 4 px radius. Active tab gets `--background-modifier-hover` fill and brightens the icon to `--text-normal`. Hover same as active. The chevron is hidden on desktop; mobile shows it as an "open" caret.

---

## 5. `.vertical-tab-content` (`app.css:10343-10362`)

```css
.horizontal-tab-content,
.vertical-tab-content {
  background-color: var(--background-primary);
  padding-inline-start: var(--size-4-12);    /* 48px sides */
  padding-inline-end:   var(--size-4-12);
  container-type: inline-size;                /* container query host */
}

.vertical-tab-content-container {
  overflow: hidden;
  flex-grow: 1;
}

.vertical-tab-content {
  overflow-y: auto;
  height: 100%;
  padding-top: var(--size-4-8);              /* 32px top */
  padding-bottom: var(--size-4-16);          /* 64px bottom */
}

.vertical-tab-content h1 { display: none; }   /* h1 is the page title — hidden, the tab nav already shows it */
.vertical-tab-content h2 {
  font-size:   var(--font-ui-medium);         /* 15px */
  font-weight: var(--font-semibold);          /* 600 */
}
```

The content pane:
- 48 px horizontal padding, 32 px top, 64 px bottom (deep bottom so the last setting isn't flush against the modal footer).
- `container-type: inline-size` — enables the responsive `@container` rule on settings rows below 340 px wide.
- h1 hidden (the section name is in the left tab); h2 styled as the section heading inside.

---

## 6. `.setting-item` (`app.css:5188-5251`)

```css
.setting-item {
  display: flex;
  align-items: center;
  row-gap: var(--size-4-3);                   /* 12px when wrapping */
  border-radius:    var(--setting-items-radius);    /* 12px */
  background-color: var(--setting-items-background);/* --background-primary-alt */
  padding: var(--size-4-4);                          /* 16px */
  margin-bottom: var(--size-4-2);                    /* 8px between rows */
  border: var(--setting-items-border-width) solid var(--setting-items-border-color);
                                                      /* 0 by default */
}

.setting-item + div > .setting-item-heading,
.setting-item + .setting-item-heading {
  margin-top: 0.75em;                          /* extra space when starting a new section */
}

.setting-item > *:first-child  { margin-inline-end: var(--size-4-4); }   /* 16px gap before second column */
.setting-item > *:last-child   { margin-inline-end: 0; }

/* Inside non-settings modals, setting-items become flat rows with hairline dividers */
.modal:not(.mod-settings) .setting-item:not(.setting-item-heading) {
  padding: var(--size-4-4) 0;
  border-top: var(--border-width) solid var(--background-modifier-border);
  background-color: transparent;
  border-radius: 0;
  margin-bottom: 0;
}
.modal:not(.mod-settings) .setting-item:not(.setting-item-heading):first-child {
  border-top: none;
  padding-top: 0;
}
.modal:not(.mod-settings) .setting-item:not(.setting-item-heading):last-child {
  padding-bottom: 0;
}

@container (max-width: 340px) {
  .setting-item:not(.mod-toggle):not(.setting-item-heading) {
    flex-direction: column;
  }
  .setting-item:not(.mod-toggle):not(.setting-item-heading) .setting-item-info {
    margin-inline-end: 0;
    align-self: flex-start;
  }
  .setting-item:not(.mod-toggle):not(.setting-item-heading) .setting-item-control {
    width: 100%;
    justify-content: flex-start;
  }
  .setting-item:not(.mod-toggle):not(.setting-item-heading) .setting-item-control button:not(.clickable-icon),
  .setting-item:not(.mod-toggle):not(.setting-item-heading) .setting-item-control input,
  .setting-item:not(.mod-toggle):not(.setting-item-heading) .setting-item-control select {
    width: 100%;
    max-width: 100%;
  }
}

.setting-item.mod-cta { justify-content: center; }
```

Geometry:
- 16 px padding, 12 px corner radius, `--background-primary-alt` fill (slightly off the page).
- Children are flex row, 16 px gap between columns.
- 8 px bottom margin between consecutive rows.
- **In non-settings modals** (e.g. small confirmation dialogs that use `.setting-item` rows internally): rows lose their card chrome and become flat hairline-divided rows.
- **Container query at < 340 px**: the row stacks vertically — info on top, control below at full width. Toggle rows always stay horizontal (the toggle is too small to need vertical layout).
- `.mod-cta` rows center their content.

### 6.1 `.setting-item-heading` (`app.css:5181-5283`)

```css
.setting-group .setting-item-heading {
  padding: 0 var(--size-4-4);            /* 0 16px */
  flex-wrap: wrap;
  background-color: transparent;
  margin-bottom: var(--size-4-4);
}

.setting-item-heading {
  border-top: none;
  background-color: transparent;
  color:       var(--setting-group-heading-color);   /* --text-normal */
  font-size:   var(--setting-group-heading-size);    /* 15px */
  font-weight: var(--setting-group-heading-weight);  /* 600 */
  padding: 0 var(--size-4-4);
  margin: 0 0 var(--size-4-4);
}

.setting-item-heading .setting-item-name {
  color:       var(--setting-group-heading-color);
  font-size:   var(--setting-group-heading-size);
  font-weight: var(--setting-group-heading-weight);
}
.setting-item-heading .setting-item-info {
  flex-grow: 0;
  margin-inline-end: 0;
}
.setting-item-heading .setting-item-description {
  font-weight: var(--font-normal);
  flex-basis: 100%;
  padding-top: 0;
  font-size: var(--font-ui-small);       /* 13px */
}
```

Heading rows are **transparent** (no card background), 15 px / 600, with the description wrapping to 100 % width on a second line at 13 px / normal weight.

---

## 7. `.setting-group` — capsule grouping (`app.css:5131-5186`)

```css
.setting-group + .setting-group { margin-top: var(--size-4-6); }   /* 24px between groups */

.setting-group .setting-group-search {
  background-color: var(--setting-items-background);
  padding: var(--setting-items-padding);          /* 20px */
  border-top-left-radius:  var(--setting-items-radius);   /* 12px */
  border-top-right-radius: var(--setting-items-radius);
  border: var(--setting-items-border-width) solid var(--setting-items-border-color);
  border-bottom: none;
}

.setting-group .setting-group-search + .setting-items {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  padding-top: 0;
  border-top: none;
}

.setting-group .setting-items {
  background-color: var(--setting-items-background);
  padding: var(--setting-items-padding);          /* 20px */
  border-radius: var(--setting-items-radius);     /* 12px */
  corner-shape: var(--corner-shape);
  border: var(--setting-items-border-width) solid var(--setting-items-border-color);
}

.setting-group .setting-items:empty { display: none; }

.setting-group .setting-item {
  border: none;
  border-top: var(--border-width) solid var(--background-modifier-border);
  background-color: transparent;
  border-radius: 0;
  padding: var(--size-4-4) 0;
  margin-bottom: 0;
}
.setting-group .setting-item:first-child {
  padding-top: 0;
  border-top: none;
}
.setting-group .setting-item:last-child {
  padding-bottom: 0;
}
```

When wrapped in a `.setting-group`:
- Items lose their individual card chrome and stack as rows inside a single capsule (`.setting-items` provides the capsule).
- An optional `.setting-group-search` field above the capsule shares the top-rounded corners (and removes the seam between them).
- Adjacent groups are separated by 24 px.

---

## 8. `.vertical-tab-content` heading override (`app.css:5285-5298`)

```css
.vertical-tab-content h1,
.vertical-tab-content h2,
.vertical-tab-content h3,
.vertical-tab-content h4 {
  color:       var(--setting-group-heading-color);
  font-size:   var(--setting-group-heading-size);    /* 15px */
  font-weight: var(--setting-group-heading-weight); /* 600 */
  padding: 0 var(--size-4-4);                        /* 0 16px */
  margin: 0 0 var(--size-4-4);                       /* 0 0 16px 0 */
}

.vertical-tab-content .setting-item ~ :is(h1, h2, h3, h4, .setting-item-heading) {
  margin-top: var(--size-4-6);                       /* 24px above headings that follow a setting-item */
}
```

Inside settings, **all** heading levels are normalized to the same size (15 px semibold, 16 px sides, 16 px below). This prevents the markdown `--h1-size` / `--h2-size` etc. cascade from making settings headings look like document headings.

---

## 9. Reproducer build order

1. The settings modal uses `.mod-sidebar-layout` plus `.mod-settings`. Width 90 vw (max 1100), height 85 vh (max 1000), padding 0.
2. `.vertical-tab-header` is `flex: 0 0 25%; min: 180px; max: 250px; overflow: auto`. 1 px right divider.
3. Tabs are `.vertical-tab-nav-item` — 14 px font (UI-small + 1), 4 × 8 padding, 4 px radius. Active = `--background-modifier-hover`.
4. Group titles inside the tab header are 12 px semibold faint, 8 px padded.
5. `.vertical-tab-content` is **48 px** horizontal padding, 32 px top, 64 px bottom. `container-type: inline-size` enables responsive stacking.
6. `.setting-item` default = `padding: 16px; border-radius: 12px; background: --background-primary-alt; margin-bottom: 8px`. 16 px gap between columns.
7. Inside non-settings modals, `.setting-item` rows lose their card chrome and become flat hairline-divided rows.
8. Below 340 px container width, non-toggle rows stack vertically (info above, control below at full width).
9. `.setting-group` wraps multiple rows in a single 12 px-radius capsule with 20 px padding. Optional `.setting-group-search` shares the top rounding.
10. All heading levels inside `.vertical-tab-content` are normalized to 15 px / 600 / 16 px sides — overriding markdown's heading scale.
11. Mobile uses a different presentation (see `settings-mobile.md`) — vertical tabs collapse to a top horizontal nav-bar.
