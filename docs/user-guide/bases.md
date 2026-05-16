# Bases

A **base** is a saved query and view configuration over your vault.
Think of it as a "database view" on top of your notes: choose which
notes to include, which properties to surface, how to sort and group
them, and which layout to use (table, list, cards, or map).

Bases are stored as plain-text `.base` YAML files, or embedded inline
in any note via a ` ```base ` code block.

## Creating a base

- **Command palette** → *Bases: Create new base* (creates a file
  next to the active note).
- **Command palette** → *Bases: Insert new base* (creates a new base
  and embeds it in the active note).
- **File explorer** → right-click a folder → *New base*.
- **Ribbon** → *Create new base*.

The new file uses the `.base` extension and opens in a Bases view tab.

## The Bases tab

Across the top is a **toolbar**:

| Button | Action |
|--------|--------|
| **View menu** | Lists every view in this base; switch view, *Add view*, *Reorder views*. |
| **Results** | *N results* button. Limit results, copy view to clipboard, export CSV. |
| **Sort** | Add and remove sort columns; group by a property. |
| **Filter** | Add filter conditions for *All views* or *This view*. |
| **Properties** | Choose which properties (columns) to display; create formulas. |
| **Search** | Inline filter within the displayed properties. |
| **New** | Create a new file matching the active filter (so the new file is auto-included). |

Below the toolbar is the active view.

## View layouts

| Layout | Description |
|--------|-------------|
| **Table** | Rows are files, columns are properties. Right-click a column header for sort, hide, rename, set type, formula. |
| **List** | Bulleted list of files. |
| **Cards** | Tile grid. The first column-image acts as the cover. |
| **Map** | Pins on an interactive map (requires the Maps plugin). |

Each view holds its own filters, sort/group, displayed-properties, and
layout-specific options. Switch views from the **View menu** in the
toolbar.

## Filters

A filter is an `and` / `or` / `not` tree of conditions. Each condition
is a property + operator + value, where the operator set depends on
the property type.

Filter scope:

- **All views** — applies to every view in the base.
- **This view** — applies only to the active view (combined with
  All-views filters via `and`).

Example YAML — notes tagged `book` AND modified in the last 30 days:

```yaml
filters:
  and:
    - file.hasTag("book")
    - file.mtime > now() - "30 days"
```

The filter UI provides a point-and-click builder; click the
*advanced* icon to drop into raw syntax for complex expressions.

## Built-in functions (selection)

| Function | Returns | Example |
|----------|---------|---------|
| `today()` | Date | Filter rows from today onward. |
| `now()` | Date+time | Combine with durations: `now() + "1h"`. |
| `date("2025-01-01")` | Date | Construct a date. |
| `file.hasTag("book")` | Boolean | Tag membership including nested tags. |
| `file.hasLink("Note")` | Boolean | Does this file link to "Note"? |
| `file.inFolder("Path")` | Boolean | Path-prefix test. |
| `link("target", "display")` | Link | Construct a link object. |
| `value.toFixed(N)` | String | Format a number to N decimals. |
| `if(cond, then[, else])` | any | Ternary. |
| `list(x)` | List | Wrap a value as a list. |

## Formulas

Define computed properties at the base level:

```yaml
formulas:
  formatted_price: 'if(price, price.toFixed(2) + " dollars")'
  ppu: "(price / age).toFixed(2)"
```

Reference them in views, filters, and other formulas as
`formula.<name>`. Self-reference is forbidden (no cycles).

## Property display

Map property names to display configuration:

```yaml
properties:
  status:
    displayName: Status
  formula.formatted_price:
    displayName: Price
  file.ext:
    displayName: Extension
```

`displayName` is used for column headers but does not affect filters
or formulas — those still reference the underlying name.

## Summaries (column aggregates)

Each Table column can show an aggregate value at its bottom:

```yaml
summaries:
  customAverage: 'values.mean().round(3)'   # define a custom

views:
  - type: table
    summaries:
      formula.ppu: Average                  # apply in this view
```

Built-in aggregate names: `Average`, `Min`, `Max`, `Sum`, `Range`,
`Median`, `Stddev`, `Earliest`, `Latest`, `Checked`, `Unchecked`,
`Empty`, `Filled`, `Unique`.

## Views section

The `views:` array defines every view. Each view has:

```yaml
views:
  - type: table
    name: My table
    limit: 100
    groupBy:
      property: note.status
      direction: ASC
    filters:
      and:
        - 'status != "done"'
    order:
      - file.name
      - file.mtime
    summaries:
      formula.ppu: Average
```

Fields recognised on every view type: `type`, `name`, `limit`,
`groupBy`, `filters`, `order` (column ordering), `summaries`. View
types may add layout-specific fields (e.g. `cards` views can specify a
cover-image property; `map` views need lat/lng property names).

## Property namespaces

Three namespaces are available in filters and formulas:

- `note.<key>` — a frontmatter property of the note. Bare `<key>`
  defaults to this namespace.
- `file.<key>` — built-in file metadata. The complete set:
  - `file.backlinks` — list of files that reference this one.
  - `file.ctime` — date created.
  - `file.embeds` — list of embedded targets.
  - `file.ext` — file extension.
  - `file.file` — the file object itself (for passing to functions).
  - `file.folder` — folder path.
  - `file.links` — list of internal links.
  - `file.mtime` — date modified.
  - `file.name` — file name.
  - `file.path` — full vault path.
  - `file.properties` — object containing every frontmatter property.
  - `file.size` — bytes.
  - `file.tags` — list of tag strings.
- `formula.<name>` — formulas declared in the base file.

### The `this` keyword

Inside a base, `this` resolves contextually:

| Context | `this` is |
|---------|-----------|
| Base opened in the main area | The base file itself. |
| Base embedded in a note or canvas | The host file. |
| Base in a sidebar | The active note in the central area. |

This lets you write per-note views — for example, embed a base in
every note that surfaces "notes linking to me":

```yaml
filters:
  and:
    - file.hasLink(this.file)
```

## Operators

| Class | Operators |
|------|-----------|
| Arithmetic | `+`, `-`, `*`, `/`, `%`, `( )` |
| Comparison | `==`, `!=`, `>`, `<`, `>=`, `<=` |
| Boolean | `!`, `&&`, `\|\|` |
| Date arithmetic | `date + "1d"`, `date - "1M"` |

Date arithmetic units: `y` `M` `d` `w` `h` `m` `s` plus the full-word
forms (`day`, `weeks`, `years`, etc.). Subtracting two Dates yields
milliseconds.

## Type system

- **Strings** — single or double quotes.
- **Numbers** — bare numeric, optionally parenthesised.
- **Booleans** — `true` / `false` unquoted.
- **Dates** — built via `date(...)`, `today()`, `now()`.
- **Lists** — declared via `list(x)` or any property of List type.
- **Objects** — index by `[key]` or dot.
- **Links** — wikilinks in YAML are auto-typed; `link("target")`
  constructs one explicitly.

## Embedding bases

Embed a base in a note like any other internal embed:

```md
![[Books.base]]              the base's first view
![[Books.base#Reading list]] a specific named view
```

Or inline a base directly inside a note via a fenced ` ```base ` code
block:

````md
```base
filters:
  and:
    - file.hasTag("book")
views:
  - type: table
    name: Table
```
````

## The "New" button

The toolbar's `+ New` button creates a new note with the active
filter's equality conditions pre-filled. For example, if the filter
is `tag == "book"`, the new note is created with
`tags: [book]` in its frontmatter, so the new file is automatically
included in the base's results. The new note opens in a new tab.

## Performance notes

Bases run over Granite's metadata cache rather than re-reading files
on every query. A vault of 50,000 notes with a typical query computes
and renders in well under a second. If your queries are slow, check
that:

- Files are not being excluded by *Excluded files* patterns that
  prevent metadata indexing.
- Your filter does not call expensive functions repeatedly — prefer
  filtering by indexed fields (`file.tags`, `file.path`, `file.mtime`,
  property names) first.

## See also

- [Properties and tags](./properties-and-tags.md) — the data Bases
  queries.
- [Markdown syntax](./markdown-syntax.md) — embedding bases inline.
- [Reference → File formats](../reference/file-formats.md) — the full
  `.base` schema.

---

[← Canvas](./canvas.md) · [Index](./README.md) · [next: Search →](./search.md)
