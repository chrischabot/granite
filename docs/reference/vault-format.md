# Vault format

A Granite vault is a plain folder of files on disk (or a sandboxed OPFS root
in the browser). There is no proprietary database — every note is a `.md`
file you can open in any editor. This page describes the directory layout
Granite expects, the `.granite/` configuration files it owns, which file
extensions are recognised, and how writes / deletes are performed safely.

## Vault root

A vault is identified by its **root directory**. Granite mounts the root via
one of two adapters (see `PluginVaultInfo.kind`):

- `fsa` — File System Access API. The user picked a real folder; Granite has
  permission to read and write everything underneath it.
- `opfs` — Origin Private File System. A browser-private sandbox keyed by
  origin. Useful for demos and unsupported browsers, but the user cannot
  access these files outside Granite.

Everything outside the vault root is **invisible** to Granite — including to
plugins. There is no way to read or write outside the root.

## Directory layout

```text
<vault root>/
  My Notes/
    daily/
      2026-05-16.md
    Projects/
      Granite.md
      attachments/
        diagram.png
        recording.m4a
  inbox.md
  .trash/                       ← only when "deleted files → vault" is active
    inbox.md
  .granite/                     ← all of Granite's per-vault state lives here
    workspace.json
    graph.json
    settings.json
    types.json
    active-theme.json
    snippets-enabled.json
    plugins-enabled.json
    plugins/
      <plugin-id>/
        manifest.json
        main.js
        styles.css
        data.json
```

Hidden folders (any starting with `.`) are skipped by every vault listing
except the explicit `.granite/` consumer paths. `.trash/` is treated as a
regular directory by the filesystem layer, but the file explorer hides it
when the `Show hidden files` setting is off.

### Obsidian compatibility (`.obsidian/`)

Granite reads vaults that already contain an `.obsidian/` configuration
folder without migrating or rewriting that folder. The two state folders
coexist: Granite writes everything it owns under `.granite/`, leaves
`.obsidian/` alone, and never depends on Obsidian-specific files. Opening
the same vault later in Obsidian remains lossless.

## Accepted file extensions

Source: `src/core/fs/file-formats.ts` — `NATIVE_FILE_EXTENSIONS`.

| Kind | Extensions |
|------|-----------|
| `markdown` | `md` |
| `canvas` | `canvas` |
| `base` | `base` |
| `image` | `avif`, `bmp`, `gif`, `jpeg`, `jpg`, `png`, `svg`, `webp` |
| `audio` | `3gp`, `flac`, `m4a`, `mp3`, `ogg`, `wav` |
| `video` | `mkv`, `mov`, `mp4`, `ogv`, `webm` |
| `pdf` | `pdf` |

Anything else is treated as an opaque file: visible in the explorer, but the
"open in tab" flow falls back to a download / web viewer instead of a native
view. Extension matching is case-insensitive with the leading dot stripped.

## `.granite/` configuration files

Every file inside `.granite/` is written by `writeConfigJson` (see
`src/core/vault/granite-config.ts`): pretty-printed JSON, atomic write,
parent directory created idempotently.

| File | Owner | Shape | Purpose |
|------|-------|-------|---------|
| `settings.json` | `src/core/settings/store.ts` | `UserSettings` | Mirror of the user-settings localStorage key `granite.settings.v1`. |
| `workspace.json` | `src/core/workspace/persist.ts` | `{ version: 2, updatedMs, snapshot }` | Tab layout, active leaf per group, columns. v2 envelope; older bare-snapshot files are still accepted on read. |
| `graph.json` | `src/core/graph/store.ts` | `GraphConfig` | Graph view filters, group rules, last layout. |
| `types.json` | `src/core/metadata/type-registry.ts` | `Record<string, PropertyType>` | Per-property type assignments for the Properties view. |
| `active-theme.json` | `src/core/themes/loader.ts` | `string \| null` | Vault-relative path of the active `.css` theme, or null. |
| `snippets-enabled.json` | `src/core/snippets/loader.ts` | `string[]` | Filenames in `.granite/snippets/` that the user has switched on. |
| `plugins-enabled.json` | `src/core/plugins/loader.ts` | `string[]` | Plugin ids currently enabled in this vault. |
| `plugins/<id>/manifest.json` | the plugin | `PluginManifest` | Required for the loader to recognise the plugin. |
| `plugins/<id>/main.js` | the plugin | CommonJS module | The plugin code. Filename overridable via `manifest.main`. |
| `plugins/<id>/styles.css` | the plugin | CSS | Optional. Loaded into the document head when the plugin is enabled (via the obsidian-shim Style B). |
| `plugins/<id>/data.json` | the plugin | any JSON | Written by `api.saveData(...)`. |

Each store also keeps a `localStorage` mirror (`granite.settings.v1`,
`granite.workspace.last.<vaultId>`, `granite.plugins.enabled.v1:<vaultId>`,
etc.) so the UI hydrates instantly while the disk read is in flight. The
disk file is the source of truth on first launch; subsequent writes update
both.

## Markdown encoding

- UTF-8, no BOM.
- LF or CRLF line endings — Granite preserves whatever was on disk when
  rewriting.
- YAML frontmatter is a contiguous `---`-delimited block at the very top of
  the file. The frontmatter parser lives in `src/core/metadata/frontmatter.ts`.
- Wikilinks (`[[target]]`), embeds (`![[asset.png]]`), tags (`#tag/sub`),
  and block IDs (`^block-id`) follow CommonMark+ syntax described in the
  [Markdown syntax guide](../user-guide/markdown-syntax.md).

## `.canvas` files

JSON Canvas. Schema in `src/core/canvas/schema.ts`. A canvas is a
`{ nodes, edges }` object — see [File formats](./file-formats.md#canvas) for
the exact shapes.

## `.base` files

YAML. Schema in `src/core/bases/schema.ts`. A base is a query, a list of
columns, optional summaries / formulas, and a view type
(`table | list | cards | map`). See [File formats](./file-formats.md#base).

## Plugin Data

Plugins persist arbitrary JSON via `api.saveData(data)` →
`.granite/plugins/<id>/data.json`. The data store creates `.granite/plugins/<id>/`
idempotently and writes atomically. Reads use `api.loadData()` and return
`null` on missing-or-unparseable input.

## Atomic writes

`FileSystem.writeText` / `writeBytes` follow the same protocol regardless of
adapter: write the new content to a temp sibling (typically the same
directory, with a temp-marker suffix), then `rename` over the target. If the
process is killed mid-write the original is left intact.

If a previous run died after writing the temp file but before the rename,
the temp file is detected and cleaned up on the next vault open by
`src/core/fs/orphan-temp.ts`.

## Trash modes

Source: `src/core/fs/trash.ts`. `deleteVaultPath(path, mode)`.

| Mode | Behaviour |
|------|-----------|
| `system` | Move to the OS trash / recycle bin. Requires the adapter to support `FileSystem.moveToSystemTrash`. Browser File System Access does not expose this capability, so the call fails with `FsUnsupported` rather than silently falling back to permanent deletion. |
| `vault` | Move to `<vault>/.trash/`, preserving the relative path. On collision, suffixes `path 1.ext`, `path 2.ext`, … up to 999. Paths already inside `.trash/` are removed permanently. |
| `permanent` | `FileSystem.remove(path)` — no trash, no recovery. |

The active mode comes from `settings.deletedFiles`, default `system`.

## File watching

`FileSystem.watch(handler)` returns a disposer; the handler runs on the
JS event loop with one of the events documented in `src/core/fs/types.ts`.
Granite's stores (workspace, graph, metadata cache, plugin loader) wire
watchers as part of `bindPlugins` / `bindSettings` / similar.

The plugin loader treats events under `.granite/plugins/<id>/` as a
re-bind trigger: changes are debounced 250 ms and then trigger
`refreshAll()`, which re-reads every manifest and reloads / unloads plugins
whose enabled status or files have changed.

## Cross-vault uniqueness

Vault ids (`PluginVaultInfo.id`) are stable per origin / per folder handle.
Plugin enabled-sets are stored per vault: `granite.plugins.enabled.v1:<vaultId>`
in localStorage and `.granite/plugins-enabled.json` in that vault. Enabling a
plugin in vault A does not enable it in vault B.

## See also

- [File formats](./file-formats.md) for the on-disk schemas of `.md`,
  `.canvas`, and `.base`.
- [Settings reference](./settings.md) for every key in `settings.json`.
- [User guide → Vaults](../user-guide/vaults.md) for end-user workflows.

[← plugin-api](./plugin-api.md) · [Index](./README.md) · [file formats →](./file-formats.md)
