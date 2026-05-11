# 02 — Core concepts and glossary

This document defines every term that other docs in this set rely on. Implement these as named concepts in the codebase (e.g. `Vault`, `Note`, `Tab`, `Leaf`, `Workspace`, `Command`, `Hotkey`, `Property`).

## Vault

A **vault** is a folder on the user's local filesystem chosen as the root of a knowledge base. Everything inside it is a member of the vault. The vault folder also contains a hidden `.obsidian/` configuration subfolder (see `20_file_storage.md`). A user may have many vaults; each vault opens in its own application window. Multiple vaults must not be nested inside each other (links are local to a vault and would not resolve correctly).

## Note

A **note** is a Markdown file (`.md`) inside a vault. The note's *name* is its filename without extension. Notes may also contain a YAML frontmatter block at the top providing typed properties.

## Attachment

Any non-Markdown file inside the vault that was created outside the vault and added later. Images, PDFs, audio, video, etc. See accepted formats in `20_file_storage.md`.

## Link

A reference from one location to another. **Internal links** target a file (or anchor inside a file) within the same vault and may be written as `[[Wikilink]]` or `[Text](path)` Markdown links. **External links** target a URL outside the vault.

## Embed

A link prefixed with `!`, e.g. `![[Engelbart.jpg]]`, that inlines the linked content inside the note (image, audio, PDF, another note, a search query, a heading, a block).

## Alias

An alternative name for a note, declared in the YAML `aliases:` list property. Aliases participate in Quick Switcher results, Outgoing-links suggestions, and unlinked-mention discovery in Backlinks.

## Block

A unit of Markdown content (paragraph, list item, blockquote, callout, table, etc.). Each block can carry a unique identifier appended as `^id` so other notes can link to it via `[[Note#^id]]`. IDs are alphanumeric plus dashes.

## Heading anchor

Any `#`-prefixed Markdown heading inside a note. Linkable via `[[Note#Heading]]` or `[[Note#H1#H2]]` for nested anchors. Use `[[##term]]` to search for a heading across the vault from inside a wikilink popover.

## Tag

A keyword starting with `#` (e.g. `#meeting`) appearing either in the body of a note or as an entry in the `tags:` YAML list. Tags may be nested via `/` (e.g. `#inbox/to-read`). Tags are case-insensitive but their original casing is preserved in display. Tags must contain at least one non-numeric character.

## Property

A typed key/value pair stored in a note's YAML frontmatter (or as JSON between `---` fences). Built-in default property keys are `tags`, `aliases`, `cssclasses`. Property types: Text, List, Number, Checkbox, Date, Date & time, Tags. See `10_properties_and_tags.md`.

## Frontmatter

The YAML (or JSON) block fenced by `---` lines at the top of a note that holds properties.

## Command

A named action exposed by core or by a plugin. Commands appear in the Command palette (`Ctrl/Cmd+P`), can be assigned a hotkey, can be pinned to the ribbon, and can be triggered by slash commands inside the editor.

## Hotkey

A user-customizable keyboard shortcut bound to a command. Distinct from system *editing shortcuts* like `Ctrl+C` which are provided by the OS and are not customizable. See `17_hotkeys_reference.md`.

## View / View type

A view is a UI representation of some content. The Markdown editor view, the graph view, the file-explorer view, the search view, and a Bases view are all view types. Each tab hosts exactly one view.

## Tab (a.k.a. Leaf in the API)

A single document or pane within a tab group. Tabs can be opened, closed, dragged, pinned, split, and stacked. Tabs in the central area show a header strip; tabs in a sidebar collapse to icon-only.

## Tab group

A horizontal container of tabs. The user can split the workspace into multiple tab groups vertically or horizontally. The central area starts with one tab group; sidebars contain at least one tab group apiece. A *root split* is the central tab-group container; a *side dock* is a sidebar.

## Pinned tab

A tab that does not get replaced when the user opens a different note. Behavior in central area: clicking links opens new tabs instead of replacing this one. Behavior in sidebar: the panel stays focused on its current note rather than following the active note. See `21_dnd_and_pop_out_windows.md`.

## Stacked tab group

A tab group rendered with tabs sliding over each other (à la Andy Matuschak's sliding-panes pattern). Toggle on/off via the tab group's overflow menu.

## Linked view

A sidebar pane that follows another tab — e.g. a local Graph, an Outline, or a Backlinks panel that updates whenever the linked editor tab changes. Linked views are opened from a tab's *More options* menu.

## Workspace (the layout object)

The complete state of all open tabs, their groups, splits, sizes, sidebar widths, sidebar tab order, and pinned states. Persisted to `.obsidian/workspace.json` (and `workspace-mobile.json` on mobile). The Workspaces *plugin* lets the user save named workspace snapshots and switch between them.

## Ribbon

A vertical strip of icon buttons fixed to the leftmost edge of the main window. Holds quick-access actions (vault switcher, help, settings, plus user-pinned commands). The ribbon is part of the left sidebar's chrome on desktop but remains visible even when the left sidebar is collapsed. On mobile it lives in a menu accessible from the bottom navigation.

## Sidebar (left / right)

Two collapsible vertical panels flanking the central area. Each holds one or more tab groups, each holding tabs which are sidebar views (file explorer, search, backlinks, etc.). Sidebars can be resized by dragging their inner edge and toggled by their toggle icon.

## Status bar

A horizontal strip in the bottom-right of the main window. Hosts small informational/interactive chips (word count, sync status, editing-mode toggle, plugin-provided indicators).

## Vault profile

A button at the bottom of the left sidebar showing the current vault name with a chevrons-up-down icon. Click opens the **Vault switcher** menu (Manage Vaults..., switch vault, etc.).

## Theme

A CSS file that overrides the app's CSS variables to change the look and feel. Themes are full re-skins; one theme is active at a time. Distributed via the community theme directory or installed manually.

## CSS snippet

A smaller CSS file applied on top of the active theme. Multiple snippets may be enabled simultaneously. Stored in `<vault>/.obsidian/snippets/`.

## Plugin

JavaScript code that extends the app. **Core plugins** ship with the app and are toggleable; **community plugins** are third-party and require turning off Restricted mode to install. See `22_plugins_themes_architecture.md`.

## Selection model: active vs. focused vs. selected vs. current

- **Focused**: the OS-level focus target receiving keyboard input.
- **Active**: the tab/leaf currently displayed in the foreground of its tab group.
- **Selected**: highlighted in a list (e.g. selected file in File explorer, selected suggestion in Quick switcher).
- **Current**: the active tab in the focused workspace window. Distinguished from "active" because there can be one active tab per group but only one current tab in the whole window.

## Editing mode terms

- **Reading view**: rendered HTML output, syntax hidden, read-only.
- **Editing view**: editable mode, encompasses Live Preview and Source.
- **Live Preview**: editable mode where Markdown syntax is mostly hidden and rendered inline; revealing only at the cursor's current line/block.
- **Source mode**: editable mode where Markdown is shown as raw characters.

## Excluded files

Files matched by the user's "Excluded files" patterns under Settings → Files and links. Excluded files are hidden from Search, Graph, Backlinks and Outgoing links *unlinked-mentions*, and deprioritized in Quick Switcher and link suggestions. They still exist in the vault and can still be opened directly.

## Restricted mode

A safety toggle (Settings → Community plugins) that blocks all third-party plugins from running. Default-on for new vaults so users opt in to the security trade-off.

## Lucide

The open-source icon family the app uses ([lucide.dev](https://lucide.dev)). All UI icons referenced in this spec by lowercase name (e.g. *menu*, *settings*, *folder-open*) come from Lucide. Custom icons must follow Lucide's design grid.