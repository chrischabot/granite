# Editor modes

Granite gives you three ways to look at a Markdown note: **Reading
view** for distraction-free reading, **Live Preview** for editing with
inline rendering, and **Source mode** for raw Markdown. You can switch
freely; the underlying file is identical in every mode.

## The three modes at a glance

| Mode | What it shows | Read-only? |
|------|---------------|------------|
| **Reading view** | Rendered HTML output. Markdown syntax is hidden; tasks and headings are clickable. | Yes — you cannot place a caret. |
| **Live Preview** *(default)* | Editable. Markdown markers are visually hidden and replaced by their rendered output. Tokens reveal at the cursor's line so you can edit them. | No |
| **Source mode** | Editable. Every Markdown character is shown verbatim — no inline rendering. | No |

The default mode for new tabs is **Live Preview** with editing
enabled. You can change either default in
*Settings → Editor → Default view for new tabs* and *Default editing
mode*.

## Switching modes

Three ways:

1. **View switcher** — the icon button in the upper-right of every
   editor tab. Click to toggle between Reading and your preferred
   editing mode.
2. **Status bar chip** — turn on *Settings → Editor → Show editing
   mode in status bar* to add a chip in the bottom-right that opens
   a menu of all three modes.
3. **Hotkey** — `Mod+E` toggles Reading view on and off. To toggle
   between Live Preview and Source within editing, bind a hotkey to
   the *Toggle Live Preview / Source mode* command in *Settings →
   Hotkeys*.

To open the **other** view in a split pane alongside your current
tab, hold `Mod` while clicking the view switcher.

## Reading view

Pure rendered output. You see your note exactly as it would publish.

- Internal links are one click to follow; external links open in a new
  tab.
- Task checkboxes (`- [ ]`) are clickable — clicking toggles between
  `[ ]` and `[x]` and writes back to the file.
- Headings can be clicked to fold or unfold their section.
- Embeds render their target inline (image, audio player, PDF page,
  another note's content).

You cannot place a text caret in Reading view. Press `Mod+E` to drop
back into editing.

## Live Preview

Live Preview is the default. It looks like the rendered page while you
type, but reveals the underlying syntax whenever your cursor enters
its line or block:

- Headings render at the right size; the leading `#` characters are
  dimmed.
- `**bold**` shows as **bold**; the asterisks reappear when the
  cursor enters that word.
- Wikilinks (`[[Note]]`) render as the linked note's title or alias,
  styled and underlined.
- Embeds (`![[Image.png]]`) render inline with a small border. Hover
  for a shadow indicator.
- Tables render as a visual grid. Right-click a table for *Insert
  column*, *Insert row*, *Sort*, *Move column*, *Delete column*,
  *Delete row*.
- Callouts render as styled boxes. Right-click the title to change
  the type.
- Footnote markers render as small superscript pills.
- Code blocks use the editor's syntax highlighter.

Tip: Live Preview is great for *writing*; Source mode is great for
*debugging* a stubborn piece of syntax.

## Source mode

Source mode shows every Markdown character verbatim. No inline
rendering, no hidden tokens, no embed previews. Indentation is
slightly tighter than in Live Preview.

Use Source mode when:

- You want to see exactly what is in the file.
- You are pasting Markdown from elsewhere and want to verify the
  source.
- A piece of Live Preview rendering is hiding the underlying syntax
  you need to edit.

## Editor display options

All in *Settings → Editor → Display*:

| Setting | What it does | Default |
|---------|--------------|---------|
| Readable line length | Wraps the editor body to a comfortable measure (about 700 px). Turn off for full-width. | On |
| Strict line breaks | Off: a single newline is a paragraph break. On: a single newline is a soft-wrap (CommonMark behaviour). | Off |
| Properties in document | Where the YAML frontmatter block appears: *Visible* (inline editor), *Hidden* (only via the Properties panel), or *Source* (shown as raw YAML). | Visible |
| Fold heading | Allow collapsing a heading and everything below it. | On |
| Fold indent | Allow collapsing indented lists. | On |
| Show line numbers | Adds a line-number gutter. | Off |
| Show indentation guides | Vertical lines connecting list items. | On |
| Right-to-left (RTL) | Default text direction. Per-note override via a `direction:` property. | Off |
| Auto-pair brackets | Auto-close `(`, `[`, `{`, `<`, `"`, `'`. | On |
| Auto-pair Markdown syntax | Auto-close `**`, `*`, `_`, `` ` ``, `==`, `~~`. | On |
| Smart lists | Continue list markers and bump nesting on `Enter`. | On |
| Indent using tabs | `Tab` inserts a tab character. Off: inserts 4 spaces. | On |
| Convert pasted HTML to Markdown | Pasting from a browser becomes Markdown. `Mod+Shift+V` always pastes raw. | On |
| Spellcheck | Toggle the browser spellchecker. | On |
| Indent visual width | How many spaces a tab character renders as. | 4 |
| Vim key bindings | Enables vim modal editing. | Off |

## Multiple cursors

Granite supports multi-cursor editing in Live Preview and Source mode:

- `Alt+click` (Windows/Linux) or `Option+click` (macOS) — add a caret
  at the clicked position.
- `Shift+Alt+drag` or `Shift+Option+drag` — make a rectangular
  selection.
- `Esc` — collapse back to a single caret.

Once you have multiple carets, every typing or formatting command
applies to all of them at once. Great for renaming a token in a
column of list items, or appending the same text to several lines.

## Folding

Sections of a long note can be collapsed:

- **By heading** — when *Fold heading* is on, hover the gutter next
  to a heading and click the chevron. Everything until the next
  equal-or-higher heading collapses.
- **By indentation** — when *Fold indent* is on, the same chevron
  appears beside indented list items.
- **By command** — *Fold all headings and lists* and *Unfold all
  headings and lists* are in the Command palette (`Mod+P`).
- **At the cursor** — bind hotkeys to *Fold more* (collapse the
  innermost section at the cursor) and *Fold less* (unfold one level).

Folds are visual only — the file on disk is unchanged. Folds are
persisted with the workspace, so they survive a reload.

## Vim mode

Turn on *Settings → Editor → Vim key bindings* to use modal editing.
Granite uses CodeMirror's vim implementation, which supports the
common motions, operators, registers, marks, and basic ex commands.

When vim is on:

- `:w` saves the current file.
- `:e <path>` opens another file.
- `:q` closes the active tab.
- Visual block, line, and char modes all work.
- The Properties panel has its own light vim overlay — see
  [Properties and tags](./properties-and-tags.md).

## The inline title

Above the editor body is a single editable row showing the file's
name (separate from any `# H1` you may type in the body). This is the
**inline title**. Editing it renames the file on disk. Toggle visibility
via *Settings → Appearance → Show inline title*.

The inline title does not add a heading to the file. If you also have
`# Title` as the first line of your note, both will display.

## Right-click menus

Right-click inside the editor for a context menu organised into:

- **Cut / Copy / Paste / Paste without formatting / Paste and match
  style** — standard clipboard actions.
- **Format** — bold, italic, strikethrough, highlight, inline code,
  insert link, headings, quote, lists, task list, code block, math
  block, horizontal rule.
- **Insert** — link, callout, table, footnote, template.
- **Note composer** — *Extract current selection* and *Merge entire
  file with…*.
- **Find and replace** — opens the in-file search.
- **Open link in new tab / pane / window** — only when the right-click
  lands on a link.
- **Add link to bookmarks** — pin the current selection's link to your
  Bookmarks list.

## Tab title bar

The thin strip above the editor shows the tab's title and a More-options
menu (three dots) with extra actions: *Pin*, *Move to new window*,
*Rename file*, *Open linked view*, *Start presentation*, etc. Toggle the
bar's visibility in *Settings → Appearance → Show tab title bar*.

When the tab title bar is hidden, the view switcher icon goes with it.
If you still need to flip between Reading and Editing, enable the
status-bar editing-mode chip.

## See also

- [Markdown syntax](./markdown-syntax.md) — every construct the editor
  understands.
- [Hotkeys](./hotkeys.md) — every editor shortcut and how to rebind it.
- [Reference → Settings](../reference/settings.md) — the full Editor
  settings table with default values.

---

[← Vaults](./vaults.md) · [Index](./README.md) · [next: Markdown syntax →](./markdown-syntax.md)
