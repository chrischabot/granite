# Granite Vault Format

Granite vaults are plain folders. User notes, attachments, canvases, and bases
remain directly inspectable with normal file tools.

## Layout

Granite writes app-owned state under `.granite/`. Existing Obsidian vaults may
also contain `.obsidian/`; Granite must read the content without migrating or
rewriting that folder during open.

```text
MyVault/
  .granite/
    workspace.json
    graph.json
    plugins/
      example-plugin/
        manifest.json
        main.js
        data.json
  .obsidian/
    app.json
    appearance.json
  Notes/
    Project.md
  Board.canvas
  Tasks.base
  attachments/
    image.png
```

## Accepted Files

Granite opens Markdown (`.md`), JSON Canvas (`.canvas`), Bases (`.base`),
images (`.avif`, `.bmp`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.svg`, `.webp`),
audio (`.flac`, `.m4a`, `.mp3`, `.ogg`, `.wav`, `.webm`, `.3gp`), video
(`.mkv`, `.mov`, `.mp4`, `.ogv`, `.webm`), and PDF (`.pdf`). Other files may
be shown and linked when the user chooses to show all file types.

## Markdown

Markdown files are UTF-8 text. Granite preserves readable Markdown syntax,
frontmatter, wikilinks, embeds, block IDs, tags, callouts, math, Mermaid code
blocks, tasks, and footnotes. Frontmatter is parsed as YAML and may be rewritten
as YAML when the user edits properties.

## JSON Canvas

`.canvas` files use the published JSON Canvas shape: top-level `nodes` and
`edges` arrays. Granite accepts text, file, link, and group nodes. Unknown fields
are ignored during parsing so files from other conforming apps remain openable.

## Bases

`.base` files are YAML. Granite supports table, list, cards, and map views,
filters, sort order, grouping, summaries, and formulas. Visual edits serialize
back to YAML that can be reopened as text.

## Plugin Data

Community plugins live under `.granite/plugins/<plugin-id>/`. Each plugin has a
`manifest.json`, `main.js`, optional `styles.css`, and plugin-owned `data.json`
written by `saveData()`.

## Safety

File writes use the FileSystem adapter's Atomic write path. Deleted files honor
the configured trash behavior: system trash, vault `.trash/`, or permanent
delete.
