# View — PDF Viewer

> The PDF viewer is built on **Mozilla pdf.js** — most of `app.css:1-1390` (and again `1391-2019`) is adapted from the upstream pdf.js stylesheet. Obsidian wraps pdf.js with its own toolbar, sidebar, and find bar.

Source: `renderer/app.css:1-2019` (pdf.js core), `10892-11320` (Obsidian's wrapper). Tokens: see [`design-tokens.md`](design-tokens.md) §16.

---

## 1. DOM scaffold

```
.workspace-leaf-content[data-type="pdf"]
  └─ .view-content
       └─ .pdf-container [.mod-themed]
            ├─ .pdf-toolbar [.findbarOpen]
            │    ├─ .pdf-toolbar-left
            │    ├─ .pdf-toolbar-center
            │    │    ├─ .pdf-page-numbers
            │    │    │    ├─ <input class="pdf-page-input">
            │    │    │    └─ "/ N"
            │    │    └─ .pdf-toolbar-divider
            │    ├─ .pdf-toolbar-spacer
            │    └─ .pdf-toolbar-right
            ├─ .pdf-content-container [.sidebarOpen] [.sidebarMoving]
            │    ├─ .pdf-sidebar-container [data-view="1|2"]
            │    │    └─ .pdf-sidebar-content-wrapper
            │    │         └─ .pdf-sidebar-content        ← thumbnails or outline
            │    ├─ .pdf-sidebar-resizer
            │    └─ .pdf-viewer-container
            │         └─ .pdfViewer
            │              ├─ .page
            │              │    ├─ .canvasWrapper
            │              │    │    └─ <canvas>
            │              │    ├─ .textLayer
            │              │    └─ .annotationLayer
            │              └─ … more pages …
            ├─ .pdf-findbar (only when findbarOpen)
            └─ .pdf-password-dialog (only when locked)
```

---

## 2. `.pdf-container` (`app.css:10899-10923`)

```css
.pdf-container {
  background-color: var(--pdf-background);   /* --background-primary */
  flex-grow: 1;
  min-width: 350px;
  overflow: hidden;
  position: relative;
}

/* Dark theme adjustments to PDF annotation/popup colors */
.theme-dark .pdf-container.mod-themed .annotationLayer .textWidgetAnnotation input,
.theme-dark .pdf-container.mod-themed .annotationLayer .textWidgetAnnotation textarea {
  filter: invert(100%) hue-rotate(180deg);
}
.theme-dark .pdf-container.mod-themed .popupWrapper > div {
  background-color: var(--background-secondary-alt);
  filter: drop-shadow(0px 0px 1px var(--color-base-60))
          drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.4))
          drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.4));
}
.theme-dark .pdf-container.mod-themed .popupWrapper > div::after {
  background-color: var(--background-secondary-alt);
}
.theme-dark .pdf-container.mod-themed .popupContent:empty + .popupMeta {
  background-color: var(--background-secondary-alt);
}
```

`.mod-themed` enables Obsidian's recoloring of PDFs — annotation widgets get inverted hue-rotated for dark mode (preserves color information through inversion), popups get themed backgrounds with multi-layer drop shadows.

---

## 3. `.pdf-viewer-container` (`app.css:10925-10934`)

```css
.pdf-viewer-container {
  outline: none;
  overflow: auto;
  position: absolute;
  top: 0;
  inset-inline-end: 0;
  bottom: 0;
  inset-inline-start: 0;
  scroll-padding: var(--size-4-3);              /* 12px scroll-into-view buffer */
  z-index: 0;
}
.findbarOpen .pdf-viewer-container {
  margin-top: var(--findbar-height);
}
```

The viewport container fills the content area (under the toolbar). When the find bar is open, it gets a top margin equal to `--findbar-height` so content shifts down.

---

## 4. `.pdfViewer .page` (`app.css:1899-1925`)

```css
.pdfViewer .page {
  /* core pdf.js page rule */
  /* margin: 1px auto; … */
  background-clip: content-box;
  background-color: var(--pdf-page-background);   /* --background-primary */
  /* dimensions set inline by pdf.js based on PDF intrinsic size and zoom */
}
```

Each page is a positioned div with a `<canvas>` (the rendered page bitmap), a `.textLayer` (selectable text overlay), and an `.annotationLayer` (clickable annotations).

Page shadow: `--pdf-shadow` (`design-tokens.md` §16):
- Light: `0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.1)`.
- Dark: `0 0 0 1px var(--background-modifier-border)`.

Spread (when displaying two pages side-by-side): `--pdf-spread-shadow` = `0 0 0 1px rgba(0,0,0,0.05)`.

---

## 5. `.pdf-toolbar` (`app.css:11050-11200ish`)

```css
.pdf-toolbar {
  /* flex row, height: var(--header-height) = 40px */
  /* contains: left | center | spacer | right */
}

.pdf-toolbar-left,
.pdf-toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--size-2-2);
}

.pdf-toolbar-center {
  display: flex;
  align-items: center;
}

.pdf-toolbar-spacer {
  flex-grow: 1;
}

.pdf-toolbar-divider {
  width: 1px;
  height: 16px;
  background-color: var(--background-modifier-border);
  margin: 0 var(--size-4-1);
}
```

The toolbar is a 40 px flex row: `[left buttons] | [page input] [/ N] [divider] | (spacer) | [right buttons]`.

The page input (`.pdf-page-input`) is a small numeric text input — typing a number jumps to that page.

---

## 6. `.pdf-sidebar` (`app.css:10941-11048`)

```css
.pdf-content-container {
  --sidebar-width: 140px;
}

.pdf-content-container.sidebarMoving .pdf-sidebar-container,
.pdf-content-container.sidebarOpen .pdf-sidebar-container {
  visibility: visible;
}

.pdf-sidebar-container {
  /* width animates between 0 and --sidebar-width */
  background-color: var(--pdf-sidebar-background);   /* --background-primary */
  /* … */
}

.pdf-sidebar-resizer {
  /* drag handle on the sidebar's right edge */
  width: 4px;
  cursor: col-resize;
}

.is-mobile .pdf-sidebar-resizer { display: none; }

.pdf-sidebar-content {
  /* scrollable column */
}

.pdf-sidebar-container[data-view="1"] {
  /* thumbnails view */
}
.pdf-sidebar-container[data-view="2"] {
  /* outline view */
}
```

The sidebar is 140 px wide by default. `.sidebarOpen` toggles its visibility. `.sidebarMoving` is set during the open/close animation. Two view types: thumbnails (data-view="1") and outline (data-view="2"), each with their own internal layout. Mobile hides the resizer.

Thumbnail shadow: `--pdf-thumbnail-shadow` — light has 2-layer shadow, dark uses `0 0 0 1px var(--background-modifier-border)`.

---

## 7. `.pdf-outline-view` (`app.css:11210-11270ish`)

The outline (table of contents) view inside the sidebar uses `.tree-item` primitives — see `tree-item.md`. Each outline entry is a clickable `.tree-item-self` with `.tree-item-children` for nested subsections.

---

## 8. `.pdf-findbar` (`app.css:11270-11320+`)

```css
.pdf-findbar {
  /* slides down from the top when findbarOpen */
  background-color: var(--background-primary);
  border-bottom: 1px solid var(--background-modifier-border);
  height: var(--findbar-height);
  /* find input, settings toggle, prev/next buttons, close button */
}

.pdf-findbar-settings {
  /* match-case, whole-words, regex toggles */
}

.pdf-find-results-count {
  font-size: var(--font-ui-smaller);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  /* spinning loader during search via @keyframes rotation */
}

.is-phone .pdf-findbar .pdf-search-wrapper {
  gap: var(--size-4-2);
}
```

The find bar is a fixed-height bar that slides in from the top when the user presses Cmd/Ctrl+F. Contains the search input, prev/next, and toggles (match case, whole words, etc.).

---

## 9. `.pdf-password-dialog` (`app.css:11330+`)

```css
.pdf-password-dialog {
  /* shown when the PDF is encrypted */
  /* contains a lock icon, password input, submit button */
}

.pdf-lock-icon {
  /* large lock icon */
}
```

When opening an encrypted PDF, the lock dialog overlays the viewer.

---

## 10. `.pdfPresentationMode` (`app.css:1391+`)

Presentation/full-screen mode is a separate mode the user can enter. Uses Lucide-style fullscreen-exit icon, hides chrome, fits one page to viewport.

---

## 11. PDF.js text layer and annotation layer (`app.css:200-1390`)

The `.textLayer` and `.annotationLayer` rules are inherited mostly from pdf.js upstream. They handle:
- Selectable text rendered as transparent `<span>`s positioned over the canvas.
- Annotation widgets (form fields, links, popups) — text widgets are inverted in dark mode (see §2).

These are out of scope for hand-modification — the reproducer should ship pdf.js as-is and only override the wrapper chrome.

---

## 12. Reproducer build order

1. Bundle pdf.js (`renderer/lib/pdfjs/`) and ship its CSS verbatim — that's the bulk of `app.css:1-2019`.
2. Wrap the pdf.js viewer in `.pdf-container.mod-themed` to enable Obsidian's theme overlays.
3. Build the toolbar as a 40 px flex row: `[left buttons] | [page-input + divider] | (spacer) | [right buttons]`. Use `.clickable-icon`s for the buttons.
4. Sidebar: 140 px wide, slides via `width` transition. `data-view` switches between thumbnails (1) and outline (2). Outline reuses `.tree-item` primitives.
5. Find bar: fixed-height slide-in from top, pushes content down via `--findbar-height` margin on `.pdf-viewer-container`.
6. Page rendering uses pdf.js's `<canvas>` + `.textLayer` + `.annotationLayer`. Multi-layer shadows are theme-specific (`--pdf-shadow`, `--pdf-thumbnail-shadow`).
7. In dark mode with `.mod-themed`, annotation form fields invert + hue-rotate so they remain accessible. Popups gain themed backgrounds.
8. Password dialog overlays the viewer for encrypted PDFs.
9. Mobile: sidebar resizer hidden; sidebar takes a different layout. See `mobile.md` for full mobile rules.
10. PDF embeds in markdown (`![[doc.pdf]]`) reuse the same `.pdf-container` chrome but at fixed dimensions (450 × 400 in popovers — see `hover-popover.md`).
