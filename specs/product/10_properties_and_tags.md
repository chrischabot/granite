# 10 — Properties and tags

## 10.1 Properties: storage

Properties live in the YAML frontmatter at the top of a `.md` file:

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

JSON between `---` fences is also accepted and rewritten as YAML on save.

Property *names* are case-sensitive. Property *types* are global per name across the vault: setting `year` to type Number anywhere makes `year` a Number type for all notes — the All-properties view enforces and edits this.

## 10.2 Property types

Seven built-in types. Each type icon is a Lucide glyph shown next to the property name in the inline editor.

| Type | YAML form | Icon | Notes |
|------|-----------|------|-------|
| **Text** | `key: value` | `text` | Single line. URLs supported as plain text. Internal links must be quoted: `key: "[[Page]]"`. |
| **List** | hyphen-list | `list` | Each value on its own line preceded by `- `. Items can mix Text, Number, internal links (quoted). |
| **Number** | `key: 1977` | `binary` | Integer or decimal. No expressions. |
| **Checkbox** | `key: true` / `key: false` | `check-square` | Renders a checkbox in the inline editor. |
| **Date** | `key: 2024-01-01` | `calendar` | ISO date. Picker follows OS locale. With *Daily notes* enabled, dates auto-link to the matching daily note. |
| **Date & time** | `key: 2024-01-01T10:30:00` | `calendar-clock` | ISO datetime. |
| **Tags** | YAML list | `tags` | Special — only applies to the `tags` key. Items are tag names without `#`. |

## 10.3 Default property keys

| Key | Type | Purpose |
|-----|------|---------|
| `tags` | Tags | Tag list for the note. |
| `aliases` | List (text) | Alternative names for the note. |
| `cssclasses` | List (text) | CSS class names that get applied to this note's container, allowing per-note styling. |

### Optional default keys (used by the Publish service)

| Key | Purpose |
|-----|---------|
| `publish` | Whether to include the note in published output (`true` / `false`). |
| `permalink` | Custom URL slug. |
| `description` | Used for OpenGraph link previews. |
| `image` / `cover` | OpenGraph image. |

### Deprecated singular forms (for migration)

`tag`, `alias`, `cssclass` — these used to be accepted singular variants. They are no longer treated as Default properties as of v1.9. The Format Converter plugin migrates them to the plural forms.

## 10.4 The inline property editor

Sits at the top of the note (between any frontmatter fence and the first heading). Visibility controlled by *Settings → Editor → Properties in document* (Visible / Hidden / Source).

### Layout

A list of property rows, each containing:

| Region | Content |
|--------|---------|
| Type icon | Click to switch type. |
| Label | The property name. Click or press Left arrow to edit. |
| Value editor | Type-specific input. Press Right arrow to focus. |

A trailing **+ Add property** button below the list.

### Keyboard shortcuts inside the property block

| Action | Hotkey |
|--------|--------|
| Add new property | `Cmd/Ctrl+;` |
| Focus next property | `Down` or `Tab` |
| Focus previous property | `Up` or `Shift+Tab` |
| Jump from properties to editor body | `Alt+Down` |
| Edit property name | `Left` arrow |
| Edit property value | `Right` arrow |
| Focus property (escape edit) | `Escape` |
| Extend selection up | `Shift+Up` |
| Extend selection down | `Shift+Down` |
| Select all | `Cmd/Ctrl+A` |
| Delete property (or selection) | `Cmd/Ctrl+Backspace` |
| Undo / redo | `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` |

Vim-bindings overlay (when Vim is enabled): `j`/`k` move; `h`/`l` focus key/value; `A`/`i` enter value with cursor at end/start; `o` create new property below.

### Display modes

| Mode | Behavior |
|------|----------|
| Visible | Inline editor is rendered; YAML hidden. |
| Hidden | Editor hidden; YAML still present in source — edit via the Properties side panel. |
| Source | YAML shown verbatim with no inline editor at all. |

## 10.5 What properties cannot do (intentional limits)

- **Nested objects** — only flat key/value pairs in the inline editor. Use Source mode to edit nested YAML.
- **Markdown formatting in values** — properties are atomic data, not rich text.
- **Bulk edit across many notes** — provide via the Properties view's *Rename property* / *Change type* actions, but multi-note edit-in-place is out of scope.

## 10.6 Properties via the Properties view core plugin

Two sidebar tabs (described in §5):
- **File properties** — duplicate of the inline editor; useful when display mode is Hidden.
- **All properties** — every distinct property name in the vault with its inferred type and frequency. Right-click → *Rename in vault*, *Change type*, *Delete from all notes*.

CSS for the inline editor (selection from `--metadata-*` variables): `--metadata-background`, `--metadata-padding`, `--metadata-border-color/width/radius`, `--metadata-gap`, `--metadata-divider-color`, `--metadata-property-padding`, `--metadata-property-radius`, `--metadata-property-background`, `--metadata-label-text-color`, `--metadata-label-font-size`, `--metadata-label-font-weight`, `--metadata-label-width`, `--metadata-input-height`, `--metadata-input-text-color`, `--metadata-input-font-size`, `--metadata-input-background`. Hover and active variants exist on each.

## 10.7 Tags

Two equivalent ways to attach a tag to a note:

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

### Allowed characters

- ASCII letters and digits.
- Underscore `_`, hyphen `-`, forward slash `/` (for nesting).
- Common Unicode (emoji, accented letters, etc.).

### Forbidden patterns

- All-numeric tags (`#1984` is invalid; `#y1984` is fine).
- Spaces. Use camelCase / PascalCase / snake_case / kebab-case for multi-word.

### Case handling

Tags are matched case-insensitively. Display preserves the original casing (whichever one was created first).

### Nested tags (`/`-separated)

`#inbox/to-read` is a child of `#inbox`. Behaviors:

| Surface | Nesting behavior |
|---------|------------------|
| Search `tag:inbox` | Matches both `#inbox` and `#inbox/to-read`. |
| Tags view | Shows hierarchy as a tree (toggleable). |
| Bases `file.hasTag("inbox")` | Matches `#inbox` and any descendant. |

### Search and filter

- `tag:#tagname` operator — matches a tag explicitly. Faster than full-text because it ignores code blocks.
- Click a tag in the body of a note to search for it.
- Click a tag in the Tags view to open Search prefilled.

### YAML caveat

The `tags` property is a Tags-typed list, **not** a Text list. The `#` prefix is implied; do not write `- #book` in YAML, write `- book`.