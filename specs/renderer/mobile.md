# Mobile

> Cross-cutting overrides for `.is-mobile`, `.is-phone`, `.is-tablet`, `.is-android`, `.is-ios`. Distinct from [`editor-mobile-toolbar.md`](editor-mobile-toolbar.md) (the editor's keyboard toolbar) and [`settings-mobile.md`](settings-mobile.md) (mobile Settings layout).

Source: many `app.css` selectors with `.is-mobile`, `.is-phone`, `.is-tablet`, `.is-android`, `.is-ios` ancestor selectors. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. The body class hierarchy

| Class | Set when | Notes |
| --- | --- | --- |
| `is-mobile` | Capacitor mobile build | covers both phone and tablet |
| `is-phone` | Phone-sized viewport (heuristic in JS) | tighter than tablet |
| `is-tablet` | Tablet-sized viewport | between phone and desktop |
| `is-android` | Android Capacitor build | overrides scrollbars, etc. |
| `is-ios` | iOS Capacitor build | safe-area-aware, more-vertical rotated |

A device can be `.is-mobile.is-phone.is-android` — three concurrent classes. Selectors typically chain whichever subset they need.

---

## 2. Most-impactful mobile rules

### 2.1 Hide tab strip on phone (`app.css:6714-6716`)

```css
.is-phone .workspace-tab-header-container { display: none; }
```

Phone-sized viewports remove the desktop tab rail entirely — tabs move to the mobile-tab-switcher overlay instead.

### 2.2 Hide view-header on phone (`app.css:4460-4462`, `6568-6570`)

```css
body:not(.show-view-header):not(.is-phone) .view-header { display: none; }
body.is-phone .view-header-nav-buttons { display: none; }
```

The view-header is hidden on phone unless `body.show-view-header` is set. Inside the header, the back/forward nav buttons are also hidden on phone.

### 2.3 Phone tablet sidebar layout (`app.css:4782-4784`)

```css
.is-phone .view-header { direction: ltr; }
```

Forces LTR direction on phone view-headers (for now — comment notes RTL sidebar flipping is a TODO).

### 2.4 Mobile-specific input growth (`app.css:8015-8023`, `9973-9976`)

```css
.is-mobile .combobox-button {
  --dropdown-padding: 0 var(--size-4-4) 0 var(--size-4-4);
  gap: var(--size-4-2);
}

.is-mobile .combobox-clear-button {
  --icon-size: var(--icon-s);
  --icon-stroke: var(--icon-s-stroke-width);
}

.is-mobile .suggestion-container {
  max-width: calc(100vw - 20px - var(--safe-area-inset-left) - var(--safe-area-inset-right));
  max-height: 240px;
}
```

Mobile combobox: padding doubles to 16 px on both sides; clear button grows to 16 px. Suggestion containers fill viewport minus safe-area + 20 px, with smaller max-height (240 px vs desktop's 300).

### 2.5 Mobile clickable-icon transition (`app.css:8303-8309`)

```css
.is-mobile .clickable-icon { transition: opacity 0.1s ease-in-out; }
.clickable-icon.mobile-tap svg { opacity: var(--icon-opacity-hover); }
```

Mobile icons fade in 100 ms (vs desktop 140 ms). The `.mobile-tap` class is JS-managed: added on touchstart, removed on touchend.

### 2.6 Mobile tree-item transition (`app.css:10678-10680`)

```css
.is-mobile .tree-item-self {
  transition: background-color 0.1s ease-in-out, color 0.1s ease-in-out;
}
```

Tree rows transition both background and color in 100 ms — gives touch interactions a snappier feel than desktop's instant hover.

### 2.7 PDF sidebar mobile (`app.css:10960-11020`, `11153`)

```css
.is-mobile .pdf-content-container.sidebarOpen .pdf-sidebar-container { /* … */ }
.is-mobile .pdf-content-container.sidebarOpen .pdf-viewer-container { /* … */ }
.is-mobile .pdf-sidebar-container[data-view="1"] { /* thumbnails layout */ }
.is-mobile .pdf-sidebar-container[data-view="2"] { /* outline layout */ }
.is-mobile .pdf-sidebar-resizer { display: none; }
```

PDF sidebars on mobile change layout — thumbnails grid instead of single column, no resizer.

### 2.8 Metadata container mobile (`app.css:12731-12733`)

```css
.is-mobile .metadata-container { transform: none; }
.is-mobile .metadata-properties-heading { padding: var(--size-4-1) 0; }
```

The desktop's 4 px transform offset is removed on mobile. Heading padding tightens.

### 2.9 Search params mobile (`app.css:18292-18299`)

```css
.is-mobile .search-params { /* … */ }
.is-mobile .search-row > .clickable-icon { /* … */ }
```

Search-row icons get larger touch targets.

### 2.10 Canvas mobile (`app.css:19191-19228`, `19669+`)

```css
.is-mobile .canvas-controls { inset-inline-end: var(--size-4-3); }
.is-mobile .canvas-control-group { border: none; }
.is-mobile .canvas-control-item { /* larger touch targets */ }
.is-mobile .canvas-node-resizer { /* larger drag handles */ }
```

Canvas controls move slightly inward and lose their borders. Resize handles are larger.

### 2.11 Android scrollbars (`app.css:9885-9890`)

```css
.is-android {
  --scrollbar-border-width: 0px;
  --scrollbar-width:        5px;
  --scrollbar-height:       5px;
  --scrollbar-radius:       0;
}
```

Android-style thin sharp scrollbars (5 px, no radius). See `scrollbars.md` §2.

### 2.12 iOS-specific (`app.css:8239-8243`, `3653-3655`, `8860-8864`, etc.)

```css
.is-ios .lucide-more-vertical { transform: rotate(90deg); }   /* match macOS HIG */

.is-mobile.is-ios .markdown-source-view.mod-cm6 .cm-content {
  -webkit-user-modify: read-write;     /* iOS contenteditable hack */
}

.is-mobile.is-ios .metadata-input-text.mod-datetime.is-empty::before,
.is-mobile.is-ios .metadata-input-text.mod-date.is-empty::before {
  content: attr(placeholder);          /* iOS doesn't render placeholder on date inputs */
  color: var(--text-faint);
}
```

iOS overrides:
- More-vertical icon rotated 90°.
- WebKit-specific `user-modify: read-write` to make contenteditable work properly inside CodeMirror on iOS.
- Manual placeholder rendering for date inputs (iOS doesn't show native placeholders).

### 2.13 Phone-only feedback banner (`app.css:4094-4136`)

```css
.feedback-banner-container { display: none; }
body.is-phone .feedback-banner-container { display: block; }
```

The feedback banner only appears on phone — desktop and tablet don't show it.

### 2.14 Phone-only suggestion-item toggle size (`app.css:10124-10127`)

```css
.is-phone .suggestion-item.mod-toggle {
  --icon-size: var(--icon-l);          /* 18px (vs desktop 14px) */
  --icon-stroke: var(--icon-l-stroke-width);
}
```

Toggle suggestions get bigger icons on phone for tap accuracy.

### 2.15 Phone-only combobox sizing (`app.css:8025-8041`)

```css
.is-phone .combobox.suggestion-container {
  max-height: calc(100vh - var(--view-header-height) - var(--safe-area-inset-top));
}
.is-phone .combobox.suggestion-container.has-input-focus {
  max-height: unset;
  height: calc(100vh - var(--view-header-height) - var(--safe-area-inset-top));
}
.is-phone .combobox .search-input-container {
  margin: var(--size-4-1) var(--size-4-3);
}
.is-phone .combobox .search-input-container input[type=search] {
  border-radius: var(--radius-l);                /* 12px — fully pill on phone */
  background-color: var(--background-modifier-form-field);
}
```

Phone comboboxes claim full available height when their input has focus (so the keyboard doesn't crowd them). Internal search input switches to fully-pill (12 px radius).

---

## 3. Safe-area inset usage

iOS safe-area insets are referenced throughout:

- Container padding: `padding-bottom: max(var(--safe-area-inset-bottom), <fallback>);`.
- Mobile toolbar: `padding-bottom: var(--safe-area-inset-bottom);`.
- Tab switcher: `padding-top: var(--safe-area-inset-top);`.
- Content min-width: `max-width: calc(100vw - 20px - var(--safe-area-inset-left) - var(--safe-area-inset-right))`.

The `--safe-area-inset-*` variables are set automatically by the browser/Capacitor when the document has `viewport-fit=cover` (which Obsidian's `index.html` sets — `app.css:6` — `meta name="viewport" content="...viewport-fit=cover"`).

---

## 4. Reproducer build order

1. Set the appropriate body classes (`.is-mobile`, `.is-phone`, `.is-tablet`, `.is-android`, `.is-ios`) based on platform / viewport detection. Multiple can apply simultaneously.
2. Phone-only changes are extensive: hide tab rail, hide view-header by default, hide nav buttons, mobile-only feedback banner, larger toggle icons.
3. Mobile-only (phone + tablet) changes: faster transitions (100 ms), larger combobox padding/icons, bigger touch targets.
4. iOS specifics: 90° rotated more-vertical, WebKit contenteditable hack, manual placeholder for date inputs.
5. Android specifics: 5 px sharp scrollbars.
6. Use `viewport-fit=cover` in the meta tag and respect `--safe-area-inset-*` everywhere.
7. The `.mobile-tap` class (added/removed by JS on touchstart/end) drives all touch-state visuals — keep this convention; don't use `:active` for touch.
