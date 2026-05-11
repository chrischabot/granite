# View — Webviewer (browser)

> The built-in browser tab. Renders external URLs in an Electron `<webview>`, with an address-bar input, autocomplete suggestions, and a reader-mode fallback.

Source: `renderer/app.css:20025-20188`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. DOM scaffold

```
.workspace-leaf-content[data-type="browser"]
  └─ .view-header
       ├─ .view-header-left
       │    └─ .view-header-reload-button .clickable-icon
       ├─ .view-header-title-container
       │    └─ .webviewer-address-container
       │         └─ .webviewer-address [.view-header-always-show]
       │              ├─ .webviewer-favicon-container
       │              └─ <input type="text">                ← URL input
       └─ .view-actions
            └─ .view-action.mod-webviewer .clickable-icon … ← bookmark, share, back, forward
  └─ .view-content.webviewer-content
       ├─ <webview src="https://…">                          ← Electron webview
       └─ .reader-mode-content [.is-readable-line-width]
            └─ .markdown-preview-view                         ← reader-mode HTML
```

Address-bar autocomplete shows a `.suggestion-container` with `.webviewer-addressbar-suggestion.suggestion-item` rows.

---

## 2. `.webviewer-favicon-container` (`app.css:20025-20033`)

```css
.webviewer-favicon-container {
  display: flex;
  align-items: center;
}
.webviewer-favicon-container > * {
  height:    var(--icon-size);
  max-width: var(--icon-size);
}
```

The favicon container shows the site's favicon (16 × 16). Always sized via `--icon-size`.

---

## 3. `.view-action.mod-webviewer` (`app.css:20035-20038`)

```css
.view-action.mod-webviewer {
  --icon-color:       var(--icon-color-active);
  --icon-color-hover: var(--icon-color-active);
}
```

Webviewer view-actions use `--text-accent` color even in their default state — they're always "highlighted" because they're the only chrome adjacent to live external content.

---

## 4. `.webviewer-container` and address area (`app.css:20040-20078`)

```css
.webviewer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workspace-leaf-content[data-type="browser"] .view-header {
  gap: 0;
}

.view-header-always-show {
  display: flex !important;            /* show even when --show-view-header is off */
}

.view-header-reload-button {
  display: flex;
  align-items: center;
  --icon-size: var(--icon-s);           /* 16px */
}

.webviewer-address {
  width: 100%;
  display: flex;
  margin: 0 2px;
}

.webviewer-address input {
  flex-grow: 1;
  min-width: 50px;
}

.webviewer-address-container {
  padding: 0 var(--size-4-2);          /* 0 8px */
}

.webviewer-address-container::after {
  background: transparent !important;   /* override standard view-header-title gradient fade */
}
```

The address bar replaces the view-header title. The container has explicit `padding: 0 8px` and overrides the `::after` gradient that normally fades the title. The address itself is a flex row: `[favicon] [input grow]`. Reload button is 16 px on the left.

---

## 5. Address-bar autocomplete suggestions (`app.css:20080-20133`)

```css
.webviewer-addressbar-suggestion.suggestion-item {
  gap: var(--size-4-2);                /* 8px */
  align-items: center;
}

.webviewer-addressbar-suggestion.suggestion-item .suggestion-flair-left,
.webviewer-addressbar-suggestion.suggestion-item .suggestion-icon:first-child {
  color: var(--text-muted);
  --icon-size:   var(--icon-s);        /* 16px */
  --icon-stroke: var(--icon-s-stroke-width);
  display: flex;
  min-width: var(--icon-s);
}

.webviewer-addressbar-suggestion.suggestion-item .suggestion-flair-left img,
.webviewer-addressbar-suggestion.suggestion-item .suggestion-icon:first-child img {
  height: var(--icon-size);
  max-width: var(--icon-size);
}

.webviewer-addressbar-suggestion.suggestion-item .suggestion-icon:last-child:empty {
  display: none;
}

.webviewer-addressbar-suggestion.suggestion-item > .suggestion-content {
  align-items: baseline;
  flex-direction: row;                  /* title and URL side-by-side */
  flex-grow: 1;
}

.webviewer-addressbar-suggestion.suggestion-item > .suggestion-content > .suggestion-title {
  max-width: 75%;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-wrap: nowrap;
  font-size: var(--font-ui-medium);    /* 15px */
}

.webviewer-addressbar-suggestion.suggestion-item > .suggestion-content > .suggestion-url {
  overflow: hidden;
  text-overflow: ellipsis;
  text-wrap: nowrap;
  font-size: var(--font-ui-small);     /* 13px */
  color: var(--text-muted);
}

.webviewer-addressbar-suggestion.suggestion-item > .suggestion-content .suggestion-title + .suggestion-url {
  margin-left: var(--size-4-2);
}

.webviewer-addressbar-suggestion.suggestion-item > .suggestion-content .suggestion-title:empty + .suggestion-url {
  margin-left: 0;
}
```

Each suggestion shows favicon + title (15 px, max 75 % width) + URL (13 px, muted, takes remaining width). Title and URL are side-by-side (not stacked like other suggestion-items).

---

## 6. `.webviewer-content` (`app.css:20135-20171`)

```css
.view-content.webviewer-content { padding: 0; }

.webviewer-content {
  border-top: var(--border-width) solid var(--divider-color);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.webviewer-content webview {
  flex-grow: 1;
  width: 100%;
}

.webviewer-content .reader-mode-content {
  overflow-y: auto;
}

.webviewer-content .reader-mode-content.is-readable-line-width .markdown-preview-sizer {
  max-width: var(--file-line-width);    /* 700px */
  margin-left: auto;
  margin-right: auto;
}

.webviewer-content .markdown-preview-view .external-link {
  /* Hide the external link icon — already in a webviewer */
  background-image: none;
  padding-right: 0;
}

.webviewer-content .error-notice {
  max-width: var(--file-line-width);
  margin: 25% auto 0;
  padding: var(--file-margins);
}
```

Content area:
- 1 px top border separates it from the address bar.
- Hosts either the live `<webview>` (full-width, flex-grow) or the reader-mode HTML rendering (scrollable column).
- Reader mode caps at 700 px when `is-readable-line-width` is on.
- External-link arrows are suppressed inside the webviewer (the user is already browsing).
- Error notice (when load fails) sits centered 25 % from top.

---

## 7. History view (`app.css:20174-20177`)

```css
.webviewer-history-view-item {
  text-wrap: nowrap;
  overflow: hidden;
}
```

The browser history pane shows visited URLs as nowrap text with overflow hidden — a single-line-per-entry layout.

---

## 8. Settings — adblock list (`app.css:20180-20188`)

```css
textarea.webviewer-adblock-lists {
  flex-grow: 1;
}

.list-container.mod-manage-workspaces {
  margin-top: var(--size-4-4);
  padding-top: var(--size-4-1);
  border-top: var(--border-width) solid var(--divider-color);
}
```

Adblock filter-list textarea fills its container. Workspace-management list gets a 1 px top divider.

---

## 9. Reproducer build order

1. Render an Electron `<webview>` inside `.webviewer-content`. JS sets `src` based on the URL input.
2. Replace the view-header's title with the address bar via `.webviewer-address-container`. Show favicon + URL input.
3. View-actions (reload, back, forward, bookmark) use `.view-action.mod-webviewer` — accent-colored even in default state.
4. Address-bar autocomplete is a `.suggestion-container` with `.webviewer-addressbar-suggestion` items — title + URL side-by-side, favicon on the left.
5. Reader mode falls back to a `.markdown-preview-view` (using the standard reading-mode chrome) — `.is-readable-line-width` caps to 700 px.
6. Suppress the external-link arrow icons inside the webviewer.
7. Error notices center at 25 % from top with `--file-margins` padding.
8. Address-bar overrides the standard view-header title gradient — `.webviewer-address-container::after { background: transparent !important; }`.
