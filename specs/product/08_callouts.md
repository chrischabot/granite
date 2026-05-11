# 08 — Callouts

A **callout** is a styled blockquote whose first line is `> [!type]` (optionally with a custom title).

## 8.1 Syntax

```md
> [!info] Optional custom title
> Body content.
> Body can include **Markdown**, [[Wikilinks]], and ![[embeds]].
```

- The token `[!type]` must be at the start of the first line.
- Optional title text follows the type token on the same line.
- Add `+` after the type to make a callout that's foldable and **expanded** by default.
- Add `-` after the type to make it foldable and **collapsed** by default.

```md
> [!faq]- Are callouts foldable?
> Yes — collapsed by default because of the `-`.
```

## 8.2 Default callout types

Each type maps to a color, an icon, and one or more aliases (the aliases let users write the same callout under a different name without needing to register custom CSS).

| Type | Icon (Lucide) | Aliases |
|------|---------------|---------|
| `note` (default) | `pencil` | (none) |
| `abstract` | `clipboard-list` | `summary`, `tldr` |
| `info` | `info` | (none) |
| `todo` | `check-circle-2` | (none) |
| `tip` | `flame` | `hint`, `important` |
| `success` | `check` | `check`, `done` |
| `question` | `help-circle` | `help`, `faq` |
| `warning` | `alert-triangle` | `caution`, `attention` |
| `failure` | `x` | `fail`, `missing` |
| `danger` | `zap` | `error` |
| `bug` | `bug` | (none) |
| `example` | `list` | (none) |
| `quote` | `quote` | `cite` |

The type identifier is **case-insensitive**. An unrecognized type silently falls back to `note`.

The colors are bound to CSS variables: `--callout-bug`, `--callout-default`, `--callout-error`, `--callout-example`, `--callout-fail`, `--callout-important`, `--callout-info`, `--callout-question`, `--callout-success`, `--callout-summary`, `--callout-tip`, `--callout-todo`, `--callout-warning`, `--callout-quote`. Each is an `R, G, B` triple (no `rgb()` wrapper) so the renderer can compose `rgba(var(--callout-info), 0.2)` for a tinted background.

## 8.3 Title-only callouts

Omit the body to render a single-row callout:

```md
> [!tip] Title-only callout
```

## 8.4 Nested callouts

Callouts may nest by adding additional `>` per level:

```md
> [!question] Outer
> > [!todo] Middle
> > > [!example] Inner
```

The inner callout's color blends with its parent via the `--callout-blend-mode` variable (typically `mix-blend-mode: lighten` in dark mode and `darken` in light mode).

## 8.5 Custom callouts via CSS

To register a new type called `tldr-2`:

```css
.callout[data-callout="tldr-2"] {
  --callout-color: 100, 200, 255;       /* RGB */
  --callout-icon: lucide-clipboard-check;
}
```

`--callout-icon` accepts:
- A Lucide icon ID (string), e.g. `lucide-flame`.
- A literal SVG element as a string: `--callout-icon: '<svg>...</svg>';`

## 8.6 Right-click a callout title

In Live Preview, right-click the callout's title row to open a menu listing all known callout types. Selecting one rewrites the `[!type]` token in the source.

## 8.7 Callout layout (CSS surface)

| CSS variable | Purpose |
|--------------|--------|
| `--callout-border-width` | Outer border width. |
| `--callout-border-opacity` | Border opacity. |
| `--callout-padding` | Padding inside the callout. |
| `--callout-radius` | Corner radius. |
| `--callout-blend-mode` | Mix mode for nested callout backgrounds. |
| `--callout-title-color` | Title text color (often the callout's accent). |
| `--callout-title-padding` | Padding for the title row. |
| `--callout-title-size` | Title font size. |
| `--callout-title-weight` | Title font weight. |
| `--callout-content-padding` | Padding for the body. |
| `--callout-content-background` | Body background tint. |

The visual default is: body background `rgba(var(--callout-color), 0.1)`, title background `rgba(var(--callout-color), 0.2)`, left border `rgba(var(--callout-color), 0.45)` 4 px wide, title icon tinted to the callout color, title text in the callout color, body text in `--text-normal`.

## 8.8 Inserting callouts

- Command palette → *Insert callout*: inserts a `> [!note]` skeleton with the cursor placed in the type field.
- With a selection: *Insert callout* wraps the selected text/list/code block in a `> [!note]` envelope.
- Right-click in editor → *Insert → Callout*.

## 8.9 Lucide icon version pinning

Lucide icons are updated periodically. The set referenced by callout `--callout-icon` values (and the rest of the UI) must be pinned to a known version when the app ships, so that user CSS snippets continue to resolve `--callout-icon: lucide-foo` to the same glyph.