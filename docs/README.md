# Granite documentation

Granite is a local-first, Markdown-native personal knowledge base. The app
ships as a desktop-class web UI (React + Vite + CodeMirror + Effect) that runs
against a folder of plain files. This `docs/` tree is the public documentation
for both users and developers.

If you are looking for the implementation-level product/renderer
specifications, those live under [`specs/`](../specs/) and are intended as
internal references rather than user-facing documentation.

## Quick links

- **New to Granite?** Start with [Getting started](./getting-started/installation.md).
- **Power user?** Browse the [User guide](./user-guide/README.md).
- **Building a plugin?** See the [Plugin SDK](./sdk/README.md) and
  [Plugin API reference](./reference/plugin-api.md).
- **Working on Granite itself?** Read the [Developer guide](./developer/README.md).

## Top-level sections

### [Getting started](./getting-started/README.md)

Install Granite, run it, choose a vault, and write your first note.

- [Installation](./getting-started/installation.md)
- [First run](./getting-started/first-run.md)
- [Your first note](./getting-started/first-note.md)
- [Workspace tour](./getting-started/workspace-tour.md)

### [User guide](./user-guide/README.md)

Everything Granite can do from the keyboard and mouse: editing, organising,
searching, visualising, and extending your vault.

- [Vaults](./user-guide/vaults.md)
- [Editor modes](./user-guide/editor.md)
- [Markdown syntax](./user-guide/markdown-syntax.md)
- [Links, embeds, and aliases](./user-guide/links-and-embeds.md)
- [Properties and tags](./user-guide/properties-and-tags.md)
- [Canvas](./user-guide/canvas.md)
- [Bases](./user-guide/bases.md)
- [Search](./user-guide/search.md)
- [Graph view](./user-guide/graph.md)
- [Command palette and Quick Switcher](./user-guide/command-palette.md)
- [Hotkeys](./user-guide/hotkeys.md)
- [Settings](./user-guide/settings.md)
- [Themes and CSS snippets](./user-guide/themes-and-snippets.md)
- [Plugins](./user-guide/plugins.md)
- [Accessibility](./user-guide/accessibility.md)
- [Troubleshooting](./user-guide/troubleshooting.md)

### [Developer guide](./developer/README.md)

How Granite is built and how to extend, run, and verify it.

- [Architecture overview](./developer/architecture.md)
- [Repository layout](./developer/repo-layout.md)
- [Running the servers](./developer/running-servers.md)
- [Build and deploy](./developer/build-and-deploy.md)
- [Web app structure](./developer/web-app.md)
- [Testing](./developer/testing.md)
- [Browser verifiers](./developer/verifiers.md)
- [Reporting: notices, errors, recovery, debug info](./developer/reporting.md)
- [CSS architecture and design tokens](./developer/css-and-tokens.md)
- [Internationalisation](./developer/i18n.md)
- [Contributing](./developer/contributing.md)

### [Reference](./reference/README.md)

Canonical, parameter-by-parameter reference for every public surface.

- [Plugin API reference](./reference/plugin-api.md)
- [Vault format](./reference/vault-format.md)
- [File formats](./reference/file-formats.md)
- [Commands](./reference/commands.md)
- [Events](./reference/events.md)
- [Settings reference](./reference/settings.md)
- [Hotkeys reference](./reference/hotkeys.md)
- [Glossary](./reference/glossary.md)

### [Plugin SDK](./sdk/README.md)

Build, package, and ship community plugins.

- [SDK overview](./sdk/overview.md)
- [Quickstart](./sdk/quickstart.md)
- [Manifest](./sdk/manifest.md)
- [Lifecycle](./sdk/lifecycle.md)
- [Type reference](./sdk/types.md)
- [Cookbook](./sdk/cookbook.md)
- [Publishing](./sdk/publishing.md)

## Where things live

```text
docs/
  getting-started/   First-run install, vault setup, intro tour
  user-guide/        Feature-by-feature end-user documentation
  developer/         Contributor and integrator documentation
  reference/         Parameter-level API and format reference
  sdk/               Plugin author guide and recipes
specs/
  api/               Stable API/format specifications (plugin API, vault format)
  product/           Product surface specifications (per area)
  renderer/          Renderer/CSS specifications (per component)
```

## Conventions

- Code paths look like `src/core/plugins/types.ts`.
- Hotkeys use `Cmd` on macOS and `Ctrl` on Windows/Linux. The neutral
  `Mod` modifier means "`Cmd` on macOS, `Ctrl` everywhere else".
- File-extension lists use lowercase (`.md`, `.canvas`, `.base`).
- Bash commands assume `bun` is installed.
