# OS Modifiers — `.mod-macos`, `.mod-windows`, `.mod-linux`

> Per-OS overrides. Most live in scattered selectors but the token overrides are concentrated in `.mod-macos`.

Source: `renderer/app.css:2998-3009`, plus selector-based rules throughout. Tokens: see [`design-tokens.md`](design-tokens.md) §28.

---

## 1. `.mod-macos` token overrides (`app.css:2998-3009`)

```css
.mod-macos {
  --slider-thumb-width:           30px;          /* default 18px — fatter macOS-style thumb */
  --toggle-width:                 44px;          /* default 40px */
  --toggle-radius:                24px;          /* default 18px */
  --toggle-thumb-radius:          24px;          /* default 18px */
  --toggle-thumb-height:          16px;          /* default 18px */
  --toggle-thumb-width:           26px;          /* default 18px — wider, capsule shape */
  --toggle-thumb-opacity-active:  0.6;            /* fade-on-press (Linux/Win don't fade) */
  --toggle-s-width:               36px;          /* default 34px */
  --toggle-s-thumb-height:        12px;          /* default 15px */
  --toggle-s-thumb-width:         20px;          /* default 15px */
}
```

These mirror macOS native controls — capsule-shaped toggles instead of round-thumb-on-track, slightly bigger slider thumbs, and the press-fade behavior.

There are **no** equivalent token blocks for `.mod-windows` or `.mod-linux` — those classes only drive selector-based behavior (e.g. window button rendering).

---

## 2. macOS-only selectors (titlebar, scrollbars, traffic lights)

Documented in [`app-shell.md`](app-shell.md) §6.3:

```css
.mod-macos .titlebar-button-container { top: 8px; }
.mod-macos .titlebar-button-container.mod-left { left: calc(80px / var(--zoom-factor)); }
.mod-macos .titlebar-button { border-radius: var(--radius-s); }
.is-hidden-frameless.mod-macos .titlebar { display: none; }
```

macOS uses native traffic lights so Obsidian doesn't render its own min/max/close buttons — only the back/forward arrows on the left, offset 80 px from the window edge to clear the traffic lights.

For the right-side toggle in macOS frameless mode (`app.css:7338-7349`):

```css
.mod-macos.is-hidden-frameless:not(.is-popout-window) .sidebar-toggle-button.mod-right {
  background-color: var(--tab-container-background);
  position: fixed;
  top: 0; right: 0;
  padding-right: var(--size-4-2);
  z-index: var(--layer-cover);
}
.mod-macos.is-hidden-frameless:not(.is-popout-window) .workspace .workspace-tabs.mod-top-right-space .workspace-tab-header-container {
  padding-right: 38px;
}
```

When macOS frameless, the right sidebar toggle is fixed-positioned at the top-right of the window with `z-index: var(--layer-cover)`.

---

## 3. macOS / iOS more-vertical icon rotation (`app.css:8239-8243`)

```css
.is-ios .lucide-more-vertical,
.mod-macos .lucide-more-vertical {
  transform: rotate(90deg);
}
```

Apple platforms use horizontal `…` (per HIG). The shipped icon is vertical-dots; this rotates it 90°.

---

## 4. Windows / Linux titlebar buttons (`app.css:6267-6296`)

```css
.mod-linux .titlebar-button-container,
.mod-windows .titlebar-button-container { height: 100%; }

.mod-linux .titlebar-button,
.mod-windows .titlebar-button {
  padding: 0 16px;
  display: flex;
  align-items: center;
}

.mod-linux .titlebar-button.mod-logo,
.mod-windows .titlebar-button.mod-logo {
  padding: 4px 8px;
}

@media (hover: hover) {
  .mod-linux .titlebar-button.mod-close:hover,
  .mod-windows .titlebar-button.mod-close:hover {
    background-color: var(--background-modifier-error);
  }
  .mod-linux .titlebar-button.mod-close:hover .svg-icon,
  .mod-windows .titlebar-button.mod-close:hover .svg-icon {
    fill: white;
    stroke: white;
  }
}
```

Win/Linux render Obsidian-drawn min/max/close buttons (since these OSes don't enforce window controls in the title bar). Buttons are 0 × 16 px padded, full-titlebar-height. Close button hover paints red with white SVG.

---

## 5. Frameless variants per OS (`app.css:6241-6265`)

```css
.is-hidden-frameless.mod-macos .titlebar { display: none; }

.is-hidden-frameless.mod-windows .titlebar,
.is-hidden-frameless.mod-linux .titlebar {
  background: transparent;
  border: none;
  z-index: var(--layer-popover);
  pointer-events: none;
}

.is-hidden-frameless.mod-windows .titlebar-button.mod-back, … { display: none; }
.is-hidden-frameless.mod-windows .titlebar-button-container,
.is-hidden-frameless.mod-linux .titlebar-button-container { pointer-events: auto; }
```

- macOS frameless: titlebar fully hidden — macOS native traffic lights cover the chrome instead.
- Win/Linux frameless: titlebar present but transparent and pointer-events-none. Only the right-side window-control buttons opt back into pointer-events.

---

## 6. Windows / Linux content-frame padding (`app.css:4273-4290`)

```css
.is-hidden-frameless:not(.is-fullscreen):not(.mod-macos) .workspace-tabs.mod-top-left-space .workspace-tab-header-container:before {
  -webkit-app-region: no-drag;
  content: '';
  position: absolute;
  height: 100%; width: var(--frame-left-space);
  left: 0; top: 0;
}

.is-hidden-frameless:not(.is-fullscreen):not(.mod-macos) .workspace-tabs.mod-top-right-space .workspace-tab-header-container:after {
  -webkit-app-region: no-drag;
  content: '';
  position: absolute;
  height: 100%; width: var(--frame-right-space);
  right: 0; top: 0;
}
```

Win/Linux frameless mode uses `:before` / `:after` pseudo-elements as no-drag spacers in the tab header — covering the area where window-control buttons live so the user can click them without accidentally dragging the window.

---

## 7. Reproducer build order

1. Set `.mod-macos` / `.mod-windows` / `.mod-linux` on `<body>` based on `process.platform` (Electron) or user-agent (web build).
2. Only `.mod-macos` overrides design tokens (the toggle / slider sizes). Win and Linux rely entirely on selector-based rules.
3. macOS chrome:
   - Hides Obsidian's window-control buttons (relies on native traffic lights).
   - Offsets back/forward to leave 80 px on the left for traffic lights.
   - Rotates more-vertical icons to horizontal `…`.
   - Frameless mode hides the titlebar entirely.
4. Win/Linux chrome:
   - Renders Obsidian's own min/max/close buttons in `.titlebar-button-container.mod-right`.
   - Close button hover: red bg + white SVG.
   - Frameless mode keeps titlebar in DOM but transparent and pointer-events-none, with the buttons opting back in.
5. iOS rotation matches macOS — both use horizontal `…`.
