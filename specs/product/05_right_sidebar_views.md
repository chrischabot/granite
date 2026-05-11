# 05 — Right sidebar views

The right sidebar mirrors the left in mechanics (icon strip, drag, pin, multiple groups). The default tabs differ.

## 5.1 Outline

Lists the headings (H1–H6) of the active note as an indented tree. Click a heading to jump to it in the editor. Drag a heading row to reorder the entire section in the underlying file. The tab follows the active editor tab unless pinned.

Header has no buttons (Outline is purely passive). Indentation is one `--list-indent` step per heading-level deeper than the section's root. Active heading (containing the cursor) is highlighted with `--nav-item-background-active`.

## 5.2 Backlinks

Lists notes that link back to the active note. Two collapsible sections:

| Section | Meaning |
|---------|---------|
| **Linked mentions** | Notes that contain an explicit `[[...]]` or Markdown link pointing at the active note. |
| **Unlinked mentions** | Occurrences of the active note's name (or any of its aliases) in other notes that are *not yet* a link. Excluded files do not appear here. |

### Header controls

| Control | Icon | Function |
|---------|------|----------|
| Collapse results | `chevrons-down-up` / `chevrons-up-down` | Toggle whether to show match context lines. |
| Show more context | `align-justify` | Show the full paragraph instead of a truncated line. |
| Change sort order | `arrow-up-narrow-wide` | *File name (A→Z / Z→A)*, *Modified time (new→old / old→new)*, *Created time*. |
| Show search filter | `search` | Reveals an inline filter input that further narrows the results. |
| Open backlinks for active note | `link-2` | Opens a *linked* backlinks tab in the central area (a separate tab pinned to the source note). |

### Per-mention row

Source-file path; below it, snippet of context with the matched name highlighted. For unlinked mentions, an *Add link* button on hover converts the mention into a wikilink in-place in the source file.

### Show backlinks at the bottom of the document

Setting (or `Backlinks: Toggle backlinks in document` command) toggles a section appended to the editor pane after the note's body, showing the same content as the side panel.

## 5.3 Outgoing links

Lists every link **out of** the active note plus discovered unlinked references. Same structure as Backlinks but reversed.

| Section | Meaning |
|---------|---------|
| **Links** | Every internal link present in the active note (deduplicated by target). |
| **Unlinked mentions** | Names of other notes (or aliases) that appear in the active note but are not linked. Click *Add link* to convert. |

A code-block exception applies: links found inside fenced code blocks are not added to the *Links* section, but text inside those code blocks can still be turned into links via *Unlinked mentions*.

## 5.4 Properties — File properties

Shows the YAML property editor for the active note in a sidebar tab (a duplicate of the inline properties editor at the top of the note). Useful when properties are hidden inline (Settings → Editor → Properties in document → *Hidden*).

Each row: type icon, label, value editor (typed). Buttons: **+ Add property**, drag handle to reorder, type-icon button on each row to switch type.

See `10_properties_and_tags.md` for the property type system.

## 5.5 Properties — All properties

Shows every distinct property name used anywhere in the vault, with its inferred type and a count.

- **Click** a property name → opens Search prefilled with `[propname]`.
- **Right-click** → *Rename property in vault…*, *Change property type…*, *Delete from all notes…*.

Sort options: by name (A→Z) or by frequency (most-used first).

## 5.6 Footnotes view

Lists every footnote `[^id]: ...` definition in the active note. Click a footnote to jump to (and start editing) its definition.

## 5.7 Tags (right-sidebar duplicate)

Optionally available; same as the left-sidebar Tags view. Useful when the user wants Tags accessible alongside the editor while the left sidebar is collapsed.

## 5.8 Right-sidebar pinning behavior

Right-sidebar tabs are typically *follow the active note* (Backlinks, Outgoing, Outline, File properties, Footnotes). When pinned (drag the tab onto the right sidebar from the central area, or right-click → *Pin*), the tab freezes on its current target and a *link-2* icon appears in its title strip. New active notes do **not** update the pinned tab.

This is how a user can keep, e.g., the backlinks of *Project A* visible while reading *Note B*.

## 5.9 Linked-views (light variant)

A subset of right-sidebar views can be opened as **linked views** — a fresh independent tab in the *central area* that is permanently linked to a *specific* source tab. This is opened via the source tab's More-options → *Open linked view → Local graph / Backlinks / Outline / Outgoing links / Footnotes*. Closing the source tab does not close the linked view, but the linked view's source-following stops at that point.