# Granite

Granite is a local-first, Markdown-native personal knowledge base. It stores
your notes as plain files in a folder you control, gives you fast linked-note
navigation, and keeps the app extensible through themes, snippets, and
community-style plugins.

The project is built as a desktop-class web UI with React, Vite, CodeMirror,
Effect, and plain vault files. In development it runs in the browser; packaged
or host-integrated builds can add native capabilities such as operating-system
trash integration.

## Why Granite Exists

Most note systems eventually ask you to trade ownership for convenience:
proprietary sync, opaque databases, or a single vendor's app as the only real
way to inspect your work. Granite takes the opposite position:

- Your vault is a normal folder.
- Notes are UTF-8 Markdown.
- Canvases and Bases use readable file formats.
- App state is stored beside the vault under `.granite/`.
- Existing Obsidian-style vault content can be opened without forcing a
  migration.

The goal is a capable knowledge-work environment that stays portable, fast, and
hackable.

## What Granite Can Do

Granite includes the core surfaces expected from a modern linked-thinking app:

- Vault picker and multi-vault window support.
- File explorer, folders, accepted native file formats, and configurable trash
  behavior: system trash, vault `.trash/`, or permanent deletion.
- Markdown editor with Reading, Live Preview, and Source modes.
- CommonMark, GitHub Flavored Markdown, wikilinks, embeds, callouts, math,
  Mermaid, footnotes, block IDs, tags, and YAML properties.
- Vim mode, multi-cursor editing, rectangular selection, code folding, and
  persisted fold state.
- Quick Switcher, Command Palette, configurable hotkeys, and keyboard-first
  navigation.
- Backlinks, outgoing links, outline, recents, bookmarks, tags, and properties
  sidebars.
- Search with operators, regex, property filters, match-case, sort controls,
  and embedded query blocks.
- Graph view with filters, groups, colors, display/force controls, local graph,
  and persisted state.
- Canvas files with text, file, link, and group cards; marquee selection,
  duplication, snap control, and embeds inside notes.
- Bases files with table, list, cards, and map views; formulas, summaries,
  grouping, filtering, sorting, and embedded base blocks.
- Themes, CSS snippets, light/dark/high-contrast modes, RTL support, and
  localized UI strings.
- Community plugin browser, install/enable/disable flow, plugin data
  persistence, update checks, settings tabs, status-bar items, and lifecycle
  cleanup.
- File recovery snapshots, crash/restart workspace restoration, error boundary,
  debug info, accessibility announcements, and broad browser verification.

## What Is Included In This Repo

```text
src/                 Application source
  core/              File system, vaults, metadata, parser, search, graph,
                     plugins, settings, workspace, i18n, and data services
  ui/                React shell, editor surfaces, prompts, sidebars, overlays
  styles/            Renderer CSS modules and theme tokens
scripts/             Browser and integration verifiers
docs/                User/developer docs: vault format, plugin API, contributor guide
examples/plugins/    Example plugin code and API definitions
specs/               Product and renderer reference specs
public/              Static assets used by the Vite app
```

## Documentation

The full documentation lives under [`docs/`](docs/README.md). Top-level
sections:

- [Getting started](docs/getting-started/README.md) — install, first run,
  first note, workspace tour.
- [User guide](docs/user-guide/README.md) — every Granite feature explained
  for end users: vaults, editor modes, Markdown syntax, links and embeds,
  properties and tags, Canvas, Bases, search, graph view, command palette,
  hotkeys, settings, themes and snippets, plugins, accessibility,
  troubleshooting.
- [Developer guide](docs/developer/README.md) — architecture, repo layout,
  running the dev/preview servers, build and deploy, web app structure,
  testing, browser verifiers, reporting (notices/errors/file
  recovery/debug info), CSS and design tokens, i18n, contributing.
- [Reference](docs/reference/README.md) — parameter-level reference for the
  Plugin API, vault format, file formats, commands, events, settings,
  hotkeys, and a glossary.
- [Plugin SDK](docs/sdk/README.md) — overview, quickstart, manifest,
  lifecycle, type reference, cookbook, and publishing guide.

Internal references:

- [Stable API and format specifications](specs/api) (plugin API, vault format)
- [Product specs](specs/product)
- [Renderer specs](specs/renderer)

## How It Is Built

Granite is a TypeScript application with a React UI and Effect-powered core
services.

- **Build tool:** Vite
- **Runtime/package manager:** Bun
- **UI:** React 19
- **Editor:** CodeMirror 6 plus Vim support
- **Markdown:** markdown-it, KaTeX, Mermaid, Prism
- **State and services:** Effect services, local stores, IndexedDB handle
  registry, File System Access / OPFS adapters
- **Testing:** Vitest, Playwright/Chromium browser verifiers, Lighthouse a11y
  audit, Biome linting

In a browser/dev environment Granite can open OPFS-backed vaults and, where the
browser allows it, user-picked folders through the File System Access API. A
native host can provide extra bridges such as `window.graniteHost.fs`
system-trash support.

## Requirements

- Bun
- A modern Chromium-based browser for local development and browser verifiers
- macOS, Linux, or Windows for development

The app is designed for desktop-class local use. Some browser APIs used by the
development build, especially File System Access, are not uniformly available in
all browsers.

## Install

```sh
bun install
```

## Run For Development

```sh
bun run dev
```

Vite serves the app at:

```text
http://localhost:8080
```

If port `8080` is already in use, run Vite manually with another port:

```sh
bunx vite --host 0.0.0.0 --port 8081
```

## Build And Preview

```sh
bun run build
bun run preview
```

The production build is written to `dist/`.

## First Run

1. Start the dev server with `bun run dev`.
2. Open the local URL in Chromium.
3. Choose or create a vault from the Vault Picker.
4. Start writing Markdown notes, importing files, creating canvases, or creating
   bases.

Granite writes app-owned state under `.granite/` inside the vault. Existing
`.obsidian/` folders are read for compatibility, but Granite does not need to
rewrite that folder to operate.

## Configure Granite

Open Settings from the ribbon or Command Palette. Important areas include:

- **Appearance:** theme, light/dark behavior, accent color, inline title,
  ribbon/header visibility, CSS snippets.
- **Files and links:** attachments folder, excluded files, link behavior,
  deletion mode, confirmation behavior.
- **Editor:** spellcheck, languages, Vim mode, source/live-preview behavior.
- **Hotkeys:** capture, save, reset, and assign multiple bindings.
- **Core plugins:** enable or disable built-in features.
- **Community plugins:** turn off Restricted mode, browse/install plugins,
  enable/disable installed plugins, and check for updates.
- **Plugin options:** settings pages registered by enabled plugins.

## Vaults And Files

Granite vaults are plain folders. Common files include:

```text
MyVault/
  .granite/
    workspace.json
    graph.json
    plugins/
  Notes/
    Project.md
  Board.canvas
  Tasks.base
  attachments/
    image.png
```

Granite opens:

- Markdown: `.md`
- Canvas: `.canvas`
- Bases: `.base`
- Images: `.avif`, `.bmp`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.svg`, `.webp`
- Audio: `.flac`, `.m4a`, `.mp3`, `.ogg`, `.wav`, `.webm`, `.3gp`
- Video: `.mkv`, `.mov`, `.mp4`, `.ogv`, `.webm`
- PDF: `.pdf`

## Plugins, Themes, And Snippets

Community plugins live under:

```text
.granite/plugins/<plugin-id>/
  manifest.json
  main.js
  styles.css
  data.json
```

Plugins can register commands, status-bar items, workspace events, metadata
reads, vault reads/writes, data persistence, and settings tabs. See
[docs/reference/plugin-api.md](docs/reference/plugin-api.md) and the
[Plugin SDK](docs/sdk/README.md).

Themes and snippets are normal CSS. Granite's renderer CSS is tokenized so
themes can override visual variables without patching app logic.

Security note: community plugins are third-party JavaScript. Restricted mode is
on by default for new vaults. Only enable plugins you trust.

## Quality And Verification

Run the standard local gate before committing:

```sh
bun run lint
bun run typecheck
bun run test
bun run build
git diff --check
```

Documentation checks:

```sh
bun run docs:check
bun run docs:verify-browser
```

Accessibility checks:

```sh
bun run audit:a11y
bun run audit:lighthouse-a11y
```

Browser verifiers live under `scripts/` and are exposed as `verify:*` package
scripts. Examples:

```sh
bun run verify:keyboard-browser
bun run verify:obsidian-vault-browser
bun run verify:community-plugin-browser
bun run verify:renderer-visual-browser
```

To run every audit/docs/verify script:

```sh
node - <<'NODE' | while read script; do
  echo "== $script =="
  bun run "$script" || exit $?
done
const pkg = JSON.parse(require("fs").readFileSync("package.json", "utf8"));
for (const name of Object.keys(pkg.scripts)) {
  if (
    name.startsWith("verify:") ||
    name.startsWith("audit:") ||
    name === "docs:check" ||
    name === "docs:verify-browser"
  ) console.log(name);
}
NODE
```

## Contributing

Start with [docs/developer/contributing.md](docs/developer/contributing.md).

The short version:

- Read the relevant spec or existing implementation first.
- Root-cause bugs instead of papering over symptoms.
- Add tests or browser verifiers that would have failed before the fix.
- Keep user-facing docs, API docs, and examples in sync when public behavior
  changes.
- Run the strongest relevant checks before pushing.

## Compatibility Notes

Granite is designed for interoperability with Markdown vaults and Obsidian-style
ecosystem conventions. It uses its own `.granite/` state folder while preserving
existing `.obsidian/` content. It implements compatible file formats, plugin API
concepts, theme/snippet conventions, and common linked-note workflows without
requiring a proprietary database.

## License

See [LICENSE](LICENSE).
