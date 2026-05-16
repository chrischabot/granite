# File formats

Granite reads and writes three first-class file types from the vault: plain
Markdown, JSON Canvas (`.canvas`), and Bases (`.base`). This page documents
the on-disk schema for each.

## Markdown (`.md`)

UTF-8, no BOM. Granite preserves the exact bytes for everything it does not
recognise. Recognised constructs:

```md
---
title: Example
tags: [draft, sample]
created: 2026-05-16
---

# Heading

A paragraph with a [[wikilink]] and an ![[embed.png]] and a #tag.

> [!note] Callout title
> Body of the callout.

- A task with a [[link]] inside.
- A nested item.

Some text. ^block-id
```

| Construct | Source | Notes |
|-----------|--------|-------|
| YAML frontmatter | `src/core/metadata/frontmatter.ts` | A single `---`-delimited block at the top. Keys become "Properties". |
| Wikilink `[[target]]` | parser in `src/core/metadata/parser.ts` | Resolved against vault paths and titles. `[[target#heading]]` and `[[target#^block-id]]` are supported. |
| Embed `![[asset]]` | parser | Same resolution as wikilink. Images, audio, video, and PDFs render inline. |
| Tag `#tag/sub` | parser | Hierarchical via `/`. `settings.showNestedTags` controls whether the tag pane shows them as a tree. |
| Block id `^id` | parser | Trailing block reference at the end of a line. |
| Callout `> [!kind]` | `src/markdown/callout.ts` | Same kinds as Obsidian: `note`, `info`, `tip`, `warning`, `error`, `important`, etc. |

See `docs/user-guide/markdown-syntax.md` for the user-facing reference.

## Canvas (`.canvas`)

JSON Canvas — schema lives in `src/core/canvas/schema.ts`. The on-disk shape:

```ts
interface Canvas {
  readonly nodes: ReadonlyArray<CanvasNode>;
  readonly edges: ReadonlyArray<CanvasEdge>;
}

type CanvasNode = TextNode | FileNode | LinkNode | GroupNode;

interface BaseNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color?: string; // "1".."6" or any CSS-ish string
}

interface TextNode extends BaseNode { readonly type: "text"; readonly text: string; }
interface FileNode extends BaseNode { readonly type: "file"; readonly file: string; readonly subpath?: string; }
interface LinkNode extends BaseNode { readonly type: "link"; readonly url: string; }
interface GroupNode extends BaseNode {
  readonly type: "group";
  readonly label?: string;
  readonly background?: string;
  readonly backgroundStyle?: "cover" | "ratio" | "repeat";
}

interface CanvasEdge {
  readonly id: string;
  readonly fromNode: string;
  readonly toNode: string;
  readonly fromSide?: "top" | "right" | "bottom" | "left";
  readonly toSide?: "top" | "right" | "bottom" | "left";
  readonly fromEnd?: "none" | "arrow";
  readonly toEnd?: "none" | "arrow";
  readonly color?: string;
  readonly label?: string;
}
```

`parseCanvas(raw)` drops malformed entries (missing `id`, missing `type`,
unknown `type`, missing `fromNode` / `toNode`). Default sizes when a node
omits them: `width = 200`, `height = 80`. Missing `x` / `y` fall back to 0.

Empty / unparseable input parses to:

```json
{ "nodes": [], "edges": [] }
```

Example minimal canvas:

```json
{
  "nodes": [
    { "id": "a", "type": "text", "x": 0, "y": 0, "width": 200, "height": 80, "text": "Hello" },
    { "id": "b", "type": "file", "x": 400, "y": 0, "width": 240, "height": 200, "file": "Notes/Welcome.md" }
  ],
  "edges": [
    { "id": "e1", "fromNode": "a", "toNode": "b", "fromSide": "right", "toSide": "left", "toEnd": "arrow" }
  ]
}
```

`serializeCanvas(canvas)` pretty-prints with `JSON.stringify(canvas, null, 2)`
and appends a trailing newline. `newCanvasId()` produces a 16-char hex id
suitable for new nodes / edges.

## Base (`.base`)

YAML — schema in `src/core/bases/schema.ts`. A base configures a query over
the vault and a way to view the results.

```ts
interface BaseConfig {
  readonly name: string;
  readonly filter: string;
  readonly columns: ReadonlyArray<ColumnKey>;
  readonly sort: ColumnKey;
  readonly sortOrder: "asc" | "desc";
  readonly view: "table" | "list" | "cards" | "map";
  readonly mapLatitude: ColumnKey;
  readonly mapLongitude: ColumnKey;
  readonly groupBy?: ColumnKey;
  readonly summaries: ReadonlyArray<SummarySpec>;
  readonly formulas: Readonly<Record<string, string>>;
}

type ColumnKey =
  | "file.name"
  | "file.path"
  | "file.modified"
  | "file.created"
  | "file.size"
  | "tags"
  | (string & {}); // frontmatter property keys

interface SummarySpec {
  readonly column: ColumnKey;
  readonly op: "count" | "sum" | "avg" | "min" | "max" | "median";
  readonly label?: string;
}
```

Defaults (from `DEFAULT_BASE`):

| Field | Default |
|-------|---------|
| `name` | `""` |
| `filter` | `""` |
| `columns` | `["file.name", "file.path", "file.modified", "tags"]` |
| `sort` | `"file.name"` |
| `sortOrder` | `"asc"` |
| `view` | `"table"` |
| `mapLatitude` | `"lat"` |
| `mapLongitude` | `"lng"` |
| `summaries` | `[]` |
| `formulas` | `{}` |

Example `.base`:

```yaml
name: "Active projects"
filter: 'path:Projects/ tag:#active'
columns:
  - file.name
  - status
  - due
  - tags
sort: due
sortOrder: asc
view: table
groupBy: status
summaries:
  - column: file.name
    op: count
    label: Projects
formulas:
  overdue: 'due < today()'
```

The parser fills in defaults for any missing key. Unknown `view` values fall
back to `"table"`. Unknown `op` values are dropped from `summaries`.
`serializeBaseConfig` writes back YAML without preserving comments.

## See also

- [Vault format](./vault-format.md) for the directory layout that holds these files.
- [User guide → Canvas](../user-guide/canvas.md) and
  [User guide → Bases](../user-guide/bases.md) for the editing experience.

[← vault format](./vault-format.md) · [Index](./README.md) · [commands →](./commands.md)
