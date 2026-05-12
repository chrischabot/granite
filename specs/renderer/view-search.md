# View — Search (Global Search)

> The left-sidebar pane that searches across all files in the vault. Has its own input header with a magnifying-glass icon, an optional search-suggest button, and a results tree with per-match snippets.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css`.

---

## 1. DOM scaffold

```
.workspace-leaf-content[data-type="search"]
  └─ .view-content
       ├─ .nav-header
       │    └─ .global-search-input-container.search-input-container
       │         ├─ <input type="search" placeholder="Search…">
       │         ├─ .search-input-clear-button       ← × clear
       │         ├─ .search-input-suggest-button     ← optional helper
       │         └─ .input-right-decorator           ← optional case-sensitive toggle, etc.
       ├─ .search-info-container        ← optional "showing N results" header
       ├─ .search-results-info          ← match-count + sort dropdown
       └─ .search-result-container [.mod-global-search] [.is-loading]
            └─ .tree-item.search-result [.is-collapsed] [.has-focus]
                 ├─ .tree-item-self.search-result-file-title (file name + match count)
                 └─ .tree-item-children
                      └─ .search-result-file-matches
                           ├─ .search-result-file-match [.has-focus]
                           │    ├─ (snippet text, with .search-result-file-matched-text wrapping the match)
                           │    └─ .search-result-file-match-replace-button
                           └─ … more matches …
```

---

## 2. `.search-input-container` — the search input shell (`app.css:17771-17847`)

### 2.1 Container + leading magnifying-glass icon

```css
.search-input-container {
  position: relative;
}
.search-input-container:before {
  top: calc((var(--input-height) - var(--search-icon-size)) / 2);   /* (30 - 18) / 2 = 6px */
  inset-inline-start: var(--size-4-2);                              /* 8px */
  position: absolute;
  content: '';
  height: var(--search-icon-size);                                  /* 18px */
  width:  var(--search-icon-size);
  display: block;
  background-color: var(--search-icon-color);                       /* --text-muted */
  -webkit-mask-image: url("data:image/svg+xml,<svg viewBox='0 0 24 24' …><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>");
  -webkit-mask-repeat: no-repeat;
}

.search-input-container input {
  display: block;
  width: 100%;
  padding-inline-start: 36px;             /* leave room for the magnifying glass */
}
```

The magnifying-glass icon is painted as a **pseudo-element mask**. The `::before` is `width × height × background-color` (so we control color via CSS), and the SVG is the mask shape. This pattern lets the icon retint per state without needing two SVGs.

The icon is 18 × 18, positioned 8 px from the leading edge, vertically centered using `(input-height − icon-size) / 2 = 6 px`.

### 2.2 Clear button

```css
.search-input-clear-button {
  position: absolute;
  background: transparent;
  border-radius: 50%;                     /* circle */
  color: var(--search-clear-button-color);
  cursor: var(--cursor);
  top: 0;
  inset-inline-end: 2px;
  bottom: 0;
  line-height: 0;
  height: var(--input-height);            /* 30px */
  width: 28px;
  margin: auto;
  padding: 0;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: color var(--anim-duration-fast) ease-in-out;
}
.search-input-clear-button:after {
  content: '';
  height: var(--search-clear-button-size); /* 13px */
  width:  var(--search-clear-button-size);
  display: block;
  background-color: currentColor;
  -webkit-mask-image: url("data:image/svg+xml,<svg viewBox='0 0 12 12'><path d='M6 12C9.31 12 12 9.31 12 6C12 2.68 9.31 0 6 0C2.68 0 0 2.68 0 6C0 9.31 2.68 12 6 12ZM3.87 3.09L6 5.22L8.12 3.09L8.90 3.87L6.77 6L8.90 8.12L8.12 8.90L6 6.77L3.87 8.90L3.09 8.12L5.22 6L3.09 3.87L3.87 3.09Z'/></svg>");
  -webkit-mask-repeat: no-repeat;
}
.search-input-clear-button:hover,
.search-input-clear-button:active {
  color: var(--text-normal);
  transition: color var(--anim-duration-fast) ease-in-out;
}
```

The × is also a mask SVG (a filled-circle with an inset cross). Stays positioned at the inline-end of the input. `display: none` when the input has placeholder showing (see `inputs.md` §5).

### 2.3 Suggest button (`app.css:17831-17846`)

```css
.search-input-suggest-button {
  position: absolute;
  left: 0;
  top: 0;
  color: var(--text-faint);
  cursor: var(--cursor);
  padding: var(--size-4-1) var(--size-4-2);   /* 4px 8px */
  opacity: 0;
  z-index: 10;
}

@media (hover: hover) {
  .search-input-suggest-button:hover { color: var(--text-muted); }
}
```

A **transparent overlay** that captures clicks on the magnifying glass area to open the search-syntax helper popover. It's `opacity: 0` (so it doesn't paint anything) but `z-index: 10` (so it captures clicks). Hovering brightens text (visible only because of the popover's effect, not the button itself).

---

## 3. Search results

### 3.1 `.search-result-container` (`app.css:17848-17873`)

```css
.search-result-container {
  padding: var(--size-4-3) var(--size-4-3) var(--size-4-4);   /* 12px 12px 16px */
  position: relative;
  flex: 1 0 0;
}

.search-result-container.mod-global-search {
  overflow-y: auto;
  padding-bottom: max(var(--safe-area-inset-bottom), var(--size-4-3));
}

.search-result-container:before {
  content: ' ';
  position: absolute;
  top: 0;
  width: 0;
  height: 3px;
}

.search-result-container.is-loading:before {
  background-color: var(--interactive-accent);
  animation: 1000ms ease-in-out 300ms infinite progress-bar;
}
```

The result container scrolls. While searching, a 3 px accent-colored animated bar runs across the top via `@keyframes progress-bar` (see `animations.md`).

### 3.2 `.search-result` and file title (`app.css:17975-17992`)

```css
.search-result { word-break: break-word; }

.search-result:not(.is-collapsed) .search-result-file-title {
  color: var(--nav-item-color-active);   /* --text-normal */
}

.search-result-file-matches {
  font-size: var(--font-ui-smaller);     /* 12px */
  line-height: var(--line-height-tight); /* 1.3 */
  background-color: var(--search-result-background);    /* --background-primary */
  border-radius: var(--radius-s);                       /* 4px */
  overflow: hidden;
  margin: var(--size-4-1) 0 var(--size-4-2);            /* 4px top, 8px bottom */
  color: var(--text-muted);
  box-shadow: 0 0 0 var(--border-width) var(--background-modifier-border);
                                                        /* 1px outline */
}

.search-result-file-matches:empty { display: none; }
```

Each file result has a title row (using tree-item) and a match-list block:
- Match list: 12 px / 13 px tight, with a 1 px inset border (via box-shadow), 4 px radius. Background is `--background-primary` (page color, not the parent sidebar color) — match cards stand off from the sidebar.

### 3.3 `.search-result-file-match` (`app.css:18002-18029`)

```css
.search-result-file-match {
  cursor: var(--cursor);
  position: relative;
  padding: var(--size-4-2) var(--size-4-5) var(--size-4-2) var(--size-4-3);
                                                        /* 8px 20px 8px 12px */
  white-space: pre-wrap;
  width: 100%;
  border-bottom: var(--border-width) solid var(--background-modifier-border);
}
.search-result-file-match:last-child { border-bottom: none; }

@media (hover: hover) {
  .search-result-file-match:hover {
    color: var(--text-normal);
    background-color: var(--text-selection);    /* 20% accent (light) / 33% (dark) */
  }
  .search-result-file-match:hover .search-result-file-match-replace-button {
    display: block;                              /* reveal replace button on hover */
  }
}
.search-result-file-match.mobile-tap {
  color: var(--text-normal);
  background-color: var(--text-selection);
}
```

Each snippet:
- 8 px top/bottom × 12 px / 20 px asymmetric padding (extra room on the inline-end for buttons).
- 1 px bottom border between matches; the last match has no border.
- Hover paints `--text-selection` (the same accent-tinted overlay as text selection in the editor) — so hover visually previews "this is the match that will be selected".
- Replace button hidden by default, revealed on hover (only when in replace mode).

### 3.4 `.search-result-file-matched-text` (`app.css:18072-18075`)

```css
.search-result-file-matched-text {
  color: var(--text-normal);
  background-color: var(--text-highlight-bg);   /* rgba(255, 208, 0, 0.4) */
}
```

The matched substring inside the snippet text is wrapped in `.search-result-file-matched-text` and gets a yellow highlight (40 % opacity).

### 3.5 `.search-result-file-match-replace-button` (`app.css:18031-18046`)

```css
.search-result-file-match-replace-button {
  display: none;          /* hidden until hover */
  position: absolute;
  height: auto;
  bottom: 5px;
  inset-inline-end: 24px;
  padding: var(--size-4-1) var(--size-4-2);
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}
@media (hover: hover) {
  .search-result-file-match-replace-button:hover { color: var(--text-normal); }
}
```

The "Replace" link sits absolute-positioned at bottom-right of each snippet. Visible only on hover.

### 3.6 `.search-result-hover-button` (`app.css:18048-18070`)

```css
.search-result-hover-button {
  position: absolute;
  display: flex;
  inset-inline-end: 2px;
  border-radius: var(--radius-s);
  color: var(--text-faint);
  padding: 1px 3px;
}
@media (hover: hover) {
  .search-result-hover-button:hover {
    opacity: 1;
    background-color: var(--background-modifier-hover);
  }
}
.search-result-hover-button.mod-top    { top: 2px; }
.search-result-hover-button.mod-bottom { bottom: 2px; }
```

Small action buttons that appear on top-right or bottom-right of a result during hover (e.g. expand / collapse / pin).

---

## 4. Search results info (`app.css:17848-17865`, `18159-18173`)

```css
.search-results-info {
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: var(--border-width) solid var(--background-modifier-border);
  margin: 0;
  min-width: 0;
  padding: 0 var(--size-4-3) var(--size-4-2);   /* 0 12px 8px */
  white-space: nowrap;
}
.search-results-info .dropdown {
  height: 24px;
  box-shadow: none;
  background-color: transparent;
  /* …more rules trimmed; the dropdown inside search-info is flat (no shadow, transparent bg) */
}
```

The info row above results — left side shows match count ("12 results in 4 files"), right side shows a sort/group dropdown. The dropdown here is a **flat** override of the standard dropdown: no shadow, no background.

### 4.1 `.search-info-container` and `.search-info-children` (`app.css:18077-18091`)

```css
.search-info-container {
  color: var(--text-muted);
  padding: var(--size-4-1) var(--size-4-4) var(--size-4-2);
  font-size: var(--font-ui-smaller);
}
.search-info-container:empty { display: none; }

.search-info-children {
  padding-inline-start: 20px;
  border-inline-start: var(--border-width) solid var(--background-modifier-border);
  margin: 1px 0;
}
```

Used for grouped or hierarchical search info (e.g. "Showing matches in folder X" with sub-items). Indented 20 px with a 1 px guide line (mirroring the tree-item-children indent guide).

### 4.2 `.search-empty-state` (`app.css:17968-17973`)

```css
.search-empty-state {
  color: var(--text-faint);
  font-size: var(--font-ui-small);
  margin: 0 0 var(--size-4-3);
  padding-inline-start: var(--size-4-2);
}
```

Shown when no results. Faint, 13 px, 8 px left padding, 12 px bottom margin.

---

## 5. Copy search results (`app.css:18093-18106`)

```css
.copy-search-result-container { display: flex; flex-direction: column; }
.copy-search-result-textarea {
  height: 300px;
  max-height: 20vh;
  resize: none;
}
.copy-search-result-textarea + .setting-item { border-top: none; }
```

A modal pops up to copy results as text — the textarea is 300 px tall (capped at 20 vh), non-resizable. The setting-item that follows it (configuration options) has its top border removed for visual continuity.

---

## 6. Destination-file pills (`app.css:18108-18152`)

```css
.search-result-file-match-destination-file-container {
  display: flex;
  flex-wrap: wrap;
  margin-top: var(--size-2-3);                /* 6px */
  gap: var(--size-2-1);                       /* 2px */
}

.search-result-file-match-destination-file {
  display: inline-flex;
  background-color: var(--interactive-normal);
  border-radius: var(--radius-s);
  box-shadow: var(--input-shadow);
  color: var(--text-muted);
  padding: var(--size-2-2) var(--size-2-3);   /* 4px 6px */
}

@media (hover: hover) {
  .search-result-file-match:hover .search-result-file-match-destination-file {
    background-color: var(--background-secondary);
  }
  .search-result-file-match:hover .search-result-file-match-destination-file:hover {
    background-color: var(--interactive-hover);
    box-shadow: var(--input-shadow-hover);
    color: var(--text-normal);
  }
}

.search-result-file-match-destination-file-icon {
  --icon-size: var(--icon-xs);                /* 14px */
  --icon-stroke: var(--icon-xs-stroke-width);
  margin-inline-end: var(--size-4-1);         /* 4px */
  display: flex;
  color: var(--text-faint);
}
.search-result-file-match-destination-file-icon .svg-icon {
  align-self: center;
}

.search-result-file-match-destination-file-name {
  white-space: pre-wrap;
  word-break: break-all;
}
```

When a snippet shows a backlink-target, the destination file is rendered as a pill (icon + name) using button-style chrome. Multiple destinations wrap.

---

## 7. Focus rings (`app.css:18153-18157`)

```css
body:not(.is-phone) .workspace-leaf.mod-active .search-result.has-focus .tree-item-self,
body:not(.is-phone) .workspace-leaf.mod-active .search-result-file-match.has-focus {
  border-radius: var(--radius-s);
  box-shadow: inset 0 0 0 var(--input-border-width-focus) var(--background-modifier-border-focus);
                                              /* 2px inset ring */
}
```

When the search pane has DOM focus and a result/match has `.has-focus` (keyboard nav target), it gets a 2 px **inset** ring (so it doesn't shift the surrounding layout).

---

## 8. Reproducer build order

1. The search input uses `.search-input-container` with the magnifying glass painted as a `::before` mask. 8 px from the leading edge, 36 px left padding on the input.
2. The clear button is a 28 px circular button at the inline-end of the input, its × is also a mask-image. Hidden when input has placeholder showing.
3. Results live in `.search-result-container.mod-global-search` (scrollable). A 3 px progress bar runs at the top during loading via `@keyframes progress-bar`.
4. Each file's matches are wrapped in `.search-result-file-matches` — a card with a 1 px inset hairline and 4 px radius, using `--background-primary` background to stand off from the sidebar.
5. Each match (`.search-result-file-match`) is 8 × 12/20 padded with a 1 px bottom border between siblings. Hover paints `--text-selection` (accent-tinted), revealing the replace button.
6. Matched substrings inside snippets get the yellow highlight (`--text-highlight-bg` = `rgba(255, 208, 0, 0.4)`).
7. The sort dropdown in the info row is **flat** — no shadow, transparent background. Override the standard `.dropdown` chrome locally.
8. Keyboard focus uses **inset** 2 px ring (rather than outer) so the row geometry doesn't shift.
9. Destination-file pills inside snippets (for backlinks) use button-style chrome with `--input-shadow`.
10. The `.search-input-suggest-button` is `opacity: 0` overlay — invisible but click-capturing. This is what lets clicking the magnifying-glass open a search-syntax popover.
