# Repository layout

This is a tour of the top-level directories and the most important
subdirectories in the Granite repository. Paths are relative to the repo root.

## Top level

```text
granite/
├── src/                  Application source (TypeScript + React)
├── scripts/              Browser verifiers and audit scripts
├── specs/                Product and renderer specifications
├── docs/                 Public documentation (this tree)
├── examples/             Example plugin code and API d.ts
├── public/               Static assets bundled by Vite
├── dist/                 Production build output (generated)
├── index.html            Vite entry point
├── vite.config.ts        Vite + Vitest configuration
├── tsconfig.json         TypeScript configuration
├── biome.json            Biome lint / format configuration
├── package.json          Scripts and dependencies
├── bun.lock              Resolved dependency lockfile
├── README.md             Project overview
├── PLAN.md / STATUS.md   Internal planning and status notes
└── LICENSE
```

## `src/`

```text
src/
├── App.tsx               Root component: providers, binders, shell, prompts, overlays
├── main.tsx              ReactDOM.createRoot entry
├── vite-env.d.ts         Vite ambient types
├── core/                 Non-React core services
├── ui/                   React surfaces
├── styles/               CSS modules and design tokens
└── test/                 Shared test setup (happy-dom, mocks)
```

### `src/core/` — services

```text
core/
├── a11y/                 a11yAnnouncer + icon-button audit
├── app/                  version.ts (APP_VERSION = "0.1.0-dev")
├── bases/                .base file parser, query engine, views
├── canvas/               .canvas parser and store
├── commands/             CommandRegistry singleton + createCommandRegistrar
├── compat/               Obsidian compatibility shims and detection
├── dnd/                  Drag-and-drop state and helpers
├── docs/                 Public-docs test (docs:check entry)
├── effect/               Effect 4 runtime helpers and Layer wiring
├── errors/               reporter.ts — reportCapturedError, subscribeErrorReports
├── fs/                   FileSystem service, atomic writes, native-trash
│                         bridge, path helpers, file-formats, trash policy
├── graph/                Graph layout engine and persistence
├── i18n/                 t(), registerLocale, direction, date-format, locales
├── links/                Wikilink/embed resolution and backlinks
├── markdown/             markdown-it pipeline, KaTeX, Mermaid, Prism wiring
├── metadata/             cache, frontmatter parser, type-registry
├── notices/              noticeManager singleton (notice.ts)
├── perf/                 startup + typing-budget instrumentation
├── plugins/              PluginApi types, loader, host-registries,
│                         events, data-store, community-registry,
│                         update-check, obsidian-shim
├── plugins-core/         Built-in plugins (daily-notes, templates,
│                         file-recovery, debug-info, format-converter,
│                         web-viewer, tag-rename, vault-find-replace,
│                         random-note, audio-recorder, …)
├── search/               Search index, operators, regex, result sort
├── settings/             settingsStore, useSettings hook, spellcheck
├── snippets/             CSS snippet loader (reads from vault .granite/)
├── themes/               Theme loader (CSS + manifest)
├── vault/                VaultContext provider helper, registry (IDB),
│                         granite-config (disk mirror), permissions,
│                         window-url helpers
└── workspace/            workspaceStore, persist, recents, folds, sync,
                          types, native-history binder
```

### `src/ui/` — React surfaces

```text
ui/
├── A11yAnnouncer.tsx           sr-only aria-live region + workspace announcer
├── CssClassesBinder.tsx        Applies platform/locale classes to <html>
├── LocaleDirectionBinder.tsx   Sets dir="rtl" / lang on <html>
├── commands/                   CommandsBootstrap registers default commands
├── controls/                   Reusable buttons, inputs, dropdowns, sliders
├── i18n/                       useI18n hook
├── overlay/                    ErrorBoundary, Modal, Menu, Tooltip,
│                               HoverPopover, NoticeContainer, OverlayHost,
│                               Prompt, inputPrompt
├── prompts/                    CommandPalette, QuickSwitcher, SettingsModal,
│                               VaultPicker, HelpModal, InstallPluginModal,
│                               FileRecoveryModal, TemplatePicker
├── shell/                      Titlebar, Ribbon, LeftSidebar, RightSidebar,
│                               StatusBar, Workspace, VaultProfile,
│                               sidebar-groups
├── theme/                      ThemeProvider, theme switcher logic
├── vault/                      VaultContext (React side)
├── views/                      MarkdownView, ReadingView, CanvasView,
│                               BasesView, GraphView, AssetView, WebViewerView,
│                               InlineTitle, asset/, bases/, file-explorer/,
│                               sidebar/ (backlinks, outline, tags, properties)
└── workspace/                  Leaf, Tab, TabStrip, leaf-title, drag helpers
```

### `src/styles/` — CSS

```text
styles/
├── tokens.css              Design tokens (colors, spacing, typography)
├── base.css                Reset and document defaults
├── index.css               Aggregator that imports the rest
├── shell.css               Titlebar, ribbon, sidebars, status bar
├── tabs.css                Tab strip, leaves, splits
├── markdown.css            Reading-mode and live-preview rendering
├── cm-livepreview.css      CodeMirror live-preview decorations
├── view-*.css              Per-view styles (graph, bases, pdf, release-notes)
├── settings*.css           Settings UI and community-plugin browser
├── notice.css / popover.css / tooltip.css / menu.css / modal.css
├── inputs.css / buttons.css / checkbox.css / toggle.css / slider.css
├── tree-item.css           File explorer and outlines
├── callouts.css            Markdown callouts
├── prism.css               Code block syntax highlighting
├── rtl.css                 Right-to-left adjustments
├── high-contrast.css       High-contrast theme overrides
├── print.css / mobile.css  Media-specific overrides
└── *.test.ts               Renderer-modules and contrast tests
```

## `scripts/`

```text
scripts/
├── _lib/                                  Shared verifier helpers
├── fixtures/                              Sample vaults used by verifiers
├── *-browser-fixture.html                 HTML fixtures loaded by verifiers
├── verify-*-browser.mjs                   Playwright/Chromium verifier scripts
├── verify-docs-browser.mjs                Doc-pipe verifier
├── audit-lighthouse-a11y.mjs              Lighthouse a11y audit
├── e2e-real-world-scenarios.md            Manual end-to-end scenarios
└── e2e-real-world-results.md              Manual run log
```

See [Browser verifiers](./verifiers.md) for the full enumerated list.

## `specs/`

Authoritative specs for internal contributors. The renderer specs are the
source of truth that the CSS in `src/styles/` is verified against.

```text
specs/
├── api/                    Stable API/format specs (plugin API, vault format)
├── product/                Product surface specifications
└── renderer/               Per-component renderer / CSS specifications
```

## `docs/`

Public documentation tree.

```text
docs/
├── README.md               Top index
├── getting-started/        First-run install, vault setup, intro tour
├── user-guide/             Feature-by-feature end-user documentation
├── developer/              This guide
├── reference/              Parameter-level API and format reference
└── sdk/                    Plugin author guide and recipes
```

## `examples/`

```text
examples/
└── plugins/
    ├── granite-api.d.ts    Hand-maintained public PluginApi typings
    └── …                   Example plugin sources
```

The d.ts is kept in lockstep with `src/core/plugins/types.ts` —
`bun run docs:check` enforces that the public API stays documented.

## `public/`

Static assets copied verbatim into the build output, plus the splash markup
referenced by `index.html`.

---

[← architecture](./architecture.md) · [Index](../README.md) · [next →](./running-servers.md)
