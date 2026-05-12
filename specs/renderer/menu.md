# Menu

> Context menus and dropdown menus. The single primitive `.menu` is reused for: right-click context menus, view-action menus, the more-actions ("…") submenu, the file-explorer-row context menu, and the menu opened by `.text-icon-button`/`.combobox-button` triggers when the suggestion popover would be overkill.

Tokens: see [`design-tokens.md`](design-tokens.md). Sources: `renderer/app.css`.

---

## 1. DOM scaffold

```
.menu [.mod-no-icon] [.mod-tab-list]
  └─ .menu-scroll                    ← always present, holds items
       ├─ .menu-grabber              ← display:none in CSS — placeholder for mobile drag affordance
       ├─ .menu-item [.is-label] [.is-disabled] [.is-warning] [.selected]
       │    ├─ .menu-item-icon                ← optional left icon (auto-hidden when .menu.mod-no-icon)
       │    ├─ .menu-item-title
       │    └─ .menu-item-icon .mod-submenu   ← optional right chevron for submenu
       ├─ .menu-item-desc            ← optional caption beneath an item
       ├─ .menu-separator            ← horizontal rule
       └─ … more items, separators …
```

The menu mounts as a direct child of `<body>` (sibling of `.app-container`) — it has `position: fixed` and is positioned by JS based on the trigger location.

---

## 2. `.menu` shell (`app.css:8937-8957`)

```css
.menu {
  -webkit-app-region: no-drag;
  display: flex;
  flex-direction: column;
  border: var(--menu-border-width) solid var(--menu-border-color);
                                       /* 1px solid --background-modifier-border-hover */
  background-color: var(--menu-background);    /* --background-secondary */
  backdrop-filter: var(--menu-backdrop-filter); /* none — overrideable by themes */
  overflow: hidden;
  padding: 0;
  border-radius: var(--menu-radius);   /* 8px */
  corner-shape: var(--menu-corner-shape);
  box-shadow: var(--menu-shadow);      /* --shadow-s */
  max-height: 100%;
  position: fixed;
  z-index: var(--layer-menu);          /* 65 */
  user-select: none;
}

.menu.mod-no-icon .menu-item-icon:first-child { display: none; }
```

Resolved values (light/dark):

| Property | Light | Dark |
| --- | --- | --- |
| `border` | `1px solid #d4d4d4` | `1px solid #3f3f3f` |
| `background-color` | `#f6f6f6` | `#262626` |
| `box-shadow` (`--shadow-s`) | `0px 1px 2px rgba(0,0,0,0.028), 0px 3.4px 6.7px rgba(0,0,0,0.042), 0px 15px 30px rgba(0,0,0,0.07)` | `0px 1px 2px rgba(0,0,0,0.121), 0px 3.4px 6.7px rgba(0,0,0,0.179), 0px 15px 30px rgba(0,0,0,0.3)` |

Reproducer rules:
- The 8 px radius is on the **outer** menu, not the items. Items have a 4 px radius (see §4) so they tuck inside.
- `position: fixed` + `z-index: 65` (above modals at 50, below tooltips at 70).
- `max-height: 100%` constrains to viewport — JS handles overflow scrolling via `.menu-scroll`.

`.mod-no-icon` is a class set by JS on menus where no item has an icon — it suppresses the leading-icon column entirely, which would otherwise create awkward indentation.

---

## 3. `.menu-scroll` and `.menu-grabber` (`app.css:8959-8968`)

```css
.menu-scroll {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: var(--menu-padding);   /* 6px */
}
.menu-grabber { display: none; }
```

The grabber is a placeholder for a mobile drag handle (Apple/Google sheet-style affordance). Currently hidden everywhere by default; some platform-specific themes make it visible.

The scroll container has `overflow: hidden` (not `auto`) — when the menu is taller than the viewport, JS dynamically resizes and scrolls; CSS does not auto-scroll the menu.

---

## 4. `.menu-item` (`app.css:8995-9054`)

```css
.menu-item {
  display: flex;
  align-items: center;
  gap: var(--size-4-2);                        /* 8px between icon and title */
  padding: var(--size-4-1) var(--size-4-2);    /* 4px 8px */
  cursor: var(--cursor);
  font-size: var(--font-ui-small);             /* 13px */
  border-radius: var(--radius-s);              /* 4px */
  corner-shape: var(--corner-shape);
  white-space: nowrap;
}

.menu-item.is-warning:not(.is-disabled),
.menu-item.is-warning:not(.is-disabled).selected {
  color: var(--text-error);
}

.menu-item.is-label {
  cursor: default;
  font-size: var(--font-ui-medium);            /* 15px — section header */
  color: var(--text-muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.menu-item.is-disabled {
  cursor: default;
  color: var(--text-faint);
}

.menu-item:not(.is-label):not(.is-disabled).mobile-tap,
.menu-item:not(.is-label):not(.is-disabled).selected {
  background-color: var(--background-modifier-hover);
}
```

State summary:

| Class combo | `color` | `background-color` | `cursor` |
| --- | --- | --- | --- |
| (base) | inherit (`--text-normal`) | transparent | `--cursor` (default) |
| `.is-warning` | `--text-error` | transparent | `--cursor` |
| `.is-warning.selected` | `--text-error` | `--background-modifier-hover` | `--cursor` |
| `.is-label` | `--text-muted` | transparent | `default` |
| `.is-disabled` | `--text-faint` | transparent | `default` |
| `.selected` (keyboard nav highlight) | inherit | `--background-modifier-hover` | `--cursor` |
| `.mobile-tap` | inherit | `--background-modifier-hover` | `--cursor` |

`.is-label` is for non-clickable section headers within a menu (e.g. "Recent files" caption). It uses the larger 15 px UI size, allows wrapping (since labels can be long file names), and disables the cursor pointer.

### 4.1 Item icon (`app.css:9034-9050`)

```css
.menu-item-icon {
  flex: 0 1 auto;
  display: flex;
  color: var(--text-muted);
}
.menu-item.is-warning .menu-item-icon { color: var(--text-error); }
.menu-item.is-disabled .menu-item-icon { color: var(--text-faint); }
.menu-item-icon .mod-submenu { color: var(--text-faint); }
```

The submenu chevron (a right-arrow inside `.menu-item-icon.mod-submenu`) uses the faintest text color so it doesn't compete with the title.

### 4.2 Item title (`app.css:9052-9062`)

```css
.menu-item-title { flex: 1 0 0; }

.menu.mod-tab-list .menu-item-title {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
```

The title takes all remaining horizontal space. In `.mod-tab-list` (the chevron-down menu that lists every open tab), titles are capped at 300 px and ellipsized.

### 4.3 Item description (`app.css:8989-8993`)

```css
.menu-item-desc {
  padding-top: var(--size-4-1);   /* 4px gap above */
  color: var(--text-faint);
  font-size: 0.8em;               /* 80% of parent */
}
```

The description is a small sub-line (e.g. a hotkey hint or a path). Note this is a **sibling** of `.menu-item`, not a descendant — it sits below an item rather than inside it.

---

## 5. `.menu-separator` (`app.css:8970-8987`)

```css
.menu-separator {
  height: 0;
  margin: var(--size-2-3) calc(var(--size-2-3) * -1);  /* 6px top/bottom, -6px left/right */
  border-bottom: var(--border-width) solid var(--background-modifier-border);
}

.menu-separator:last-child,
.menu-separator:first-child { display: none; }   /* don't show separators at the menu edges */

.menu-separator + .menu-separator { display: none; }   /* collapse adjacent separators */

.menu-separator + .menu-item.is-label { padding-bottom: var(--size-4-1); }
```

Geometry:
- The separator is a 0 px-height element with a 1 px bottom border. The negative horizontal margin (`-6px`) makes it bleed into the menu's `--menu-padding: 6px` so the line stretches edge to edge.
- The trio of `:last-child`, `:first-child`, and `+` rules ensures separators never appear redundantly. This is **CSS-only deduplication** — the calling code can emit separators around every group without manual cleanup.
- A separator immediately preceding a label gets +4 px bottom padding for visual breathing room.

---

## 6. Mobile / phone variations

There are no `.is-mobile` overrides on `.menu` — the menu is the same shape on touch devices. JS handles touch-specific interactions (long-press to trigger context menus, `.mobile-tap` class for press feedback during touch).

---

## 7. Keyboard / focus behavior (from JS — `app.webcrack/deobfuscated.js`)

The menu is keyboard-driven via JS: arrow up/down moves `.selected` between non-disabled, non-label items; `Enter` activates the selected item; `Escape` closes the menu; `Tab` cycles like arrow-down. Submenus open on right-arrow (or hover after a 200 ms delay), close on left-arrow.

The `.selected` class is **not** synonymous with `:focus` — only the menu itself receives DOM focus. Selection is purely visual and JS-managed. This is what allows the menu to track the cursor's position even when it has not yet entered a hover region.

Reproducer must replicate:
- Single-focus container; keyboard navigation moves the `.selected` class.
- Hover sets `.selected` to mirror cursor.
- Submenus mount as nested `.menu` instances at fixed positions next to their parent.

---

## 8. Reproducer build order

1. Mount the menu under `<body>` at `position: fixed; z-index: 65`. JS sets its `top`/`left`/`right` based on trigger geometry; the menu must be measured before final positioning to avoid offscreen flicker.
2. Always wrap items in `.menu-scroll` even for short menus — overflow handling depends on it.
3. The menu uses `--background-secondary` for its surface, **not** `--background-primary` (which the modal uses). This is what gives menus a slightly different gray than the editor body — they read as elevated.
4. The 6 px `--menu-padding` plus `-6px` separator margin produces edge-to-edge separators while keeping items inset 6 px from the menu edge.
5. `.is-warning` recolors text and icon to red; `.is-disabled` washes out to faint and disables cursor; `.is-label` enlarges to 15 px and wraps. These are mutually exclusive in practice but stack correctly if combined.
6. The submenu marker is a `.menu-item-icon.mod-submenu` placed at the **end** of the item (after the title). Its color is `--text-faint`.
7. Separators auto-deduplicate via CSS — emit them freely between groups without checking adjacency.
8. The `.menu-grabber` is a no-op slot reserved for mobile drag affordances — leave it in DOM in case a theme styles it.
