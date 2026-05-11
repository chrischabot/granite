# Settings — Community Plugins / Themes (`.mod-community-modal`)

> The plugin and theme browsers are both `.mod-community-modal` instances using `.mod-sidebar-layout`. Cards on the left list browsable items; the right side shows details + readme.

Source: `renderer/app.css:5692-6044`. Tokens: see [`design-tokens.md`](design-tokens.md). The same shape is used for both **Community Plugins** and **Community Themes**.

---

## 1. DOM scaffold

```
.modal.mod-sidebar-layout.mod-community-modal
  ├─ .modal-sidebar                                ← left column (search + filter setting-items)
  │    ├─ .search-input-container
  │    └─ .setting-item …                           ← filter rows (sort, category, etc.)
  └─ .community-modal-details                      ← right side
       ├─ .community-modal-search-results-wrapper [.is-empty-results]
       │    ├─ .community-modal-search-summary    ← "Showing 12 results"
       │    ├─ .community-modal-search-results-status
       │    │    ├─ .community-modal-search-results-status-content
       │    │    └─ .community-modal-search-results-cta
       │    ├─ .community-modal-search-results
       │    │    └─ .community-item.mod-grid-item    ← card grid
       │    └─ .community-modal-empty-state
       └─ .community-modal-info                      ← details view (when an item is selected)
            ├─ .community-modal-info-name
            ├─ .community-modal-info-author / -repo / -version
            ├─ .community-modal-info-desc
            ├─ .community-modal-info-downloads
            ├─ .community-modal-button-container       ← Install / Disable / Uninstall buttons
            └─ .community-readme                        ← rendered README markdown
```

---

## 2. Sidebar overrides (`app.css:5692-5725`)

```css
.mod-community-modal .modal-sidebar .setting-item:not(.setting-item-heading) {
  max-width: var(--modal-community-sidebar-width);   /* 280px */
  padding: 0 var(--size-4-3) var(--size-4-1);        /* 0 12px 4px */
  border: none;
  gap: var(--size-4-2);                              /* 8px */
  background-color: transparent;
}
.mod-community-modal .modal-sidebar .setting-item:not(.setting-item-heading):first-child { /* … */ }

.mod-community-modal .modal-sidebar .setting-item-name {
  /* compact label styling */
}
.mod-community-modal .modal-sidebar .setting-item-info {
  /* tighter sidebar info column */
}

.mod-community-modal .modal-sidebar .search-input-container {
  /* search input inside the sidebar */
}

.mod-community-modal .modal-sidebar button.clickable-icon {
  /* sidebar action icons */
}
```

The sidebar in community modals strips the standard `.setting-item` card chrome — rows become flat with 12 px sides and 4 px bottom padding, no border, no background. Maximum width matches the sidebar width.

---

## 3. Search results states (`app.css:5727-5826`)

```css
.community-modal-details-empty-state { /* shown before any search */ }
.community-modal-search-summary { /* "12 results" */ }
.community-modal-search-results-wrapper { /* outer wrapper */ }
.community-modal-search-results { /* the grid */ }
.community-modal-search-results-status { /* "Loading…" / "No results" */ }
.community-modal-search-results-status-content { /* status detail */ }
.community-modal-search-results-cta {
  /* call-to-action link below status (e.g. "Visit obsidian.md/plugins") */
}
.community-modal-search-results-cta.mobile-tap { /* tap state */ }
.community-modal-empty-state { /* fallback empty */ }

body:not(.is-phone) .community-item.is-selected .flair,
body:not(.is-phone) .community-item.is-selected:hover .flair {
  --flair-color: var(--text-on-accent);
  --flair-background: transparent;
}
```

---

## 4. `.community-item` card (`app.css:5828-5946`)

```css
.community-item {
  position: relative;
  background-color: var(--background-primary);
  padding: var(--size-4-3);                          /* 12px */
  cursor: var(--cursor);
  border-radius: var(--radius-m);                    /* 8px */
  border: var(--border-width) solid var(--background-modifier-border);
  display: flex;
  flex-direction: column;
  gap: var(--size-2-1);                              /* 2px */
}

.community-item:last-child { margin-bottom: 0; }

.community-item .suggestion-highlight {
  background-color: var(--text-highlight-bg);        /* yellow */
}

@media (hover: hover) {
  .community-item:hover { border-color: var(--background-modifier-border-hover); }
}

.community-item.mobile-tap { background-color: var(--background-modifier-hover); }

.is-mobile .community-item { max-width: 500px; }

.community-item .flair {
  --flair-background: var(--background-modifier-active-hover);   /* 10% accent */
  --flair-color: var(--text-accent);
  margin-inline-start: var(--size-4-1);
  vertical-align: middle;
  top: -1px;
}
```

Each card:
- 12 px padding, 8 px corner radius, 1 px border in `--background-modifier-border`. Hover lifts border to `--background-modifier-border-hover`.
- Background is `--background-primary` (page color — stands off from the modal's secondary background).
- 2 px gap between internal lines.
- Mobile: 500 px max width.
- Built-in flair badges (e.g. "INSTALLED") use 10 %-accent background with accent text.
- Search-highlighted matches inside name/author/desc paint yellow.

### 4.1 Card content rules (`app.css:5870-5898`)

```css
.community-item-name {
  font-size:   var(--font-ui-medium);                /* 15px */
  line-height: var(--line-height-tight);             /* 1.3 */
  font-weight: var(--font-medium);                    /* 500 */
}

.community-item-author {
  font-size:   var(--font-ui-smaller);               /* 12px */
  line-height: var(--line-height-tight);
  color: var(--text-muted);
}

.community-item-downloads {
  font-size:   var(--font-ui-smaller);
  color: var(--text-muted);
  --icon-color:  var(--text-faint);
  --icon-size:   var(--icon-xs);                     /* 14px */
  --icon-stroke: var(--icon-xs-stroke-width);
}
.community-item-downloads svg { vertical-align: text-bottom; }

.community-item-updated {
  font-size:   var(--font-ui-smaller);
  color: var(--text-muted);
  margin-bottom: var(--size-4-2);                    /* 8px */
}

.community-item-downloads-text { margin-inline-start: var(--size-2-2); }

.community-item-desc {
  font-size:   var(--font-ui-small);                 /* 13px */
  line-height: var(--line-height-tight);
  margin-top: 4px;
  overflow: hidden;
}
```

Card text hierarchy (top-down): name (15 px / 500) → author (12 px / muted) → downloads + updated (12 px / muted) → desc (13 px). Download icon is 14 px in `--text-faint`.

### 4.2 Update badge (`app.css:5911-5918`)

```css
.community-item-badge.mod-update {
  --icon-size:   var(--icon-xs);
  --icon-stroke: var(--icon-xs-stroke-width);
  color: var(--interactive-accent);
  position: absolute;
  top:           var(--size-4-3);                    /* 12px from top */
  inset-inline-end: var(--size-4-3);                 /* 12px from right */
}
```

Top-right corner of the card shows an accent-colored 14 px icon when an update is available.

### 4.3 Screenshot (`app.css:5920-5946`)

```css
.community-item-screenshot {
  max-width: 100%;
  margin-top: auto;                                   /* push to card bottom */
  object-fit: cover;
  border-radius: var(--radius-s);                    /* 4px */
  aspect-ratio: 16 / 9;
  image-rendering: -webkit-optimize-contrast;
  margin-top: var(--size-4-1);                       /* 4px */
}

.community-item-screenshot.mod-unavailable {
  text-align: center;
  color: var(--text-muted);
}

.community-item-screenshot .placeholder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.community-item-screenshot .placeholder-icon .svg-icon {
  color: var(--text-faint);
  width:  var(--size-4-8);                            /* 32px */
  height: var(--size-4-8);
}
```

Screenshot pinned at the bottom of the card with a 16:9 aspect ratio. Falls back to a centered placeholder icon when unavailable.

---

## 5. Details view (`app.css:5948-6044`)

```css
.community-modal-info-name {
  font-size: var(--h2-size);                         /* 1.462em ≈ 23px @ 16 */
  font-weight: var(--font-semibold);                 /* 600 */
  line-height: var(--line-height-tight);
  margin-bottom: var(--size-4-6);                    /* 24px */
}

.community-modal-info-author,
.community-modal-info-repo,
.community-modal-info-version {
  font-size:   var(--font-ui-small);                 /* 13px */
  line-height: var(--line-height-tight);
  color: var(--text-muted);
}

.community-modal-info-desc {
  font-size:   var(--font-ui-small);                 /* 13px (overridden below to 15px) */
  line-height: var(--line-height-tight);
  margin-top: 4px;
}

.community-modal-details {
  flex: 1 1 calc(var(--modal-max-width) - var(--modal-community-sidebar-width));
                                                      /* 1100 - 280 = 820 */
  overflow: auto;
  display: flex;
  flex-direction: column;
  border-inline-start: var(--border-width) solid var(--divider-color);
                                                      /* 1px left divider */
}

.community-modal-info {
  flex: 1 1 0;
  overflow-y: auto;
  padding: var(--size-4-8) var(--size-4-16);          /* 32px 64px */
  scroll-padding: var(--size-4-4);
  display: flex;
  flex-direction: column;
  gap: var(--size-4-4);                               /* 16px */
}

.community-readme {
  overflow-x: hidden;
  overflow-y: visible;
  height: auto;
  padding: var(--size-4-4) 0;                         /* 16px top/bottom */
}

.community-readme video,
.community-readme svg,
.community-readme img { max-width: 100%; }

/* Override (later declaration wins): the desc inside info uses 15px */
.community-modal-info-desc {
  font-size:   var(--font-ui-medium);                /* 15px — overrides earlier 13px */
  line-height: var(--line-height-tight);
  margin-top: var(--size-4-2);                       /* 8px */
}

.community-modal-button-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4-2);                              /* 8px */
  margin-top: var(--size-4-4);                       /* 16px */
}

.community-modal-info-downloads {
  color: var(--text-muted);
  margin-top: var(--size-4-1);
  display: inline-block;
  --icon-size:   var(--icon-xs);
  --icon-stroke: var(--icon-xs-stroke-width);
}
```

Details pane:
- Width: `1100 - 280 = 820` px.
- Title at h2 size (23 px / 600).
- Meta lines at 13 px / muted.
- Description at 15 px (overridden from card-level 13 px because details has more room).
- README rendered with `markdown-rendered` chrome (see `editor-reading-mode.md`).
- 32 × 64 padding around the info block.
- 16 px gap between sections; 16 px top margin on the action buttons.

---

## 6. Reproducer build order

1. The community modal is `.modal.mod-sidebar-layout.mod-community-modal`. Use the standard `.mod-sidebar-layout` shape (90 vw × 85 vh, max 1100 × 1000).
2. Left sidebar is 280 px wide (`--modal-community-sidebar-width`). Strip standard setting-item card chrome — flat rows.
3. Right side splits into a search-results grid OR a details pane (mutually exclusive based on selection).
4. Cards (`.community-item`): 8 px radius, 1 px border, 12 px padding, name + author + downloads + desc + screenshot stack. 16:9 screenshot pinned to bottom.
5. Details pane: 32 × 64 padding, h2-size title, 15 px description, action buttons.
6. README renders with full markdown chrome — reuse `.markdown-rendered` rules.
7. Update-available badge: absolutely positioned 12 px from top-right, accent color, 14 px icon.
8. Selected card swaps `.flair` colors: white text on transparent.
