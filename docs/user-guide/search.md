# Search

Granite has a rich search language with operators for paths, files,
tags, properties, tasks, regex, and more. Searches happen in the
**Search** sidebar tab and can be embedded inline in notes using a
` ```query ` code block.

## Opening Search

- **Hotkey** — `Mod+Shift+F`.
- **Sidebar** — click the *Search* tab in the left sidebar.
- **From a selection** — pressing `Mod+Shift+F` with text selected in
  the editor uses that text as the initial query.

The Search panel lives in the sidebar (not a modal), so you can keep
it open while you read and edit.

## How a search runs

Granite searches:

- Note content (Markdown body).
- Filenames and paths.
- Tags (in body and frontmatter).
- Properties (frontmatter).
- Tasks (lines starting with `- [ ]` or `- [x]`).

Code blocks are excluded from `tag:` searches but included in general
content searches.

## Operator reference

Every operator is a `prefix:value` pair, optionally with parentheses
or quotes around the value.

### Basic operators

| Operator | Description | Example |
|----------|-------------|---------|
| (bare word) | Match in note content. | `meeting work` |
| `"phrase"` | Exact phrase. | `"star wars"` |
| `OR` | Disjunction. | `meeting OR call` |
| `-term` | Negation. | `-archive` |
| `( )` | Group. | `(work OR meetup) -archive` |

### Filename and path

| Operator | Description | Example |
|----------|-------------|---------|
| `file:` | Match in filename. | `file:.png` |
| `path:` | Match in vault path. | `path:"Daily/2025"` |

### Content scoping

| Operator | Description | Example |
|----------|-------------|---------|
| `content:` | Force content-only match. | `content:"happy cat"` |
| `line:` | At least one line matches. | `line:(mix flour)` |
| `block:` | Within the same block. | `block:(dog cat)` |
| `section:` | Within the same heading section. | `section:(intro)` |

### Case sensitivity

| Operator | Description | Example |
|----------|-------------|---------|
| `match-case:` | Case-sensitive match for a token. | `match-case:HappyCat` |
| `ignore-case:` | Case-insensitive (overrides global setting). | `ignore-case:ikea` |

### Tags

| Operator | Description | Example |
|----------|-------------|---------|
| `tag:` | Find a tag (skips code blocks). Includes nested. | `tag:#work` |

`tag:#inbox` also matches `#inbox/to-read` and any other descendant.

### Tasks

| Operator | Description | Example |
|----------|-------------|---------|
| `task:` | Match inside any task line. | `task:call` |
| `task-todo:` | In an unchecked task. | `task-todo:call` |
| `task-done:` | In a checked task. | `task-done:call` |

### Properties

| Operator | Description | Example |
|----------|-------------|---------|
| `[propname]` | Has this property. | `[aliases]` |
| `[propname:value]` | Property equals (sub-queryable). | `[status:Draft OR Published]` |
| `[propname:null]` | Property exists but is empty. | `[date:null]` |
| `[propname:>5]` | Range filter on numeric properties. | `[duration:>5]` |

Numeric range comparisons: `>`, `<`, `>=`, `<=`, `=`.

### Regex

| Operator | Description | Example |
|----------|-------------|---------|
| `/regex/` | JavaScript-flavoured regex. | `/\d{4}-\d{2}-\d{2}/` |

Regex flags can be appended after the closing slash: `/foo/i` for
case-insensitive.

### Operator precedence

`( )` is highest, then `-`, then `OR`, then implicit `AND`
(concatenation).

So `a b OR c` parses as `(a AND b) OR c`, and `(a OR b) -c` means *a
or b but not c*.

## Search results

Each result file appears with a count of matches. Two display modes:

| Mode | Behaviour |
|------|-----------|
| **Collapsed** | File row only, with a small chip showing the match count. |
| **Expanded** *(default)* | Each file row, then snippet rows beneath showing match context with the matched substring highlighted. |

Toggle between the two from the settings popover (sliders icon) at
the top of the Search panel.

The *Show more context* toggle expands each snippet from a single
line up to the full enclosing paragraph.

### Sort order

Six file-system orders are available:

- File name A → Z / Z → A
- Modified time, new → old / old → new
- Created time, new → old / old → new

The Search and File explorer sort selectors are independent — change
either without affecting the other.

### Result actions

Drag a result row to insert a link to that file elsewhere. Right-click
a result for:

- *Open in new tab / split / window*
- *Bookmark*
- *Copy markdown link*
- *Reveal in file explorer*

The three-dots overflow menu next to the result count offers:

- *Copy search results* — copies the result list to the clipboard.
- *Bookmark this search* — saves the query as a Bookmarks entry so it
  can be re-run with one click.
- *Replace in vault…* — a guarded vault-wide find-and-replace.

## Explain mode

The Search settings popover offers an **Explain search term** toggle.
When on, Granite shows a plain-English breakdown of the parsed query
above the results — useful for confirming you typed what you meant,
especially with nested groups and operators.

## Embedding searches in notes

Use a fenced ` ```query ` code block to embed a search inline in any
note:

````md
```query
tag:#meeting -path:Archive
```
````

The block renders an interactive results panel inside the note —
clickable, sortable, and re-evaluated whenever the metadata cache
changes.

Embedded queries are great for dashboards: a "Project A" note can
contain `tag:#project-a [status:active]` and always reflect the
current set of active sub-notes.

## Common patterns

### Everything in a folder

```
path:"Projects/Active"
```

### Notes I created this week, excluding daily notes

```
[created:>2025-01-01] -path:Daily
```

### Tasks I have not yet finished

```
task-todo:
```

### Notes that mention "API" but not "deprecated"

```
API -deprecated
```

### Markdown files with embeds

```
/!\[\[/
```

### Frontmatter with no `tags` property

```
-[tags]
```

### Notes containing the same word twice

```
/\b(\w+)\b.*\b\1\b/
```

## Performance notes

Granite's search runs over the metadata cache for properties, tags,
and links, and uses an on-the-fly text scan for content matches.

- Property and tag operators are fast — they are indexed.
- Content searches stream through files; the first results appear
  immediately but the count keeps climbing until the scan completes.
- Excluded files (configured in *Settings → Files and links →
  Excluded files*) are skipped, which keeps results focused and the
  scan fast.

## See also

- [Command palette and Quick Switcher](./command-palette.md) —
  fuzzy-find notes by name, not by content.
- [Bases](./bases.md) — saved queries with multiple view layouts.
- [Properties and tags](./properties-and-tags.md) — the metadata that
  property and tag operators search.

---

[← Bases](./bases.md) · [Index](./README.md) · [next: Graph view →](./graph.md)
