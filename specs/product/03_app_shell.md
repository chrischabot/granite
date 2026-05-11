# 03 — Application shell and layout

This file specifies the macroscopic layout of the desktop window. Every box, every divider, every region. Pixel/spacing values reference design tokens defined in `18_design_tokens.md`.

## 3.1 Window-level structure (top to bottom, left to right)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TITLE BAR  (vault name · centered tab title · window controls)              │
├────┬─────────────────┬────────────────────────────┬──────────────────────┬──┤
│    │                 │                            │                      │  │
│    │ LEFT SIDEBAR    │                            │ RIGHT SIDEBAR        │  │
│ R  │ ───────────     │   CENTRAL AREA             │ ──────────────       │  │
│ I  │  tab strip      │  (1+ tab groups,           │  tab strip           │  │
│ B  │  active panel   │   horizontal/vertical      │  active panel        │  │
│ B  │   (file explor, │   splits, stacks,          │   (outline,          │  │
│ O  │    search, etc.)│   pop-out spawns)          │    backlinks, etc.)  │  │
│ N  │                 │                            │                      │  │
│    │  vault profile  │                            │                      │  │
│    │                 │                            │                      │  │
├────┴─────────────────┴──────────────────┬─────────┴──────────────────────┴──┤
│                                         │   STATUS BAR (chips)              │
└─────────────────────────────────────────┴───────────────────────────────────┘
```

## 3.2 Window frame / title bar

Three frame styles, user-selectable in Settings → Appearance → Advanced → Window frame style:

| Mode | Behavior |
|------|----------|
| **App frame** (default) | The app draws a custom title bar containing (left) the active tab title and (right) the OS window controls. Drag area runs across the full title bar. Reflects focus state. |
| **Native frame** | The OS draws the window frame. The custom title bar is omitted; tab strip starts at the top. |
| **Hidden frame** | No title bar at all. Tab strip starts at the top; window must still be draggable from a defined drag region. Switching this requires a full app restart. |

CSS variables: `--titlebar-background`, `--titlebar-background-focused`, `--titlebar-border-width`, `--titlebar-border-color`, `--titlebar-text-color`, `--titlebar-text-color-focused`, `--titlebar-text-weight`, `--header-height`. See `19_component_styling.md`.

## 3.3 Ribbon

A vertical strip running the entire height of the main window on the leftmost side. Always visible regardless of left sidebar collapse state, unless the user disables it via Settings → Appearance → Advanced → Show ribbon (or right-clicks an empty area and selects *Hide ribbon*).

### 3.3.1 Geometry

- Width: `--ribbon-width` (≈ 44 px).
- Padding: `--ribbon-padding`.
- Background: `--ribbon-background` (or `--ribbon-background-collapsed` when the left sidebar is collapsed).
- Z-order: in front of the workspace, below modals/popovers/tooltips/menus.

### 3.3.2 Default ribbon items (top to bottom)

The ribbon has two contiguous sections separated visually by space:

**Top (user actions, scrollable):**
1. **Open quick switcher** — *file-search* icon. Opens Quick Switcher.
2. **Open graph view** — *git-fork* / graph icon. Opens the global graph in a new tab.
3. **Create new canvas** — *layout-dashboard* icon.
4. **Create new base** — *table* icon.
5. **Open today's daily note** — *calendar* icon.
6. **Manage workspace layouts** — *panels-top-left* icon.
7. **Open command palette** — *terminal* icon.
8. **Insert template** — *layout-template* icon.
9. **Create new unique note** — *sheet-in-box* icon.
10. **Open random note** — *dice* icon.
11. **Start/stop recording** — *mic* icon.
12. **Open format converter** — *binary* icon.

(The exact set of items above the spacer is determined by which core plugins are enabled. The 12 items above are the union when all defaults are enabled.)

**Bottom (system actions, fixed):**
- **Vault switcher** — *chevrons-up-down* icon, in the bottom corner of the left sidebar (treated as ribbon-area; see Vault profile §3.6).
- **Open help** — *help-circle* icon.
- **Open settings** — *settings* (cog) icon.

### 3.3.3 Ribbon interactions

- **Hover** on any icon shows a tooltip with the command name.
- **Click** triggers the command.
- **Drag-and-drop** rearranges icons; order persists in `workspace.json`.
- **Right-click** on an empty area of the ribbon shows a checklist of every command that *can* live in the ribbon, allowing show/hide; also offers *Hide ribbon*.
- **Right-click on an icon** offers *Hide* and *Reset to default*.
- The user can also configure the ribbon via Settings → Appearance → Advanced → Manage (under Ribbon menu configuration).

## 3.4 Left sidebar

The left sidebar contains one or more **tab groups** stacked vertically, each holding **sidebar tabs** rendered as icons in a thin strip with the active tab's content beneath.

### 3.4.1 Default tabs (left sidebar)

| Order | Tab | Provided by |
|------|------|--------------|
| 1 | **File explorer** — folder tree of the vault | core plugin |
| 2 | **Search** — full-vault search with operators | core plugin |
| 3 | **Bookmarks** — pinned shortcuts to files/folders/headings/searches/etc. | core plugin |
| 4 | **Tags** — list of all tags in the vault with counts | core plugin (Tags view) |

Plugins may add additional tabs. Users may rearrange tabs by drag, close them via right-click, and pin them by dragging across the central area boundary into the sidebar.

### 3.4.2 Geometry

- Default width: ≈ 280 px (resizable by dragging the right edge).
- Minimum width below which it auto-collapses.
- The header tab strip is icon-only (no labels) by default; CSS variable `--sidebar-tab-text-display` controls whether tab text is shown.
- Markdown rendered inside left sidebar uses `--sidebar-markdown-font-size` (smaller than main editor).

### 3.4.3 Collapse/expand

- An expand/collapse icon (Lucide *side-bar-left*) toggles the left sidebar's visibility.
- When collapsed, the ribbon remains visible.
- A user gesture (mouse near the left edge) does **not** auto-expand on desktop.

### 3.4.4 Tab groups in the sidebar

Sidebars support multiple horizontally-split tab groups (drag a tab above or below an existing tab strip to spawn a new tab group). This is a less-common power-user feature but is supported.

## 3.5 Right sidebar

Mirrors the left sidebar in structure. Default tabs:

| Order | Tab | Provided by |
|------|------|--------------|
| 1 | **Backlinks** | core plugin |
| 2 | **Outgoing links** | core plugin |
| 3 | **Outline** | core plugin |
| 4 | **Properties — File properties** | Properties view core plugin |
| 5 | **Properties — All properties** | Properties view core plugin |
| 6 | **Tags** (optional secondary placement) | core plugin |
| 7 | **Footnotes** | core plugin |

The right sidebar is collapsed by default on first launch.

## 3.6 Vault profile (bottom-left)

A button anchored to the bottom of the left sidebar above the status-bar line. Shows the current vault's name and a *chevrons-up-down* icon. Clicking it opens a popover menu containing:

- A list of recently opened vaults (each item: name, path tooltip, *More options* dots).
- **Manage vaults...** — opens the Vault Switcher modal where the user can create a new vault, open an existing folder as a vault, rename, move, or remove vaults from the list.
- **Open another vault** — opens the same modal in "open" mode.

CSS variables: `--vault-profile-display`, `--vault-profile-actions-display`, `--vault-profile-font-size`, `--vault-profile-font-weight`, `--vault-profile-color`, `--vault-profile-color-hover`.

The Vault Switcher must be the very first surface a user sees on initial app launch (before any vault exists).

## 3.7 Central area (the workspace root split)

The central area starts as one tab group occupying the full width between the two sidebars. It supports:

- **Splitting** horizontally (split right) or vertically (split down) via the tab's right-click menu, the More-options menu (`...`/dots) at the upper-right of the editor, or by dragging a tab to the bottom of another tab.
- **Resizing** by hovering the divider between two groups; the cursor becomes a resize cursor and the divider thickness grows by `--divider-width-hover`.
- **Pop-out** by dragging a tab outside the window or via *Move current tab to new window*. Each pop-out window belongs to its parent vault; closing the parent closes its pop-outs.
- **Closing** an entire tab group by closing all its tabs.
- **Stacking** tabs in a tab group via the group's overflow menu → *Stack tabs*. Stacked tabs render as overlapping vertical headers using `--tab-stacked-*` variables.

### 3.7.1 Tab strip (per group)

For each tab group there is a horizontal strip at the top containing:

- One header per tab with: a leading icon (per view type), the tab title (filename or view label), and a close (×) button on hover. Tabs are draggable.
- A **+** new-tab button at the right end (`Ctrl/Cmd+T` keyboard equivalent).
- A trailing **dropdown chevron** opening the tab-group menu: *Stack tabs*, *Reverse tab order*, *Bookmark N tabs*, *Close all*, etc.
- Tab text uses `--tab-font-size` (≈ 13 px) and `--tab-font-weight`.
- Active tab uses a slightly different background `--tab-background-active` and outline radius. See `19_component_styling.md`.

### 3.7.2 Tab pinning

Right-click a tab → *Pin*. A pinned tab in the central area:
- Receives no replacement behavior — clicking links opens new tabs instead.
- Renders a small *pin* icon in place of the close button until unpinned.

### 3.7.3 More-options menu (per active editor tab)

Each editor tab shows a *more-horizontal* (three-dots) icon in its top-right corner. The menu contains, at minimum:
- *Pin* / *Unpin*
- *Open in new tab/window/pop-out*
- *Open linked view* → submenu with *Backlinks for this note*, *Outgoing links for this note*, *Local graph*, *Outline of this note*, *Footnotes for this note*
- *Close*, *Close others*, *Close to the right*
- *Move to new window*
- *Open file in default app* (desktop)
- *Reveal in file explorer / Finder*
- *Properties* — adds/edits properties
- *Show / hide tab title bar*
- *Print* (when supported)
- *Toggle reading view* / *Toggle Live Preview* / *Toggle Source mode*

## 3.8 Status bar

A horizontal strip aligned to the bottom-right of the main window. Each child is a "status item" rendered as a small chip with a leading icon and a label.

### 3.8.1 Default status items (left to right within the bar)

(Order is a recommendation; users with the Commander plugin can reorder.)

1. **Backlink count** — number of backlinks for the active note.
2. **Editing-mode toggle** — clickable; cycles or opens a small menu *Reading / Live Preview / Source*. Hidden by default; shown when *Settings → Editor → Show editing mode in status bar* is on.
3. **Word count / Character count** — text "X words, Y characters". Non-clickable. Provided by Word count core plugin.
4. **Sync status** — present when sync is enabled; clickable, opens sync log.
5. **Vim mode indicator** — when Vim bindings are on.

### 3.8.2 Status bar styling

CSS variables: `--status-bar-background`, `--status-bar-border-color`, `--status-bar-border-width`, `--status-bar-font-size`, `--status-bar-text-color`, `--status-bar-position`, `--status-bar-radius`, `--status-bar-scroll-padding`. The status bar layer sits above the workspace at `--layer-status-bar` (15).

## 3.9 Layered surfaces (z-order)

Everything that can appear above the workspace has a defined layer. Implementations must respect these so that, e.g., a tooltip never hides behind a modal:

| Surface | Variable | Default z-index |
|---------|----------|-----------------|
| Cover (e.g. dimmer behind a modal) | `--layer-cover` | 5 |
| Sidedock (sidebar floating overlay on mobile) | `--layer-sidedock` | 10 |
| Status bar | `--layer-status-bar` | 15 |
| Popover (page-preview, etc.) | `--layer-popover` | 30 |
| Slides presentation overlay | `--layer-slides` | 45 |
| Modal | `--layer-modal` | 50 |
| Notice (toast) | `--layer-notice` | 60 |
| Menu | `--layer-menu` | 65 |
| Tooltip | `--layer-tooltip` | 70 |
| Dragged item (ghost) | `--layer-dragged-item` | 80 |

## 3.10 Resize handles & dividers

Every internal divider (between sidebar and center, between split panes, between tab groups, between sidebar tab groups) is a 1-px line at rest using `--divider-color` and `--divider-width`. On hover its thickness grows to `--divider-width-hover` and color to `--divider-color-hover`. The hit area is wider than the visible line for ergonomics.

## 3.11 Translucency (macOS only by default)

When *Settings → Appearance → Advanced → Translucent window* is on (and on macOS), the workspace background uses `--workspace-background-translucent`. The OS supplies the vibrancy material; the app simply lets it through. Disabled and unsupported on Linux. Removed on Windows in app version 1.15.11 due to upstream Electron deprecation.

## 3.12 Notices (toasts)

Transient notifications appear at the top-right corner stacked vertically, on layer `--layer-notice` (60). Auto-dismiss after a few seconds; can be clicked to copy / dismiss. Style: rounded card with 1-px border, 8-px radius, padding `--size-4-3`.

## 3.13 Pop-out windows

Each pop-out window has its own root split (its own central area) but no ribbon and no sidebars. Closing the parent vault window closes all its pop-outs. Tabs can only be moved between windows that belong to the same vault. See `21_dnd_and_pop_out_windows.md`.