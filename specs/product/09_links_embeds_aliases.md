# 09 — Internal links, embeds, and aliases

## 9.1 Two link formats

The editor supports both forms interchangeably; users can switch the *generated* form globally via *Settings → Files and links → Use \[\[Wikilinks\]\]*.

| Form | Example |
|------|---------|
| Wikilink (default) | `[[Three laws of motion]]` |
| Wikilink with extension | `[[Three laws of motion.md]]` |
| Wikilink with display text | `[[Three laws of motion\|3 laws]]` |
| Markdown link | `[Three laws of motion](Three%20laws%20of%20motion.md)` |

Spaces in Markdown URLs must be percent-encoded (`%20`) or wrapped in `<...>`.

## 9.2 Link target resolution

Three settings determine how generated paths look (*Settings → Files and links → New link format*):

1. **Shortest path when possible** *(default)* — uses just the file name when unique in the vault, else uses the minimum disambiguating path.
2. **Relative path to file** — uses a path relative to the source file.
3. **Absolute path in vault** — uses the full path from the vault root.

Resolution at *click* time: take the link target string, look up via the metadata cache. If it matches a single file, navigate. If multiple files share the name, prefer the one with the closest path. If no match exists, the link is *unresolved* (gets a distinct color and a hover-action *Create note*).

## 9.3 Reserved characters

These characters may not appear in a link target string because they are link syntax:
`# | ^ : %% [[ ]]`. The renderer will refuse to make a working link from a target containing them. The implementer should also follow the platform's filename rules (no `\ /:*?"<>|` on Windows, etc.).

## 9.4 Heading anchors

```md
[[Note#Heading]]            ← single heading
[[Note#H1#H2]]              ← nested heading
[[#In-current-note]]        ← heading in the current note
[[##term]]                  ← search-mode: any heading whose text contains "term"
```

When the user types `[[#` inside the current note, a list of in-note headings appears. After choosing a heading and pressing Enter, the link is inserted with the heading text as display text by default.

## 9.5 Block anchors

A block anchor is a token `^id` declared at the end of a paragraph (preceded by a space) or on its own line below a structured block. To link:

```md
[[Note#^abc123]]
[[#^abc123]]                ← same-note block link
[[^^searchterm]]            ← search across the vault for blocks matching searchterm
```

When the user types `[[Note#^` in the editor, a popover lists every block in the target note with their first line of context.

ID rules: latin letters, digits, dashes only. Auto-generated IDs are 6-character random hex.

## 9.6 Link autocomplete (linker popover)

Triggered by typing `[[`. Shows a fuzzy list of all notes (and aliases) in the vault, sorted by relevance + recency. Excluded files appear lower in the list.

Keystrokes inside the popover:
- `Up`/`Down` — move selection.
- `Enter` — insert.
- `Shift+Enter` — insert as text only without creating a link to a non-existent note (rare path).
- `Tab` — insert and continue into heading/block selection (`#` or `#^`).
- `Esc` — dismiss.

## 9.7 Display text

Wikilink: `[[Target|Display]]`. Markdown: `[Display](Target.md)`.

If the user wants the *same* display text in many places, prefer using an alias (see 9.10) rather than repeating display text.

## 9.8 Embeds

Prefix any internal link with `!`. The embed is rendered inline:

| Target | Rendered as |
|--------|-------------|
| Image (`.png`/`.jpg`/etc.) | inline image. Width / height with `\|WxH` or `\|W`. |
| Audio (`.mp3`/`.ogg`/etc.) | audio player. |
| Video (`.mp4`/etc.) | video player. |
| PDF | embedded PDF viewer. `#page=N`, `#height=N`. |
| `.md` note | full note content. |
| `.md#Heading` | the section under that heading. |
| `.md#^id` | the single block. |
| `.canvas` | embedded canvas viewport. |
| `.base` | first view of the base. `#ViewName` to pick. |
| Search results | via a `query` code block (not a `!`-link) — see 13. |

External Markdown image embeds: `![alt|width](https://example.com/foo.png)`. Width-only or width×height in the alt suffix.

Embeds use these CSS variables: `--embed-max-height`, `--embed-canvas-max-height`, `--embed-background`, `--embed-border-end`, `--embed-border-start`, `--embed-border-top`, `--embed-border-bottom`, `--embed-padding`, `--embed-font-style`. In Live Preview, hovering an embed adds `--embed-block-shadow-hover`.

## 9.9 Page preview (hover popovers)

When the *Page preview* core plugin is enabled, hovering over an internal link opens a small floating preview of the linked content. In Editing view this requires holding `Ctrl/Cmd` while hovering.

CSS: `--popover-width`, `--popover-height`, `--popover-max-height`, `--popover-font-size`, `--popover-pdf-width`, `--popover-pdf-height`. Layer `--layer-popover`.

## 9.10 Aliases

Declared in YAML:

```yaml
---
aliases:
  - AI
  - Doggo
  - Yapper
---
```

Aliases participate in:
- Quick Switcher (the alias and its underlying file both appear).
- Wikilink autocomplete (alias entries are marked with a curved-arrow icon).
- Backlinks unlinked-mention discovery (so unlinked text matching an alias is surfaced).

When an alias is chosen as a link target, the editor inserts `[[Real Name|Alias]]` (preserving the canonical target) rather than just `[[Alias]]` so the link survives without alias resolution in interoperable consumers.

## 9.11 Excluded files behavior

Files matched by *Settings → Files and links → Excluded files* are deprioritized in:
- Quick Switcher
- Link suggestions
- Backlinks unlinked-mentions
- Outgoing-links unlinked-mentions
- Search

They still exist and can still be opened explicitly.

## 9.12 Updating links on rename

When a file is renamed (or moved):

- If *Settings → Files and links → Automatically update internal links* is **on**, the app rewrites every wikilink and Markdown link target across the vault.
- If **off**, a confirmation dialog asks the user before each rewrite (or globally per-rename).

The metadata cache (see `20_file_storage.md`) is the source of truth for which files reference which targets; it must be kept in sync after every file write.

## 9.13 External links

`[Display](https://example.com)` — opens in the user's default browser unless the *Web viewer* plugin is enabled, in which case the user can configure it to open in-app instead.

`obsidian://...` URIs are also valid external links — they let one vault link to another via *Obsidian URI* (or the equivalent custom URI in the replica).

## 9.14 The `obsidian://` URI scheme

Used to open vaults and files from outside the app. Common forms:

- `obsidian://open?vault=Name&file=Path%2Fto%2FNote.md`
- `obsidian://search?vault=Name&query=...`
- `obsidian://new?vault=Name&name=...&content=...`

If implementing this in the replica, choose your own URI scheme name (not `obsidian://`) to avoid namespace collision with Obsidian itself.

## 9.15 Link rendering colors

| State | Color variable |
|-------|----------------|
| Resolved internal link | `--link-color` |
| Resolved internal link, hover | `--link-color-hover` |
| Unresolved internal link | `--link-unresolved-color` |
| External link | `--link-external-color` |
| External link, hover | `--link-external-color-hover` |

Decoration: `--link-decoration` (e.g. `underline`), `--link-decoration-hover`, `--link-decoration-thickness`. Unresolved links additionally get `--link-unresolved-opacity` and a `--link-unresolved-decoration-style` (often dashed).