# Properties and tags

Granite gives every note two layers of structured metadata:

- **Properties** — typed key/value pairs in the note's YAML
  frontmatter. Searchable, filterable, queryable from Bases.
- **Tags** — informal keywords, either in the body of a note or in the
  `tags:` property.

Both are plain text in the file. You can edit them by hand in any text
editor; Granite offers a friendly inline UI for properties and
autocomplete for tags.

## Properties

A property lives in the YAML frontmatter — a block fenced by `---` at
the very top of a Markdown file:

```yaml
---
title: My Note
year: 1977
date: 2025-01-01
favorite: true
tags:
  - example
aliases:
  - alt name
---
```

JSON between `---` fences is also accepted but is rewritten to YAML on
the next save.

Property **names** are case-sensitive. Property **types** are global
per name across the vault — setting `year` to type Number anywhere
makes `year` a Number type for every note in the vault.

### Property types

There are seven built-in types. Each has its own icon in the inline
editor and its own input control.

| Type | YAML form | Notes |
|------|-----------|-------|
| **Text** | `key: value` | A single line. URLs are plain text. Internal links must be quoted: `key: "[[Page]]"`. |
| **List** | hyphen-list | Each value on its own line preceded by `- `. Can mix Text, Number, and quoted internal links. |
| **Number** | `key: 1977` | Integer or decimal. No expressions. |
| **Checkbox** | `key: true` / `key: false` | Renders as a checkbox. |
| **Date** | `key: 2024-01-01` | ISO date. Picker follows the OS locale. With Daily notes enabled, dates auto-link to the matching daily note. |
| **Date & time** | `key: 2024-01-01T10:30:00` | ISO datetime. |
| **Tags** | YAML list | Special — only applies to the `tags` key. Items are tag names without `#`. |

### Default property keys

Three property names are recognised by Granite out of the box:

| Key | Type | Purpose |
|-----|------|---------|
| `tags` | Tags | Tag list for the note. |
| `aliases` | List (text) | Alternative names — see [Links and embeds](./links-and-embeds.md#aliases). |
| `cssclasses` | List (text) | CSS classes applied to the note's container, for per-note styling. |

A few optional keys are recognised by the Publish service (out of
scope in v1):

| Key | Purpose |
|-----|---------|
| `publish` | Include in published output. |
| `permalink` | Custom URL slug. |
| `description` | OpenGraph description. |
| `image` / `cover` | OpenGraph image. |

### The inline property editor

Below the YAML fence (or in place of it, depending on display mode)
sits the **inline property editor** — a UI block at the top of the
note that lets you edit properties without touching YAML.

Each row has:

- A **type icon** on the left (click to change the type).
- A **label** (the property name; click or press `Left` to edit).
- A **value editor** appropriate to the type (text, number input,
  date picker, checkbox, list editor).

A `+ Add property` button sits at the bottom.

### Keyboard shortcuts inside the property block

| Action | Hotkey |
|--------|--------|
| Add a new property | `Mod+;` |
| Focus the next / previous property | `Down` / `Up` or `Tab` / `Shift+Tab` |
| Jump from properties into the note body | `Alt+Down` |
| Edit the property name | `Left` arrow |
| Edit the property value | `Right` arrow |
| Escape edit mode (re-focus the row) | `Esc` |
| Extend selection up / down | `Shift+Up` / `Shift+Down` |
| Select all properties | `Mod+A` |
| Delete the property (or selection) | `Mod+Backspace` |
| Undo / redo | `Mod+Z` / `Mod+Shift+Z` |

When vim is on, an overlay layer adds `j`/`k` for movement, `h`/`l`
to switch between label and value, `A`/`i` to enter the value with the
caret at end or start, and `o` to create a new property below.

### Display modes

Choose how the YAML appears in the editor via *Settings → Editor →
Properties in document*:

| Mode | Behaviour |
|------|-----------|
| **Visible** *(default)* | The inline editor is rendered. The YAML source is hidden. |
| **Hidden** | The editor is hidden too. YAML is still in the file — edit via the Properties sidebar. |
| **Source** | The YAML is shown verbatim as raw Markdown with no inline editor. |

### The Properties sidebar

The Properties core plugin adds two right-sidebar tabs:

- **File properties** — a duplicate of the inline editor. Useful when
  the display mode is *Hidden*.
- **All properties** — every distinct property name in the vault,
  with its inferred type and how many notes use it. Right-click a row
  for *Rename in vault*, *Change type*, *Delete from all notes*.

### What properties cannot do

Some intentional limits:

- **No nested objects.** The inline editor handles flat key/value
  pairs only. To edit nested YAML, switch the display mode to
  *Source*.
- **No Markdown formatting in values.** Properties are atomic data,
  not rich text. Use the note body for prose.
- **No multi-note edit-in-place.** Use the All-properties view to
  rename or change types across the vault, but you cannot bulk-edit
  values on many notes at once from inside Granite.

## Tags

A **tag** is a keyword starting with `#`. Two equivalent forms:

```md
This is a note about #philosophy and #zettelkasten/method.
```

```yaml
---
tags:
  - philosophy
  - zettelkasten/method
---
```

Both forms produce the same tag — they show up in the same places and
are matched by the same search operators.

### Allowed characters

- Letters and digits.
- Underscore `_`, hyphen `-`, forward slash `/` (for nesting).
- Common Unicode characters (emoji, accented letters, CJK).

### Forbidden patterns

- All-numeric tags. `#1984` is not valid. `#y1984` is.
- Spaces. Use camelCase, PascalCase, snake_case, or kebab-case for
  multi-word tags.

### Case handling

Tags are matched case-insensitively, but the display preserves the
original casing — whichever variant was created first wins for display.

### Nested tags

A `/` separates tag levels:

```md
#inbox/to-read    is a child of #inbox
```

Behaviour:

| Surface | Behaviour |
|---------|-----------|
| Search `tag:#inbox` | Matches both `#inbox` and `#inbox/to-read`. |
| Tags view | Shows tags as a tree by default; toggle to flat in the view's overflow menu. |
| Bases `file.hasTag("inbox")` | Matches the tag and any descendant. |

### YAML caveat

The `tags` property is a Tags-typed list, **not** a Text list. The `#`
prefix is implied. Write:

```yaml
tags:
  - book
  - inbox/to-read
```

…and not:

```yaml
tags:
  - "#book"          # wrong
  - "#inbox/to-read" # wrong
```

### Finding and using tags

- **The Tags view** — left sidebar; shows every tag with its frequency.
  Click a tag to open Search prefilled.
- **Clicking a tag in the body** — searches for it across the vault.
- **The `tag:` search operator** — `tag:#meeting` finds every note
  with that tag, skipping code blocks for performance.

### Renaming a tag across the vault

Right-click a tag in the Tags view and choose *Rename in vault*.
Granite rewrites every body occurrence and every YAML `tags:` entry
in the vault. The undo is a single Ctrl-Z (limited to the current
session).

## How properties and tags relate to Bases

Properties are the data Bases queries over. Every column in a Bases
table view is either:

- A property of the underlying notes (`status`, `year`, …).
- A built-in `file.*` field (`file.name`, `file.mtime`, …).
- A formula (`formula.total_price`).

Tags are accessed via `file.tags` and the `file.hasTag("…")` helper.

See [Bases](./bases.md) for the full query language.

## See also

- [Markdown syntax](./markdown-syntax.md#properties-frontmatter) — the
  YAML grammar.
- [Bases](./bases.md) — querying over properties.
- [Search](./search.md) — the `tag:` and `[property]` operators.

---

[← Links and embeds](./links-and-embeds.md) · [Index](./README.md) · [next: Canvas →](./canvas.md)
