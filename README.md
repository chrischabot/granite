# Granite

Granite is a personal knowledge base that runs in your browser and keeps your notes as plain Markdown files in a folder you choose. It rebuilds the way of working that Obsidian made familiar, with wikilinks and backlinks, a live-preview editor, a graph view, canvases and database-style views, as an application whose source you can read, run and change. It is for people who keep their thinking in Markdown and want the same ownership of the tool that they already have of the files, and for developers looking for a substantial local-first web application to study or extend.

A folder of Markdown stays portable because any editor can open it, but the links, previews and views that make it useful belong to the application, and that part usually comes from a single vendor. Granite was written against a [detailed specification](specs/product/00_README.md) of Obsidian's behavior and file formats, so existing vaults open without a migration: it keeps its own state in `.granite/`, does not write to `.obsidian/`, and offers any themes it finds in `.obsidian/themes/`.

## How it works

Granite is a React single-page application with no server of its own. You grant it a folder through the browser's File System Access API, and from then on it reads and writes ordinary files there, so your notes never depend on Granite continuing to exist: you can edit them in another program while the app is open and it will pick up the changes, and you can leave with the folder at any time. Backlinks, the graph and the database views are all worked out from those files, and the app's own settings sit beside them in `.granite/`.

## Getting started

You need [Bun](https://bun.sh) and, to work with a real folder, a Chromium-based browser. Folder access depends on the File System Access API; other browsers can only create in-browser vaults, whose files you cannot reach from outside the browser.

```sh
git clone https://github.com/chrischabot/granite.git
cd granite
bun install
bun run dev
```

Open <http://localhost:8080> and choose **Pick a folder...**, pointing it at an existing vault or an empty folder. Create your first note with the **New note** button at the top of the file explorer. If port 8080 is taken, Vite stops rather than choosing another, and `bunx vite --port 8081` runs it elsewhere. The [documentation](docs/README.md) covers the rest, with a user guide, a developer guide, a reference and a plugin SDK.

There is no packaged desktop app or tagged release, so you either run Granite from source or host the build yourself. `bun run build` type-checks the project and writes a static site to `dist/`, and `bun run preview` serves it locally. Anywhere other than localhost it needs HTTPS for folder access to work. A native shell such as Electron or Tauri could wrap `dist/` and inject a bridge for moving files to the system trash, which a browser cannot do; [Build and deploy](docs/developer/build-and-deploy.md) sketches how, but the repository does not include a shell.

## What it does

- **Editing:** Reading, Live Preview and Source modes built on CodeMirror 6, with CommonMark, GitHub Flavored Markdown, callouts, math, Mermaid, footnotes, block IDs and YAML properties, plus Vim bindings, multiple cursors and folding that survives a reload.
- **Finding things:** a quick switcher, command palette, configurable hotkeys, search with operators and regex, backlinks, outgoing links, an outline, tags and bookmarks.
- **Seeing connections:** global and local graphs with filters, color groups and force controls.
- **Structured work:** `.canvas` boards in the open JSON Canvas format, and `.base` files that show notes as tables, lists, cards or maps, with formulas, summaries and grouping.
- **Files:** native views for images, audio, video and PDFs, a choice of vault `.trash/` or permanent deletion, and multiple vaults in separate windows.
- **Customization:** CSS themes and snippets, light, dark and high-contrast modes, English and Hebrew interface strings with right-to-left layout, built-in plugins such as daily notes and templates, and a plugin API.

## Themes and plugins

Themes and snippets are plain CSS, at `.granite/themes/<name>.css` and in `.granite/snippets/`. A plugin is a folder at `.granite/plugins/<id>/` with a `manifest.json` and a `main.js`, and Granite loads plugins only from there, so anything under `.obsidian/plugins/` stays dormant. Community plugins do not run until you turn off Restricted mode in Settings, and after that they have the same privileges as the app, because Granite has no plugin sandbox. Enable only code you trust.

Plugins can target Granite's own API, documented in the [Plugin SDK](docs/sdk/README.md) and shown in the [examples](examples/plugins/README.md), or be written in Obsidian's style and load through a `require("obsidian")` shim. The shim covers commands, ribbon icons, status-bar items, settings tabs, events, plugin data and basic vault operations. It does not cover the editor, `MarkdownView`, custom views, `requestUrl` or DOM helpers such as `createEl`, so many real plugins will not work, and the repository tests it with small fixtures shaped like popular plugins rather than with the plugins themselves.

The install dialog can search Obsidian's public plugin list, but installing from that list currently fails in a browser tab, because GitHub's release downloads do not allow cross-origin requests. Copy a plugin's files into its folder instead, or paste a `manifest.json` URL whose `main.js` sits beside it on a host that permits them, such as `raw.githubusercontent.com`.

## Known gaps

- The commands for a new note (`Cmd/Ctrl+N`), a new note in a new tab (`Cmd/Ctrl+Shift+N`) and reopening a closed tab (`Cmd/Ctrl+Shift+T`) show a "not yet implemented" notice.
- Folders cannot be renamed.
- The file explorer's **Rename** menu item does not update links to the note. Rename from the note's inline title, or drag the note to another folder, and Granite rewrites wikilinks and Markdown links across the vault.

Parts of the [user guide](docs/user-guide/README.md) were written from the specification and describe more than the code does today, notably the plugin marketplace.

## Technical details

Every read and write goes through one `FileSystem` service, written with [Effect](https://effect.website) 4 over browser directory handles, which can point either at a real folder opened through the File System Access API or at a private vault in the browser's Origin Private File System.

A save writes the new content to a temporary file beside the note and then moves it over the original, or, where the browser has no move call, copies it across under a commit marker. An interrupted save can leave temporary files or commit markers; the next time the vault opens, Granite warns about those leftovers and leaves them untouched. Edits made by other programs are found by polling: Granite walks the vault and compares modification times every 200 ms while files are changing, backs off to every two seconds when they are not, and stops while the tab is hidden. Those file events keep a metadata cache current, and backlinks, tags and property views read from it.

State is divided by how far it should travel. The workspace layout, graph settings, enabled plugins and a mirror of your settings live in `.granite/`, so they move with the folder. File recovery snapshots the active Markdown note's saved contents into the browser's IndexedDB, with a default five-minute interval. It prunes snapshots whose file modification time is more than seven days old. These snapshots do not follow the vault to another machine. The [architecture overview](docs/developer/architecture.md) and [vault format reference](docs/reference/vault-format.md) have the full detail.

## Development

```sh
bun run lint        # Biome
bun run typecheck   # tsgo --noEmit
bun run test        # Vitest
bun run build       # type-check, then Vite build
```

CI runs the type check, tests and build on pushes to `main` and on pull requests. Beyond those, more than 40 Playwright verifiers drive real Chromium through scenarios such as keyboard navigation, saving, vault compatibility and visual rendering. Install the browser once and run them by name:

```sh
bunx playwright install chromium
bun run verify:keyboard-browser
```

The [verifier index](docs/developer/verifiers.md) lists them all, `bun run docs:check` and `bun run audit:a11y` cover the documentation and accessibility checks, and [Contributing](docs/developer/contributing.md) describes how to work on the project. The [developer guide](docs/developer/README.md), [reference](docs/reference/README.md) and [product specification](specs/product/00_README.md) go deeper.

## The portal build

The repository also holds a separate application with nothing to do with local vaults: a read-only viewer for the wiki and activity records of Arcwell, a private system, served by a Cloudflare Worker behind Cloudflare Access. It reuses Granite's Markdown renderer but has its own code in `src/portal/` and `worker/`, and `wrangler.jsonc` binds it to one deployment's database and bucket, so it is of little use elsewhere without adapting it. `bun run build:portal` builds it, `bun run test:portal` checks the Worker, and `bun run cf:check` does a deploy dry run. `bun run deploy` also needs the `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` Worker secrets, and the Worker refuses every request until they are set.

## License and credits

Granite's original code is released under the [MIT License](LICENSE), copyright 2026 Chris Chabot. That grant does not extend to third-party material. `src/styles/obsidian-fallback.css` is a verbatim copy of Obsidian's renderer stylesheet, loaded beneath Granite's CSS so that selectors Granite does not define still resolve, and it embeds Mozilla's Apache-2.0 pdf.js styles. Other modules in `src/styles/` were synced against the same source. Those rules belong to their owners and are not offered under the MIT License.

Granite is built on React, CodeMirror, Effect, markdown-it, KaTeX, Mermaid, Prism, PDF.js, Lucide and the other packages listed in `package.json`, each under its own license, and bundles the Inter and JetBrains Mono fonts. Canvas files follow the open [JSON Canvas](https://jsoncanvas.org) format.

Obsidian is a trademark of Dynalist Inc. This project is not affiliated with, sponsored by, or endorsed by Dynalist Inc.
