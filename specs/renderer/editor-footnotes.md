# Editor — Footnotes

> Markdown footnotes (`[^1]` reference + `[^1]: Body text` definition) in both reading and source modes.

Tokens: see [`design-tokens.md`](design-tokens.md) §8. Source: `renderer/app.css:12627-12689`.

---

## 1. Reading-mode footnotes (`app.css:12627-12651`)

```css
.footnote-link {
  text-decoration: none;
}

.footnotes {
  font-size: var(--footnote-size);          /* --font-smaller = 0.875em */
}

.footnote-ref {
  vertical-align: super;
}

.footnote-backref {
  display: inline-block;
  margin-inline-start: var(--size-4-1);     /* 4px */
  color: var(--text-faint);
  text-decoration: none;
}

@media (hover: hover) {
  .footnote-backref:hover {
    color: var(--text-accent);
    text-decoration: none;
  }
}
```

DOM in reading mode:

```
<p>Body text <sup id="fnref:1"><a class="footnote-link footnote-ref">[1]</a></sup></p>

<section class="footnotes">
  <ol>
    <li id="fn:1">
      <p>Footnote body text.
         <a class="footnote-link footnote-backref" href="#fnref:1">↩</a>
      </p>
    </li>
  </ol>
</section>
```

Reproducer rules:
- Footnote refs (`[1]` superscripts) use `vertical-align: super` so the browser computes the superscript offset.
- The `.footnotes` section is at 87.5 % size — smaller than body, matching academic convention.
- The back-arrow link (`.footnote-backref`) sits 4 px to the right of the body, in `--text-faint`. Hover brightens to accent.
- Both link types skip the default underline (`text-decoration: none`) — relying on color alone for affordance.

---

## 2. Source-mode footnotes — `.HyperMD-footnote` (`app.css:12653-12689`)

```css
.cm-s-obsidian .cm-line.HyperMD-footnote {
  font-size: var(--footnote-size);             /* 0.875em */
}

.cm-s-obsidian .cm-line.HyperMD-footnote span.cm-hmd-footnote {
  cursor: text;
  display: inline-block;
  font-size: var(--font-smallest);             /* 0.8em */
  position: relative;
  top: -0.3em;                                  /* lift to look like a superscript */
  color: var(--text-muted);
}

.cm-s-obsidian .cm-line.HyperMD-footnote span.cm-hmd-footnote.cm-formatting {
  color: var(--text-faint);
}

.cm-s-obsidian .cm-line.HyperMD-footnote span.cm-hmd-footnote:hover {
  text-decoration: none;
}

.cm-s-obsidian .cm-line.HyperMD-footnote span.cm-hmd-footnote .cm-underline {
  color: var(--text-muted);
  text-decoration: none;
}

@media (hover: hover) {
  .cm-s-obsidian .cm-line.HyperMD-footnote span.cm-hmd-footnote .cm-underline:hover {
    cursor: text;
    color: var(--text-muted);
    text-decoration: none;
  }
}

.cm-s-obsidian .cm-line.HyperMD-footnote .cm-hmd-footnote-url-title {
  color: var(--text-muted);
}
```

In source mode:
- Footnote definition lines (`.HyperMD-footnote`) are 87.5 % size.
- The `[^N]` markers (`.cm-hmd-footnote`) are smaller still (`--font-smallest = 0.8em`), positioned 0.3em up to look superscript, in `--text-muted`. Hover doesn't add underline (which would suggest a clickable link — the marker is just text in source mode).
- Formatting characters (the `[`, `^`, `]`) are `--text-faint`.
- Inside a footnote body, URLs / link titles use `--text-muted` rather than the standard accent — keeps the footnote visually quieter than body links.

---

## 3. `.footnotes-view` — sidebar pane

The footnotes pane (a sidebar view that lists all footnotes in the current document) reuses the `.footnotes-view` selector — defined alongside other sidebar panes. Internal layout reuses `.tree-item` and `.search-result-*` primitives.

---

## 4. Hover-popover for footnote refs

When the user hovers a `[^N]` ref, a hover popover (see `hover-popover.md`) shows the footnote definition. The popover is sized via:

```css
.popover.hover-popover > .markdown-embed[data-type="footnote"].mod-empty {
  /* small dimmed empty state */
}
.popover.hover-popover > .markdown-embed[data-type="footnote"]:not(.mod-empty) {
  /* footnote-specific size — typically narrower than markdown-embed default */
}
.popover.hover-popover > .markdown-embed[data-type="footnote"] > .markdown-embed-content .cm-scroller,
.popover.hover-popover > .markdown-embed[data-type="footnote"] > .markdown-embed-content .markdown-preview-view {
  /* explicit dimensions inside the footnote popover */
}
```

(See `hover-popover.md` §3.6 for the full ruleset.)

---

## 5. Reproducer build order

1. Reading mode: footnote refs use `vertical-align: super`; back-references use `--text-faint` plus a 4 px left margin. Footnote section is 87.5 % size.
2. Source mode: definition lines are 87.5 %; the marker chars are 80 % with `top: -0.3em` to look superscripted. Marker color `--text-muted`, formatting brackets `--text-faint`.
3. Both modes skip underline on footnote links — color alone signals interactivity.
4. Footnote popovers use the markdown-embed primitive with `data-type="footnote"` — distinct sizing from regular embeds.
5. The `--footnote-id-color`, `--footnote-id-color-no-occurrences`, `--footnote-divider-color`, and other tokens (see `design-tokens.md` §8) are consumed by the footnotes-view sidebar — not the inline rendering.
