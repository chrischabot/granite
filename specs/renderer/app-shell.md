# App Shell

> The outermost layout: how `<body>` is divided into chrome, ribbon, workspace splits, and status bar. Every interior view (file explorer, editor, settings modal) is rendered into a `.workspace-leaf` mounted somewhere in this scaffold.

All citations: `renderer/app.css`. Tokens referenced are defined in [`design-tokens.md`](design-tokens.md).

---

## 1. Body classes — runtime feature flags

`<body>` ships with `class="theme-dark"` (`renderer/index.html:12`). At runtime, JS adds and removes class flags that gate hundreds of selectors in `app.css`. Below are the **shell-affecting** flags and what each enables.

| Flag | Effect | Selectors that consume it |
| --- | --- | --- |
| `theme-light` / `theme-dark` | Theme primitives (see `design-tokens.md` §14-15). | `.theme-light { … }`, `.theme-dark { … }` |
| `mod-macos` | macOS chrome — traffic-light spacing, larger toggles/sliders, no platform titlebar buttons. | many; e.g. `app.css:6177-6187`, `2998-3009` |
| `mod-windows` | Windows chrome — built-in min/max/close buttons. | `app.css:6267-6296` |
| `mod-linux` | Linux chrome (same builtin button behavior as Windows). | `app.css:6267-6296` |
| `is-frameless` | Hides the OS titlebar; renderer draws its own. JS sets `<body>` padding-top to 0 when `.is-hidden-frameless`. | `app.css:4254-4317`, `6237-6296` |
| `is-hidden-frameless` | Specifically when the renderer titlebar is suppressed. Drag regions move from `.titlebar` to `.workspace-tab-header-container-inner`. | `app.css:4246-4252`, `4265-4298`, `6241-6265` |
| `is-fullscreen` | macOS fullscreen / Windows max → restore traffic-light spacing. | `app.css:4265-4298`, `6067-6069`, `6241-6243` |
| `is-focused` | Window has OS-level focus. Switches `--titlebar-background` → `--titlebar-background-focused`, switches `.view-header` background and `.view-header-title` color. | `app.css:4219-4227`, `4464-4466`, `4558-4560`, `6147-6148`, `4297-4298` |
| `is-translucent` | Vibrancy / blur effect on macOS — the workspace becomes transparent over OS wallpaper. Forces `--background-primary` etc. transparent on most chrome. | `app.css:3205-3207`, `6304-6326`, `6406-6408`, `6490-6493` |
| `is-mobile` | Mobile detection (Capacitor app). | many |
| `is-phone` | Phone-sized viewport. Hides view-header on non-`show-view-header`, etc. | `app.css:4460-4462`, `6568-6570`, `6714-6716`, `4782-4784` |
| `is-tablet` | Tablet form factor. | misc |
| `is-android`, `is-ios` | OS-specific tweaks. | misc |
| `is-grabbing` | Dragging is in progress — sets `cursor: grabbing` everywhere except `.workspace-leaf-resize-handle`, blocks pointer events on iframes/webviews. | `app.css:3244-3253` |
| `is-screenshotting` | Screenshot mode — hides status bar. | `app.css:6125-6127` |
| `is-text-garbled` | Privacy mode — replaces all text glyphs with `Flow Circular`. | `app.css:3297-3300` |
| `is-loading` | Generic "this element is loading" via animated 3-px bar `::before`. | `app.css:4423-4435` |
| `show-view-header` | View header chrome visibility toggle. | `app.css:4460-4462` |
| `show-inline-title` | Inline page title visibility toggle. | `app.css:4621-4627` |
| `show-ribbon` | Ribbon visibility toggle. When absent, `--ribbon-width: 0px` and ribbon is `display: none`. | `app.css:4711-4718` |
| `is-rtl` | RTL interface language — flips bidi behavior. | `app.css:4818+` |
| `is-frameless.in-progress` | Update install in progress. | `app.css:4254-4263` |

The reproducer must keep these as a single source of truth on `<body>` and toggle them in response to system events. Adding/removing classes is the **only** way the shell shifts modes — no inline styles.

---

## 2. Top-level DOM scaffold

```
<body class="theme-dark mod-macos is-focused [...]">

  ┌─ .titlebar (position:fixed, top:0, full width)            ← window chrome
  │    └─ .titlebar-inner (color, weight)
  │         ├─ .titlebar-button-container.mod-left
  │         │    ├─ .titlebar-button.mod-logo (Linux/Windows only)
  │         │    ├─ .titlebar-button.mod-back  (back nav)
  │         │    └─ .titlebar-button.mod-forward (forward nav)
  │         ├─ .titlebar-text  (vault name, centered)
  │         └─ .titlebar-button-container.mod-right
  │              ├─ .titlebar-button.mod-min   (Win/Lin only)
  │              ├─ .titlebar-button.mod-max
  │              └─ .titlebar-button.mod-close
  │
  ├─ .app-container (flex column, 100% × 100%)
  │    └─ .horizontal-main-container (flex row, grows)
  │         ├─ .workspace-ribbon.mod-left
  │         ├─ .workspace (flex 1, grows)
  │         │    └─ .workspace-split.mod-root
  │         │         ├─ .workspace-split.mod-left-split
  │         │         │    └─ .workspace-tabs.mod-top-left-space
  │         │         │         └─ .workspace-leaf …
  │         │         ├─ (root content area – tabs + splits)
  │         │         └─ .workspace-split.mod-right-split
  │         │              └─ .workspace-tabs.mod-top-right-space
  │         │                   └─ .workspace-leaf …
  │         └─ .workspace-ribbon.mod-right (display:none always)
  │
  └─ .status-bar (position:fixed, bottom:0, right:0)
       └─ .status-bar-item …
```

There is **no top toolbar**, no menu bar in the renderer (the menu is a native OS construct on macOS, hidden in Windows/Linux behind a hamburger). The titlebar is the only horizontal chrome strip.

DOM is constructed entirely by `app.js` at startup; only the body is in `index.html`.

---

## 3. `body` baseline (`app.css:3179-3203`)

```css
* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  height: 100%; width: 100%;
  overscroll-behavior: none;
}

body {
  text-rendering: optimizeLegibility;
  font-family: var(--font-interface);
  line-height: var(--line-height-tight);   /* 1.3 */
  font-size: var(--font-ui-medium);        /* 15px */
  background-color: var(--background-primary);
  color: var(--text-normal);
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0);
  overflow: hidden; overflow: clip;
  contain: strict;
  user-select: none;
  -webkit-user-select: none;
  caret-color: var(--caret-color);
}

body.is-translucent { background-color: transparent; }

body [contenteditable="true"], body [contenteditable=""] {
  user-select: text; -webkit-user-select: text;
}

body.is-grabbing,
body.is-grabbing *:not(.workspace-leaf-resize-handle) {
  cursor: grabbing !important;
}
body.is-grabbing iframe:not(.is-controlled),
body.is-grabbing webview { pointer-events: none; }
```

Reproducer rules:
- `user-select: none` on body is critical — only contenteditable elements opt back in.
- `contain: strict` — the body cannot leak layout/paint outside its box. This isolates the editor and previews from each other for performance.
- `:focus { outline: none; }` (`app.css:3293-3295`) suppresses the default focus ring; every component that wants focus visibility draws its own (`box-shadow`, etc.).

---

## 4. `.app-container` (`app.css:3256-3284`)

```css
.app-container {
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: column;
}
.app-container.no-transition * { transition: none !important; }
.app-container.mod-loading .clickable-icon {
  pointer-events: none; touch-action: none;
}
.app-container.mod-loading .view-header .loader-spinner {
  --icon-size: var(--icon-l);            /* 18px */
  --icon-stroke: var(--icon-l-stroke-width); /* 1.75px */
  margin: var(--size-4-3) var(--size-4-2); /* 12px 8px */
}
.app-container.mod-loading .view-header .loader-spinner svg {
  animation: spin 0.9s ease infinite;
}
body:not(.is-mobile) .app-container { position: relative; }
```

Modifier classes:
- `.no-transition` — disables every transition globally. JS toggles this during initial mount and during full-window resize so geometry changes don't animate.
- `.mod-loading` — set during vault load. Shows spinner in view header, blocks ribbon clicks, blocks touch.

---

## 5. `.horizontal-main-container` (`app.css:3286-3291`)

```css
.horizontal-main-container {
  width: 100%;
  display: flex;
  overflow: hidden;
  flex: 1 0 0;        /* takes all remaining vertical space */
}
```

This is the row that holds the ribbon, the workspace, and (when the right ribbon is enabled, which it never is) the right ribbon.

---

## 6. `.titlebar` (`app.css:6129-6296`)

### 6.1 The titlebar element itself

```css
.titlebar {
  -webkit-app-region: drag;            /* whole bar drags the window */
  position: fixed;
  top: 0; left: 0; right: 0;
  display: flex;
  background-color: var(--titlebar-background);
  border-bottom: var(--titlebar-border-width) solid var(--titlebar-border-color);
}
.titlebar-inner {
  color: var(--titlebar-text-color);
  font-weight: var(--titlebar-text-weight);
  width: 100%;
  display: flex;
}
.is-focused .titlebar-inner { color: var(--titlebar-text-color-focused); }
```

Resolved values (default tokens):

| Property | Light | Dark |
| --- | --- | --- |
| `background` | `--background-secondary` → `#f6f6f6` | `#262626` |
| (when `.is-focused`) | `--background-secondary-alt` → `#fcfcfc` | `#363636` |
| `border-bottom` | `0px solid #e0e0e0` | `0px solid #363636` |
| text color | `--text-muted` → `#5c5c5c` | `#b3b3b3` |
| (focused) | `--text-normal` → `#222222` | `#dadada` |
| font-weight | `700` | `700` |

The titlebar height is **not set explicitly** — it expands to fit `.titlebar-inner` content. `.titlebar` height = `--header-height` = `40px` because the `.workspace-ribbon.mod-left:before` (the rectangle painted above the ribbon to align with the titlebar background) is `var(--header-height)` tall (`app.css:4706`) and the ribbon is offset by `margin-top: var(--header-height)` (`app.css:4694`).

### 6.2 Titlebar text — vault name (`app.css:6151-6169`)

```css
.titlebar-text {
  opacity: 0.85;
  position: absolute;
  width: 100%; height: 100%;
  top: 0; inset-inline-start: 0;
  flex-grow: 1;
  gap: 0.15em;
  font-size: var(--font-ui-small);   /* 13px */
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 125px;                  /* leaves room for buttons each side */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

`@media screen and (max-width: 300px) { .titlebar-text { display: none; } }` (`app.css:6298-6302`) — at narrow widths the title disappears entirely.

### 6.3 Titlebar buttons (`app.css:6171-6234`)

```css
.titlebar-button-container { display: flex; position: absolute; top: 0; }
.mod-macos .titlebar-button-container { top: 8px; }
.titlebar-button-container.mod-left { left: 0; }
.mod-macos .titlebar-button-container.mod-left { left: calc(80px / var(--zoom-factor)); }
.titlebar-button-container.mod-right { right: 0; }

.titlebar-button-container .mod-back,
.titlebar-button-container .mod-forward { color: var(--icon-color); }

.titlebar-button-container .mod-back .svg-icon,
.titlebar-button-container .mod-forward .svg-icon {
  width: 14px; height: 14px;
  stroke-width: 2.25px;
}
@media (hover: hover) {
  .titlebar-button-container .mod-back:hover,
  .titlebar-button-container .mod-forward:hover { color: var(--icon-color-hover); }
}

.titlebar-button {
  -webkit-app-region: no-drag;
  padding: var(--size-2-2) var(--size-2-3);   /* 4px 6px */
  cursor: var(--cursor);
  display: inline-flex;
  align-items: center;
}
@media (hover: hover) {
  .titlebar-button:hover {
    opacity: 1;
    background-color: var(--background-modifier-hover);
  }
  .titlebar-button.mod-close:hover { background-color: var(--background-modifier-error); }
}
.mod-macos .titlebar-button { border-radius: var(--radius-s); }   /* 4px */
.mod-linux .titlebar-button-container,
.mod-windows .titlebar-button-container { height: 100%; }
.mod-linux .titlebar-button,
.mod-windows .titlebar-button {
  padding: 0 16px;
  display: flex; align-items: center;
}
.mod-linux .titlebar-button.mod-logo,
.mod-windows .titlebar-button.mod-logo { padding: 4px 8px; }

@media (hover: hover) {
  .mod-linux .titlebar-button.mod-close:hover,
  .mod-windows .titlebar-button.mod-close:hover { background-color: var(--background-modifier-error); }
  .mod-linux .titlebar-button.mod-close:hover .svg-icon,
  .mod-windows .titlebar-button.mod-close:hover .svg-icon { fill: white; stroke: white; }
}
```

Key facts:
- macOS: traffic lights are native — Obsidian only renders back/forward arrows on the left at `top: 8px; left: 80px / var(--zoom-factor)` to **align with macOS native traffic lights**. The 80 px offset is the standard macOS gap between window edge and the start of titlebar widgets after the lights.
- Windows / Linux: Obsidian renders its own min/max/close on the right, padded `0 16px`, full titlebar height. Hover on `.mod-close` paints `--background-modifier-error` (red) and inverts the SVG to white fill/stroke.
- Logo button: shown only on Win/Linux. macOS shows the back/forward arrows positioned over the ribbon column at `var(--ribbon-width)` (44 px) wide (`app.css:4241-4244`). When hovered it swaps the wireframe and full logo SVGs (`app.css:4301-4304`).

### 6.4 Frameless variants (`app.css:6237-6296`)

`is-hidden-frameless.mod-macos`: `.titlebar { display: none }` — fully removed; macOS uses its own traffic lights against `.workspace-ribbon.mod-left:before` and the workspace-tabs header.

`is-hidden-frameless.mod-windows / .mod-linux`: titlebar still in DOM but `background: transparent; border: none; z-index: var(--layer-popover); pointer-events: none` — the only visible parts are the back/forward arrows and the right-side window-control buttons whose container is given `pointer-events: auto`. Title text disappears.

Frameless padding (`app.css:4265-4291`):

```css
.is-hidden-frameless:not(.is-fullscreen) .workspace-tabs.mod-top-left-space .workspace-tab-header-container {
  padding-left: calc(var(--size-4-2) + var(--frame-left-space));
}
.is-hidden-frameless:not(.is-fullscreen) .workspace-tabs.mod-top-right-space .workspace-tab-header-container {
  padding-right: calc(var(--size-4-2) + var(--frame-right-space));
}
/* macOS does NOT need the no-drag overlay — Win/Linux do */
.is-hidden-frameless:not(.is-fullscreen):not(.mod-macos) .workspace-tabs.mod-top-left-space .workspace-tab-header-container:before {
  -webkit-app-region: no-drag;
  content: '';
  position: absolute;
  height: 100%; width: var(--frame-left-space);
  left: 0; top: 0;
}
/* mirror on right */
```

`--frame-left-space` and `--frame-right-space` are runtime CSS variables set by JS based on detected traffic-light width (macOS) and OS chrome buttons (Win/Linux).

`body.is-frameless.in-progress` (during update install): forces `--titlebar-background: var(--background-primary)` so the titlebar reads as part of the editor while updating; titlebar gets `display: block; -webkit-app-region: drag; z-index: 10001` (`app.css:4254-4263`).

---

## 7. `.workspace-ribbon` (`app.css:4691-4760`, `4711-4718`, `4720-4750`)

### 7.1 Container

```css
.workspace-ribbon {
  width: var(--ribbon-width);            /* 44px */
  flex: 0 0 var(--ribbon-width);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--ribbon-background);   /* --background-secondary */
  z-index: var(--layer-sidedock);                /* 10 */
  color: var(--text-muted);
  padding: var(--ribbon-padding);                /* 8px 4px 12px */
  gap: var(--size-4-1);                          /* 4px */
  border-right: var(--divider-width) solid var(--divider-color);
}
```

### 7.2 Left-ribbon header gap (above ribbon, behind macOS traffic lights)

```css
.workspace-ribbon.mod-left { margin-top: var(--header-height); }   /* 40px */
.workspace-ribbon.mod-left:before {
  -webkit-app-region: drag;
  position: absolute;
  left: 0; top: 0;
  background-color: var(--titlebar-background);
  content: " ";
  border-bottom: var(--tab-outline-width) solid var(--tab-outline-color);
  height: var(--header-height);                  /* 40px */
  width: var(--ribbon-width);                    /* 44px */
  box-sizing: border-box;
}
```

### 7.3 Visibility

```css
body:not(.show-ribbon) { --ribbon-width: 0px; }
body:not(.show-ribbon) .workspace-ribbon,
body:not(.show-ribbon) .side-dock-ribbon { display: none; }

.workspace-ribbon.mod-right { display: none; }   /* never used */
.workspace-ribbon.is-hidden { display: none; }
.workspace-ribbon.is-collapsed { background-color: var(--background-secondary); }
.workspace-ribbon.mod-left.is-collapsed {
  transition: background-color 250ms 95ms ease-in-out;
  background-color: var(--ribbon-background-collapsed);   /* --background-primary */
  border-right-color: var(--divider-color);
}
```

### 7.4 Sidebar-toggle button at top of ribbon

```css
.workspace-ribbon .sidebar-toggle-button {
  position: absolute;
  top: 0; left: 0;
  width: var(--ribbon-width);
  justify-content: center;
}
.titlebar-button.mod-logo {
  width: var(--ribbon-width);
  justify-content: center;
}
.sidebar-toggle-button,
.workspace-tabs.mod-top { --tab-container-background: var(--titlebar-background); }
body.is-focused .titlebar,
body.is-focused .workspace-ribbon.mod-left {
  --titlebar-background: var(--titlebar-background-focused);
}
body.is-focused .sidebar-toggle-button,
body.is-focused .workspace-tabs.mod-top {
  --tab-container-background: var(--titlebar-background-focused);
}
```

The sidebar toggle button (chevron) sits absolutely positioned at the top of the ribbon, occupying the full ribbon width (44 px) for click targeting.

### 7.5 Side-dock action lists (`app.css:4752-4764`)

```css
.side-dock-settings,
.side-dock-actions { flex-direction: column; }
.side-dock-settings .side-dock-ribbon-action,
.side-dock-actions .side-dock-ribbon-action { margin: 0 auto; }
.side-dock-settings { margin-top: auto; }     /* push to bottom of column */
```

The ribbon column is split into two action groups:
- `.side-dock-actions` — top group (e.g., Open command palette, Toggle left/right sidebar, etc.).
- `.side-dock-settings` — bottom group (Settings, Help) pushed to the bottom by `margin-top: auto`.

Each ribbon action is rendered as a `.side-dock-ribbon-action` (which is a `.clickable-icon` — see `buttons.md`).

### 7.6 Translucency (`app.css:6315-6326`)

When `.is-translucent` and not fullscreen, every shell surface that has its own opaque background goes transparent so the OS wallpaper shows through:

```css
.is-translucent:not(.is-fullscreen) .workspace-ribbon.mod-left,
.is-translucent:not(.is-fullscreen) .workspace-tabs,
.is-translucent:not(.is-fullscreen) .workspace-split,
.is-translucent:not(.is-fullscreen) .sidebar-toggle-button,
.is-translucent:not(.is-fullscreen) .mod-left-split .workspace-tab-header-container,
.is-translucent:not(.is-fullscreen) .mod-right-split .workspace-tab-header-container,
.is-translucent:not(.is-fullscreen) .mod-top .workspace-tab-header-container,
.is-translucent:not(.is-fullscreen) .workspace-tabs .workspace-leaf,
.is-translucent:not(.is-fullscreen) .workspace-sidedock-vault-profile,
.is-translucent:not(.is-fullscreen) .workspace-ribbon.mod-left:before {
  background-color: transparent !important;
}
.is-translucent:not(.is-fullscreen) .titlebar,
.is-translucent:not(.is-fullscreen) .app-container {
  background-color: var(--workspace-background-translucent);  /* rgba(mono-rgb-0, 0.6) */
}
.is-translucent:not(.is-fullscreen) {
  --nav-collapse-icon-color: rgba(var(--mono-rgb-100), 0.3);
  --nav-collapse-icon-color-collapsed: rgba(var(--mono-rgb-100), 0.3);
  --divider-color: rgba(0, 0, 0, 0.15);
}
```

---

## 8. `.workspace` and `.workspace-split` (`app.css:6398-6464`)

### 8.1 Workspace root

```css
.workspace {
  display: flex;
  flex: 1 0 0;
  transition: padding-left 100ms ease-in;
  overflow: hidden;
  height: 100%;
}
.is-translucent .workspace { background-color: transparent; }
```

The 100ms ease-in transition on `padding-left` is what makes the left sidebar collapse animate smoothly on desktop.

### 8.2 Splits

```css
.workspace-split {
  display: flex;
  background-color: var(--tab-container-background);    /* --background-secondary */
  position: relative;
}
.workspace-split.mod-vertical    { flex-direction: row; }
.workspace-split.mod-horizontal  { flex-direction: column; }
.workspace-split.mod-root        { background-color: var(--background-primary); }

.workspace-split.mod-vertical>.workspace-split:last-child { padding-inline-end: 0; }

.workspace-split.mod-vertical>* { height: 100%; flex: 1 0 0; width: 0; }
.workspace-split.mod-horizontal>* { width: 100%; flex: 1 0 0; height: 0; }

.workspace-split.mod-left-split,
.workspace-split.mod-right-split { flex: 0 0 auto; }   /* don't grow with the workspace */
```

There are exactly **three top-level splits** below the ribbon: `.mod-left-split`, `.mod-root`, `.mod-right-split`, in that visual order. The root split contains user-created child splits which can themselves nest with `.mod-vertical` and `.mod-horizontal` flex directions. **Only the root split** has `--background-primary`; left/right sidebars use `--background-secondary` via `--tab-container-background`.

### 8.3 Sidedock collapsed visibility (`app.css:6549-6552`)

```css
.is-translucent .workspace-split.mod-left-split.is-sidedock-collapsed .workspace-tabs,
.is-translucent .workspace-split.mod-right-split.is-sidedock-collapsed .workspace-tabs {
  visibility: hidden;
}
```

When a sidebar is collapsed in translucent mode, its contents are kept in DOM but hidden. JS animates the split's flex-basis to 0.

---

## 9. `.workspace-leaf` and resize handles (`app.css:6436-6560`)

### 9.1 Leaf

```css
.workspace-leaf {
  display: flex;
  flex-direction: column;
  position: relative;
  contain: strict !important;
  overflow: hidden;
  isolation: isolate;
}
.workspace-split.mod-root .workspace-leaf:last-child .workspace-leaf-resize-handle {
  display: none;
}
.workspace-leaf.is-highlighted:before {
  content: ' ';
  position: absolute;
  height: 100%; width: 100%;
  top: 0; inset-inline-start: 0;
  background-color: hsla(var(--interactive-accent-hsl), 0.25);
  z-index: var(--layer-popover);
  pointer-events: none;
}
.workspace>.workspace-leaf,
.workspace>.workspace-split { height: 100%; width: 100%; }
```

Notes:
- `contain: strict !important` — every leaf is a layout/paint/style boundary. This is what allows the editor to function without the rest of the app re-laying out on every keystroke. **Reproducer must keep this exactly** — replacing it with `contain: layout` measurably degrades frame times.
- `isolation: isolate` — the leaf is its own stacking context for `mix-blend-mode` (used by `.is-flashing`).
- `.is-highlighted` overlay — a 25%-opaque accent wash placed above content (z-index 30) but with `pointer-events: none`.

### 9.2 Resize handles (`app.css:6467-6560`)

```css
.workspace-split.mod-root>.workspace-leaf-resize-handle { display: none; }

.workspace-leaf-resize-handle {
  -webkit-app-region: no-drag;
  position: absolute;
  z-index: var(--layer-cover);                                 /* 5 */
  background-color: transparent;
  transition:
    background-color 200ms ease-in-out,
    border-color     200ms ease-in-out,
    opacity          200ms ease-in-out;
  border-color: var(--divider-color);
  border-top: 0;
  border-width: var(--divider-width);                          /* 1px */
  margin: 0;
}

@media (hover: hover) {
  .workspace-leaf-resize-handle:hover {
    background-color: var(--divider-color-hover);              /* --interactive-accent */
    border-color:    var(--divider-color-hover);
  }
  .is-translucent .workspace-leaf-resize-handle:hover {
    background-color: var(--divider-color-hover);
    border-color:    var(--divider-color-hover);
  }
}

/* horizontal split → bottom resize handle, full width × 3px */
.workspace-split.mod-horizontal>*>.workspace-leaf-resize-handle {
  bottom: 0;
  inset-inline-start: 0;
  border-bottom-style: solid;
  border-bottom-width: var(--divider-width);                   /* 1px */
  height: var(--divider-width-hover);                          /* 3px */
  width: 100%;
  cursor: row-resize;
}

/* vertical split + sidebars → right-edge resize handle, 3px × split-height */
.workspace-split.mod-vertical>*>.workspace-leaf-resize-handle,
.workspace-split.mod-left-split>.workspace-leaf-resize-handle,
.workspace-split.mod-right-split>.workspace-leaf-resize-handle {
  inset-inline-end: 0;
  bottom: 0;
  width: var(--divider-width-hover);                           /* 3px */
  height: var(--divider-vertical-height);                      /* 100% - 40px */
  cursor: col-resize;
}

.workspace-split.mod-right-split>.workspace-leaf-resize-handle {
  border-inline-start-style: solid;
  border-inline-start-width: var(--divider-width);
  inset-inline-end: unset;
  inset-inline-start: 0;                                       /* on the LEFT edge of right split */
}
.workspace-split.mod-vertical>*>.workspace-leaf-resize-handle,
.workspace-split.mod-left-split>.workspace-leaf-resize-handle {
  border-inline-end-style: solid;
  border-inline-end-width: var(--divider-width);
}

.workspace-split.mod-left-split>.workspace-leaf-resize-handle,
.workspace-split.mod-right-split>.workspace-leaf-resize-handle {
  z-index: var(--layer-status-bar);                            /* 15 — above leaf content */
  height: var(--divider-vertical-height);                      /* not 100% — leaves room for status bar */
  top: unset;
  bottom: 0;
}
```

Geometry:
- The handle is a 3 px wide hit-region drawn over the divider line (which is itself 1 px). On hover the entire 3 px region paints with `--divider-color-hover` (i.e. accent), making the handle visually thicken from 1 px to 3 px on approach.
- `--divider-vertical-height` = `calc(100% - 40px)` (`design-tokens.md` §5) leaves space for the 40 px status bar at the bottom so the handle does not overlap status-bar clicks.
- Sidebar handles get `z-index: 15` (`--layer-status-bar`) so they stack above their own leaf content.
- `mod-root` itself never has its own resize handle — the user resizes children, never the root.

### 9.3 Drop overlay and fake-target (`app.css:6612-6665`)

```css
.workspace-fake-target-overlay,
.workspace-drop-overlay {
  will-change: transform, width, height;
  position: fixed;
  inset-inline-start: 0; top: 0;
  width: 0; height: 0;
  transform: translate(0, 0);
  transition: all 100ms ease-in-out;
  z-index: var(--layer-cover);          /* 5 */
  pointer-events: none;
}

.workspace-drop-overlay:before {
  content: ' ';
  position: absolute;
  width:  calc(100% - 6px);
  height: calc(100% - 6px);
  top: 0; left: 0; bottom: 0; right: 0; margin: auto;
  background-color: var(--interactive-accent);
  border-radius: var(--radius-m);       /* 8px */
  opacity: 0.5;
}

.workspace-fake-target-container {
  visibility: hidden;
  position: absolute;
  pointer-events: none;
  top: 0; inset-inline-start: 0;
}
.workspace-fake-target-overlay {
  visibility: visible;
  overflow: hidden;
  background-color: var(--background-primary);
}
.workspace-fake-target-overlay>* { width: 100%; height: 100%; }
```

These are the **drag-to-split target highlights** that paint when the user drags a tab over a leaf edge:
- `.workspace-drop-overlay` is the violet-accent box (50 % opaque, inset 3 px on all sides) that appears over the half/quarter of the target leaf where the dragged tab will dock. It animates from `0×0` to its target size over 100 ms.
- `.workspace-fake-target-overlay` is a **detached preview** of the leaf being dragged — it's a duplicate render of the leaf's current content placed at fixed position to show what will land where. `visibility: visible` on this overrides the parent `.workspace-fake-target-container { visibility: hidden }`.

JS sets `transform`, `width`, and `height` on these elements; the 100 ms transition handles the animation.

---

## 10. `.workspace-leaf-content` (`app.css:6572-6610`)

```css
.workspace-leaf-content {
  width: 100%; height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}
.workspace-leaf-content .view-content {
  padding: var(--size-4-3) var(--size-4-3) var(--size-4-8);   /* 12px 12px 32px */
  padding-bottom: max(var(--safe-area-inset-bottom), var(--size-4-8));
  overflow: auto;
}
.workspace-leaf-content[data-type='markdown'] .view-content {
  padding: 0; overflow: hidden;
}
.workspace-leaf-content[data-type='backlink'] .view-content,
.workspace-leaf-content[data-type='outgoing-link'] .view-content {
  padding: 0; overflow: hidden;
  display: flex; flex-direction: column;
}
.workspace-leaf-content .image-container,
.workspace-leaf-content .audio-container,
.workspace-leaf-content .video-container { text-align: center; }
.workspace-leaf-content img:not([width]),
.workspace-leaf-content audio,
.workspace-leaf-content video { max-width: 100%; }
```

`data-type` selectors:
- The leaf's `data-type` attribute is the registered view type (`markdown`, `backlink`, `outgoing-link`, `file-explorer`, `search`, `bookmarks`, `tag`, `outline`, `graph`, `canvas`, `bases`, `pdf`, `webviewer`, `release-notes`, etc.).
- Generic views get default `12px 12px 32px` padding plus iOS safe-area expansion at the bottom.
- Markdown specifically zeroes padding because the editor manages its own gutters.
- Backlinks/outgoing-links use `display: flex; flex-direction: column` because their pane has its own scroll regions.

---

## 11. `.view-header` (`app.css:4449-4565`)

The pane header — the strip above each leaf's content that shows breadcrumbs, title, and per-view actions.

### 11.1 Container

```css
.view-header {
  height: var(--header-height);             /* 40px */
  display: flex;
  border-bottom: var(--file-header-border);  /* 1px solid transparent */
  background-color: var(--file-header-background);  /* --background-primary */
  z-index: 1;
  position: relative;
  gap: var(--size-4-2);                      /* 8px */
  padding: 0 var(--size-4-3);                /* 0 12px */
}
body:not(.show-view-header):not(.is-phone) .view-header { display: none; }

.is-focused .workspace-leaf.mod-active .view-header {
  background-color: var(--file-header-background-focused);   /* same default token */
}

.workspace-split.mod-left-split .view-header,
.workspace-split.mod-right-split .view-header,
.workspace-fake-target-overlay.is-in-sidebar .view-header { display: none; }

.view-header.is-highlighted:after {
  content: ' ';
  position: absolute;
  width: 100%; height: 100%;
  top: 0; inset-inline-start: 0;
  background-color: hsla(var(--interactive-accent-hsl), 0.5);
}
```

Reproducer rules:
- Sidebar leaves have **no view-header** — `display: none` on `.mod-left-split` / `.mod-right-split` descendants.
- The header height equals exactly `--header-height` (40 px) so it aligns with the titlebar gap above the ribbon and the workspace-tab-header.

### 11.2 Header content (`app.css:4484-4565`)

```css
.view-header-left {
  display: flex; align-items: center; justify-content: flex-start;
}

.view-header-title-container {
  font-family: var(--file-header-font);        /* --font-interface */
  font-size:   var(--file-header-font-size);   /* 13px */
  font-weight: var(--file-header-font-weight); /* 400 */
  flex: 1 1 auto;
  overflow: hidden;
  position: relative;
  justify-content: var(--file-header-justify); /* center */
  display: flex; align-items: center;
  gap: var(--size-4-1);                        /* 4px */
  min-width: 0;
}

.view-header-title-parent {
  color: var(--text-muted);
  flex: 0 100 auto;                            /* shrinks first */
  display: flex; gap: 0;
  overflow: hidden; white-space: nowrap;
}
.view-header-title-parent:empty { display: none; }

.view-header-title-parent .view-header-breadcrumb {
  padding: 2px 4px;
  border-radius: var(--radius-s);              /* 4px */
  overflow: hidden;
  text-overflow: ellipsis;
}
.view-header-title-parent .view-header-breadcrumb.has-active-menu {
  background-color: var(--background-modifier-hover);
  color: var(--text-normal);
}
@media (hover: hover) {
  .view-header-title-parent .view-header-breadcrumb:hover {
    background-color: var(--background-modifier-hover);
    color: var(--text-normal);
  }
}
.view-header-title-parent .view-header-breadcrumb-separator {
  padding: 2px 1px;
  color: var(--text-faint);
}

.view-header-title {
  flex: 0 0 auto;
  max-width: 100%;
  word-wrap: normal;
  color: var(--text-muted);
  overflow: hidden;
  scroll-padding-inline-end: 20px;
  text-overflow: ellipsis;
  white-space: pre;
}
.view-header-title:focus-within {
  max-width: 100%;
  overflow: auto;
  text-overflow: unset;
}
.is-focused .workspace-leaf.mod-active .view-header-title {
  color: var(--text-normal);
}
.view-header-title::-webkit-scrollbar { display: none; }
```

Behavior:
- Title is centered (`--file-header-justify: center`) because the file-header default justification is centered. Themes can override.
- The container is a flex row holding `.view-header-left` (icons / nav buttons) → `.view-header-title-container` (centered breadcrumb + title) → `.view-actions` (right-side action buttons). Title inherits `flex: 1 1 auto` so it absorbs available space.
- Breadcrumbs (`.view-header-breadcrumb`) are individual `<span>`s separated by `.view-header-breadcrumb-separator` slashes. Each breadcrumb is its own clickable region with hover `--background-modifier-hover`.
- When the title is focused (renaming via click-into-title), it switches from `text-overflow: ellipsis` to `overflow: auto` so the user can scroll horizontally to see the full long name being edited.
- `::-webkit-scrollbar { display: none }` on the title — the title scrolls but no scrollbar paints.

### 11.3 `.view-content` (`app.css:4566-4583`)

```css
.view-content {
  width: 100%;
  height: calc(100% - var(--header-height));   /* leaf-height − 40px */
}
.workspace-split.mod-root .view-content { background-color: var(--background-primary); }
.workspace-split.mod-root .workspace-fake-target-overlay .view-content { background-color: transparent; }
.workspace-split.mod-left-split .view-content,
.workspace-split.mod-right-split .view-content {
  height: 100%;                                /* sidebars have no view-header → take full height */
  overflow: auto;
}
```

### 11.4 Nav buttons (`app.css:6562-6570`)

```css
.view-header-nav-buttons {
  --icon-size: var(--icon-s);   /* 16px */
  align-items: center;
  display: flex;
}
body.is-phone .view-header-nav-buttons { display: none; }
```

Back/forward nav buttons inside the view header use the small icon size; on phone they collapse out.

---

## 12. Status bar (`app.css:6045-6127`)

### 12.1 Container

```css
.status-bar {
  position: var(--status-bar-position);          /* fixed */
  width: auto;
  bottom: 0; right: 0;
  border-radius: var(--status-bar-radius);       /* 8px 0 0 0 — only top-left rounded */
  border-style: solid;
  border-width: var(--status-bar-border-width);  /* 1px 0 0 1px — top + left */
  border-color: var(--status-bar-border-color);  /* --divider-color */
  background-color: var(--status-bar-background);/* --background-secondary */
  color: var(--status-bar-text-color);           /* --text-muted */
  display: flex;
  font-size: var(--status-bar-font-size);        /* 12px */
  justify-content: flex-end;
  min-height: 18px;
  padding: var(--size-4-1);                      /* 4px */
  gap: var(--size-4-1);
  user-select: none;
  z-index: var(--layer-status-bar);              /* 15 */
  font-variant-numeric: tabular-nums;            /* monospaced numerals for word-counts etc. */
}
body:not(.is-fullscreen) .status-bar { padding-right: var(--size-4-2); }   /* 8px right pad off fullscreen */
.is-screenshotting .status-bar { display: none; }
```

The status bar is a **floating capsule** in the bottom-right corner, not a full-width strip. It sits above the workspace (z-index 15) so it overlaps content, with only its top and left edges drawn (1 px) and only its top-left corner rounded (8 px). This produces the characteristic "tab" silhouette.

### 12.2 Items (`app.css:6071-6123`)

```css
.status-bar-item {
  border-radius: var(--radius-s);               /* 4px */
  corner-shape: var(--corner-shape);            /* round */
  display: inline-flex;
  align-items: center;
  padding: 3px var(--size-2-2);                 /* 3px 4px */
  line-height: 1;
}
.status-bar-item.mod-clickable { cursor: var(--cursor); }

@media (hover: hover) {
  .status-bar-item.mod-clickable:hover {
    background-color: var(--background-modifier-hover);
    color: var(--text-normal);
  }
}

.status-bar-item.plugin-editor-status,
.status-bar-item.plugin-sync { padding: 0 var(--size-2-2); }   /* 0 4px — these contain icons that handle their own y-padding */

@media (hover: hover) {
  .status-bar-item.plugin-editor-status:hover,
  .status-bar-item.plugin-sync:hover {
    background-color: var(--background-modifier-hover);
  }
}

.status-bar-item:empty { display: none; }

.status-bar-item-icon {
  vertical-align: middle;
  display: flex; align-items: center;
}

.status-bar-item-segment {
  margin-inline-end: var(--size-4-2);   /* 8px right gap between segments */
  display: flex; align-items: center;
  gap: var(--size-2-2);                 /* 4px between icon and text within a segment */
}
.status-bar-item-segment:last-child { margin-inline-end: 0; }
```

Layout:
- Items are arranged right-justified (`justify-content: flex-end` on container) with a 4 px gap.
- Each item is `inline-flex`, padded `3px 4px`, with `corner-shape: round` (corner-shape is a future CSS property; falls back to standard radii).
- Items can have multiple segments — for instance `plugin-editor-status` shows `<icon> <count> | <icon> <count>` segments. Each segment has 8 px right margin (except last) and 4 px internal gap.
- Empty items collapse out so plugins don't leave gaps.
- `font-variant-numeric: tabular-nums` on the bar means a counter like "12,345 words" doesn't shift width as digits change.
- When `body.is-screenshotting`, the entire bar is hidden.

---

## 13. Vault profile / drawer footer (`app.css:6333-6396`)

The vault profile is the footer of the left sidebar — the block showing the vault name with a switcher chevron. Only present on desktop (`body:not(.is-mobile)`).

```css
body:not(.is-mobile) .workspace-split.mod-left-split .workspace-sidedock-vault-profile {
  background-color: var(--background-secondary);
  border-top: var(--tab-outline-width) solid var(--tab-outline-color);
  display: var(--vault-profile-display);   /* flex */
  align-items: center;
  height: unset;
  flex: 0 0 auto;
  gap: var(--size-4-1);                    /* 4px */
  justify-content: space-between;
  padding: var(--size-4-2) var(--size-4-2);/* 8px */
  order: 1;                                /* sticks to bottom of flex column above */
}
body:not(.is-mobile) .workspace-split.mod-left-split .workspace-sidedock-vault-profile .workspace-drawer-vault-switcher {
  color: var(--vault-profile-color);       /* --text-normal */
  border-radius: var(--radius-s);          /* 4px */
  corner-shape: var(--corner-shape);
  display: flex;
  flex-grow: 1;
  align-items: center;
  gap: var(--size-4-2);                    /* 8px */
  overflow: hidden;
  padding: var(--size-4-1) var(--size-4-2);/* 4px 8px */
}
body:not(.is-mobile) .workspace-split.mod-left-split .workspace-sidedock-vault-profile .workspace-drawer-vault-switcher.has-active-menu {
  background-color: var(--background-modifier-hover);
}
body:not(.is-mobile) .workspace-split.mod-left-split .workspace-sidedock-vault-profile .workspace-drawer-vault-switcher.has-active-menu .workspace-drawer-vault-switcher-icon {
  color: var(--text-muted);
}
@media (hover: hover) {
  body:not(.is-mobile) .workspace-split.mod-left-split .workspace-sidedock-vault-profile .workspace-drawer-vault-switcher:hover {
    color: var(--vault-profile-color-hover);
    background-color: var(--background-modifier-hover);
  }
  body:not(.is-mobile) .workspace-split.mod-left-split .workspace-sidedock-vault-profile .workspace-drawer-vault-switcher:hover .workspace-drawer-vault-switcher-icon {
    color: var(--text-muted);
  }
}
body:not(.is-mobile) .workspace-split.mod-left-split .workspace-sidedock-vault-profile .workspace-drawer-vault-name {
  font-size: var(--vault-profile-font-size);    /* 13px */
  font-weight: var(--vault-profile-font-weight);/* 500 */
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
body:not(.is-mobile) .workspace-split.mod-left-split .workspace-sidedock-vault-profile .workspace-drawer-vault-switcher-icon {
  --icon-size: var(--icon-s);                   /* 16px */
  --icon-stroke: var(--icon-s-stroke-width);    /* 2px */
  display: flex; align-items: center;
  color: var(--text-faint);
}
body:not(.is-mobile) .workspace-split.mod-left-split .workspace-sidedock-vault-profile .workspace-drawer-vault-actions {
  display: var(--vault-profile-actions-display); /* flex */
  align-items: center;
}
```

DOM:

```
.workspace-split.mod-left-split
  ├─ .workspace-tabs (the actual sidebar tab content area, order: 2)
  └─ .workspace-sidedock-vault-profile (order: 1 — but rendered after tabs because flex order:1 < order:2 elsewhere — see below)
       ├─ .workspace-drawer-vault-switcher  (flex-grow:1, hover-fillable button)
       │    ├─ .workspace-drawer-vault-switcher-icon (chevron, 16 px)
       │    └─ .workspace-drawer-vault-name        (vault name, 13px / 500)
       └─ .workspace-drawer-vault-actions          (settings cog, etc.)
```

The `order: 1` plus `flex-direction` on the parent puts this profile at the bottom because everything else has the default `order: 0`. Actually `order: 1` is _higher_, meaning it renders **after** items with `order: 0`, which is the desired bottom-of-column placement.

---

## 14. Animation summary (just for shell elements)

| Element | Property | Duration | Easing | Source |
| --- | --- | --- | --- | --- |
| `.app-container.no-transition *` | all | `0` (forced) | n/a | `3263-3265` |
| `.app-container.mod-loading .view-header .loader-spinner svg` | rotation | `0.9s infinite` | `ease` | `3279` |
| `.workspace` | `padding-left` | `100ms` | `ease-in` | `6401` |
| `.workspace-ribbon.mod-left.is-collapsed` | `background-color` | `250ms 95ms` | `ease-in-out` | `4735` |
| `.workspace-leaf-resize-handle` | `background-color`, `border-color`, `opacity` | `200ms` | `ease-in-out` | `6477` |
| `.workspace-fake-target-overlay`, `.workspace-drop-overlay` | `all` | `100ms` | `ease-in-out` | `6621` |
| `.is-flashing` | `color`, `background-color` | `0.25s` | `ease` | `3225` |
| `.node-insert-event` | (sentinel) | `0.01s` | linear | `3220` |
| `@keyframes node-inserted` | `outline-color` `#fff → #000` | — | — | `3209-3217` |

There are no `transform` or `opacity` transitions on the shell at the top level — these are reserved for the drag overlay and per-component animations.

---

## 15. Reproducer build order

1. Render `<body class="theme-dark">` with the body baseline rules.
2. Construct the DOM in the order shown in §2. Do not include `.titlebar` if the platform (e.g. embedded webview test harness) suppresses it; otherwise always render it even in `is-frameless` mode (its visibility is via class flags, not removal).
3. Wire `is-focused` to `window.focus`/`blur` events. Wire `is-grabbing` to drag start/end. Wire `is-translucent` to user preference + macOS detection.
4. Make `--ribbon-width` a single CSS variable on `<body>` so `body:not(.show-ribbon) { --ribbon-width: 0 }` propagates to flex `flex: 0 0 var(--ribbon-width)` on `.workspace-ribbon`. The ribbon takes 0 width and `display: none` simultaneously — both are required (the latter for keyboard navigation skip).
5. Construct `.workspace-split.mod-root` once. Construct `.mod-left-split` and `.mod-right-split` lazily — they may not exist if the user has hidden both sidebars.
6. Resize handles are siblings of leaves inside their parent split, never children of leaves. The CSS uses descendant combinators on the parent split's modifier (`mod-vertical`, `mod-horizontal`, `mod-left-split`, `mod-right-split`) to choose which axis to resize.
7. Status bar mounts as a child of `<body>` (sibling of `.app-container`), not inside the workspace, because it's `position: fixed`. Z-index 15 keeps it above leaf content but below modals/menus/tooltips.
8. Vault profile is mounted inside the `.mod-left-split`, after the sidebar tabs in DOM order; CSS `order: 1` does not change DOM order but ensures it lays out at the bottom.

If any of those structural choices are wrong, the resize handles will overlap the wrong elements, the translucent mode will paint over chrome it shouldn't, or the macOS traffic lights will land on top of ribbon icons.
