# Editor — Tags and Links

> The visual treatment of `#tags`, `[[wikilinks]]`, `[markdown links](url)`, and external URLs in both reading and source-mode editors.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css`.

---

## 1. Tags — reading mode (`app.css:14690-14732`)

```css
a.tag {
  background-color: var(--tag-background);             /* hsla(accent, 0.1) */
  border:           var(--tag-border-width) solid var(--tag-border-color);
                                                        /* 0px solid hsla(accent, 0.15) */
  border-radius:    var(--tag-radius);                  /* 2em — full pill */
  corner-shape:     var(--tag-corner-shape);            /* round */
  color:            var(--tag-color);                   /* --text-accent */
  font-size:        var(--tag-size);                    /* 0.875em */
  font-weight:      var(--tag-weight);                  /* inherit */
  text-decoration:  var(--tag-decoration);              /* none */
  padding: var(--tag-padding-y) var(--tag-padding-x);   /* 0.25em 0.65em */
  line-height: 1;
}

@media (hover: hover) {
  a.tag:hover {
    background-color: var(--tag-background-hover);     /* hsla(accent, 0.2) */
    border:           var(--tag-border-width) solid var(--tag-border-color-hover);
    color:            var(--tag-color-hover);           /* --text-accent */
    text-decoration:  var(--tag-decoration-hover);
  }
}
```

The rule is duplicated at `app.css:14712-14732` (a redundant declaration that resolves to the same values — likely a build artifact). Both blocks are identical in effect.

A tag in reading mode is an anchor styled as a fully-pill capsule with a 10 %/20 % accent fill on base/hover. Border opacity is 15 %. No underline. 0.875em font, line-height 1 for tight vertical rhythm.

---

## 2. Tags — source mode (`.cm-hashtag`) (`app.css:14734-14769`)

Source-mode tags are split across multiple spans (the `#` character, the body, and any boundary markers). Each span gets `.cm-hashtag`, with first/last segments adding the rounded edges:

```css
.cm-hashtag {
  color:            var(--tag-color);
  background-color: var(--tag-background);
  border:           var(--tag-border-width) solid var(--tag-border-color);
  font-size:        var(--tag-size);
  font-weight:      var(--tag-weight);
  vertical-align:   baseline;
  border-inline-start: none;
  border-inline-end:   none;
  padding-top:    var(--tag-padding-y);
  padding-bottom: var(--tag-padding-y);
}

.cm-hashtag.cm-hashtag-begin {
  border-start-start-radius: var(--tag-radius);
  border-end-start-radius:   var(--tag-radius);
  corner-start-start-shape:  var(--tag-corner-shape);
  corner-end-start-shape:    var(--tag-corner-shape);
  border-inline-end: none;
  border-inline-start: var(--tag-border-width) solid var(--tag-border-color);
  padding-inline-start: var(--tag-padding-x);
}

.cm-hashtag.cm-hashtag-end {
  border-start-end-radius: var(--tag-radius);
  border-end-end-radius:   var(--tag-radius);
  corner-start-end-shape:  var(--tag-corner-shape);
  corner-end-end-shape:    var(--tag-corner-shape);
  border-inline-start: none;
  border-inline-end:   var(--tag-border-width) solid var(--tag-border-color);
  padding-inline-end: var(--tag-padding-x);
}

.cm-s-obsidian span.cm-hashtag.cm-hmd-escape-backslash { color: #FCC; }
                                          /* fixed pink for the escape-backslash sequence */
```

Each span gets vertical padding only; horizontal padding lives on the `-begin` and `-end` modifier classes. Borders are off on the inside edges and on for the outside — the result is a single seamless pill across the multi-span text.

Escape-backslash characters (`\#`) used to escape a literal `#` get fixed pink (`#FCC`) — a marker for "this is escape syntax, not a tag".

---

## 3. Internal links — `[[wikilink]]`

The CSS for internal links is spread across many selectors but the core tokens come from `design-tokens.md` §11:

```
--link-color:                       var(--text-accent)
--link-color-hover:                 var(--text-accent-hover)
--link-decoration:                  underline
--link-decoration-hover:            underline
--link-decoration-thickness:        auto
--link-weight:                      var(--font-weight)
--link-unresolved-color:            var(--text-accent)
--link-unresolved-opacity:          0.7
--link-unresolved-decoration-style: solid
--link-unresolved-decoration-color: hsla(--interactive-accent-hsl, 0.3)
```

In reading mode, internal links look like:
- `a.internal-link` — base accent color, underline.
- `a.internal-link.is-unresolved` — accent at 70 % opacity, underline color softens to 30 %-accent — visual cue that the target file does not exist.

In source mode (live-preview), wikilinks are rendered through `.cm-link`, `.cm-hmd-internal-link`, etc. (full selector list under `.cm-s-obsidian` in `app.css:12136+`).

The source-mode `[[ ]]` formatting characters get `--text-faint` color (via `.cm-formatting-link`). When the cursor leaves the link line, the formatting characters compress visually (CodeMirror handles this via decoration ranges).

---

## 4. External links

Tokens (`design-tokens.md` §11):

```
--link-external-color:            var(--text-accent)
--link-external-color-hover:      var(--text-accent-hover)
--link-external-decoration:       underline
--link-external-decoration-hover: underline
--link-external-filter:           none
```

External links additionally render the small "↗" SVG icon (the `i-external` SVG from `renderer/public/images/6155340132a851f6089e.svg`) — added by JS as a `::after` background-image on `.external-link`. See `icons-and-assets.md` §2.2.

Footnote-backreference links (`.footnote-backref`) and footnote-target links (`.footnote-link`, `.footnote-ref`) reuse the same accent color but with explicit padding adjustments — see `editor-footnotes.md`.

---

## 5. Source-mode formatting characters

Throughout the source/live-preview editor, the markdown formatting characters (everything that's not the rendered text) are colored `--text-faint` so they recede:

```css
.cm-formatting,
.cm-formatting-link,
.cm-formatting-link-string,
.cm-formatting-em,
.cm-formatting-strong,
.cm-formatting-header,
.cm-formatting-list,
.cm-formatting-quote,
.cm-formatting-code,
.cm-formatting-task { color: var(--text-faint); }
```

(Exact selector list lives in `app.css:13417` for headings; lists at `13826`; the rest follow the same pattern. Reproducer should map every CodeMirror `cm-formatting-*` class to `--text-faint`.)

---

## 6. Reading-mode link decorations

The combination of `.markdown-rendered` rules and the link tokens produces:

| Link type | `color` | `text-decoration` | Extra |
| --- | --- | --- | --- |
| `a` (default) | `--link-color` (`--text-accent`) | underline | — |
| `a:hover` | `--link-color-hover` | underline | — |
| `.internal-link` | `--link-color` | underline | resolves via JS lookup |
| `.internal-link.is-unresolved` | `--link-unresolved-color` × 70 % | underline (decoration color: 30 % accent) | — |
| `.external-link` | `--link-external-color` | underline | trailing arrow icon |
| `.cm-link` (source) | (token-driven inside CM) | (per-token) | — |

---

## 7. Reproducer build order

1. Tags in reading mode are anchors with full-pill chrome — 10 %/20 % accent fill, 2em radius, 0.875em font, line-height 1, 0.25em × 0.65em padding.
2. Source-mode tags are multi-span: `.cm-hashtag.cm-hashtag-begin` (left round + left border) + `.cm-hashtag` body (no inside borders) + `.cm-hashtag.cm-hashtag-end` (right round + right border).
3. The escape-backslash inside a tag gets fixed `#FCC` pink — keep the literal hex.
4. All link tokens default to `--text-accent`, underline. Override the unresolved variant to 70 % opacity and 30 %-accent decoration color.
5. External links get the trailing `i-external` SVG via JS-injected `::after`. Don't inline it as image-set — the SVG file is shipped under `public/images/`.
6. All `.cm-formatting-*` classes map to `--text-faint` — apply this universally so source-mode chrome characters recede.
7. The wiki-link `[[ ]]` brackets are part of the formatting; the inner text (the link target) is the colorful "link" portion. CodeMirror handles which chars are formatting vs link content via decoration ranges.
