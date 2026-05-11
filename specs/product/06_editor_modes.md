# 06 — Editor: views and modes

Two **views** (Reading vs. Editing) and, within Editing, two **modes** (Live Preview vs. Source).

## 6.1 Reading view

Pure rendered output. Markdown syntax is not visible. Read-only — you cannot place a text caret in it. Internal links are clickable; embeds render their target inline. Task checkboxes are clickable to toggle. Headings are clickable for fold/unfold.

## 6.2 Editing view

A live editor (CodeMirror-based in the original; any equivalent is fine) where the user can type, select, and edit. Two underlying display modes:

### 6.2.1 Live Preview

The default Editing mode. Most Markdown markers (asterisks for bold, brackets for links, hashes for headings, etc.) are *visually hidden* and replaced by the rendered output. When the cursor enters a token's line/block, the underlying syntax becomes visible **on that line/block only** so the user can edit it.

Specific behaviors:
- Headings render at the right size and weight; the leading `#`s are dimmed.
- `**bold**` shows as **bold** with `**` hidden until the cursor enters that word.
- Wiki-style internal links render as the target's title (or alias display text) styled with `--link-color` and underline `--link-decoration`.
- Embeds (`![[…]]`) render their content inline (image, PDF page, audio player, embedded note section) inside an "embed block" that has its own border and hover shadow `--embed-block-shadow-hover`.
- Tables render as visual grid; right-click a table opens *Insert column / Insert row / Delete column / Delete row / Sort / Move column* etc.
- Callouts (`> [!type]`) render as styled boxes; right-click the title bar to change the type.
- Footnote markers render as superscript pills.
- Inline code stays in monospace with `--code-background`.
- Code blocks render with PrismJS-style highlighting (Editor uses CodeMirror's own highlighter; Reader uses Prism — they may render slightly differently).

### 6.2.2 Source mode

Plain text editor view: every Markdown character is shown verbatim. No inline rendering. Indentation in nested lists uses `--list-indent-source` (typically less than `--list-indent-editing`).

## 6.3 Switching views and modes

Three controls on the desktop:

1. **View switcher** in the upper-right of the editor tab — single icon button that toggles between Reading and the user's preferred Editing mode. Icons: `book-open` for Reading, `pencil` (`edit-3`) for Live Preview, `code-xml` for Source.
2. **Status bar** chip — when *Settings → Editor → Show editing mode in status bar* is on, clicking it offers the three modes as a menu.
3. **Hotkey** — `Ctrl/Cmd+E` toggles between Reading view and the most-recent Editing mode. The command *Toggle Live Preview/Source mode* (assignable hotkey) toggles within Editing.

### View side-by-side

Hold `Ctrl/Cmd` while clicking the view switcher to open the *other* view in a new split pane next to the current one.

## 6.4 Defaults

Settings → Editor:
- *Default view for new tabs*: **Editing view** (default) or *Reading view*.
- *Default editing mode*: **Live Preview** (default) or *Source mode*.

## 6.5 Editor display options (Settings → Editor → Display)

Each is an on/off toggle unless noted:

| Setting | Effect |
|--------|--------|
| Readable line length | Constrain main editor body width to `--file-line-width` (≈ 700 px) so long lines wrap mid-screen. Toggle off for full-width. |
| Strict line breaks | Off by default. When **on**, single `\n` is treated as a soft-break per the CommonMark spec; with two trailing spaces or `Shift+Enter` for a `<br>`. When **off** (Obsidian's default), single `\n` is treated as a paragraph break. |
| Properties in document | *Visible*, *Hidden*, *Source*. Controls how the YAML block at the top of a note appears. |
| Fold heading | Allows the user to collapse a heading and everything below it (until the next equal-or-higher heading). |
| Fold indent | Allows folding indented lists at any depth. |
| Show line numbers | Show line numbers in the gutter (Source mode primarily). |
| Show indentation guides | Vertical lines connecting list items. |
| Right-to-left (RTL) | Default text direction. Per-note override possible via property. |
| Auto-pair brackets | Auto-close `(`, `[`, `{`, `<`, `"`, `'`. |
| Auto-pair Markdown syntax | Auto-close `**`, `*`, `_`, `` ` ``, `==`, `~~`. |
| Smart lists | Continue list markers and adjust indentation when pressing Enter inside a list. |
| Indent using tabs | Tab key inserts a `\t` (default). When off, inserts 4 spaces. |
| Convert pasted HTML to Markdown | Pasting HTML from a browser becomes Markdown. `Ctrl/Cmd+Shift+V` always pastes raw. |
| Spellcheck | Toggles the spellchecker. |
| Spellcheck languages | (Windows/Linux) list manager; (macOS) follows OS. |
| Indent visual width | Number of spaces a tab character renders as. |
| Vim key bindings | Enables Vim modal editing for the editor. |

## 6.6 Editor toolbar (mobile only, informative)

Above the soft keyboard on mobile: a horizontal scrollable strip of formatting commands. Out of scope for v1 desktop replica but the hotkey commands it triggers (Bold, Italic, etc.) must exist as commands in any case.

## 6.7 Multiple cursors

Hold `Alt` (Windows/Linux) or `Option` (macOS) and click to add a caret. Hold `Shift+Alt` (or `Shift+Option`) and drag to make a rectangular selection. Click without a modifier to collapse back to one caret. `Escape` cancels the multi-cursor state.

## 6.8 Folding

Sections can be folded by:
- Clicking the chevron that appears in the gutter on hover next to a heading or indented list.
- The Command palette: *Fold all headings and lists*, *Unfold all headings and lists*.
- Hotkey-bindable: *Fold less* (unfold one level at the cursor), *Fold more* (fold the section at the cursor).

Folds are visual only; the underlying file content is unchanged.

## 6.9 Inline title

Optional "title row" at the top of the editor showing the filename as an editable title (separate from any H1 in the body). Toggle via *Settings → Appearance → Show inline title*. Editing this row renames the file. Styled by `--inline-title-*` variables (font, size, weight, color, line-height). It does **not** add a heading to the file content.

## 6.10 Tab title bar

The thin row above the editor showing the tab's title and the More-options dots. Toggleable via *Settings → Appearance → Show tab title bar*. When off, the View switcher icon also disappears (workaround: enable status-bar editing-mode toggle).

## 6.11 Right-click menus inside the editor

The right-click menu on selected text or at the caret offers:

- *Cut* / *Copy* / *Paste* / *Paste without formatting* / *Paste and match style*
- *Format* submenu: *Bold*, *Italic*, *Strikethrough*, *Highlight*, *Inline code*, *Insert link*, *Heading 1…6*, *Quote*, *Bulleted list*, *Numbered list*, *Task list*, *Code block*, *Math block*, *Insert horizontal rule*
- *Insert* submenu: *Insert link…*, *Insert callout*, *Insert table*, *Insert footnote*, *Insert template*
- *Note composer* submenu: *Extract current selection*, *Merge entire file with…*
- *Open link in new tab/pane/window* (when right-clicking a link)
- *Add link to bookmarks*
- *Find and replace*