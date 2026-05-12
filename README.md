# Obsidian Renderer — UI Reproduction Specification

> **Purpose.** This repository contains a complete, source-cited specification of the Obsidian desktop renderer's user interface. The goal is reproduction so faithful that an agent following these documents produces a **pixel-perfect, behavior-perfect carbon copy** of the running app.
>
> **Standard.** Every value here (color, dimension, font weight, easing, duration, z-index, radius, shadow, padding, margin, opacity, blend mode) is sourced from `renderer/app.css`, `renderer/index.html`, or `renderer/app.webcrack/` — and is cited by file:line. If a value is missing, the spec is incomplete; do not invent one.

## Scope

**In scope.** The Obsidian renderer:

- `renderer/app.css` — entire stylesheet (24,005 lines).
- `renderer/index.html` — entry point.
- `renderer/app.webcrack/` — webcrack-deobfuscated webpack modules (195 modules + `deobfuscated.js` single-file output).
- `renderer/i18n/`, `renderer/i18n.js` — interface strings.
- `renderer/lib/` — vendored libraries that affect UI: CodeMirror 5 (the markdown editor), moment, i18next, pixi (graph view), prism (syntax highlighting), pdf.js, mermaid, scrypt, turndown, reveal (slides), readability, mathjax.
- `renderer/public/fonts/`, `renderer/public/images/` — font and image assets.
- `renderer/sim.js`, `renderer/worker.js`, `renderer/enhance.js`, `renderer/main.js` — supporting renderer scripts.

**Out of scope.** The Electron main process (`main/`), sandboxed iframes (`renderer/sandbox/`), the help app (`renderer/help.html`, `renderer/help.js`), the starter / first-run experience (`renderer/starter.html`, `renderer/starter.js`), and any UI provided by community plugins.

## Public Docs

The local public documentation site starts at [`docs/index.html`](docs/index.html).
It links the vault format, plugin API, and contributor guide.

## Source-of-truth precedence

When multiple sources describe the same property, resolve in this order:

1. `renderer/app.css` — the authoritative computed style.
2. `renderer/index.html` — DOM scaffolding (note: minimal; the DOM is built by JS).
3. `renderer/app.webcrack/deobfuscated.js` and individual module files — DOM construction, event handlers, computed runtime values, state machines.
4. `renderer/i18n/en.txt` — display strings (English is the source language; other locales are translations).
5. Vendored libraries — only when the renderer delegates rendering to them (CodeMirror, pdf.js).

## Conventions used in every spec file

- **Selectors.** Quoted exactly as they appear in `app.css`.
- **Values.** Always concrete: hex codes, px/em/rem/vw, ms, cubic-beziers. No "approximately".
- **Theme variants.** All color tokens are given for both `.theme-light` and `.theme-dark`, plus `.mod-macos`, `.mod-windows`, `.mod-linux`, `.is-mobile`, `.is-phone`, `.is-tablet`, `.is-translucent`, `.is-rtl` overrides where applicable.
- **States.** Hover, active, focus, focus-visible, disabled, selected, highlighted, dragging, loading — each is its own block when the CSS provides distinct rules.
- **Citations.** Every rule cites `app.css:LINE` so the value can be verified. Behavior cites `app.webcrack/deobfuscated.js:LINE` or the relevant module file.
- **DOM trees.** Each component spec includes the exact DOM scaffold the JS builds (selector tree with attributes), reconstructed from CSS selectors that imply structure plus webcrack output.
- **Units.** `px` is `device-independent CSS pixels`. `em` resolves against the element's own `font-size`. `rem` resolves against `html` `font-size` (default 16px unless the host changes it). `var(--token)` is always resolved transitively in the spec.

## Reading order for a fresh reproducer

If you are an agent or a person building this from scratch, read the specs in this order:

1. `design-tokens.md` — every CSS custom property; theme variants; the units & motion system.
2. `typography.md` — font stacks, type scale, weights, line heights, letter-spacing.
3. `icons-and-assets.md` — icon set, font files, image assets, SVG inventory.
4. `app-shell.md` — root layout (`.app-container`, `.horizontal-main-container`).
5. `titlebar.md` — window chrome.
6. `ribbon.md` — left-edge action ribbon.
7. `workspace-and-splits.md` — `.workspace`, `.workspace-split`, `.workspace-leaf`, `.workspace-tabs`, leaf resize handles.
8. `tabs.md` — `.workspace-tab-header*` family + `tab-stacked` + `mobile-tab-switcher`.
9. `sidedock.md` — `.workspace-sidedock-empty-state`, sidedock tabs.
10. `view-header.md` — pane chrome (`.view-header`, `.view-actions`, breadcrumb).
11. `status-bar.md`.
12. `scrollbars.md`.

Then control primitives:

13. `buttons.md` — `.clickable-icon`, `.mod-cta`, `.mod-warning`, `.mod-destructive`, `button` element.
14. `inputs.md` — text/number/date/range/color, password fields, textarea, search inputs.
15. `dropdown-select.md`.
16. `toggle.md`.
17. `checkbox.md`.
18. `slider.md`.
19. `multi-select.md`.
20. `progress-bar.md`.
21. `tooltip.md`.
22. `tree-item.md`.
23. `flair-and-pill.md`.
24. `card.md`.
25. `empty-state.md`.

Then overlays:

26. `modal.md`.
27. `suggestion-and-prompt.md` — quick-switcher, command palette, suggestion popover.
28. `menu.md` — context menus and dropdown menus.
29. `notice.md` — toasts.
30. `hover-popover.md` — link hover previews.
31. `dialog.md`.

Then content surfaces:

32. `editor-codemirror.md` — `.cm-s-obsidian`, gutters, cursor, selection, fold marks.
33. `editor-markdown-rendering.md` — `.markdown-rendered` shared rules.
34. `editor-source-mode.md` — `.markdown-source-view` + live-preview tokens.
35. `editor-reading-mode.md` — `.markdown-preview-view`, `.markdown-reading-view`.
36. `editor-inline-title.md`.
37. `editor-properties.md` — `.metadata-container` and properties panel.
38. `editor-callouts.md`.
39. `editor-tables.md`.
40. `editor-code-blocks.md` — fenced code, prism syntax highlight tokens.
41. `editor-embeds.md` — `.internal-embed`, `.markdown-embed`, `.file-embed`, image/video/audio.
42. `editor-footnotes.md`.
43. `editor-headings-and-lists.md`.
44. `editor-tags-and-links.md`.
45. `editor-document-search.md` — Find & replace bar.
46. `editor-mobile-toolbar.md`.

Then sidebar views:

47. `view-file-explorer.md`.
48. `view-search.md`.
49. `view-bookmarks.md`.
50. `view-tags.md`.
51. `view-outline.md`.
52. `view-backlinks.md` — pane + embedded.
53. `view-outgoing-links.md`.
54. `view-graph.md`.
55. `view-canvas.md`.
56. `view-bases.md` — table, cards, list, group, toolbar.
57. `view-pdf.md`.
58. `view-webviewer.md`.
59. `view-release-notes.md`.
60. `view-history-sync.md`.

Then meta-UI:

61. `settings-modal.md` — vertical-tabs structure, search, hotkey editor.
62. `settings-community-plugins.md`.
63. `settings-community-themes.md`.
64. `settings-vertical-tabs.md` — primitive used by settings.
65. `settings-horizontal-tabs.md`.
66. `settings-mobile.md`.

Then state and motion:

67. `themes-light-dark.md` — exhaustive token diff.
68. `os-modifiers.md` — `.mod-macos`, `.mod-windows`, `.mod-linux` overrides.
69. `mobile.md` — `.is-mobile`, `.is-phone`, `.is-tablet`, `.is-android`, `.is-ios` overrides.
70. `rtl.md` — `.mod-rtl`, `.is-rtl`.
71. `animations.md` — every `@keyframes`, every `transition`.
72. `drag-and-drop.md` — `.drag-ghost`, `.drag-reorder-ghost`, `.drop-indicator`, `.workspace-drop-overlay`.
73. `loading-states.md` — `.is-loading`, `.loader-cube`, `.loader-spinner`.

## File index (alphabetical)

Every file below is at the repo root. Items marked **(planned)** are part of this specification but their contents will be authored as the documentation is written.

| File | Topic |
| --- | --- |
| [animations.md](animations.md) | All `@keyframes`, transitions, easings, durations |
| [app-shell.md](app-shell.md) | Root layout, `.app-container`, `.horizontal-main-container` |
| [buttons.md](buttons.md) | `button`, `.clickable-icon`, `.mod-cta`, `.mod-warning` |
| [card.md](card.md) | `.card`, `.card-container` |
| [checkbox.md](checkbox.md) | `[type=checkbox]`, `.task-list-item-checkbox`, `.checkbox-container` |
| [design-tokens.md](design-tokens.md) | Every CSS custom property, both themes |
| [dialog.md](dialog.md) | `.dialog`, confirmation modals |
| [drag-and-drop.md](drag-and-drop.md) | Drag ghosts, drop indicators, fake-target overlay |
| [dropdown-select.md](dropdown-select.md) | `select.dropdown`, `.combobox` |
| [editor-callouts.md](editor-callouts.md) | `.callout` and types |
| [editor-code-blocks.md](editor-code-blocks.md) | Fenced code blocks + Prism tokens |
| [editor-codemirror.md](editor-codemirror.md) | `.cm-s-obsidian` editor chrome |
| [editor-document-search.md](editor-document-search.md) | `.document-search-container` |
| [editor-embeds.md](editor-embeds.md) | `.internal-embed`, `.markdown-embed`, `.file-embed` |
| [editor-footnotes.md](editor-footnotes.md) | `.footnote-ref`, `.footnotes` |
| [editor-headings-and-lists.md](editor-headings-and-lists.md) | h1-h6, ul/ol/checklists |
| [editor-inline-title.md](editor-inline-title.md) | `.inline-title` |
| [editor-live-preview.md](editor-live-preview.md) | Live-preview-only rules |
| [editor-markdown-rendering.md](editor-markdown-rendering.md) | `.markdown-rendered` shared rules |
| [editor-mobile-toolbar.md](editor-mobile-toolbar.md) | `.mobile-toolbar*` |
| [editor-properties.md](editor-properties.md) | `.metadata-container`, `.metadata-property` |
| [editor-reading-mode.md](editor-reading-mode.md) | `.markdown-preview-view`, `.markdown-reading-view` |
| [editor-source-mode.md](editor-source-mode.md) | `.markdown-source-view` |
| [editor-tables.md](editor-tables.md) | `.cm-s-obsidian table`, `.markdown-rendered table` |
| [editor-tags-and-links.md](editor-tags-and-links.md) | `.cm-hashtag`, `.cm-link`, `.tag`, `.internal-link` |
| [empty-state.md](empty-state.md) | `.empty-state*` family |
| [flair-and-pill.md](flair-and-pill.md) | `.flair`, `.multi-select-pill` |
| [hover-popover.md](hover-popover.md) | `.hover-popover`, `.popover` |
| [icons-and-assets.md](icons-and-assets.md) | Icon set, font files, image assets |
| [inputs.md](inputs.md) | `input` elements + textarea |
| [loading-states.md](loading-states.md) | `.is-loading`, `.loader-spinner`, `.loader-cube` |
| [menu.md](menu.md) | `.menu`, `.menu-item`, separators |
| [modal.md](modal.md) | `.modal`, `.modal-bg`, `.modal-container` |
| [mobile.md](mobile.md) | `.is-mobile`, `.is-phone`, `.is-tablet` overrides |
| [multi-select.md](multi-select.md) | `.multi-select-container` |
| [notice.md](notice.md) | `.notice`, `.notice-container` |
| [os-modifiers.md](os-modifiers.md) | `.mod-macos`, `.mod-windows`, `.mod-linux` |
| [progress-bar.md](progress-bar.md) | `.progress-bar*` |
| [ribbon.md](ribbon.md) | `.workspace-ribbon`, `.side-dock-actions`, `.side-dock-settings` |
| [rtl.md](rtl.md) | `.mod-rtl`, `.is-rtl` |
| [scrollbars.md](scrollbars.md) | `::-webkit-scrollbar*` |
| [settings-community-plugins.md](settings-community-plugins.md) | `.community-*` |
| [settings-community-themes.md](settings-community-themes.md) | Themes manager |
| [settings-horizontal-tabs.md](settings-horizontal-tabs.md) | `.horizontal-tab-*` |
| [settings-modal.md](settings-modal.md) | `.modal-setting-*`, hotkey editor |
| [settings-vertical-tabs.md](settings-vertical-tabs.md) | `.vertical-tab-*` |
| [sidedock.md](sidedock.md) | Side dock, empty state |
| [slider.md](slider.md) | `[type=range]` |
| [splash.md](splash.md) | `.splash`, `.splash-brand` |
| [status-bar.md](status-bar.md) | `.status-bar`, `.status-bar-item` |
| [suggestion-and-prompt.md](suggestion-and-prompt.md) | `.prompt`, `.suggestion-container` |
| [tabs.md](tabs.md) | `.workspace-tab-header*` family |
| [themes-light-dark.md](themes-light-dark.md) | Exhaustive light vs dark token diff |
| [titlebar.md](titlebar.md) | `.titlebar` |
| [toggle.md](toggle.md) | `.checkbox-container.is-enabled` toggle styling |
| [tooltip.md](tooltip.md) | `.tooltip`, `[aria-label]` |
| [tree-item.md](tree-item.md) | `.tree-item*` family |
| [typography.md](typography.md) | Type scale, font fallbacks, line heights |
| [view-backlinks.md](view-backlinks.md) | `.backlink-pane`, `.embedded-backlinks` |
| [view-bases.md](view-bases.md) | `.bases-*` (table, cards, list, toolbar) |
| [view-bookmarks.md](view-bookmarks.md) | Bookmarks pane |
| [view-canvas.md](view-canvas.md) | `.canvas`, `.canvas-node*`, `.canvas-edges`, controls, minimap |
| [view-file-explorer.md](view-file-explorer.md) | `.nav-folder`, `.nav-file*`, `.file-tree*` |
| [view-graph.md](view-graph.md) | `.graph-view`, `.graph-controls` |
| [view-history-sync.md](view-history-sync.md) | `.sync-history-*`, `.file-recovery-*` |
| [view-outgoing-links.md](view-outgoing-links.md) | `.outgoing-link-pane` |
| [view-outline.md](view-outline.md) | Outline pane |
| [view-pdf.md](view-pdf.md) | `.pdf-toolbar`, `.pdf-sidebar`, `.pdfViewer`, find bar |
| [view-release-notes.md](view-release-notes.md) | `.release-notes-view`, `.changelog-item` |
| [view-search.md](view-search.md) | `.search-result-*`, `.search-row` |
| [view-tags.md](view-tags.md) | `.tag-container`, `.tag-pane-tag` |
| [view-webviewer.md](view-webviewer.md) | `.webviewer-*` |
| [view-header.md](view-header.md) | `.view-header`, `.view-actions`, `.view-content` |
| [workspace-and-splits.md](workspace-and-splits.md) | `.workspace`, `.workspace-split`, `.workspace-leaf` |

## Failure modes to avoid

- **"Approximately" — banned.** If you cannot give a concrete value, the spec is incomplete.
- **"Subtle shadow" — banned.** Cite the `box-shadow` rule.
- **"A reasonable easing" — banned.** Cite the cubic-bezier.
- **Inventing colors.** Every color in the running app exists in `app.css` — find it.
- **Skipping states.** A spec without `:hover`, `:active`, `:focus-visible`, `:disabled` is incomplete.
- **Skipping themes.** Every spec must show light and dark resolved values.
- **Skipping OS variants.** macOS ships different toggle dimensions, slider thumbs, and traffic-light offsets.
