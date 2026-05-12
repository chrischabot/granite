# Tabs

> The `.workspace-tab-header*` family — the tab strip that sits at the top of every `.workspace-tabs` container. There are three distinct presentations: **root tabs** (the main editor area), **sidebar tabs** (icon-only switchers at top of left/right sidebars), and **stacked tabs** (vertical-text rotated headers when the user enables stacked tabs).

All citations: `renderer/app.css`. Tokens defined in [`design-tokens.md`](design-tokens.md).

---

## 1. DOM scaffold

```
.workspace-tabs.mod-top                         ← parent
  ├─ .workspace-tab-header-container            ← strip wrapper, h = --header-height
  │    ├─ .workspace-tab-header-container-inner ← horizontally scrollable, holds all tabs
  │    │    ├─ .workspace-tab-header[.is-active][data-type="markdown" | …]
  │    │    │    ├─ ::before  / ::after          ← decorative outer corner curves
  │    │    │    └─ .workspace-tab-header-inner
  │    │    │         ├─ .workspace-tab-header-inner-icon (hidden for markdown / empty)
  │    │    │         ├─ .workspace-tab-header-inner-title
  │    │    │         ├─ .workspace-tab-header-status-container
  │    │    │         │    └─ .workspace-tab-header-status-icon (.mod-pinned, .mod-linked, ...)
  │    │    │         └─ .workspace-tab-header-inner-close-button
  │    │    └─ … more headers …
  │    ├─ .workspace-tab-header-spacer          ← drag region for window
  │    ├─ .workspace-tab-header-tab-list        ← chevron-down (open tab menu)
  │    └─ .workspace-tab-header-new-tab         ← `+` button
  └─ .workspace-tab-container                    ← actual leaves
       └─ .workspace-leaf …
```

Stacked variant adds `.mod-stacked` to `.workspace-tabs`; sidebar variants add `.mod-left-split` / `.mod-right-split` to the surrounding `.workspace-split`.

---

## 2. `.workspace-tab-header-container` — the strip (`app.css:6703-6716`)

```css
.workspace-tab-header-container {
  display: flex;
  background-color: var(--tab-container-background);   /* --background-secondary, theme-dependent */
  height: var(--header-height);                        /* 40px */
  border-bottom: var(--tab-outline-width) solid var(--tab-outline-color);
                                                       /* 1px solid --divider-color */
  flex: 0 0 auto;
  padding-left:  var(--size-4-2);                      /* 8px */
  padding-right: var(--size-4-2);
  position: relative;
}
.is-phone .workspace-tab-header-container { display: none; }
```

Tokens:
- `--tab-container-background` defaults to `--background-secondary`. Inside `.titlebar` (frameless) and `.workspace-tabs.mod-top`, JS overrides via the `.sidebar-toggle-button, .workspace-tabs.mod-top { --tab-container-background: var(--titlebar-background) }` rule (`app.css:4214-4217`). When window has focus, `body.is-focused` swaps the strip background to `--titlebar-background-focused` (`app.css:4224-4227`).
- Strip is exactly 40 px tall, and 1 px of `--divider-color` paints below it.
- Side padding is 8 px to match the breathing room around the inner scroll region.

---

## 3. `.workspace-tab-header-container-inner` — the scrollable rail (`app.css:6718-6734`)

```css
.workspace-tab-header-container-inner {
  -webkit-app-region: drag;                       /* drag the window from empty rail space */
  display: flex;
  flex: 0 1 auto;
  overflow: auto;
  margin: 6px -5px calc(var(--tab-outline-width) * -1);   /* 6px top, -5px sides, -1px bottom */
  padding: 1px 15px 0;
}
.mod-root .workspace-tab-header-container-inner { padding: 1px 15px 0; }
.workspace-tab-header-container-inner::-webkit-scrollbar,
.workspace-tab-header-container-inner::-webkit-scrollbar-thumb { display: none; }
```

Geometry:
- `margin: 6px -5px -1px` — vertical offset of 6 px sets the tab tops below the strip top; horizontal `-5px` lets the rail bleed slightly past the container's `padding: 0 8px` so tab corner curves can sit flush against the container edges; bottom `-1px` (the negative `--tab-outline-width`) makes the active-tab underline overlap the strip border so it appears continuous.
- `padding: 1px 15px 0` — 15 px gutters at start and end of the rail.
- The rail is horizontally scrollable but its scrollbar is hidden — the user scrolls via wheel/swipe.
- The rail is a drag region for the window (Electron `-webkit-app-region: drag`), but each `.workspace-tab-header` opts back out via `no-drag` so dragging a tab doesn't drag the window.

---

## 4. `.workspace-tab-header` — a single tab (`app.css:6774-6832`)

### 4.1 Base

```css
.workspace-tab-header-container .workspace-tab-header {
  -webkit-app-region: no-drag;
  color: var(--tab-text-color);                  /* --text-faint */
  display: flex;
  position: relative;
  padding: 1px 4px 3.5px;
  scroll-margin-inline-start: var(--size-2-3);   /* 6px */
  scroll-margin-inline-end:   var(--size-4-1);   /* 4px */
  text-align: center;
  border-radius: var(--tab-radius-active);       /* 6px 6px 0 0 */
  corner-shape: var(--corner-shape);
}
```

Note `border-radius: 6px 6px 0 0` is applied to **every** tab (active or not) — but only the active tab paints a background, so the radius is only visible on the active one.

### 4.2 Hover and mobile-tap (`app.css:6788-6796`)

```css
@media (hover: hover) {
  .workspace-tab-header-container .workspace-tab-header:not(.is-active):hover .workspace-tab-header-inner {
    background-color: var(--background-modifier-hover);
  }
}
.workspace-tab-header-container .workspace-tab-header:not(.is-active).mobile-tap .workspace-tab-header-inner {
  background-color: var(--background-modifier-hover);
}
```

The `.mobile-tap` class is added by JS on touchstart and removed on touchend/cancel; it lets touch devices preview hover affordances without `:hover` (which behaves differently on touch).

### 4.3 The corner-curve trick (`app.css:6798-6817`)

The active tab's "rounded outer corners merging into a baseline" appearance is built with two pseudo-elements that paint the **inverse** of a quarter-circle in the strip background. They sit just outside the tab on both sides.

```css
.workspace-tab-header-container .workspace-tab-header::before,
.workspace-tab-header-container .workspace-tab-header::after {
  position: absolute;
  bottom: 0;
  content: '';
  width:  calc(var(--tab-curve) * 2);            /* 12px */
  height: calc(var(--tab-curve) * 2);            /* 12px */
  border-radius: 100%;
  box-shadow: 0 0 0 calc(var(--tab-curve) * 3) transparent;
                                                 /* 18px transparent ring — replaced when active */
}
.workspace-tab-header-container .workspace-tab-header::before {
  left:  calc(var(--tab-curve) * -2);            /* -12px */
  clip-path: inset(50% calc(var(--tab-curve) * -1) 0 50%);
                                                 /* show only bottom-right quadrant + 6px overflow right */
}
.workspace-tab-header-container .workspace-tab-header::after {
  right: calc(var(--tab-curve) * -2);            /* -12px */
  clip-path: inset(50% 50% 0 calc(var(--tab-curve) * -1));
                                                 /* show only bottom-left quadrant + 6px overflow left */
}

/* When active, the box-shadow rings turn into a "negative corner" - they paint the strip
   color in the area the tab is now NOT covering, producing the seamless inset curve. */
.workspace-split.mod-root .workspace-tab-header-container .workspace-tab-header.is-active::before,
.workspace-split.mod-root .workspace-tab-header-container .workspace-tab-header.is-active::after {
  box-shadow: inset 0 0 0 var(--tab-outline-width) var(--tab-outline-color),
              0 0 0 calc(var(--tab-curve) * 4) var(--tab-background-active);
                                                 /* 24px wide ring of --background-primary */
}
.workspace-tab-header-container .workspace-tab-header.is-active .workspace-tab-header-inner::after {
  opacity: 0;                                    /* hide the right-edge divider on active */
}
```

This pattern produces the **outward-curving corner** silhouette characteristic of macOS-style tabs without using `mask-image`. Reproducer must keep the exact `--tab-curve: 6px` token; changing it shifts the geometry of the curve.

### 4.4 Active tab (`app.css:6819-6832`)

```css
.workspace-tab-header-container .workspace-tab-header.is-active {
  box-shadow:    0 0 0 var(--tab-outline-width) var(--tab-outline-color);  /* 1px outline */
  color:         var(--tab-text-color-active);    /* --text-muted */
  background-color: var(--tab-background-active); /* --background-primary */
}
.workspace-tab-header-container .workspace-tab-header.is-active .workspace-tab-header-inner::after {
  opacity: 0;
}
```

The active tab gets a 1 px box-shadow outline (this is the entire outline including the bottom — the negative bottom margin on the rail (`-1px`) hides the bottom segment so the active tab _appears_ to merge with the leaf below).

### 4.5 Container width and container query (`app.css:7117-7197`)

```css
.workspace .mod-root .workspace-tab-header {
  -webkit-app-region: no-drag;
  container-type: inline-size;
  container-name: tab-header;
  flex: 1 1 0;
  width:     var(--tab-width);        /* 200px */
  min-width: 0;
  max-width: var(--tab-max-width);    /* 320px */
  padding: 1px 3px 3.5px;
}

@container tab-header (width < 3rem) {
  .workspace .workspace-split.mod-root .workspace-tabs:not(.mod-stacked) .workspace-tab-header-container .workspace-tab-header:not(.is-active) .workspace-tab-header-inner-close-button {
    display: none;
  }
}
```

Each tab sets up an `inline-size` container named `tab-header`. When a tab gets compressed below `3rem` (~48 px at default 16 px root), the close button on **non-active** tabs hides automatically. The active tab keeps its close button regardless. This protects the close-on-tab UX when many tabs are open.

### 4.6 Sticky inner controls (`app.css:7128-7158`)

```css
.workspace .mod-root .workspace-tab-header .workspace-tab-header-status-container {
  position: sticky; inset-inline-end: 0;
}
.workspace .mod-root .workspace-tab-header .workspace-tab-header-inner-close-button {
  position: sticky; inset-inline-end: 0;
}
.workspace .mod-root .workspace-tab-header.is-active .workspace-tab-header-inner-close-button {
  pointer-events: all;
  opacity: 1;
}
.workspace .mod-root .workspace-tab-header.is-active .workspace-tab-header-inner-close-button svg { opacity: 1; }
.workspace .mod-root .workspace-tab-header.is-active .workspace-tab-header-inner-close-button::after {
  background-color: transparent;
}
.workspace .mod-root .workspace-tab-header-inner::after {
  position: absolute;
  inset-inline-end: -0.5px;
  width: 1px;
  background-color: var(--tab-divider-color);   /* --background-modifier-border-hover */
  content: '';
  height: 20px;                                  /* divider line is 20px tall (centered vertically) */
}
```

Behavior:
- The close button and status container are `position: sticky; inset-inline-end: 0` so they remain visible at the right edge as the inner content scrolls (long titles).
- A 1 px × 20 px divider sits at `right: -0.5px` between consecutive tabs (`.workspace-tab-header-inner::after`) — this is the vertical separator visible between non-active tabs. Active tabs hide it via `::after { opacity: 0 }`.

### 4.7 The "before-active" curve fix (`app.css:6959-6961`)

```css
.workspace-tab-header.is-before-active .workspace-tab-header-inner {
  border-bottom-right-radius: 10px;
}
```

The tab immediately preceding the active tab gets a 10 px bottom-right radius on its inner — making its right edge curve **into** the active tab's curve cleanly.

---

## 5. `.workspace-tab-header-inner` (`app.css:6843-6883`)

```css
.workspace-tab-header-inner {
  align-items: center;
  display: flex;
  gap: var(--size-2-1);              /* 2px */
  height: 100%;
  border-radius: var(--tab-radius);  /* 4px */
  corner-shape: var(--corner-shape);
  overflow: hidden;
  padding: 0 8px;
  width: 100%;
}
.workspace-tab-header-inner .workspace-tab-header-inner-icon {
  color:   var(--icon-color);
  opacity: var(--icon-opacity);
}
@media (hover: hover) {
  .workspace-tab-header-inner:hover .workspace-tab-header-inner-icon {
    color:   var(--icon-color-hover);
    opacity: var(--icon-opacity-hover);
  }
}
.mod-root .workspace-tab-header-inner {
  padding-top: 0;
  padding-inline-end:   3px;
  padding-inline-start: 6px;
  padding-bottom: 0;
}
.workspace-tab-header-inner-title {
  flex: 1 1 auto;
  font-size:   var(--tab-font-size);   /* 13px */
  font-weight: var(--tab-font-weight); /* inherit */
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
```

Resolved active-tab title color (light/dark, focused window, active leaf):

| Window state | Tab state | Color |
| --- | --- | --- |
| `body.is-focused`, `.mod-active` leaf, `.is-active` tab | normal | `--tab-text-color-focused-active-current` → `--text-normal` |
| `body.is-focused`, `.mod-active` leaf, `.is-active.is-highlighted` tab | flashed | `--tab-text-color-focused-highlighted` → `--text-accent` |
| `body.is-focused`, any leaf, `.is-active` tab | non-active leaf | `--tab-text-color-focused-active` → `--text-muted` |
| `body.is-focused`, any leaf, non-`is-active` tab | inactive | `--tab-text-color-focused` → `--text-muted` |
| no `body.is-focused` | inactive | `--tab-text-color` → `--text-faint` |
| no `body.is-focused`, `.is-active` tab | active | `--tab-text-color-active` → `--text-muted` |

These cascade rules live at `app.css:6751-6772`:

```css
body.is-focused .workspace-tab-header-container .workspace-tab-header { color: var(--tab-text-color-focused); }
body.is-focused .workspace-tab-header-container .workspace-tab-header.is-active { color: var(--tab-text-color-focused-active); }
body.is-focused .mod-active .workspace-tab-header-container .workspace-tab-header.is-active .workspace-tab-header-inner-icon,
body.is-focused .mod-active .workspace-tab-header-container .workspace-tab-header.is-active .workspace-tab-header-inner-title {
  color: var(--tab-text-color-focused-active-current);
}
body.is-focused .mod-active .workspace-tab-header-container .workspace-tab-header.is-active.is-highlighted .workspace-tab-header-inner-icon,
body.is-focused .mod-active .workspace-tab-header-container .workspace-tab-header.is-active.is-highlighted .workspace-tab-header-inner-title {
  color: var(--tab-text-color-focused-highlighted);
}
body.is-focused .workspace-tab-header-container .workspace-tab-header.is-highlighted .workspace-tab-header-inner-icon,
body.is-focused .workspace-tab-header-container .workspace-tab-header.is-highlighted .workspace-tab-header-inner-title {
  color: var(--tab-text-color-focused-highlighted);
}
```

---

## 6. Status icons and close button (`app.css:6885-6952`)

```css
.workspace-tab-header-status-container {
  display: flex;
  flex-shrink: 0;
  gap: var(--size-2-1);             /* 2px */
  justify-content: center;
}
.workspace-tab-header-status-container:empty { display: none; }

.workspace-tab-header-status-icon,
.workspace-tab-header-inner-close-button {
  cursor: var(--cursor);
  padding: var(--size-2-1);         /* 2px */
  border-radius: var(--radius-s);   /* 4px */
  corner-shape: var(--corner-shape);
  display: flex;
  align-items: center;
  --icon-size:   var(--icon-xs);    /* 14px */
  --icon-stroke: var(--icon-xs-stroke-width);  /* 2px */
}

@media (hover: hover) {
  .workspace-tab-header.is-active .workspace-tab-header-status-icon:hover,
  .workspace-tab-header.is-active .workspace-tab-header-inner-close-button:hover {
    background-color: var(--background-modifier-hover);
  }
  .mod-root .workspace-tab-header.is-active .workspace-tab-header-status-icon.mod-linked:hover,
  .mod-root .workspace-tab-header.is-active .workspace-tab-header-inner-close-button.mod-linked:hover,
  .mod-root .workspace-tab-header.is-active .workspace-tab-header-status-icon.mod-pinned:hover,
  .mod-root .workspace-tab-header.is-active .workspace-tab-header-inner-close-button.mod-pinned:hover {
    background-color: var(--background-modifier-active-hover);
                                    /* hsla(--interactive-accent-hsl, 0.1) */
  }
}

.workspace-tab-header.is-active .workspace-tab-header-status-icon::after,
.workspace-tab-header.is-active .workspace-tab-header-inner-close-button::after { background-color: transparent; }

@media (hover: hover) {
  .workspace-tab-header-inner-close-button:hover { color: var(--tab-text-color-focused-active-current); }
}
.workspace-tab-header:hover .workspace-tab-header-inner-close-button { color: var(--tab-text-color-focused); }
@media (hover: hover) {
  .workspace-tab-header:hover .workspace-tab-header-inner-close-button:hover { color: var(--tab-text-color-focused-active-current); }
}
.workspace-tab-header.is-active .workspace-tab-header-inner-close-button { color: var(--tab-text-color-focused-active); }
@media (hover: hover) {
  .workspace-tab-header.is-active .workspace-tab-header-inner-close-button:hover { color: var(--tab-text-color-focused-active-current); }
}
```

Pin/Link status icons specifically use `--background-modifier-active-hover` (a 10 % accent tint) rather than the generic neutral hover, marking them as "stateful" indicators when interacted.

### 6.1 Hide close on non-active in root tabs (`app.css:7032-7046`, `7183-7191`)

```css
.mod-root .workspace-tab-header-status-icon { color: var(--text-accent); }

.mod-root .workspace-tab-header-status-icon,
.mod-root .workspace-tab-header-inner-icon {
  --icon-size:   var(--icon-xs);   /* 14px */
  --icon-stroke: var(--icon-xs-stroke-width);
}
.mod-root .mod-pinned,
.mod-root .workspace-tab-header-inner-close-button {
  --icon-size:   var(--icon-s);    /* 16px */
  --icon-stroke: var(--icon-s-stroke-width);
}

.workspace .mod-root .workspace-tabs:not(.mod-stacked) .workspace-tab-header:not(.is-active) .workspace-tab-header-inner-close-button {
  display: none;
}
@media (hover: hover) {
  .workspace .mod-root .workspace-tabs:not(.mod-stacked) .workspace-tab-header:hover .workspace-tab-header-inner-close-button {
    display: flex;
  }
}
```

In the root tabs, only the active tab shows its close button by default. Hover on any tab reveals its close button. This prevents the rail from looking cluttered with × icons.

---

## 7. Sidebar tabs — icon-only switchers (`app.css:7011-7022`, `7062-7115`)

The left and right sidebar tabs display only icons; titles are hidden via `--sidebar-tab-text-display: none`.

```css
.workspace-fake-target-overlay.is-in-sidebar .workspace-tab-header-inner-title,
.mod-left-split .workspace-tab-header-inner-title,
.mod-right-split .workspace-tab-header-inner-title {
  display: var(--sidebar-tab-text-display);   /* none */
}
.workspace-fake-target-overlay.is-in-sidebar .workspace-tab-header-inner-close-button,
.mod-left-split .workspace-tab-header-inner-close-button,
.mod-right-split .workspace-tab-header-inner-close-button { display: none; }

.mod-left-split .workspace-tab-header-container .workspace-tab-header-container-inner,
.mod-right-split .workspace-tab-header-container .workspace-tab-header-container-inner {
  padding: 1px 0 7px;
  margin: 6px 0 0 0;
  gap: 3px;
}

.mod-left-split .workspace-tab-header-container .workspace-tab-header,
.mod-right-split .workspace-tab-header-container .workspace-tab-header {
  box-shadow: none;                          /* no outline */
  background-color: transparent;             /* no fill */
  padding: 0;
  margin: 0;
  border-radius: var(--radius-s);            /* 4px */
  corner-shape: var(--corner-shape);
}

/* Disable the corner-curve pseudo-elements in sidebar mode */
.mod-left-split .workspace-tab-header-container .workspace-tab-header:before,
.mod-right-split .workspace-tab-header-container .workspace-tab-header:before,
.mod-left-split .workspace-tab-header-container .workspace-tab-header:after,
.mod-right-split .workspace-tab-header-container .workspace-tab-header:after {
  display: none;
}

.mod-left-split .workspace-tab-header-container .workspace-tab-header:active .workspace-tab-header-inner-icon,
.mod-right-split .workspace-tab-header-container .workspace-tab-header:active .workspace-tab-header-inner-icon {
  color: var(--icon-color-focused);   /* --text-normal */
}

.mod-left-split .workspace-tab-header-container .workspace-tab-header.has-active-menu,
.mod-right-split .workspace-tab-header-container .workspace-tab-header.has-active-menu,
.mod-left-split .workspace-tab-header-container .workspace-tab-header.is-active,
.mod-right-split .workspace-tab-header-container .workspace-tab-header.is-active {
  background-color: var(--background-modifier-hover);
}
@media (hover: hover) {
  .mod-left-split .workspace-tab-header-container .workspace-tab-header.has-active-menu:hover,
  .mod-right-split .workspace-tab-header-container .workspace-tab-header.has-active-menu:hover,
  .mod-left-split .workspace-tab-header-container .workspace-tab-header.is-active:hover,
  .mod-right-split .workspace-tab-header-container .workspace-tab-header.is-active:hover {
    background-color: var(--background-modifier-hover);
  }
}

.mod-left-split .workspace-tab-header-container .workspace-tab-header.has-active-menu .workspace-tab-header-inner-icon,
.mod-right-split .workspace-tab-header-container .workspace-tab-header.has-active-menu .workspace-tab-header-inner-icon,
.mod-left-split .workspace-tab-header-container .workspace-tab-header.is-active .workspace-tab-header-inner-icon,
.mod-right-split .workspace-tab-header-container .workspace-tab-header.is-active .workspace-tab-header-inner-icon {
  opacity: var(--icon-opacity-active);   /* 1 */
  color:   var(--icon-color-focused);    /* --text-normal */
}
```

Sidebar tabs are simple icon buttons with hover/active backgrounds; the active state is just a `--background-modifier-hover` fill, not a tab outline.

---

## 8. New-tab and tab-list buttons (`app.css:6976-7009`)

```css
.workspace-tab-header-tab-list,
.workspace-tab-header-new-tab {
  -webkit-app-region: no-drag;
  display: none;                  /* hidden in sidebars; shown in titlebar/root */
  z-index: 1;
  align-items: center;
}
.titlebar .workspace-tab-header-tab-list,
.titlebar .workspace-tab-header-new-tab,
.mod-root .workspace-tab-header-tab-list,
.mod-root .workspace-tab-header-new-tab {
  display: flex;
}

.workspace-tab-header-tab-list .clickable-icon,
.workspace-tab-header-new-tab .clickable-icon {
  color: var(--icon-color);                  /* --text-muted */
  padding: var(--size-2-2);                  /* 4px */
  --icon-size:   var(--icon-m);              /* 18px */
  --icon-stroke: var(--icon-m-stroke-width); /* 1.75px */
  align-items: center;
}

.workspace-tab-header-new-tab {
  padding: var(--size-4-2) 0 var(--size-2-3);    /* 8px 0 6px */
  margin-inline-end:   var(--size-4-3);          /* 12px */
  margin-inline-start: -4px;                     /* pulls tighter to the rail */
}
.workspace-tab-header-tab-list {
  margin-inline-end: var(--size-4-1);            /* 4px */
  padding: var(--size-4-2) 0 var(--size-2-3);    /* 8px 0 6px */
}
```

The `+` is `.workspace-tab-header-new-tab`; the chevron-down (open all-tabs menu) is `.workspace-tab-header-tab-list`. Both are at the right end of the rail in root and titlebar contexts.

---

## 9. Spacer drag region (`app.css:6963-6974`)

```css
.workspace-tab-header-spacer { display: flex; flex-grow: 1; }
body:not(.is-grabbing):not(.is-fullscreen) .workspace-tabs.mod-top .workspace-tab-header-spacer {
  -webkit-app-region: drag;
}
body:not(.is-grabbing):not(.is-fullscreen).is-hidden-frameless .mod-top .workspace-tab-header-container {
  -webkit-app-region: drag;
}
```

The spacer fills any leftover horizontal space in the rail. It opts back into Electron's `drag` region (the rail itself opted out for tabs), so the user can grab the empty area to move the window. Disabled during `.is-grabbing` (so dragging a tab doesn't drag the window) and during fullscreen.

In `.is-hidden-frameless` mode (no titlebar), the **entire** tab-header container becomes drag — the user has no titlebar so the rail doubles as drag handle. Tabs themselves remain `no-drag`.

---

## 10. Stacked tabs (`app.css:7199-7299`)

When the user enables "Stacked tabs" on a `.mod-root .workspace-tabs`, the leaves arrange horizontally in a scrollable strip and each tab header rotates 90 degrees with vertical text.

```css
.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-header-container-inner {
  padding: 0 0 0 var(--size-4-3);  /* 12px left only */
  margin: 0;
}
.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container {
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  display: flex;
  flex-direction: row;
}
.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container>* {
  flex: 0 0 auto;
  position: sticky;
}

.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header {
  width: var(--tab-stacked-header-width);   /* 40px */
  writing-mode: var(--tab-stacked-text-writing-mode);   /* vertical-lr */
  text-orientation: sideways;
  background-color: var(--background-primary);
  padding: 0;
  border-radius: 0;
  box-shadow: -1px 0 0 0 var(--tab-outline-color),
              var(--tab-stacked-shadow);    /* -8px 0 8px 0 rgba(0,0,0,0.05) */
  --no-tooltip: true;
}
.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header:before,
.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header:after { display: none; }

@media (hover: hover) {
  .workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header:hover .workspace-tab-header-inner {
    background-color: transparent;
  }
}

.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header-inner {
  padding: var(--size-4-2) var(--size-4-2) var(--size-4-4);  /* 8px 8px 16px */
  border-radius: 0;
}
.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header-inner:after {
  display: none;
}

.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header-inner-title {
  order: 3;
  width: auto;
  -webkit-mask-image: unset;
  padding: var(--size-4-1) 0;
  transform: var(--tab-stacked-text-transform);  /* rotate(0deg) */
  text-align: var(--tab-stacked-text-align);     /* start */
  font-weight: var(--tab-stacked-font-weight);   /* 400 */
  font-size: var(--tab-stacked-font-size);       /* 13px */
  text-orientation: mixed;
}

.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header-inner-icon {
  order: 2;
  cursor: grab;
  display: flex;
  padding: var(--size-2-2);            /* 4px */
  border-radius: var(--radius-s);
  corner-shape: var(--corner-shape);
}
@media (hover: hover) {
  .workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header-inner-icon:hover {
    background-color: var(--background-modifier-hover);
  }
}
.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header-inner-icon:active { cursor: grabbing; }

.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header-inner-close-button {
  color: var(--tab-text-color-focused);
}
@media (hover: hover) {
  .workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-tab-header-inner-close-button:hover {
    background-color: var(--background-modifier-hover);
  }
}

.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-leaf {
  width: var(--tab-stacked-pane-width);   /* 700px */
  contain: strict;
}
.workspace .mod-root .workspace-tabs.mod-stacked .workspace-tab-container .workspace-leaf.is-hidden>* {
  display: none;
}
```

Behavior:
- Stacked tabs row is `flex: 0 0 auto` for each leaf, each pinned `position: sticky`. The leaves are 700 px wide each and the container scrolls horizontally.
- Each header is rotated to vertical-lr writing mode (text reads bottom-up). The icon stays upright (`text-orientation: mixed`).
- Header is 40 px wide with a `-8px 0 8px 0 rgba(0,0,0,0.05)` shadow on the left so the headers stack visually like overlapping pages.
- Icons in stacked mode are **drag handles** — `cursor: grab` → `grabbing` on press, used to reorder leaves.
- The leaf gets `contain: strict` so off-screen leaves don't render (perf optimization).
- `.is-hidden` collapses leaves whose content is fully off-screen.
- `--no-tooltip: true` is set so the header doesn't auto-tooltip its title (the title is already visible in the rotated label).

---

## 11. Sidebar toggle button (`app.css:7301-7349`)

```css
.sidebar-toggle-button {
  position: relative;
  -webkit-app-region: inherit;          /* default: drag from parent strip */
  height: calc(var(--header-height) - 1px);   /* 39px */
  display: flex;
  justify-content: center;
  padding: var(--size-4-2) 0 7px 0;     /* 8px top, 7px bottom — keeps icon centered with the 1px outline visible */
  -webkit-app-region: no-drag;          /* but the button itself is clickable */
  --icon-size:   var(--icon-l);         /* 18px */
  --icon-stroke: var(--icon-l-stroke-width);
}

.sidebar-toggle-button .sidebar-toggle-icon-inner { stroke: none; }

.sidebar-toggle-button.mod-left .sidebar-toggle-icon-inner {
  width: var(--sidebar-left-toggle-inner-width);     /* 8.33% (closed) */
}
.workspace.is-left-sidedock-open .sidebar-toggle-button.mod-left .sidebar-toggle-icon-inner {
  --sidebar-left-toggle-inner-width: var(--sidebar-left-toggle-inner-width-open);  /* 24% (open) */
}

.sidebar-toggle-button.mod-right .clickable-icon { transform: scale(-1, 1); }   /* mirror the icon */
.sidebar-toggle-button.mod-right .clickable-icon .sidebar-toggle-icon-inner {
  width: var(--sidebar-right-toggle-inner-width);    /* 8.33% closed */
}
.workspace.is-right-sidedock-open .sidebar-toggle-button.mod-right .clickable-icon .sidebar-toggle-icon-inner {
  --sidebar-right-toggle-inner-width: var(--sidebar-right-toggle-inner-width-open);
}

/* macOS frameless: pin the right toggle to top-right of window */
.mod-macos.is-hidden-frameless:not(.is-popout-window) .sidebar-toggle-button.mod-right {
  background-color: var(--tab-container-background);
  position: fixed;
  top: 0; right: 0;
  padding-right: var(--size-4-2);
  z-index: var(--layer-cover);
}
.mod-macos.is-hidden-frameless:not(.is-popout-window) .workspace .workspace-tabs.mod-top-right-space .workspace-tab-header-container {
  padding-right: 38px;        /* leave room for the absolute-positioned right toggle */
}
```

Mechanism:
- Each toggle is a button containing an SVG with an "inner" rectangle whose CSS `width` is animated by a token. Closed → 8.33% (a tiny notch of fill); open → 24% (a fatter rectangle visualizing the docked sidebar). This is a single-frame visual indicator — no path morphing.
- `.mod-right` mirrors the icon (`transform: scale(-1, 1)`) so the same SVG works on both sides.
- On macOS frameless windows, the right toggle is hoisted to a fixed position at top-right (matching the absent native window-control buttons), with the rail's right padding bumped to 38 px to clear it.

### Forced-colors override (`app.css:7351-7355`)

```css
@media (forced-colors: active) {
  .workspace-tab-header.is-active { outline: 1px ButtonBorder solid; }
}
```

In Windows high-contrast mode, the active tab gets an explicit `ButtonBorder` outline so it's visible without depending on background color.

---

## 12. Reproducer build order

1. The strip (`.workspace-tab-header-container`) is a fixed 40 px tall flex row. It must use `padding: 0 8px` and `position: relative` so children's `position: absolute` (corner curves) anchor correctly.
2. The rail (`-container-inner`) must use **negative margins** `6px -5px -1px` to bleed into the strip's padding and overlap the bottom border. Without this the curved corners and the active-tab "merge" with the leaf will not work.
3. Each `.workspace-tab-header` is `flex: 1 1 0; min-width: 0; max-width: 320px; width: 200px` so tabs equally share remaining space, but never grow past 320 or shrink below the close-button-hide threshold of `3rem`.
4. Active tab CSS is the **only** rule that applies a 1 px box-shadow; the bottom of that box-shadow lives **below** the strip border because of the `-1px` bottom margin on the rail. This is what makes the active tab look "open at the bottom."
5. The `::before` and `::after` curve trick relies on `box-shadow` painted in `--tab-background-active` to mask out a quarter-circle of strip background. If the reproducer uses `mask-image` instead, the gradient must include both the inset border and the outer fill colors — easier to keep the original.
6. Sticky positioning on `.workspace-tab-header-status-container` and `.workspace-tab-header-inner-close-button` requires their parent `.workspace-tab-header-inner` to have `overflow: hidden`. Otherwise long titles will let the close button scroll out of view.
7. Container queries (`@container tab-header (width < 3rem)`) require `container-type: inline-size; container-name: tab-header` on the tab itself. This rule is critical; without it the close-button-hide-when-narrow logic fails and the strip looks cluttered when many tabs are open.
8. `.is-active` and `.is-before-active` are mutually exclusive but must be tracked simultaneously — when the active tab moves, both classes update.
9. Sidebar tabs reuse the **same** DOM and class names; only `.mod-left-split` / `.mod-right-split` ancestor selectors differentiate. The simplest reproducer keeps the DOM identical and lets CSS specialize.
10. Stacked tabs use `writing-mode: vertical-lr; text-orientation: sideways` for the rotation. `text-orientation: mixed` on the title only (so emoji and CJK stay upright).
11. The sidebar toggle SVG must contain a child element with the class `sidebar-toggle-icon-inner` whose width is set via CSS variables — that is the entire animation, no JS interpolation needed.
