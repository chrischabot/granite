# CSS architecture and design tokens

Granite's renderer CSS is hand-written, token-driven, and split per-component.
There is no CSS framework, no utility classes, and no CSS-in-JS at runtime —
React components emit semantic class names that match the CSS files under
`src/styles/`. The per-component renderer spec in
[`specs/renderer/`](../../specs/renderer/) is the source of truth that the
CSS verifies against.

## Layout of `src/styles/`

```text
src/styles/
├── tokens.css           Design tokens: colors, spacing, typography, motion
├── base.css             Reset, root <html> defaults
├── index.css            Aggregator that imports every other file in order
├── shell.css            Titlebar, ribbon, sidebars, status bar
├── tabs.css             Tab strip, leaves, splits
├── markdown.css         Reading-mode and live-preview rendering
├── cm-livepreview.css   CodeMirror live-preview decorations
├── view-*.css           Per-view styles (graph, bases, pdf, release-notes,
│                        history-sync)
├── views.css            Shared view chrome
├── settings.css         Settings UI
├── settings-community.css  Community plugin browser
├── notice.css           Notice toasts
├── popover.css          Generic popover surface
├── tooltip.css          Tooltip surface
├── menu.css             Popup menus
├── modal.css            Modal dialogs
├── inputs.css           Text fields and textarea
├── buttons.css          Buttons (default, cta, warning, icon-only)
├── checkbox.css / toggle.css / slider.css   Form controls
├── dropdown.css         Native + custom dropdowns
├── multi-select.css     Multi-select chips
├── flair-and-pill.css   Small status pills
├── card.css             Card primitive
├── tree-item.css        File explorer and outline items
├── callouts.css         Markdown callouts
├── prism.css            Code block syntax highlighting
├── typography.css       Font stack and inline-text styling
├── empty-state.css      "Nothing here" surfaces
├── splash.css           Initial splash before vault is open
├── loading.css          Loading skeletons
├── animations.css       Reusable keyframes
├── overlays.css         Overlay backdrops
├── drag.css             Drag-and-drop affordances
├── progress.css         Progress bars
├── suggestion-and-prompt.css  Suggestion menus and prompt UI
├── scrollbars.css       Cross-browser scrollbar styling
├── os-modifiers.css     Platform-specific tweaks (.is-mac, .is-windows)
├── rtl.css              Right-to-left adjustments
├── high-contrast.css    High-contrast theme overrides
├── print.css            Print-media overrides
├── mobile.css           Narrow-viewport overrides
├── contrast.test.ts     WCAG contrast spot-checks (Vitest)
└── renderer-modules.test.ts  Spec coverage test
```

`src/main.tsx` imports `./styles/index.css` once. Inside `index.css`, every
other CSS file is `@import`-ed in a deliberate order: tokens first, then
base, then chrome, then components, then theme/contrast overrides, then
RTL/print last so they always win.

## Design tokens

`src/styles/tokens.css` defines every token Granite uses. The
naming convention matches the Obsidian token vocabulary so that themes built
for Obsidian can be reused with little or no change. Categories include:

- **Colors** — `--background-primary`, `--background-primary-alt`,
  `--background-secondary`, `--background-modifier-*`, `--text-normal`,
  `--text-muted`, `--text-faint`, `--text-error`, `--text-accent`,
  `--interactive-accent`, `--interactive-accent-hover`.
- **Borders and radii** — `--background-modifier-border`,
  `--radius-s`, `--radius-m`, `--radius-l`.
- **Spacing scale** — `--size-2-1`, `--size-4-1` … `--size-4-12`. The
  numeric scale matches the `4px` grid; pairs that share a stem (e.g.
  `size-4-3` and `size-2-3`) are coordinated.
- **Typography** — `--font-text` (UI text), `--font-monospace` (code),
  `--font-ui-small`, `--font-ui-smaller`, `--font-ui-large`,
  `--font-semibold`.
- **Motion** — `--anim-duration-*`, `--anim-motion-smooth`.
- **Cursors** — `--cursor` for the project's preferred pointer style.
- **Theme switches** — light/dark/high-contrast variables are switched by
  class on `<html>`. `ThemeProvider` toggles `theme-light` / `theme-dark`,
  `high-contrast.css` activates when `.mod-high-contrast` is set.

When adding a new visual, prefer existing tokens. If a token does not
exist, add it to `tokens.css` rather than introducing a hard-coded value —
themes rely on the token surface being stable.

## Logical properties and RTL

Granite uses logical properties (`margin-inline-start`, `padding-inline-end`,
`inset-inline-start`, `border-inline-start`, etc.) so that one CSS file
flips automatically when `<html dir="rtl">` is set by
`LocaleDirectionBinder`. `rtl.css` exists for the rare cases where logical
properties cannot express the layout — keep it small.

The `verify:rtl-browser` verifier exercises every major surface in RTL mode.

## Focus and motion

Two non-negotiables:

- **Visible focus**. Every interactive element must show a clear focus ring.
  The default is `outline: 2px solid var(--interactive-accent)` with a
  matching `outline-offset`. Custom focus styles must keep the same
  contrast.
- **Reduced motion**. Any animation that is longer than a brief transition
  must be guarded by `@media (prefers-reduced-motion: reduce)`. Use
  `--anim-duration-*` tokens so reduced-motion overrides apply uniformly.

`audit:a11y` runs the relevant unit tests. `audit:lighthouse-a11y` catches
contrast and focus issues at the integration level.

## Themes

Vault themes live under `.granite/themes/<theme-id>/theme.css` along with a
small manifest. `src/core/themes/loader.ts` injects the active theme as a
`<style data-granite-theme="…">` tag in document order *after* the bundled
CSS, so theme files override app defaults by cascade only — there is no
preprocessor.

Themes typically override:

- Token values (`--background-primary`, `--text-accent`, …).
- Heading and code-block typography.
- Sidebar and ribbon visuals.

Because tokens drive all surfaces, a small theme can re-skin the entire
app without touching component CSS. The Obsidian compatibility shim
(`src/core/plugins/obsidian-shim.ts`) maps Obsidian theme files into the
same loader, so vaults migrated from Obsidian can keep their themes.

## CSS snippets

`src/core/snippets/loader.ts` loads any `.granite/snippets/<name>.css` file
that is enabled in Settings → Appearance → CSS snippets. Snippets are
appended after themes, so a per-vault snippet wins over the active theme.

Snippets are the right tool for per-vault tweaks (custom callout colors,
custom checkbox glyphs, etc.) — they avoid forking a theme.

## Component CSS conventions

- One CSS file per top-level component family (per `src/styles/<area>.css`).
- Class names mirror the component name in kebab-case (`.notice-container`,
  `.menu-item`, `.tab-strip`). Components inside the same family may share a
  prefix.
- Modifier classes use a leading `mod-`: `.mod-cta`, `.mod-warning`,
  `.mod-active`, `.mod-high-contrast`.
- State classes use `is-` or `has-` prefixes when they reflect runtime
  state: `.is-active`, `.has-focus`.
- Selector depth stays shallow. Prefer one or two levels and let cascade
  do the work.
- Avoid `!important`. The cascade is intentional and themes/snippets must
  remain able to override.
- Avoid hard-coded `z-index` values — use the `--z-*` token tier (see
  `tokens.css`).

## Renderer specs

Each component family has a renderer spec at
`specs/renderer/<area>.md`. The spec describes the rendered DOM, the
required classes, the visual states, and the tokens involved. The
`renderer-modules.test.ts` test cross-references every spec section against
the matching CSS file to catch drift.

When you change a renderer:

1. Update the spec first.
2. Update the CSS to match.
3. Run `bun run test src/styles` (or the broader gate).
4. If the change affects layout, run `verify:renderer-visual-browser`.

## High contrast

`high-contrast.css` is activated by adding `mod-high-contrast` to `<html>`
(Settings → Appearance → Accessibility → High contrast). It strengthens
foreground/background pairs, removes subtle backgrounds, and forces a
solid 2px focus ring across the app. Use the high-contrast theme as a
diagnostic — surfaces that disappear or lose legibility need extra
attention.

---

[← reporting](./reporting.md) · [Index](../README.md) · [next →](./i18n.md)
