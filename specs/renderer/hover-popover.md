# Hover Popover

> The floating preview that appears when the user hovers a link (or holds Cmd/Ctrl + hovers, depending on settings). Used to peek at note contents, embedded headings, footnotes, images, video, audio, and PDFs without leaving the current document.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css`.

---

## 1. Shared shell — `.popover, .suggestion-container, .cm-tooltip.cm-tooltip-autocomplete` (`app.css:9506-9517`)

```css
.popover,
.suggestion-container,
.cm-tooltip.cm-tooltip-autocomplete {
  display: flex;
  position: absolute;
  z-index: var(--layer-popover);          /* 30 */
  background-color: var(--background-primary);
  border: var(--border-width) solid var(--background-modifier-border);
  box-shadow: var(--shadow-s);
  border-radius: var(--radius-m);          /* 8px */
  max-height: var(--popover-max-height);   /* 95vh */
}
```

Three families share the box style: `.popover` (hover preview), `.suggestion-container` (autocomplete), and CodeMirror's autocomplete tooltip.

---

## 2. `.popover.hover-popover` shape (`app.css:9519-9527`)

```css
.popover.hover-popover {
  --callout-blend-mode: normal;       /* override the default 'lighten/darken' blend in callouts */
  justify-content: stretch;
  overflow: hidden;
  max-width: 80vw;
  max-height: inherit;                 /* inherits .popover's 95vh */
  min-height: 30px;
  width: fit-content;
}
```

Reproducer rules:
- 80 vw cap so popovers don't span the full window on wide displays.
- `width: fit-content` — popover sizes to its inner content, not a fixed dimension.
- `--callout-blend-mode: normal` (overriding the default `darken`/`lighten` per theme) so callouts inside a popover read cleanly without the blend-mode darkening their already-translucent panels twice.

### 2.1 Editing state (`app.css:9529-9532`)

```css
.popover.hover-popover.is-editing {
  outline: 2px var(--background-modifier-border-focus) solid;
  border-color: var(--background-modifier-border-focus);
}
```

When the user enters editing mode inside a popover (it becomes a mini-editor), the border switches to focus color and an outer 2 px outline appears.

---

## 3. Inner content sizing (`app.css:9534-9619`)

### 3.1 Default child width

```css
.popover.hover-popover > * {
  width: var(--popover-width);          /* 450px */
}
.popover.hover-popover .markdown-preview-view {
  font-size: var(--popover-font-size);  /* --font-text-size = 16px */
}
```

Default popover content is 450 px wide. The markdown body inside reads at full text size (16 px), not the smaller UI sizes.

### 3.2 Empty state

```css
.popover.hover-popover > .mod-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  font-size: var(--popover-font-size);
  color: var(--text-muted);
}
```

When the linked note is empty (no content), the popover shows centered muted-color text.

### 3.3 Image / video embeds

```css
.popover.hover-popover > .image-embed,
.popover.hover-popover > .video-embed {
  width: auto;
  max-height: inherit;
  max-width: var(--popover-width);
  width: fit-content;
  height: fit-content;
  display: flex;
  justify-content: center;
  align-items: center;
}
.popover.hover-popover > .image-embed img,
.popover.hover-popover > .video-embed img,
.popover.hover-popover > .image-embed video,
.popover.hover-popover > .video-embed video {
  width: 100%;
  max-width: inherit;
  max-height: inherit;
}
```

Image and video previews shrink to fit their natural dimensions, capped by `--popover-width` × `--popover-max-height`. Inner `<img>` / `<video>` fill the wrapper.

### 3.4 Audio embeds

```css
.popover.hover-popover > .audio-embed {
  /* (continues — see audio rules in editor-embeds.md) */
}
```

Audio is a thin player; it gets the full popover width.

### 3.5 PDF embeds

```css
.popover.hover-popover > .pdf-embed {
  width:  var(--popover-pdf-width);     /* 450px */
  height: var(--popover-pdf-height);    /* 400px */
  /* (continues — see view-pdf.md) */
}
```

PDF previews use a fixed 450 × 400 box. The PDF is rendered inside via pdf.js.

### 3.6 Markdown embeds (`app.css:9582-9618`)

```css
.popover.hover-popover > .markdown-embed {
  /* …display, padding rules — see editor-embeds.md… */
}
.popover.hover-popover > .markdown-embed > .markdown-embed-content {
  /* contents */
}
.popover.hover-popover > .markdown-embed > .markdown-embed-content > .markdown-source-view.mod-cm6 > .cm-editor > .cm-scroller,
.popover.hover-popover > .markdown-embed > .markdown-embed-content .markdown-preview-view {
  /* explicit sizing */
}
.popover.hover-popover > .markdown-embed .markdown-source-view {
  /* explicit padding */
}

/* Footnote-style markdown embed when target is empty */
.popover.hover-popover > .markdown-embed[data-type="footnote"].mod-empty {
  /* dimmed footnote-stub */
}
.popover.hover-popover > .markdown-embed[data-type="footnote"].mod-empty .markdown-preview-view {
  /* layout */
}
.popover.hover-popover > .markdown-embed[data-type="footnote"]:not(.mod-empty) {
  /* sized footnote popover */
}
.popover.hover-popover > .markdown-embed[data-type="footnote"] > .markdown-embed-content .cm-scroller,
.popover.hover-popover > .markdown-embed[data-type="footnote"] > .markdown-embed-content .markdown-preview-view {
  /* footnote content sizing */
}
```

(These rules are explicit width/height/padding values — see `editor-embeds.md` for the full set. The popover is a *consumer* of the markdown-embed primitive.)

The `data-type="footnote"` selector specializes for footnote previews — they're typically smaller and styled with a different chrome.

---

## 4. Inline-title visibility inside popovers (`app.css:4611-4627`)

```css
.hover-popover .inline-title,
.inline-embed   .inline-title { display: none; }

.hover-popover.bases-new-item-popover .inline-title,
.hover-popover .markdown-embed[data-type="heading"] .inline-title { display: block; }

body:not(.show-inline-title) .bases-new-item-popover .inline-title { display: block; }
```

By default, the inline title is hidden inside hover popovers (the file name is already known from the link being previewed). Two exceptions:
- Bases new-item popover always shows its title (it's a distinct creation flow).
- Heading-anchor markdown embeds show the title (so the user sees which file the heading came from).

---

## 5. Z-index stack (recap)

```
--layer-popover:  30    ← .popover, .cm-tooltip.cm-tooltip-autocomplete
--layer-modal:    50
--layer-notice:   60    ← .suggestion-container ALSO sits here (overrides .popover's 30)
--layer-menu:     65
--layer-tooltip:  70
--layer-dragged-item: 80
```

Hover popovers are at z-index 30 — above editor content but below modals (50). A modal will paint over a hover popover. Suggestions popovers (which share the same `.popover` base style) override to z-index 60 so they sit above modals — important for autocomplete inside a modal-hosted form.

---

## 6. Print suppression (`app.css:3110-3117`)

```css
@media print {
  iframe, .titlebar, .app-container,
  .progress-bar, .popover, .markdown-embed-link,
  .suggestion-container, .cm-tooltip.cm-tooltip-autocomplete {
    display: none !important;
  }
}
```

`.popover` and friends are hidden in print — they're transient UI, not document content.

---

## 7. Hover trigger behavior (from JS — `renderer/app.webcrack/deobfuscated.js`)

The hover-popover system listens on every `.internal-link`, `.tag`, `.external-link`, and embed. It triggers via:
- Hover with **no modifier** (default): user setting "Page preview → on by default".
- Hover with **Cmd/Ctrl** held: user setting "Page preview → require modifier" (the safer default).

Triggered popovers:
- Mount the popover at `position: absolute` calculated from the trigger's bounding box.
- JS picks the side (above / below / left / right) based on available viewport space and updates `transform` accordingly.
- Dismiss on `mouseleave` of both trigger and popover (with grace period for moving from one to the other).

---

## 8. Reproducer build order

1. The hover-popover is the same shell shape as `.suggestion-container`: 1 px border in `--background-modifier-border`, `--shadow-s` shadow, 8 px corner radius, `--background-primary` fill. Z-index 30.
2. Width: `fit-content` capped at 80 vw. Height: `min: 30px; max: inherit (95vh)`.
3. Default child width is 450 px (`--popover-width`); image/video/audio/PDF embeds size themselves.
4. The markdown body inside renders at full text size (16 px), not the smaller chrome sizes.
5. `--callout-blend-mode: normal` is set on the popover so callouts read correctly (without it they'd double-apply blend modes).
6. `is-editing` adds a 2 px focus outline + focus border color when the user types inside the popover.
7. Footnote-type markdown embeds get specialized geometry (smaller default, dimmed if empty).
8. Inline title is hidden in hover popovers by default — show it only for bases-new-item and heading-anchor embeds.
9. JS triggers via mouseenter on links/tags/embeds; positions the popover; manages dismiss with hover-grace.
10. Print and screenshotting modes hide popovers entirely.
