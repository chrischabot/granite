# View — History & Sync

> Two related views that show document history. **File recovery** lists local autosaved versions of a single file. **Sync history** (Obsidian Sync only) lists changes synced from other devices, attributed to per-user avatars.

Source: `renderer/app.css:17057-17137` (file recovery), `18460-18800ish` (sync history). Tokens: see [`design-tokens.md`](design-tokens.md) §20 (sync avatars).

---

## 1. File recovery (`app.css:17057-17137`)

```css
.file-recovery-list-item-container {
  /* outer wrapper inside the file-recovery modal */
}

.file-recovery-list {
  /* the column of versions */
  /* …layout rules… */
}

.file-recovery-list .search-input-container {
  /* filter input */
}

.file-recovery-list-container {
  /* scrollable container */
  /* …flex column… */
}

.file-recovery-list-item-header {
  /* a single saved-version row */
  /* …flex row with timestamp + indicators… */
}

.file-recovery-list-item-header:not(:last-child) {
  /* hairline separator */
}

.file-recovery-list-item-header.is-active,
.file-recovery-list-item-header.is-active:hover {
  /* the currently-selected version */
}

.file-recovery-list-item-header.is-active .u-muted,
.file-recovery-list-item-header.is-active:hover .u-muted {
  /* keep muted text legible against the active fill */
}

.file-recovery-list-item-header .file-recovery-list-item-details {
  /* timestamp + size column */
}

.file-recovery-list-item-header .collapse-indicator {
  /* per-row caret if expandable */
}

.file-recovery-text {
  font-family: var(--font-monospace);
  tab-size: 4;
  resize: none;
  flex: 1 0 0;
  padding: var(--size-4-6);                    /* 24px */
  font-size: var(--font-ui-medium);            /* 15px */
  background-color: var(--background-primary);
}

.file-recovery-text[data-ext="md"] {
  font-family: var(--font-text);
  font-size: var(--font-text-size);            /* switches to 16px text font for markdown */
}
```

The text preview pane:
- Default monospace 15 px with 24 px padding.
- For `.md` files, switches to the text font and 16 px size — so the user previews markdown in its natural format.

---

## 2. Sync history (`app.css:18460-18800ish`)

### 2.1 Container

```css
.sync-history-list-container {
  display: flex;
  flex-direction: column;
  flex-basis: 250px;
  flex-shrink: 0;
  border-inline-end: 1px solid var(--background-modifier-border);
  background-color: var(--background-secondary);
}

.sync-history-list {
  overflow: auto;
  padding: var(--size-4-2) var(--size-4-2) 0;   /* 8px */
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
}

.sync-history-list .search-input-container {
  width: 100%;
}

.sync-history-list-item-container {
  overflow: auto;
  flex: 1 1 0;
}
```

The sync history modal has a 250 px-wide left list (with a 1 px right divider) plus the content pane (the right side). Background is `--background-secondary` so it visually stands off from the diff view.

### 2.2 Item header (`app.css:18486-18605`)

```css
.sync-history-list-item-header {
  display: flex;
  align-items: center;
  padding: var(--size-4-2);                    /* 8px */
  margin-bottom: var(--size-4-1);              /* 4px */
  border-radius: var(--radius-s);              /* 4px */
}
.sync-history-list-item-header:last-child { margin-bottom: 0; }

.sync-history-list-item-header.is-active,
.sync-history-list-item-header.is-active:hover {
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
}

.sync-history-list-item-header.is-active .u-muted,
.sync-history-list-item-header.is-active:hover .u-muted {
  color: var(--text-on-accent);
  opacity: 0.8;
}

.sync-history-list-item-header.is-active {
  --nav-collapse-icon-color: var(--text-on-accent);
}

@media (hover: hover) {
  .sync-history-list-item-header:hover {
    background-color: var(--background-modifier-hover);
  }
}
```

Item header (a single sync event):
- 8 px padded, 4 px corner radius.
- Active item: solid accent fill with white text. Muted sub-text inherits white at 80 % opacity.
- The collapse caret (when present) gets `--text-on-accent` so it's visible against the accent fill.

### 2.3 User avatars (`app.css:18532-18588`)

```css
.sync-history-list-item-header .mod-avatar-current-user { background-color: var(--sync-avatar-color-current-user); }   /* transparent */
.sync-history-list-item-header .mod-avatar-color-1      { background-color: var(--sync-avatar-color-1); }   /* red */
.sync-history-list-item-header .mod-avatar-color-2      { background-color: var(--sync-avatar-color-2); }   /* orange */
.sync-history-list-item-header .mod-avatar-color-3      { background-color: var(--sync-avatar-color-3); }   /* yellow */
.sync-history-list-item-header .mod-avatar-color-4      { background-color: var(--sync-avatar-color-4); }   /* green */
.sync-history-list-item-header .mod-avatar-color-5      { background-color: var(--sync-avatar-color-5); }   /* cyan */
.sync-history-list-item-header .mod-avatar-color-6      { background-color: var(--sync-avatar-color-6); }   /* blue */
.sync-history-list-item-header .mod-avatar-color-7      { background-color: var(--sync-avatar-color-7); }   /* purple */
.sync-history-list-item-header .mod-avatar-color-8      { background-color: var(--sync-avatar-color-8); }   /* pink */

.sync-history-list-item-header .sync-history-list-item-avatar {
  border-radius: 50%;                          /* circle */
  height:   var(--size-4-8);                   /* 32px */
  width:    var(--size-4-8);
  min-width: var(--size-4-8);
  margin-inline-end: var(--size-4-2);          /* 8px */
  display: flex;
  justify-content: center;
  align-items: center;
  text-transform: uppercase;
  color: var(--text-on-accent);                /* initials are white */
  border: 1px solid rgba(var(--mono-rgb-100), 0.2);   /* 20%-tinted hairline */
}

.sync-history-list-item-header.is-active .sync-history-list-item-avatar {
  border: 1px solid rgba(255, 255, 255, 0.25);  /* tighter contrast against the accent active background */
}

.sync-history-list-item-header:not(.is-active) .sync-history-list-item-avatar.mod-avatar-current-user {
  color: var(--text-normal);                    /* current-user avatar uses normal text since its background is transparent */
}
```

Avatars:
- 32 × 32 circles with 1 px hairline border (20 % mono opacity for non-active rows, 25 % white for active).
- Each user is assigned one of 8 hue colors (avatar-color-1 through -8). The current user gets transparent — its initials use `--text-normal` instead of white.
- Initials are uppercase white (`--text-on-accent`).
- 8 px margin-inline-end so they don't bump the next column.

### 2.4 Item details

```css
.sync-history-list-item-header .sync-history-list-item-details {
  flex-grow: 1;
  cursor: var(--cursor);
  font-size: var(--font-ui-small);             /* 13px */
}

.sync-history-list-item-header .tree-item-flair {
  padding: var(--size-4-1);                    /* 4px */
}

@media (hover: hover) {
  .sync-history-list-item-header .tree-item-flair:hover {
    opacity: 1;
    background-color: var(--background-modifier-hover);
    --nav-collapse-icon-color: var(--text-normal);
  }
}
```

Right side of the row: 13 px text with the timestamp + file count + small flair badge for any row-specific actions.

### 2.5 Version groups (`app.css:18608-18653`)

```css
.sync-history-list-item .version-group-container {
  position: relative;
  margin-bottom: var(--size-4-2);              /* 8px */
}

.sync-history-list-item .version-group-container .connecting-line {
  position: absolute;
  top: 0;
  inset-inline-start: var(--size-4-6);          /* 24px */
  height: 100%;
  width: var(--indentation-guide-width);        /* 1px */
  background-color: var(--indentation-guide-color);
}

.sync-history-list-item .version-group-container .version-group-item {
  padding: var(--size-4-1) var(--size-2-2) var(--size-4-1) var(--size-4-12);
                                                /* 4px 4px 4px 48px — left 48px for the connecting line + indent */
  margin-bottom: var(--size-2-1);              /* 2px */
  border-radius: var(--radius-s);              /* 4px */
  font-size: var(--nav-item-size);             /* 13px */
  line-height: var(--line-height-tight);       /* 1.3 */
  color: var(--nav-item-color);
  font-variant: tabular-nums;
}

.sync-history-list-item .version-group-container .version-group-item:hover {
  background-color: var(--nav-item-background-hover);
  color: var(--nav-item-color-hover);
}

.sync-history-list-item .version-group-container .version-group-item.is-active,
.sync-history-list-item .version-group-container .version-group-item.is-active:hover {
  background-color: var(--nav-item-background-active);
  color: var(--nav-item-color-active);
}
```

Within a sync event header, the user can expand to see individual file versions. Each version is a `.version-group-item` — 13 px nav-style text, 48 px left padding, with a vertical connecting line at 24 px from the inline-start (visualizing the timeline).

### 2.6 Content pane (`app.css:18655+`)

```css
.sync-history-content-container {
  background-color: var(--background-primary);
  padding: 0;
  height: auto;
  display: flex;
  /* …flex column… */
}

.sync-history-content-buttons { /* footer with revert/copy buttons */ }
.sync-history-content-empty { /* empty-state */ }

.sync-history-desc { /* version description */ }
.sync-history-diff { /* the diff view — uses .diff-line styling from buttons.md / general */ }

.sync-history-preview { /* full preview when "view rendered" is selected */ }

.sync-modal-buttons,
.sync-modal-header { /* header / footer controls */ }
```

The content pane on the right shows either:
- A diff view (using `.diff-view` and `.diff-line.mod-left/right` — see `app.css:7694-7733`).
- A rendered preview of the version.
- An empty-state when nothing is selected.

### 2.7 Sync log (`app.css:18783+`)

```css
/* Sync log */
.sync-status-icon {
  /* a single status icon with state classes */
}
.sync-status-icon.mod-spin svg {
  animation: rotation 1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .sync-status-icon.mod-spin svg { animation: none; }
}
```

The status-bar icon for sync state. `.mod-spin` rotates 360° per second; reduced-motion users get a static icon.

---

## 3. Sync vault sharing (`app.css:18800+`)

```css
.sync-vault-share-container {
  display: flex;
  flex-direction: column;
}
.sync-vault-shares-list-item-container {
  overflow: auto;
}
```

Tab inside Sync settings showing share-link rows.

---

## 4. Sync exclude folders (`app.css elsewhere`)

```css
.sync-exclude-folder { /* a row with folder name + remove button */ }
.sync-exclude-folder-name { /* path display */ }
.sync-exclude-folder-remove { /* × button */ }
```

Settings UI for folders excluded from sync.

---

## 5. Reproducer build order

1. The sync-history modal is a sidebar-layout modal: 250 px left list + content pane.
2. List items are 8 px-padded rows with 32 × 32 circular avatars (initials + hue color from the 8-color palette).
3. Active row: solid accent fill, white text. Avatar border tightens to 25 %-white.
4. Current-user avatar uses transparent background + `--text-normal` text — distinct from other users.
5. Expandable groups within a row show a vertical connecting line at 24 px from the inline-start.
6. File recovery uses similar list+content layout but without avatars (it's per-file local history). The text preview switches font/size based on file extension (markdown gets `--font-text`).
7. Diff lines use `.diff-line.mod-left` (red 20 % wash) / `.mod-right` (green 20 % wash); changed runs within a line use 40 % wash via `.diff-changed`.
8. The sync status icon in the status bar uses `@keyframes rotation` for spin; respect `prefers-reduced-motion`.
