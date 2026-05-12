# Modal

> The shared dialog primitive. Used for: settings, file rename confirmations, plugin installer, theme browser, vault chooser, image lightbox, and dozens of bespoke modal flows.

Tokens: see [`design-tokens.md`](design-tokens.md). Sources: `renderer/app.css`.

---

## 1. DOM scaffold

```
.modal-container [.mod-dim] [.is-being-dragged]
  ├─ .modal-bg                                    ← backdrop overlay (clickable to dismiss)
  └─ .modal [.mod-sidebar-layout]
        [.mod-scrollable] [.mod-scrollable-content] [.mod-narrow]
        [.mod-settings] [.mod-file-browser] [.mod-image-lightbox]
        [.mod-confirmation] [.mod-form] …
       ├─ .modal-close-button                     ← × in top-right corner
       ├─ .modal-header
       │    └─ .modal-title
       ├─ .modal-content                          ← main body, scrolls
       └─ .modal-button-container                 ← footer with action buttons
            ├─ button[.mod-secondary]              ← left-aligned secondary action
            └─ button.mod-cta                      ← right-aligned primary action
```

The `.modal-container` mounts as a child of `<body>`. Multiple modals can stack; each has its own backdrop.

---

## 2. `.modal-container` (`app.css:9076-9104`)

```css
.modal-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0; bottom: 0;
  inset-inline-start: 0;
  width: 100%;
  z-index: var(--layer-modal);     /* 50 */
}
.modal-container.mod-dim .modal {
  box-shadow: var(--shadow-l);     /* heavier shadow for "bring focus to modal" mode */
}
.modal-container.is-being-dragged {
  pointer-events: none !important;
}
.modal-container.is-being-dragged .prompt,
.modal-container.is-being-dragged .modal {
  pointer-events: none;
  opacity: 0.25;                    /* fade modal to 25% while user drags through it */
}
.modal-container.is-being-dragged .modal-bg {
  opacity: 0 !important;            /* hide backdrop while dragging */
}
```

Reproducer rules:
- The container itself **centers** the modal via flex (`align-items: center; justify-content: center`).
- z-index 50 sits above sidedock (10) and status bar (15) but below notices (60), menus (65), tooltips (70), and dragged items (80).
- `.is-being-dragged` is set by JS while the user drags a tab — the modal becomes transparent and click-through so the drag target underneath is reachable.

---

## 3. `.modal-bg` (backdrop) (`app.css:9120-9127`)

```css
.modal-bg {
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  width: 100%;
  height: 100%;
  background-color: var(--background-modifier-cover);
                                  /* light: rgba(220,220,220,0.4) | dark: rgba(10,10,10,0.4) */
}
```

The backdrop is a 40 % gray wash. JS handles click-to-dismiss on the backdrop. There is no blur on the backdrop by default — themes can add it via `backdrop-filter`.

---

## 4. `.modal` (`app.css:9129-9183`)

### 4.1 Default

```css
.modal {
  --checkbox-size: var(--font-ui-medium);    /* 15px — bigger checkboxes inside modals */
  background-color: var(--modal-background); /* --background-primary */
  border-radius:    var(--modal-radius);     /* 12px */
  border: var(--modal-border-width) solid var(--modal-border-color);
                                              /* 1px solid --color-base-40 (or --background-modifier-border-focus) */
  corner-shape: var(--corner-shape);
  padding: var(--size-4-4);                   /* 16px */
  position: relative;
  min-height: 100px;
  width:      var(--dialog-width);            /* 560px */
  max-width:  var(--dialog-max-width);        /* 80vw */
  max-height: var(--dialog-max-height);       /* 85vh */
  display: flex;
  flex-direction: column;
  overflow: auto;
}
```

Default modal is a centered 560 × min-100/max-85vh dialog with 16 px padding, 12 px corner radius, 1 px border. Background is `--background-primary` (the editor body color), distinguishing it from menus (`--background-secondary`).

### 4.2 `.mod-sidebar-layout`

```css
.modal.mod-sidebar-layout {
  padding: 0;
  width:      var(--modal-width);             /* 90vw */
  height:     var(--modal-height);            /* 85vh */
  max-width:  var(--modal-max-width);         /* 1100px */
  max-height: var(--modal-max-height);        /* 1000px */
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal.mod-sidebar-layout .modal-content { display: flex; }
```

Used by Settings, Community plugins, Community themes — wide layout with a left vertical-tab sidebar plus a right content pane. Padding is removed; the inner panes manage their own padding.

### 4.3 `.mod-scrollable-content`

```css
.modal.mod-scrollable-content {
  padding: 0;
  overflow: hidden;
}
.modal.mod-scrollable-content .modal-title {
  padding: var(--size-4-4) var(--size-4-4) 0 var(--size-4-4);  /* 16px sides + top, 0 bottom */
}
.modal.mod-scrollable-content .modal-content {
  padding: 0 var(--size-4-4) var(--size-4-4) var(--size-4-4);
  overflow: auto;
}
.modal.mod-scrollable-content .modal-button-container {
  margin-top: 0;
  border-top: var(--border-width) solid var(--background-modifier-border);
  padding: var(--size-4-4);
}
```

For modals with long bodies and persistent footers — title pinned at top, content scrolls, footer pinned at bottom with a 1 px divider above.

### 4.4 `.mod-scrollable` (a different variant)

```css
.modal.mod-scrollable {
  height:     var(--modal-height);            /* 85vh */
  width:      var(--modal-width);             /* 90vw */
  max-width:  var(--modal-max-width-narrow);  /* 800px */
  padding: var(--size-4-4) 0 0 0;
  position: relative;
  overflow: hidden;
}
.modal.mod-scrollable .modal-title { padding: 0 var(--size-4-4); }
.modal.mod-scrollable .modal-content {
  overflow: auto;
  padding: 0 var(--size-4-4) var(--size-4-4);
  margin-bottom: calc(var(--input-height) + var(--size-4-8));   /* 30px + 32px = 62px */
  border-top: var(--border-width) solid var(--background-modifier-border);
}
.modal.mod-scrollable .modal-button-container {
  margin: 0 0 0 calc(var(--size-4-4) * -1);   /* -16px left to bleed into modal padding */
  padding: var(--size-4-4);
  gap: var(--size-4-2);
  position: absolute;
  bottom: 0;
  background-color: var(--background-primary);
  border-top: var(--border-width) solid var(--background-modifier-border);
  width: 100%;
}
```

Variant where the footer is **absolutely positioned** at the bottom — used when the modal is taller than its viewport target and the footer must always be visible. The 62 px bottom margin on `.modal-content` reserves the footer's height.

### 4.5 `.mod-narrow`

```css
.modal.mod-narrow { max-width: var(--modal-max-width-narrow); }   /* 800px instead of 1100px */
```

Used for forms with mostly text — keeps line lengths readable.

---

## 5. `.modal-sidebar` (`app.css:9185-9192`)

```css
.modal-sidebar {
  --background-modifier-form-field: var(--background-primary);
  flex: 1 1 var(--modal-community-sidebar-width);   /* 280px */
  min-width: var(--modal-community-sidebar-width);
  padding: var(--size-4-3) 0 0 0;                   /* 12px top */
  display: flex;
  flex-direction: column;
}
```

The left sidebar inside a `.mod-sidebar-layout` modal. The local `--background-modifier-form-field` override means inputs inside the sidebar **lighten** to the page color (since the sidebar is on the alt background).

---

## 6. `.modal-close-button` (`app.css:9194-9203`)

```css
body.styled-scrollbars .modal-close-button { inset-inline-end: 12px; }

.modal-close-button {
  position: absolute;
  top: var(--size-2-3);              /* 6px */
  inset-inline-end: var(--size-2-3); /* 6px */
  padding: var(--size-2-2);           /* 4px */
}
```

A 4 px-padded × icon at top-right, 6 px from the corners (12 px inset on `body.styled-scrollbars` to clear the styled scrollbar's gutter). It is **not** the standard `.clickable-icon` — it's a bespoke positioned element.

---

## 7. `.modal-header` and `.modal-title` (`app.css:9205-9225`)

```css
.modal-header {
  margin-bottom: 0.75em;
  height: var(--modal-header-height);   /* auto */
}
.mod-sidebar-layout .modal-header { display: none; }   /* sidebar layouts have their own internal headers */

.modal-title {
  font-size:   var(--font-ui-large);      /* 20px */
  margin-left:  auto;
  margin-right: auto;
  font-weight: var(--font-semibold);      /* 600 */
  text-align: start;
  line-height: var(--line-height-tight);  /* 1.3 */
}
.modal-title:empty { display: none; }
```

20 px semibold title, centered horizontally via auto margins. `.mod-sidebar-layout` hides the header because the layout's left sidebar already provides identification.

---

## 8. `.modal-content` and `.modal-button-container` (`app.css:9227-9256`)

```css
.modal-content {
  flex: 1 1 auto;
  font-size: var(--font-ui-medium);    /* 15px — slightly larger than the chrome 13px */
}

.modal-button-container {
  margin-top: 1.5em;
  display: flex;
  justify-content: flex-end;            /* buttons right-aligned by default */
  gap: var(--size-4-2);                 /* 8px */
  flex-wrap: wrap;
  font-size: var(--font-ui-medium);
}
.modal-button-container .mod-checkbox {
  flex-grow: 1;                         /* checkbox occupies left side, pushing buttons right */
  display: flex;
  align-items: center;
  gap: var(--size-4-1);
}

body:not(.is-mobile) .modal-button-container .mod-secondary {
  margin-inline-end: auto;              /* "Cancel" / secondary action goes to the LEFT side on desktop */
}

.modal-checkbox-label {
  cursor: var(--cursor);
  margin-inline-start: 10px;
  user-select: none;
}
```

Button layout pattern:
- Default: all buttons right-aligned, 8 px gap.
- A `.mod-secondary` button (e.g. "Cancel") receives `margin-inline-end: auto` on desktop, pushing it to the left edge while the primary CTA stays on the right. On mobile this rule is dropped — stacked layout instead.
- A `.mod-checkbox` (e.g. "Don't ask again") is given `flex-grow: 1`, pushing all buttons to the right.

Reading order in DOM should be: secondary button, primary button — but visual order is determined by `margin-inline-end: auto`.

---

## 9. `.modal-confirmation-state` (`app.css:9106-9118`)

```css
.modal-confirmation-state {
  align-items: center;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  justify-content: center;
  text-align: center;
}

.modal-status-icon {
  --icon-size: 72px;
  --icon-stroke: 1.5px;
}
```

Used inside a modal that is showing a one-time confirmation (e.g. "Vault deleted ✓" or "Operation failed ✗"). Centers content with a large 72 px icon at the top.

---

## 10. `.modal-setting-nav-bar` (`app.css:9315-9320`, `9322-9338`)

The mobile top-bar variant of vertical-tabs.

```css
.modal-setting-nav-bar {
  display: flex;
  flex: 0 1 auto;
  padding: var(--size-4-3);                    /* 12px */
  border-bottom: var(--border-width) solid var(--background-modifier-border);
}

.modal .modal-nav-action {
  background-color: unset;
  margin-top: var(--size-4-1);                 /* 4px */
  position: absolute;
  top: 0;
  width: unset;
}
.modal .modal-nav-action.mod-secondary { inset-inline-start: 0; }
.modal .modal-nav-action.mod-cta {
  color: var(--color-accent);
  font-weight: var(--font-semibold);
  inset-inline-end: 0;
}
```

`.modal-nav-action` is the mobile top-bar action button (e.g. "Cancel" left, "Save" right) used in mobile-presented sheet modals.

---

## 11. `.message` boxes inside modals (`app.css:9258-9298`)

```css
.error-container {
  align-items: center;
  display: flex;
  flex-direction: column;
  padding: var(--size-4-4);                    /* 16px */
  gap: var(--size-4-6);                        /* 24px */
  text-align: center;
}

.message-container { margin: var(--size-4-4) 0; }

.message {
  display: inline-block;
  padding: 6px 12px 6px 12px;
  border-radius: var(--radius-s);              /* 4px */
  corner-shape: var(--corner-shape);
}
.message.mod-success { background-color: var(--background-modifier-success); color: var(--text-on-accent); }
.message.mod-success a { color: var(--text-normal); }
.message.mod-info    { background-color: var(--background-modifier-info); }
.message.mod-error   { background-color: var(--background-modifier-error); color: var(--text-on-accent); }
.message.mod-error a { color: var(--text-normal); }

.mod-warning { color: var(--text-error); }
.mod-success { color: var(--text-success); }
```

Inline message boxes — a 6 × 12 px padded pill colored per status. White text on success/error fills; `--background-modifier-info` (a token defined per-theme) for info.

---

## 12. Specialized modals — selected variants

### 12.1 `.modal.mod-image-lightbox` (`app.css:5565-5574`)

```css
.modal.mod-image-lightbox {
  max-width: 90vw;
  max-height: 90vh;
  padding: 0;
}
.modal.mod-image-lightbox .modal-content {
  padding: var(--size-4-12) var(--size-4-3) var(--size-4-2) var(--size-4-3);
                                  /* 48px top, 12px sides, 8px bottom */
  text-align: center;
}
```

For image previews — fills 90 vw × 90 vh, no padding on the modal itself. Content padding leaves room for the close × at top.

### 12.2 `.modal.mod-file-browser` (`app.css:3302-3328`)

```css
.modal.mod-file-browser .modal-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.file-browser-description { flex-shrink: 0; }
.modal-view-options-toolbar {
  display: flex;
  gap: var(--size-4-1);            /* 4px */
  margin-bottom: var(--size-4-2);  /* 8px */
  justify-content: center;
  flex-shrink: 0;
}
.modal-view-option.is-active { color: var(--icon-color-active); }
.file-browser-views {
  flex: 1 1 auto;
  min-height: 200px;
  overflow: auto;
}
.attachments-gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--size-4-1);             /* 4px between thumbnails */
}
```

The file picker / attachments-pick modal — top description + view-mode toolbar + scrollable grid of items.

### 12.3 `.modal.mod-file-rename .rename-textarea` (`app.css:9308-9313`)

```css
.mod-file-rename .rename-textarea {
  overflow: hidden;
  padding: var(--size-2-3) var(--size-4-2);   /* 6px 8px */
  resize: none;
  width: 100%;
}
```

Inline file-rename modal — auto-sizing textarea (height grows with content because `overflow: hidden` triggers JS resize-to-content).

### 12.4 `.modal.mod-form` (`app.css:5121` — extends generic with form-flex layout)

Settings-style content laid out using `.setting-item` rows.

### 12.5 `.modal:not(.mod-settings) .setting-item:not(.setting-item-heading)` (`app.css:5213-5226`)

```css
.modal:not(.mod-settings) .setting-item:not(.setting-item-heading) {
  /* see settings-modal.md for full settings-item rules — modals re-style them */
}
.modal:not(.mod-settings) .setting-item:not(.setting-item-heading):first-child { /* … */ }
.modal:not(.mod-settings) .setting-item:not(.setting-item-heading):last-child  { /* … */ }
```

Setting items inside non-settings modals get rounded outer corners on first/last children (so they form a single grouped capsule). Detail in `settings-modal.md`.

---

## 13. Keyboard / focus behavior

- `Esc` closes the topmost modal.
- `Tab` cycles within the modal — JS implements a focus trap.
- Click on `.modal-bg` closes the modal **only if** the modal opts in (most do; some, like Settings, do not).

---

## 14. Reproducer build order

1. Mount `.modal-container` as a child of `<body>` at `position: absolute; z-index: 50`. Multiple containers can stack — each gets its own backdrop.
2. Default modal is **560 × auto**, max **80 vw × 85 vh**, **12 px** corner radius, **1 px** border in `--color-base-40`. Padding 16 px.
3. The backdrop (`.modal-bg`) is just a 40 % gray wash — no blur by default.
4. Use `.mod-sidebar-layout` for any modal with vertical tabs. Width becomes 90 vw (max 1100), height 85 vh (max 1000), padding zero.
5. Use `.mod-scrollable-content` when the body needs to scroll independently of header/footer. The footer gets a 1 px divider above.
6. Use `.mod-scrollable` (different from above) when you need an absolutely-positioned footer — the body must reserve 62 px bottom margin.
7. Default footer button order is: secondary first in DOM, primary second. CSS uses `margin-inline-end: auto` on `.mod-secondary` to flip the visual order on desktop.
8. The close × is at `top: 6px; inset-inline-end: 6px; padding: 4px` — bespoke, not a `.clickable-icon`.
9. Title is 20 px semibold, centered.
10. The `.is-being-dragged` flag on the container is critical — when JS enters drag-mode, the modal must become click-through (pointer-events: none) and 25 % opacity, and the backdrop must hide.
