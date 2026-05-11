# Obsidian-style Knowledge App — Replica Specification

This document set is a complete, self-contained specification for building a desktop note-taking application that is functionally and visually equivalent to Obsidian.md. It is written to be consumed by a coding agent (or a human team) and contains everything needed to reproduce the app's structure, layout, behaviors, design tokens, file formats, default content, and extension points.

## How to read this spec

The documents are numbered in roughly the order an implementer should consume them. Earlier files describe concepts and structure; later files describe pixel-level styling, file format details, and an implementation blueprint. Cross-references between files use plain relative names, e.g. *see `18_design_tokens.md`*.

| File | Topic |
|------|-------|
| `01_product_overview.md` | What the app is, design principles, supported platforms, top-level surface area. |
| `02_core_concepts.md` | Vocabulary: vault, note, link, embed, alias, tag, property, command, hotkey, view, tab, tab group, ribbon, sidebar, status bar, theme, snippet. |
| `03_app_shell.md` | Window structure: title bar, ribbon, sidebars, central tab area, status bar, vault profile. |
| `04_left_sidebar_views.md` | File explorer, Search, Bookmarks, Tags. |
| `05_right_sidebar_views.md` | Outline, Backlinks, Outgoing links, Properties, Footnotes. |
| `06_editor_modes.md` | Reading view, Live Preview, Source mode, switching, defaults. |
| `07_markdown_syntax.md` | Every supported Markdown construct (basic + advanced + Obsidian extensions). |
| `08_callouts.md` | Callout syntax, all default types, foldable, nested, customization. |
| `09_links_embeds_aliases.md` | Internal links (wikilink + Markdown), heading + block links, embeds, aliases. |
| `10_properties_and_tags.md` | YAML frontmatter properties, all property types, tag syntax. |
| `11_canvas.md` | Infinite canvas behavior + JSON Canvas file format. |
| `12_bases.md` | Database-style views over notes, syntax, formulas, filters. |
| `13_command_palette_search_quickswitcher.md` | The three keyboard prompts and their behaviors. |
| `14_graph_view.md` | Global and local graph, settings, forces, filters. |
| `15_other_core_plugins.md` | Daily notes, Templates, Unique note creator, Audio recorder, File recovery, Format converter, Note composer, Page preview, Random note, Slides, Web viewer, Word count, Workspaces, Slash commands. |
| `16_settings_reference.md` | Every Settings tab and every option, with description and default. |
| `17_hotkeys_reference.md` | Every default hotkey + system editing shortcuts (Win/Linux + macOS). |
| `18_design_tokens.md` | Foundational CSS variables: colors (light/dark), typography, spacing, radii, layers, icons, cursor. |
| `19_component_styling.md` | Per-component CSS variables: tabs, sidebar, ribbon, status bar, modal, prompt, dialog, popover, button, input, toggle, checkbox, slider, dropdown, navigation list, divider, scrollbar. |
| `20_file_storage.md` | Vault layout, accepted file formats, `.obsidian` configuration folder, JSON Canvas, `.base` schema, Markdown encoding, file recovery snapshots. |
| `21_dnd_and_pop_out_windows.md` | All drag-and-drop sources/destinations and pop-out window behavior. |
| `22_plugins_themes_architecture.md` | Plugin model, theme/snippet architecture, Lucide icon set. |
| `23_implementation_blueprint.md` | Recommended tech stack, module decomposition, build order, milestones. |
| `24_acceptance_criteria.md` | Concrete, testable criteria the finished replica must meet. |
| `25_legal_branding_notes.md` | Trademark and branding considerations: what NOT to copy verbatim. |

## Branding & legal note

Obsidian is a registered trademark; the name "Obsidian", the official logo (the purple gem), and the marketing copy on `obsidian.md` are protected. The implementer **must not** reuse the Obsidian name, logo, or any registered marks for the replica's branding. Pick a distinct product name and create a distinct mark. The functional behaviors, UI layout patterns, Markdown syntax, file formats (`.md`, `.canvas`/JSON Canvas, `.base`), CSS variable naming, and design tokens documented here are intended for an interoperable rebuild and are described as observable API surface — the schema for `.canvas` files (JSON Canvas) is itself published as an open standard. See `25_legal_branding_notes.md` for the full guidance.

## Source of truth & versions targeted

This spec targets the Obsidian 1.9–1.12 desktop generation (the version of the app current at the time of writing in early 2026). The spec covers desktop primarily; mobile parity is described where it differs but is not the target build for the v1 replica.

## Conventions used in this spec

- **CSS variables** are written as `--variable-name`. Where two columns of defaults are given, the first is light mode, the second is dark mode.
- **Hotkeys** use `Ctrl` for Windows/Linux and `Cmd` for macOS unless otherwise stated. `Alt` on Windows/Linux maps to `Option` on macOS.
- **Icons** referenced by name (e.g. *menu icon*, *cog icon*) come from the Lucide icon library unless stated otherwise. The implementer should depend on Lucide directly.
- "Active" means currently focused; "selected" means currently highlighted in a list; "current" means the open tab/file in the foreground tab group.