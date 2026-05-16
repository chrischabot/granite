# Developer guide

This section documents how Granite is built, how to run it locally, and how to
extend or verify it. If you are a plugin author, the [Plugin SDK](../sdk/README.md)
is a better starting point; if you just want to use Granite, see the
[User guide](../user-guide/README.md).

Granite is a desktop-class web app written in TypeScript. It uses React 19 for
the UI, CodeMirror 6 for the editor, Effect 4 for core services, Vite as the
build tool, and Bun as the package manager and runtime for scripts.

## Contents

- [Architecture overview](./architecture.md) — top-level diagram, layers, and
  how the pieces fit together.
- [Repository layout](./repo-layout.md) — annotated tour of the source tree.
- [Running the servers](./running-servers.md) — Vite dev and preview servers,
  ports, LAN access, troubleshooting.
- [Build and deploy](./build-and-deploy.md) — `bun run build`, Vite config,
  static hosting, native host integration via `window.graniteHost`.
- [Web app structure](./web-app.md) — `App.tsx`, providers, overlay system,
  shell composition, views, and the workspace store.
- [Testing](./testing.md) — Vitest, Playwright/Chromium verifiers, Lighthouse
  a11y audit, Biome lint, and the standard local gate.
- [Browser verifiers](./verifiers.md) — grouped index of every `bun run verify:*`
  script, how to run one, and how to run all of them.
- [Reporting: notices, errors, recovery, debug info](./reporting.md) — every
  surface for surfacing state, errors, and diagnostics to users and developers.
- [CSS architecture and design tokens](./css-and-tokens.md) — `tokens.css`, per-
  component CSS, logical properties, themes, and snippets.
- [Internationalisation](./i18n.md) — locale registry, `t()`, direction binder,
  externalization test.
- [Contributing](./contributing.md) — verification gate, testing standard, CSS
  discipline, plugin API discipline.

## Related reference

- [Plugin API reference](../reference/plugin-api.md)
- [Vault format](../reference/vault-format.md)
- [File formats](../reference/file-formats.md)
- [Commands](../reference/commands.md)
- [Events](../reference/events.md)
- [Settings reference](../reference/settings.md)

---

[Index](../README.md) · [next →](./architecture.md)
