# Editor — Document Search & Replace

> The find/replace bar that appears at the top of the active document. Triggered by Cmd/Ctrl+F (find) or Cmd/Ctrl+H (replace).

Source: `renderer/app.css:7735-7820`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. DOM scaffold

```
.markdown-source-view.is-searching          ← flips column-reverse so search lands on top
  └─ .document-search-container [.mod-replace-mode]
       ├─ .document-search
       │    ├─ .document-search-input.search-input-container [input.mod-no-match]
       │    │    ├─ <input type="search">
       │    │    ├─ .input-right-decorator     ← case-sensitive, regex, etc.
       │    │    └─ .search-input-clear-button
       │    ├─ .document-search-count           ← "1 / 4"
       │    └─ .document-search-buttons
       │         ├─ .document-search-button   ← prev
       │         ├─ .document-search-button   ← next
       │         └─ .document-search-button   ← toggle replace
       └─ .document-replace                     ← only visible when .mod-replace-mode
            ├─ .document-replace-input.search-input-container
            └─ .document-replace-buttons
                 ├─ .document-search-button   ← replace
                 └─ .document-search-button   ← replace all
```

---

## 2. Top-of-document positioning (`app.css:7739-7748`)

```css
.markdown-reading-view.is-searching,
.markdown-source-view.is-replacing,
.markdown-source-view.is-searching {
  flex-direction: column-reverse;             /* flip so search-bar (last child) lands on top */
}

.mod-active .document-search-container {
  background-color: var(--background-primary);
}
```

The trick: the `.document-search-container` is **always the last child** of the source/reading view. When the view sets `flex-direction: column-reverse`, the search bar appears at the visual top while keeping the natural DOM order (search bar after content). This avoids reordering DOM mid-search.

The active leaf's search container gets `--background-primary` background so it stays opaque over the editor.

---

## 3. `.document-search-container` (`app.css:7750-7757`)

```css
.document-search-container {
  display: flex;
  flex-direction: column;
  padding: var(--size-4-2) 0;                  /* 8px top/bottom */
  margin: 0 var(--size-4-4);                   /* 0 16px sides */
  gap: var(--size-4-2);                        /* 8px between search and replace rows */
  z-index: var(--layer-popover);               /* 30 — above editor content */
}
```

Container is a flex column (search row above replace row). 8 px gap between rows when both are visible. z-index 30 — above editor content but below modals.

---

## 4. Search and replace rows (`app.css:7759-7775`)

```css
.document-search,
.document-replace {
  width: 100%;
  max-width: var(--file-line-width);           /* 700px */
  margin: 0 auto;
  display: flex;
  padding: 0 var(--size-4-2);                  /* 0 8px */
  gap: var(--size-4-2);                        /* 8px */
}

.document-replace { display: none; }

.document-search-container.mod-replace-mode .document-replace { display: flex; }
```

Each row:
- Capped at 700 px (matches `--file-line-width` so the bar visually aligns with `is-readable-line-width` content).
- Centered with auto margins.
- 8 px horizontal padding + 8 px column gap.
- Replace row hidden by default; `.mod-replace-mode` reveals it.

---

## 5. Inputs (`app.css:7777-7793`)

```css
.document-search-input,
.document-replace-input {
  flex-grow: 1;                                 /* take remaining row space */
}

.document-search-input.mod-no-match,
.document-replace-input.mod-no-match {
  background-color: rgba(var(--background-modifier-error-rgb), 0.2);
                                                 /* 20% red wash on no-match */
}

@media (hover: hover) {
  .document-search-input.mod-no-match:hover,
  .document-replace-input.mod-no-match:hover {
    background-color: rgba(var(--background-modifier-error-rgb), 0.2);
                                                 /* same — don't lighten on hover */
  }
}
```

When the search query has no matches, the input's background goes 20 % red. Hover keeps the same color (don't visually suggest interactivity will fix it).

---

## 6. Match counter (`app.css:7795-7807`)

```css
.document-search-count {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);             /* 12px */
  font-variant-numeric: tabular-nums;
  position: absolute;
  transform: translateY(-50%);
  top: 50%;
  inset-inline-end: var(--size-4-2);             /* 8px from inline-end */
}

.search-input-clear-button ~ .document-search-count {
  inset-inline-end: var(--size-4-8);             /* 32px when clear button is visible */
}
```

The "1 / 4" counter is absolute-positioned inside the search input, vertically centered. Tabular numerals so the counter doesn't shift width as the user types. When the clear button is visible (`.search-input-clear-button` siblings), the counter moves left by 32 px to clear the × button.

---

## 7. Action buttons (`app.css:7809-7819`)

```css
.document-replace-buttons,
.document-search-buttons {
  display: flex;
  gap: var(--size-4-1);                          /* 4px */
  align-items: center;
}

.document-search-button {
  font-size: var(--font-ui-small);               /* 13px */
  color: var(--text-muted);
}
```

Buttons (prev/next/replace/replace-all) are `.document-search-button` — 13 px / muted. They're really just `.clickable-icon`s with this small additional override. Hover/active states come from the standard `.clickable-icon` rules (see `buttons.md`).

---

## 8. Live-preview integration (`app.css:7843-7848`)

```css
.markdown-source-view.mod-cm6 .document-search-container {
  flex: 0 0 auto;                                /* don't grow */
}

.cm-s-obsidian span.cm-highlight.obsidian-search-match-highlight {
  background-color: var(--text-selection);
}
```

In source mode, the document-search-container is `flex: 0 0 auto` so it takes only its natural height — the editor below grows to fill remaining space. The active match in the editor gets a `--text-selection` highlight (the same accent-tinted overlay used for normal selection).

---

## 9. Reading-mode integration (`app.css:7821-7841`)

```css
.markdown-rendered .search-highlight > div {
  position: absolute;
  pointer-events: none;
  box-shadow: 0 0 0px 2px var(--text-normal);
  opacity: 0.3;
  mix-blend-mode: var(--highlight-mix-blend-mode);
  border-radius: 2px;
}

.markdown-rendered .search-highlight > div.is-active {
  box-shadow: 0 0 0px 3px var(--text-accent);
  opacity: 1;
}
```

In reading mode, search highlights are **outline-only** absolute-positioned divs (no fill). 30 %-opacity 2 px text-color outline for non-active matches; 100 %-opacity 3 px accent outline for the active match. `mix-blend-mode` ensures the outlines stay visible over varying content.

(Cross-references in `editor-reading-mode.md` §8.)

---

## 10. Reproducer build order

1. The search container is **always the last child** of the source/reading view. Use `flex-direction: column-reverse` on `.is-searching` / `.is-replacing` to flip it visually to the top.
2. Bar is centered, capped at 700 px (`--file-line-width`), 8 px horizontal padding.
3. Search and replace inputs grow to fill the row. No-match state paints 20 % red wash.
4. Match counter is absolute-positioned with tabular numerals; shifts 24 px left when clear button is present.
5. Buttons are 13 px muted text, otherwise standard `.clickable-icon` chrome.
6. z-index 30 (`--layer-popover`) — above editor, below modals.
7. Active match in editor: `--text-selection` background; in reading mode: 3 px accent outline.
8. Non-active match in reading mode: 30 %-opacity 2 px outline in `--text-normal`.
9. Use `mix-blend-mode: var(--highlight-mix-blend-mode)` on highlights so they stay legible regardless of underlying content.
