# Editor — Mobile Toolbar

> The keyboard-adjacent toolbar that floats above the on-screen keyboard on phones/tablets, providing markdown formatting shortcuts (bold, italic, link, list, etc.) and command access.

Source: `renderer/app.css:23207-23295`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. `.mobile-toolbar` container (`app.css:23207-23223`)

```css
.mobile-toolbar {
  -webkit-app-region: drag;
  flex: 0 0 auto;
  position: absolute;
  width: 100%;
  top: calc(100vh - var(--keyboard-height) - var(--mobile-toolbar-height));
  padding-left:   var(--safe-area-inset-left);
  padding-bottom: var(--safe-area-inset-bottom);
  padding-right:  var(--safe-area-inset-right);
  z-index: var(--layer-menu);                  /* 65 */
  background-color: var(--background-primary);
}

.is-floating-nav .mobile-toolbar {
  background-color: transparent;
  box-shadow: 0 0 8px var(--background-primary);   /* haloed against editor */
}

.mobile-toolbar-spacer {
  background-color: var(--background-primary);
  height: var(--mobile-toolbar-height);
  display: flex;
  width: 100%;
}
```

The toolbar:
- Absolutely positioned, with `top: 100vh - --keyboard-height - --mobile-toolbar-height` — sits exactly above the on-screen keyboard.
- `--keyboard-height` is updated by JS based on the visual viewport.
- iOS safe-area insets respected on left, right, bottom.
- z-index 65 (above modals).
- Floating-nav variant: transparent background with a halo glow so it visually floats over content.
- A separate `.mobile-toolbar-spacer` reserves the same height in the document flow so the toolbar doesn't overlap content (mid-document scrolling preserves the gap above the keyboard).

---

## 2. `.mobile-toolbar-options-container` (`app.css:23232-23247`)

```css
.mobile-toolbar-options-container {
  --icon-size:   var(--icon-l);                /* 18px */
  --icon-stroke: var(--icon-l-stroke-width);
  --scroll-fade-offset-right: var(--toolbar-option-width);
  position: relative;
  gap: var(--size-4-2);                        /* 8px */
  margin: var(--size-4-1) auto;                 /* 4px top/bottom, auto sides */
  width: 100%;
  display: flex;
  justify-content: center;
}

.is-floating-nav .mobile-toolbar-options-container {
  margin: 0 auto;
  width: calc(100% - var(--size-4-4));         /* 100% - 16px */
}
```

The options row is a centered flex container with 8 px gap. Floating-nav inset is 16 px less wide so the haloed shadow has room.

---

## 3. `.mobile-toolbar-options-list` (`app.css:23249-23270`)

```css
.mobile-toolbar-options-list-container {
  border-radius: var(--touch-size-m);          /* 44px — fully pill */
  overflow: hidden;
}

.mobile-toolbar-options-list {
  display: flex;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  background-color: var(--touch-background);
  border-radius: var(--touch-size-m);
  padding: 0 var(--size-4-1);                  /* 0 4px */
  height: var(--touch-size-m);                 /* 44px tall */
  scrollbar-width: none !important;
}
.mobile-toolbar-options-list::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
}
```

The scrollable horizontal list:
- 44 px tall (touch-target size).
- `border-radius: 44px` — a fully-pill shape (since height is 44, radius equals height).
- Background `--touch-background` — a touch-affordance color.
- Scrollbars hidden (Firefox + WebKit).

---

## 4. `.mobile-toolbar-floating-options` (`app.css:23272-23285`)

```css
.mobile-toolbar-floating-options {
  display: flex;
  height: var(--touch-size-m);
  width:  var(--touch-size-m);
  min-width: var(--touch-size-m);
  justify-content: center;
  border-radius: var(--touch-size-m);
  background-color: var(--touch-background);
}

.mobile-toolbar-floating-options .mobile-toolbar-option {
  min-width: var(--toolbar-option-width);
  color: var(--text-normal);
}
```

The floating button (e.g. "more" button to open the full toolbar drawer) is a 44 × 44 circular button — `border-radius: 44px` makes a circle since width == height.

---

## 5. `.mobile-toolbar-option` (`app.css:23287-23295`)

```css
.mobile-toolbar-option {
  display: flex;
  font-size:   var(--font-ui-medium);          /* 15px */
  color:       var(--text-normal);
  font-family: var(--font-monospace);          /* monospace label — markdown chars look stable */
  justify-content: center;
  align-items: center;
  min-width: var(--toolbar-option-width);
}
```

Each option in the toolbar:
- 15 px monospace text — markdown shortcut characters (`#`, `*`, `[`, `>`, etc.) read stably side-by-side.
- Minimum width is `--toolbar-option-width` (varies by platform).

---

## 6. `.mobile-tab-switcher` (`app.css:23297-23320+`)

The mobile tab switcher (a full-screen overlay showing all open tabs as cards):

```css
.mobile-tab-switcher {
  background-color: var(--tab-switcher-background);   /* --background-secondary */
  position: absolute;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width:  100vw;
  top: 0; bottom: 0; left: 0; right: 0;
  z-index: var(--layer-modal);                          /* 50 */
}

.mobile-tab-switcher-scroll {
  padding-top: var(--safe-area-inset-top);
  padding-bottom: calc(var(--size-4-12) + var(--safe-area-inset-bottom));
                                                        /* 48 + safe-area */
  background-color: var(--tab-switcher-background);
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  mask: var(--view-bottom-fade-mask);
}
```

The switcher fills the viewport with `--tab-switcher-background` (a step lighter than the editor). Scroll is masked at the bottom (`--view-bottom-fade-mask`) so content fades out before reaching the keyboard / safe-area.

Tab previews use `--tab-switcher-preview-radius` (16 px) and `--tab-switcher-preview-shadow` (1 px hairline) — the active preview gets `--tab-switcher-preview-shadow-active` (2 px accent ring). See `design-tokens.md` §21.

---

## 7. `.mobile-navbar` (top navigation bar) (`app.css:22946-23055`)

```css
.mobile-navbar {
  /* fixed bar at the top showing back arrow, title, action menu */
  /* uses --safe-area-inset-top for notch clearance */
}
```

The mobile top navbar is a fixed-height bar with back arrow (left), centered title (`.mobile-navbar-text`), and right-side actions (`.mobile-navbar-actions`). Each action is a `.mobile-navbar-action` — a tappable region that may have a `.has-longpress-menu` flair to indicate long-press behavior.

(Full selector list lives in `app.css:22946-23055`. The styling follows the same patterns as the desktop chrome — same color tokens, similar geometry — but with mobile touch sizing throughout.)

---

## 8. Reproducer build order

1. The mobile toolbar floats above the keyboard. Set `--keyboard-height` from JS (visualViewport API or platform bridge) and the toolbar will reposition.
2. Use the safe-area inset variables on left, right, bottom. Top inset is handled by the navbar.
3. The toolbar list is a 44 × N pill (`border-radius: 44px`) with horizontal scroll, hidden scrollbars, `--touch-background` fill.
4. Each option is monospace 15 px so markdown character labels look stable.
5. The "more" button is a separate 44 × 44 circle next to the scrollable list.
6. Mobile tab switcher uses `--tab-switcher-*` tokens — preview cards are 16 px radius with 1 px hairline, active gets 2 px accent ring.
7. The mobile-navbar is the top complement to the mobile-toolbar bottom — full-width fixed bar with back / title / actions, respecting safe-area-inset-top.
8. `is-floating-nav` body class makes the toolbar transparent with a halo shadow — used when content is meant to flow underneath.
