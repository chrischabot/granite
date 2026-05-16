# Your first note

You have a vault open. Time to write something.

## Create a note

Three ways, pick whichever you like:

- Press `Mod+N` (`Cmd+N` on macOS, `Ctrl+N` elsewhere).
- Click the "New note" icon in the ribbon.
- Right-click an empty area in the File explorer → **New note**.

A new untitled tab opens with the cursor inside an inline title control.
Type a title and press `Enter` — Granite writes `Untitled.md` (or your typed
name) to disk immediately. By default new notes land in the vault root; change
this in **Settings → Files and links → Default location for new notes**.

## Write Markdown

Granite supports CommonMark, GitHub Flavored Markdown, and a small set of
additive extensions:

```markdown
# Heading

Paragraphs are plain text with **bold**, *italic*, ~~strike~~, and `code`.

- Bullet
  - Nested bullet
- [ ] A task
- [x] Completed task

> A blockquote.

> [!note] A callout
> Granite supports callouts via the `[!type]` syntax.

[A link](https://example.com)

[[Wikilink to another note]]
![[Embedded note or image]]

```js
// Fenced code with language for Prism highlighting
const x = 1;
```
```

See the [Markdown syntax guide](../user-guide/markdown-syntax.md) for the
complete list.

## Switch editing modes

Three editor modes are available, toggled from the view menu (top-right of a
tab) or with hotkeys:

| Mode | What it shows |
|------|---------------|
| **Source** | Raw Markdown with syntax highlighting. |
| **Live Preview** (default) | Inline rendering — format markers hide on lines you are not editing. |
| **Reading view** | Rendered Markdown only, like a published page. |

## Link to another note

Type `[[` and start typing a note title. Granite shows suggestions; press
`Enter` to insert the link. Unresolved wikilinks are styled differently so
you can spot them, and clicking one creates the note.

To embed instead of link, use `![[Note title]]`.

## Add properties

Type `---` on the first line and press `Enter` — Granite opens a YAML
frontmatter block and the **Properties panel** appears at the top of the note.
Click the panel to add typed properties (text, list, number, checkbox, date,
date & time, tags).

Properties become first-class data — searchable, filterable from Bases, and
visible from the right-sidebar Properties view.

## Save

Granite saves automatically. The status bar's "sync" chip flips when an
external editor changes the file on disk so you can pull in the change with
**File → Reload from disk**.

## What now?

- Take the [workspace tour](./workspace-tour.md) to learn the panels.
- Read the [editor guide](../user-guide/editor.md) for keyboard shortcuts.
- Skim the [hotkeys reference](../reference/hotkeys.md).

← [First run](./first-run.md) · [Index](../README.md) · [Workspace tour](./workspace-tour.md) →
