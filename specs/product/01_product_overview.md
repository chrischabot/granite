# 01 — Product overview

## What the app is

A local-first, file-based personal knowledge management (PKM) and note-taking application. The user's content lives entirely on disk as plain text Markdown files inside a folder called a **vault**. The app reads, writes, indexes, and displays those files; it never depends on a server and never leaves the user's device unless the user enables an optional sync service.

## Core value propositions

1. **Your data is yours.** Notes are plain `.md` files under the user's control; the app holds no proprietary database. The vault is portable — it can be opened by any text editor.
2. **Linked thinking.** First-class support for `[[wikilink]]`-style references between notes, plus block-level (`#^id`) and heading-level (`#H`) anchors, plus a graph visualization.
3. **Extensibility.** A core feature set is delivered as togglable "core plugins"; everything else is accomplished through community plugins (third-party JavaScript) and themes/snippets (CSS).
4. **Markdown-native authoring.** All formatting is standard Markdown (CommonMark + GitHub Flavored Markdown) plus a small set of additive extensions described in `07_markdown_syntax.md`.
5. **Offline-by-default; opt-in sync and publish.** No account is required. Optional paid services synchronize a vault end-to-end encrypted, or publish selected notes to the web.

## Target platforms

Primary target for the replica's v1: **macOS, Windows, Linux desktop**, built as a native window with a web-tech UI layer (Electron / Tauri / equivalent). All examples in this spec assume the desktop layout. A mobile companion is out of scope for v1 but should be designable (the original ships iOS, iPadOS, and Android).

There is **no web app** — the app must run locally so that it can read and write files on the user's filesystem.

## Top-level feature surface

- Multiple vaults, each opened as a separate window. A **Vault switcher** at the bottom of the left sidebar manages, creates, opens, renames, and removes vaults from the user's list.
- **Editor** with three modes: *Reading view*, *Live Preview* (Markdown with inline rendered formatting), and *Source mode* (raw Markdown). See `06_editor_modes.md`.
- **Tabs and tab groups** in the central area, splittable horizontally or vertically, plus pop-out windows.
- **Ribbon** down the far left side hosting commonly used commands.
- **Two collapsible sidebars** holding tab groups of utility panes (file explorer, search, outline, backlinks, etc.).
- **Status bar** in the bottom right with informational chips (word count, sync status, editing-mode toggle, etc.).
- **Quick switcher** (`Ctrl/Cmd+O`) to fuzzy-find and open notes by filename or alias.
- **Command palette** (`Ctrl/Cmd+P`) to fuzzy-find and run any registered command.
- **Search** with a rich operator language (path/file/tag/line/block/section/task/property operators, regex, case-sensitivity toggle, sort order). Searches can be embedded in notes via `query` code blocks.
- **Internal linking** via `[[wikilink]]` or Markdown `[text](url)`; aliases via `aliases:` property; block (`^id`) and heading anchors.
- **Graph view** (global and local) with adjustable forces, color groups, filters, animation.
- **Bases**: database-style table/list/cards/map views over notes filtered and sorted by their YAML properties. `.base` files store the view definition.
- **Canvas**: an infinite 2D drawing/idea space storing data as `.canvas` (JSON Canvas) files.
- **Properties** (YAML frontmatter) with typed values (Text, List, Number, Checkbox, Date, Date & time, Tags) and an inline editor at the top of the note.
- **Tags** with `#tag` syntax in body or in YAML, hierarchical via `/` (e.g. `#inbox/to-read`).
- **Daily notes** keyed by date with optional template and configurable folder.
- **Templates** with `{{title}}`, `{{date}}`, `{{time}}`, and Moment.js format strings.
- **Bookmarks** of files, folders, headings, blocks, searches, graphs, and links, optionally organized into bookmark groups.
- **Workspaces** that capture the current layout and let the user switch between named layouts.
- **Hotkeys** customizable for any command; default set documented in `17_hotkeys_reference.md`.
- **Themes and CSS snippets**: full styling extensibility through standard CSS variables documented in `18_design_tokens.md` and `19_component_styling.md`.
- **Community plugins** loadable from a registry, gated behind a "Restricted mode" toggle for security.
- **File recovery** core plugin maintaining periodic on-disk snapshots outside the vault.
- **Importer** community plugin for migrating from other tools (Notion, Roam, Bear, Apple Notes, etc.) — out of scope for v1 of the replica unless explicitly requested.
- **Web Clipper** browser extension — out of scope for v1.

## Non-goals (for the replica's first cut)

- Cloud sync, mobile apps, the web clipper, the publishing service, the headless CLI client. These are described elsewhere in this spec as reference, but the v1 replica does not need them. Local file storage is the only required persistence target.

## Design principles to internalize

These principles guide every UX decision and should bias judgement calls during implementation:

1. **Plain text wins.** Never invent a binary format where a text format works. Anything stored in the vault must remain editable in any text editor.
2. **Be unsurprising about Markdown.** Don't break standards. Where Obsidian extends Markdown (block IDs, embeds, callouts, properties), do it as additively as possible so files remain portable.
3. **Don't dictate the user's structure.** Folders, tags, and links are alternatives, not a single mandated hierarchy.
4. **Keyboard-first.** Every important action must be doable from the keyboard, via the command palette and hotkeys.
5. **Speed over polish.** Prioritize sub-100 ms response on common interactions in vaults of 10k+ notes. The Quick Switcher and metadata cache in particular must remain fast at scale.
6. **Match the OS.** Native menus, OS-style cursors (arrow not pointer for buttons), system spellcheck on macOS, system file dialogs everywhere.
7. **Themable everything.** No hard-coded colors or sizes inside components; only CSS variables. A theme should be able to restyle the entire app by overriding variables alone.