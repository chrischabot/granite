# Editor — Embeds

> The visual treatment of embedded content inside markdown: `![[note]]` (markdown embed), `![[image.png]]` (image embed), `![[video.mp4]]` (video), `![[audio.mp3]]` (audio), `![[doc.pdf]]` (PDF), `![](url)` (external embed), and the iframe sandbox.

Tokens: see [`design-tokens.md`](design-tokens.md) §6. Source: `renderer/app.css:12345-12504`, `12483+`.

---

## 1. Shared embed shell — `.markdown-embed`, `.file-embed`

```css
.markdown-embed,
.file-embed { position: relative; }

.markdown-embed-link,
.file-embed-link {
  position: absolute;
  top: 4px;
  inset-inline-end: 4px;
  color:   var(--icon-color);
  opacity: var(--icon-opacity);
  cursor:  var(--cursor-link);
  padding: var(--size-2-2);                /* 4px */
  border-radius: var(--radius-s);          /* 4px */
  display: flex;
  align-items: center;
  --icon-size:   var(--icon-s);            /* 16px */
  --icon-stroke: var(--icon-s-stroke-width);
}

@media (hover: hover) {
  .markdown-embed-link:hover,
  .file-embed-link:hover {
    color:   var(--icon-color-hover);
    opacity: var(--icon-opacity-hover);    /* 1 */
    background: var(--background-modifier-hover);
  }
}
```

Every embed has a small "open as note" link icon in its top-right corner — 4 px from each edge, 16 px Lucide arrow inside a 4 × 4 px-padded square. Hover paints `--background-modifier-hover` and brightens the icon.

---

## 2. `.markdown-embed` — embedded note (`app.css:12420-12482`)

```css
.markdown-embed {
  font-style: var(--embed-font-style);            /* inherit */
  background-color: var(--embed-background);      /* inherit */
  border-top:    var(--embed-border-top);         /* none */
  border-inline-end: var(--embed-border-end, var(--embed-border-right));
                                                   /* none */
  border-bottom: var(--embed-border-bottom);      /* none */
  border-inline-start: var(--embed-border-start, var(--embed-border-left));
                                                   /* 2px solid --interactive-accent */
  margin: 0;
}

.markdown-embed-content { height: 100%; }
.markdown-embed .markdown-preview-view { padding: 0; }

.embed-title {
  align-items: center;
  display: flex;
  gap: var(--size-4-1);                            /* 4px */
  font-size: var(--font-text-size);                 /* 16px */
  font-weight: calc(var(--font-weight) + var(--bold-modifier));   /* 600 */
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 0 var(--size-4-2) 0;                  /* 8px bottom */
}

.internal-embed:not(.image-embed) {
  display: block;
}

.internal-embed img:not([width]),
.internal-embed audio,
.internal-embed video {
  max-width: 100%;
}

.internal-embed.query-embed .edit-block-button {
  opacity: 1;
}

.inline-embed > .markdown-embed-title { padding: var(--embed-padding); }
                                                   /* 0 0 0 24px */
.inline-embed > .markdown-embed-content {
  height: fit-content;
  max-height: var(--embed-max-height);             /* 4000px */
  overflow: auto;
}

.inline-embed > .markdown-embed-content > .markdown-source-view,
.inline-embed > .markdown-embed-content > .markdown-preview-view {
  padding: var(--embed-padding);                    /* 0 0 0 24px */
}

.inline-embed .markdown-source-view.mod-cm6 .cm-editor {
  min-height: unset;                                /* no minimum height inside an embed */
}
```

Reproducer rules:
- A markdown embed has a **2 px solid accent left border** by default — this is its visual identity. Themes can change this via `--embed-border-start`.
- 24 px left padding (`--embed-padding`) — the content sits to the right of the border with breathing room.
- The title (`.embed-title`) is 16 px / 600 / start-aligned with an 8 px bottom gap.
- Inline embeds (`.inline-embed`) — embeds that flow inline with body text rather than as block-level — get explicit padding wrapping and capped height.
- Embedded markdown content uses the standard `.markdown-preview-view` rules but with `padding: 0` to defer to the embed's own padding.

---

## 3. `.file-embed` — non-renderable file (`app.css:12376-12418`)

```css
.file-embed-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--size-4-2);                            /* 8px */
}

.file-embed-icon {
  color: var(--text-muted);
  display: flex;
}

.file-embed {
  display: flex;
  justify-content: center;
  border-radius: var(--radius-m);                  /* 8px */
  background-color: var(--background-primary-alt);
}

.file-embed.mod-generic,
.file-embed.mod-empty {
  cursor: var(--cursor-link);
  padding: var(--size-4-2);                        /* 8px */
  color: var(--text-muted);
  text-align: center;
  font-size: var(--font-smaller);                  /* 0.875em */
}

@media (hover: hover) {
  .file-embed.mod-generic:hover,
  .file-embed.mod-empty:hover {
    color: var(--text-normal);
    background-color: var(--background-secondary);
  }
}

.file-embed.mod-empty-attachment {
  padding: var(--size-4-2);
  color: var(--text-muted);
  text-align: center;
  font-size: var(--font-smaller);
}
```

When embedding a file Obsidian can't render (zip, exe, etc.), the file-embed renders as a centered horizontal pill with the file-type icon + filename. Background is `--background-primary-alt` (slightly off the page), 8 px corner radius. Hover brightens text and background.

---

## 4. Image, video, audio embeds (`app.css:12454-12502`)

```css
.internal-embed img:not([width]),
.internal-embed audio,
.internal-embed video {
  max-width: 100%;
}

div.image-embed {
  width: fit-content;
  padding-bottom: 3px;
  padding-inline-end: 3px;
}

div.image-embed .image-wrapper {
  display: flex;
  position: relative;
}
```

Inline-image embeds:
- Image is `width: fit-content` (sized to its natural width, capped to 100 % of parent).
- 3 px right + bottom padding so resize handles (when the image is selected) don't visually bump against neighboring content.
- The image-wrapper is positioned (`relative`) so resize handles can absolute-position over it.

For audio (`app.css:10854-10878`):

```css
audio {
  width: 100%;
  height: 42px;
  outline: none;
}
.markdown-rendered audio { max-width: 100%; outline: none; }

audio::-webkit-media-controls-enclosure {
  border-radius: calc(var(--radius-m) - 1px);   /* 7px */
  border: var(--border-width) solid var(--background-modifier-border);
  background-color: var(--background-primary-alt);
}

audio::-webkit-media-controls-current-time-display,
audio::-webkit-media-controls-time-remaining-display {
  font-family: var(--font-interface);
}
```

Audio players are 42 px tall with a 7 px-radius enclosure that has a 1 px border. Time displays use the interface font (rather than the OS default monospace) so they match Obsidian's typographic rhythm.

---

## 5. Iframe and external embed (`app.css:12483-12492`, `10879-10881`)

```css
.embed-iframe {
  width: 100%;
  height: 100%;
}

iframe.external-embed {
  width: 600px;
  max-width: 100%;
  height: 350px;
}

iframe { border: 0; }
```

The `.embed-iframe` is the sandboxed rendering surface for embedded plugin content. External-embed iframes (e.g. embedded YouTube videos) get a default 600 × 350 sizing — JS can override but this is the fallback.

All iframes throughout the app get `border: 0` to strip the OS default frame.

---

## 6. PDF embed (`app.css:12283-12343`)

```css
.internal-embed.pdf-embed:not(.image-embed) {
  /* …PDF-specific embed styling — see view-pdf.md for the full PDF surface */
}
```

PDF embeds use the same `.pdf-embed` chrome as the standalone PDF viewer. See `view-pdf.md` for full details on the toolbar, sidebar, page rendering, and search.

---

## 7. Hover-popover specializations (`app.css:9519-9619`)

Inside a hover popover (see `hover-popover.md`), embeds are sized by:

```css
.popover.hover-popover > .image-embed,
.popover.hover-popover > .video-embed {
  width: auto;
  max-height: inherit;
  max-width: var(--popover-width);             /* 450px */
  width: fit-content; height: fit-content;
  display: flex;
  justify-content: center;
  align-items: center;
}

.popover.hover-popover > .pdf-embed {
  width:  var(--popover-pdf-width);            /* 450px */
  height: var(--popover-pdf-height);           /* 400px */
}

.popover.hover-popover > .markdown-embed {
  /* full markdown render with reading-mode styling */
}
```

These are repeated in `hover-popover.md` §3.

---

## 8. Block embed shadow on hover

When hovering over an embedded block (a section of another note), the embed gets a focus-style shadow:

```
--embed-block-shadow-hover:  0 0 0 1px var(--background-modifier-border),
                             inset 0 0 0 1px var(--background-modifier-border);
```

(Token defined in `design-tokens.md` §6; consumed by JS-applied class `.is-hovered` or similar — not a fixed CSS rule because hover detection differs per consumer.)

---

## 9. Reproducer build order

1. Every embed has a top-right "open as note" link icon. Use `.markdown-embed-link` / `.file-embed-link` — absolute-positioned at `top: 4px; inset-inline-end: 4px`. 16 px Lucide icon, 4 px padding, 4 px radius. Hover background `--background-modifier-hover`.
2. Markdown embeds: 2 px solid accent left border, 24 px left padding, no other borders. Title is 16 px / 600 with 8 px bottom margin.
3. File embeds: centered flex with 8 px gap, 8 px radius, `--background-primary-alt` background. Hover lifts to `--background-secondary`.
4. Image embeds: `width: fit-content`, 3 px right + bottom padding for resize-handle clearance.
5. Audio: 42 px tall with 7 px radius enclosure and 1 px hairline border. Time displays use `--font-interface`.
6. iframes: `border: 0` globally; external-embed iframes default to 600 × 350.
7. Inline embeds (embeds inside text flow) cap at `--embed-max-height: 4000px` and use `overflow: auto`. Reading-mode embeds (`.markdown-embed .markdown-preview-view`) zero their inner padding.
8. PDF embeds reuse the full `view-pdf.md` chrome at fixed 450 × 400 in popover contexts.
