# 12 — Bases (database views over notes)

A **base** is a saved query and view configuration over the vault. Stored as a `.base` YAML file or embedded in any note via a fenced ` ```base ` block.

## 12.1 Creating a base

- Command palette → *Bases: Create new base* (creates beside the active file).
- Command palette → *Bases: Insert new base* (creates and embeds in the active file).
- File explorer right-click → *New base*.
- Ribbon → *Create new base*.

## 12.2 The Bases view tab

Top of the tab is a **toolbar**:

| Button | Icon | Function |
|--------|------|----------|
| View menu | `table` (or current view's icon) | Lists views, switch view, *Add view*, *Reorder views*. |
| Results | "N results" text button | Limit results, copy view to clipboard, export CSV. |
| Sort | `arrow-up-down` | Add/remove sort columns; group by a property. |
| Filter | `list-filter` | Add filter conditions for *All views* or *This view*. |
| Properties | `list` | Choose which properties (columns) to display; create formulas. |
| Search | `search` | Inline filter within the results' displayed properties. |
| New | `plus` | Create a new file matching the active filter (so the new file is auto-included). |

Below the toolbar, the active view is rendered.

## 12.3 View layouts

| Layout | Description |
|--------|-------------|
| **Table** | Rows are files, columns are properties. Right-click a column for sort, hide, rename, set type, formula. |
| **List** | Bulleted/numbered list of files. |
| **Cards** | Tile grid; first column-image acts as the cover. |
| **Map** | Pins on an interactive map (requires the Maps plugin). |

Each view holds its own filters, sort/group, displayed-properties, and layout-specific options.

## 12.4 Filters

A filter is an `and`/`or`/`not` tree of conditions. Each condition is a property + operator + value, with the operator set varying by property type.

Example: notes tagged `book` AND read in the last 30 days:

```yaml
filters:
  and:
    - file.hasTag("book")
    - file.mtime > now() - "30 days"
```

Filter scope:
- **All views** — applies to every view in the base.
- **This view** — applies only to the active view (combined with All-views filters via `and`).

The filter UI provides a point-and-click builder; an *advanced filter* button (`code-xml` icon) toggles to raw syntax for complex expressions.

## 12.5 Built-in functions (selection)

| Function | Returns | Example |
|----------|---------|---------|
| `today()` | Date | filter rows from this morning forward. |
| `now()` | Date+time | combine with durations: `now() + "1h"`. |
| `date("2025-01-01")` | Date | construct. |
| `file.hasTag("book")` | Boolean | tag membership including nested. |
| `file.hasLink("Note")` | Boolean | does the file link to "Note"? |
| `file.inFolder("Path")` | Boolean | path-prefix test. |
| `link("target", "display")` | Link | construct a link object. |
| `value.toFixed(N)` | String | format a number to N decimals. |
| `if(cond, then[, else])` | any | ternary. |
| `list(x)` | List | wrap a value as a list. |

The implementer should expose a documented function-set extension hook for plugins.

## 12.6 Formulas

Define computed properties at the base level:

```yaml
formulas:
  formatted_price: 'if(price, price.toFixed(2) + " dollars")'
  ppu: "(price / age).toFixed(2)"
```

Reference them in views, filters, and other formulas as `formula.<name>`. Self-reference is forbidden (no cycles).

## 12.7 Properties section

Maps property names to display configuration:

```yaml
properties:
  status:
    displayName: Status
  formula.formatted_price:
    displayName: Price
  file.ext:
    displayName: Extension
```

`displayName` is used for column headers but does not affect filters or formulas.

## 12.8 Summaries (column aggregates)

Per-column aggregate at the bottom of each Table column.

```yaml
summaries:
  customAverage: 'values.mean().round(3)'   # custom

views:
  - type: table
    summaries:
      formula.ppu: Average                  # apply in this view
```

Built-in aggregate names: `Average`, `Min`, `Max`, `Sum`, `Range`, `Median`, `Stddev`, `Earliest`, `Latest`, `Checked`, `Unchecked`, `Empty`, `Filled`, `Unique`.

## 12.9 Views section

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

Fields used by all view types: `type`, `name`, `limit`, `groupBy`, `filters`, `order` (column ordering), `summaries`. View-specific fields (e.g. card image source for `cards`, lat/lng property names for `map`) are stored under any other keys; plugin authors should namespace if adding new ones.

## 12.10 Property categories

Three property "namespaces" that filters and formulas may reference:

- `note.<key>` — frontmatter property of the note. Bare `<key>` defaults to this.
- `file.<key>` — built-in file metadata. The complete set:
  - `file.backlinks` (List of files referencing this one)
  - `file.ctime` (Date — created)
  - `file.embeds` (List)
  - `file.ext` (String)
  - `file.file` (File object — for use with functions)
  - `file.folder` (String — folder path)
  - `file.links` (List of internal links)
  - `file.mtime` (Date — modified)
  - `file.name` (String — file name)
  - `file.path` (String — full vault path)
  - `file.properties` (Object — every frontmatter property)
  - `file.size` (Number — bytes)
  - `file.tags` (List of tag strings)
- `formula.<name>` — formulas defined in the base file.

### `this`

Inside a base, `this` resolves contextually:

| Context | `this` is |
|---------|-----------|
| Base opened in main area | the base file itself. |
| Base embedded in a note/canvas | the host file. |
| Base in a sidebar | the active note in the central area. |

This lets filters like `file.hasLink(this.file)` create dynamic per-note views.

## 12.11 Operators

| Class | Operators |
|------|-----------|
| Arithmetic | `+`, `-`, `*`, `/`, `%`, `( )` |
| Comparison | `==`, `!=`, `>`, `<`, `>=`, `<=` |
| Boolean | `!`, `&&`, `||` |
| Date arithmetic | `date + "1d"`, `date - "1M"` (units: `y M d w h m s` plus full-word forms). |

Subtracting two Dates yields milliseconds.

## 12.12 Type system

- **Strings** — single or double quotes.
- **Numbers** — bare numeric, optionally parenthesized.
- **Booleans** — `true` / `false` unquoted.
- **Dates** — built via `date(...)`, `today()`, `now()`.
- **Lists** — declared via `list(x)` or property of List type.
- **Objects** — index by `[key]` or dot.
- **Links** — wikilinks in YAML auto-typed; `link("target")` constructs.

## 12.13 Embedding bases

```md
![[Books.base]]              the base's first view
![[Books.base#Reading list]] specific named view
```

Or inline:

```yaml
```base
filters:
  and:
    - file.hasTag("book")
views:
  - type: table
    name: Table
```
```

## 12.14 The "New" button

Pressing the toolbar's `+ New` creates a new note with the active filter's properties pre-filled (for filters that are equality conditions on properties — e.g. `tag == "book"` becomes a `tags: [book]` frontmatter entry on the new file). The new note is opened in a new tab.

## 12.15 Performance

Bases must materialize over a metadata cache; a vault of 50,000 notes with a typical query must compute and render under 250 ms. Index `file.tags`, `file.path`, `file.mtime`, and frontmatter keys.