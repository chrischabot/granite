# Links, embeds, and aliases

Linking is what turns a folder of notes into a knowledge base. Granite
supports two link formats, several anchor types, embedded content, and
alternative names ("aliases") for any note. This page is the complete
reference.

## Two link formats

| Form | Example |
|------|---------|
| Wikilink *(default)* | `[[Three laws of motion]]` |
| Wikilink with extension | `[[Three laws of motion.md]]` |
| Wikilink with display text | `[[Three laws of motion\|3 laws]]` |
| Markdown link | `[Three laws of motion](Three%20laws%20of%20motion.md)` |

Granite reads both formats. By default it *generates* wikilinks; turn
off *Settings → Files and links → Use \[\[Wikilinks\]\]* to switch to
Markdown form.

Spaces in Markdown-form URLs must be percent-encoded (`%20`) or wrapped
in `<...>`.

## How a link target resolves

Three settings control how Granite generates link paths, in *Settings
→ Files and links → New link format*:

| Mode | Behaviour |
|------|-----------|
| **Shortest path when possible** *(default)* | Uses just the file name when it is unique in the vault; otherwise uses the minimum disambiguating path. |
| **Relative path to file** | Uses a path relative to the source file. |
| **Absolute path in vault** | Uses the full path from the vault root. |

When you *click* a link, Granite:

1. Looks the target up in the metadata cache.
2. If exactly one file matches, navigates there.
3. If multiple files share the name, prefers the one with the closest
   path.
4. If nothing matches, the link is **unresolved** — it shows in a
   different colour and a hover action *Create note* appears.

## Reserved characters

These characters may not appear inside a link target because they are
link syntax themselves:

```
# | ^ : %% [[ ]]
```

Platform filename rules also apply — on Windows, `\ / : * ? " < > |`
are forbidden in filenames.

## Heading anchors

```md
[[Note#Heading]]            ← single heading
[[Note#H1#H2]]              ← nested heading
[[#In current note]]        ← heading in the current note
[[##term]]                  ← any heading matching "term"
```

When you type `[[#` inside a note, a popover lists every heading in
that note. After choosing a heading and pressing `Enter`, the link is
inserted with the heading text as display text by default.

## Block anchors

A block anchor is a `^id` token at the end of a paragraph (preceded by
a space) or on its own line below a structured block. Then:

```md
[[Note#^abc123]]             ← link to a specific block
[[#^abc123]]                 ← same-note block link
[[^^searchterm]]             ← search every block whose text matches
```

When you type `[[Note#^` inside the editor, a popover lists every
block in that note with its first line of context.

ID rules: Latin letters, digits, and dashes only. Auto-generated IDs
are 6-character random hex.

## Link autocomplete

Type `[[` inside the editor to open the link autocomplete popover. It
shows every note (and alias) in the vault, fuzzy-matched and sorted by
relevance and recency.

| Key | Effect |
|-----|--------|
| `Up` / `Down` | Move selection. |
| `Enter` | Insert the selected link. |
| `Shift+Enter` | Insert as text only (rare — for non-existent targets). |
| `Tab` | Insert and continue into heading or block selection (`#` or `#^`). |
| `Esc` | Dismiss. |

Aliases appear in the list marked with a curved-arrow icon next to
their name.

Excluded files (configured in *Settings → Files and links → Excluded
files*) appear lower in the list.

## Display text

Wikilinks support a pipe-separated display text:

```md
[[Three laws of motion|3 laws]]
```

Markdown links use standard `[Display](Target.md)` syntax.

If you want the same display text in many places, prefer an alias
(see below) over repeating the display text.

## Embeds

Prefix any internal link with `!` to embed its content inline.

| Target | Renders as |
|--------|-----------|
| Image (`.png`, `.jpg`, …) | Inline image. Resize with `\|WxH` or `\|W`. |
| Audio (`.mp3`, `.ogg`, …) | Audio player. |
| Video (`.mp4`, `.webm`, …) | Video player. |
| PDF | Embedded PDF viewer. `#page=N` and `#height=N` are supported. |
| `.md` note | Full note content. |
| `.md#Heading` | The section under that heading. |
| `.md#^id` | The single block. |
| `.canvas` | Embedded canvas viewport (pan/zoom inside the embed). |
| `.base` | The base's first view. `#ViewName` to pick. |

Examples:

```md
![[Image.png]]
![[Image.png|320]]
![[Image.png|320x180]]
![[Document.pdf]]
![[Document.pdf#page=3]]
![[Document.pdf#height=400]]
![[Audio.mp3]]
![[Note]]
![[Note#Heading]]
![[Note#^abc123]]
![[Brainstorm.canvas]]
![[Books.base#Reading list]]
```

External image embeds use Markdown form with optional dimensions in
the alt text:

```md
![alt|320](https://example.com/image.png)
![alt|320x180](https://example.com/image.png)
```

## Page preview (hover popovers)

When the **Page preview** core plugin is enabled, hovering an internal
link opens a small floating preview of the linked content.

In Editing view, you must hold `Mod` while hovering for the preview to
appear; in the sidebar, search results, and file explorer the preview
appears on plain hover after a short delay (default 200 ms).

Configure both in *Settings → Plugin options → Page preview*.

## Aliases

An **alias** is an alternative name for a note. Declare aliases in the
note's YAML frontmatter:

```yaml
---
aliases:
  - AI
  - Doggo
  - Yapper
---
```

Aliases participate in:

- **Quick Switcher** results — both the canonical name and each alias
  appear.
- **Wikilink autocomplete** — alias entries are marked with a curved
  arrow.
- **Backlinks unlinked-mentions** — text matching an alias is
  surfaced in the Backlinks panel.

When you pick an alias as a link target, Granite inserts the canonical
form with the alias as display text, e.g. `[[Note Name|Alias]]`. This
keeps the link working even if the alias is later removed.

## Updating links on rename

When you rename or move a file, Granite can rewrite every wikilink and
Markdown link that targets it across the vault. Control this in
*Settings → Files and links → Automatically update internal links*:

- **On** *(default)* — Granite rewrites silently after each rename.
- **Off** — Granite shows a confirmation dialog asking whether to
  rewrite, on each rename.

The metadata cache is the source of truth for which files reference
which targets. It is kept in sync after every file write.

## External links

Markdown links to URLs are treated as external:

```md
[Granite homepage](https://example.com)
```

External links open in your default browser. If you enable the **Web
viewer** plugin, you can configure links to open in-app instead.

## Link colours

Granite styles links via CSS variables so themes can restyle them:

| State | Variable |
|-------|----------|
| Resolved internal link | `--link-color` |
| Resolved, on hover | `--link-color-hover` |
| Unresolved internal link | `--link-unresolved-color` |
| External link | `--link-external-color` |
| External link, on hover | `--link-external-color-hover` |

Unresolved links also get a dashed underline and reduced opacity, so
you can tell at a glance which links go nowhere yet.

## See also

- [Markdown syntax](./markdown-syntax.md) — the bigger picture of what
  the editor understands.
- [Properties and tags](./properties-and-tags.md) — for the
  `aliases:` property in particular.
- [Search](./search.md) — finding linked and unlinked references.

---

[← Markdown syntax](./markdown-syntax.md) · [Index](./README.md) · [next: Properties and tags →](./properties-and-tags.md)
