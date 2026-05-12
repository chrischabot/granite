# Suggestion & Prompt

> The two related overlay families: **`.prompt`** (the centered "command palette" / "quick switcher" overlay — has its own input field), and **`.suggestion-container`** (the floating popover used by autocomplete inside an editor, by combobox menus, by suggester modals — anchored to a trigger element).

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css`.

---

## 1. `.prompt` — full-screen command/file picker (`app.css:9808-9883`)

### 1.1 DOM scaffold

```
.modal-container               ← shared modal container (z-index 50)
  ├─ .modal-bg                  ← backdrop
  └─ .prompt
       ├─ .prompt-input-container
       │    ├─ <input class="prompt-input" placeholder="…" type="text">
       │    └─ .search-input-clear-button
       ├─ .prompt-results       ← <ul> of .suggestion-item
       │    ├─ .suggestion-item [.is-selected] [.mod-complex] …
       │    └─ … more items …
       └─ .prompt-instructions
            ├─ .prompt-instruction
            │    ├─ .prompt-instruction-command   (e.g. "↵")
            │    └─ "to open"
            └─ … more hints …
```

### 1.2 `.prompt`

```css
.prompt {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-l);              /* 12px */
  background-color: var(--prompt-background);  /* --background-primary */
  box-shadow: var(--shadow-l);
  backdrop-filter: var(--prompt-backdrop-filter); /* none */
  border: var(--prompt-border-width) solid var(--prompt-border-color);
                                                /* 1px solid --color-base-40 */
  z-index: 1;                                   /* relative to .modal-container */
  position: absolute;
  top: 80px;                                    /* fixed offset from container top */
  width:      var(--prompt-width);              /* 700px */
  max-width:  var(--prompt-max-width);          /* 80vw */
  max-height: var(--prompt-max-height);         /* 70vh */
  overflow: hidden;
  corner-shape: var(--corner-shape);
}
```

Reproducer geometry:
- Mounts inside `.modal-container` (so it gets the modal backdrop) but is `position: absolute; top: 80px` — pinned 80 px from the container top, **not** vertically centered.
- 700 px wide × max 70 vh tall, 12 px corner radius, 1 px border in `--color-base-40`.
- z-index 1 inside the container is sufficient because the container itself is at z-index 50.

### 1.3 `.prompt-input-container`

```css
.prompt-input-container {
  --search-clear-button-size: 17px;            /* slightly bigger × than the standard 13px */
  display: flex;
  position: relative;
}
.prompt-input-container .search-input-clear-button {
  inset-inline-end: var(--size-4-4);           /* 16px from end */
}
```

### 1.4 `input.prompt-input`

```css
input.prompt-input {
  width: 100%;
  padding: var(--size-4-6);                    /* 24px all sides */
  padding-inline-end: var(--size-4-12);        /* 48px on the inline-end (room for × button) */
  background-color: transparent;
  font-size: var(--font-ui-medium);            /* 15px */
  border: none;
  height: var(--prompt-input-height);          /* 40px */
  border-radius: 0;
  border-bottom: var(--border-width) solid var(--background-secondary);
                                                /* 1px hair-divider beneath */
}

input.prompt-input:hover,
input.prompt-input:focus,
input.prompt-input:focus-visible {
  border-bottom: var(--border-width) solid var(--background-secondary);
  box-shadow: none;
  background-color: transparent;
}
```

The input loses **all** the standard `<input>` styling (no rounded border, no focus ring, no background). It's a flat 40 px-tall field with a single 1 px bottom divider that doesn't change on focus. This is intentional — the prompt itself is the focus container; the input is just where you type.

Padding is 24 px all around (15 px font sits on a 40 px height because `40 = 24 + 24 - 8` doesn't quite fit — actually the text is centered via CSS line-box).

### 1.5 `.prompt-results`

```css
.prompt-results {
  list-style: none;
  margin: 0;
  padding: var(--size-4-3);    /* 12px */
  overflow-y: auto;
}
```

12 px padding around the list of items; the list itself scrolls when content exceeds `max-height` minus chrome.

### 1.6 `.prompt-instructions`

```css
.prompt-instructions {
  border-top: var(--border-width) solid var(--background-secondary);
  user-select: none;
  font-size: var(--font-ui-smaller);   /* 12px */
  color: var(--text-muted);
  padding: var(--size-4-2);             /* 8px */
  text-align: center;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--size-4-3);                 /* 12px between hint groups */
}
.prompt-instruction { display: inline-block; }
.prompt-instruction-command {
  font-weight: var(--bold-weight);      /* 600 */
  margin-inline-end: var(--size-2-2);   /* 4px */
}
```

The bottom strip with hotkey hints — e.g. "**↵** to open  **⇧↵** to open in new tab  **esc** to dismiss". The command label (the symbol) is bold, separated from its description by 4 px.

---

## 2. `.suggestion-container` — anchored popover (`app.css:9506-9517`, `9962-9976`)

### 2.1 Shared with hover-popover

```css
.popover,
.suggestion-container,
.cm-tooltip.cm-tooltip-autocomplete {
  display: flex;
  position: absolute;
  z-index: var(--layer-popover);          /* 30 */
  background-color: var(--background-primary);
  border: var(--border-width) solid var(--background-modifier-border);
  box-shadow: var(--shadow-s);
  border-radius: var(--radius-m);          /* 8px */
  max-height: var(--popover-max-height);   /* 95vh */
}
```

Three element families share this base:
- `.popover` — file hover preview.
- `.suggestion-container` — generic autocomplete / suggester.
- `.cm-tooltip.cm-tooltip-autocomplete` — CodeMirror's autocomplete tooltip (decorated with the same look so editor autocomplete matches the rest of the app).

### 2.2 Suggestion-container specifics

```css
.suggestion-container {
  background-color: var(--suggestion-background);    /* --background-primary */
  backdrop-filter: var(--suggestion-backdrop-filter);/* none */
  align-self: stretch;
  overflow: hidden;
  flex-direction: column;
  max-width: 500px;
  max-height: 300px;
  z-index: var(--layer-notice);            /* 60 — note: HIGHER than --layer-popover */
}

.is-mobile .suggestion-container {
  max-width: calc(100vw - 20px - var(--safe-area-inset-left) - var(--safe-area-inset-right));
  max-height: 240px;
}
```

The suggestion-container override of `z-index: var(--layer-notice)` (60) places it **above** generic popovers (30) but below menus (65) and tooltips (70). This is intentional — autocomplete must sit above hover popovers but below contextual menus.

500 × 300 maximum on desktop; on mobile uses full viewport width minus safe-area + a smaller 240 px height (since the keyboard takes the lower half).

### 2.3 `.suggestion-bg` (`app.css:9958-9960`, `10222-10230`)

```css
.suggestion-bg { display: none; }                  /* shown only inside modal contexts */

/* Defined twice — second declaration in app.css:10222 */
.suggestion-bg {
  position: fixed;
  top: 0;
  inset-inline-start: 0;
  width: 100%;
  height: 100%;
  background-color: var(--background-modifier-cover);
  z-index: var(--layer-popover);
}
```

A backdrop layer for **suggester modals** (where the suggestion list IS the entire modal — e.g. quick switcher fallback). The first declaration hides it; the second specifies its appearance for when JS sets `display: flex`. Resolution: `display: none` is the default (suggestion containers don't use a backdrop); when used as a modal-substitute, JS overrides to make it visible.

---

## 3. `.suggestion-item` (`app.css:10079-10220`)

### 3.1 Base

```css
.suggestion-item,
.suggestion-empty {
  font-size: var(--font-ui-medium);   /* 15px */
  margin-bottom: 1px;                  /* 1px gap between items */
}

.suggestion-empty-suggestion { color: var(--text-faint); }
.suggestion-empty {
  color: var(--text-muted);
  padding: var(--size-4-2);            /* 8px */
  padding-top: var(--size-4-3);        /* 12px top */
  text-align: center;
}

.suggestion-item {
  cursor: var(--cursor);
  padding: var(--size-2-3) var(--size-4-3);  /* 6px 12px */
  white-space: pre-wrap;
  border-radius: var(--radius-s);            /* 4px */
  corner-shape: var(--corner-shape);
}

.suggestion-item.is-selected,
.suggestion-item.mobile-tap {
  background-color: var(--background-modifier-hover);
}

.suggestion-item.is-being-dragged {
  pointer-events: auto;                /* allow drop targets to capture even while parent is dragging */
  background-color: var(--background-modifier-hover);
}

.suggestion-item.mod-downranked { color: var(--text-muted); }
                                       /* fuzzy-match items that score lower */

.suggestion-item.mod-nowrap {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### 3.2 Toggle item — for "checked" choices (`app.css:10124-10133`)

```css
.is-phone .suggestion-item.mod-toggle {
  --icon-size: var(--icon-l);          /* 18px on phone (bigger touch target) */
  --icon-stroke: var(--icon-l-stroke-width);
}

.suggestion-item.mod-toggle .mod-checked {
  --icon-size: var(--icon-xs);         /* 14px on desktop */
  --icon-stroke: var(--icon-xs-stroke-width);
  order: 2;                            /* puts the checkmark after the label */
}
```

`.mod-toggle` items have a checkmark next to selected options (e.g. "Set value to ✓ Done"). On phones the icon scales up to 18 px for tap accuracy.

### 3.3 Complex items — multi-part (`app.css:10135-10216`)

```css
.suggestion-item.mod-complex {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
}

.suggestion-item.mod-complex .suggestion-title { overflow-wrap: break-word; }

.suggestion-item.mod-complex .suggestion-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-inline-end: auto;             /* push everything to inline-start */
}

.suggestion-item.mod-complex .suggestion-prefix:after { content: ': '; }
.suggestion-item.mod-complex .suggestion-highlight { font-weight: bold; }

.suggestion-item.mod-complex .suggestion-note {
  font-size: 0.8em;                    /* 12px when parent is 15px */
  color: var(--text-muted);
  width: 100%;
  flex-basis: 100%;
  overflow-wrap: break-word;
}

.suggestion-item.mod-complex .suggestion-icon,
.suggestion-item.mod-complex .suggestion-aux {
  display: flex;
  align-items: center;
  align-self: center;
  flex-shrink: 0;
}

.suggestion-item.mod-complex .suggestion-hotkey {
  font-size: var(--font-ui-smaller);   /* 12px */
  font-family: var(--font-interface);
  padding: 2px 6px;
}
.suggestion-item.mod-complex .suggestion-hotkey:not(:last-child) {
  margin-inline-start: 10px;
}

.suggestion-item.mod-complex .suggestion-action {
  font-size: var(--font-ui-smaller);
  font-family: var(--font-interface);
  color: var(--interactive-accent);    /* purple "Open" / "Replace" labels */
}

.suggestion-item.mod-complex .suggestion-flair {
  color: var(--text-muted);
  opacity: var(--icon-opacity);        /* 0.85 */
  display: flex;
  align-items: center;
}
.suggestion-item.mod-complex .suggestion-flair:not(:last-child) {
  margin-inline-start: 6px;
}

.suggestion-item.mod-complex .suggestion-icon .suggestion-flair {
  margin-top: 0;
  margin-inline-start: var(--size-4-1);   /* 4px */
  margin-bottom: 0;
  margin-inline-end: var(--size-4-3);     /* 12px */
}
.suggestion-item.mod-complex .suggestion-aux .suggestion-flair {
  margin-top: 0;
  margin-inline-start: var(--size-4-3);
  margin-bottom: 0;
  margin-inline-end: var(--size-4-1);
}

.suggestion-highlight { font-weight: bold; }
```

DOM for a complex suggestion item (the most general form, used by command palette):

```
<div class="suggestion-item mod-complex [.is-selected] [.mod-downranked]">
  <div class="suggestion-icon">
    [svg icon]
    <span class="suggestion-flair">⌘</span>      ← optional flair/badge inside icon column
  </div>
  <div class="suggestion-content">
    <div class="suggestion-title">
      <span class="suggestion-prefix">command</span>   ← "command: "  (with auto colon)
      <span class="suggestion-highlight">Tog</span>gle theme        ← bold matched chars
    </div>
    <div class="suggestion-note">From the appearance settings</div>  ← optional sub-line
  </div>
  <div class="suggestion-aux">
    <span class="suggestion-hotkey">⌘ T</span>       ← keyboard shortcut
    <span class="suggestion-flair">PRO</span>         ← optional badge
    <span class="suggestion-action">Open</span>        ← purple action label
  </div>
</div>
```

Layout responsibilities:
- Outer `.suggestion-item.mod-complex` is `display: flex; justify-content: space-between; align-items: baseline`.
- `.suggestion-icon` (left column): flex-shrink:0, vertically centered.
- `.suggestion-content` (middle column): flex column, `margin-inline-end: auto` pushes auxiliary content to the right.
- `.suggestion-aux` (right column): flex-shrink:0, vertically centered, contains hotkey + action labels.
- `.suggestion-note` is `flex-basis: 100%` — it takes a new line below within the content column.

### 3.4 Secret-key suggestion (`app.css:5669-5690`) — used in keychain modal

```css
.suggestion-item.mod-complex.suggestion-secret-key {
  --checkbox-size: 18px;
  align-items: center;
  gap: var(--size-4-1);
}
.suggestion-item.mod-complex.suggestion-secret-key.is-selected {
  background-color: hsla(var(--color-accent-hsl), 0.15);   /* 15% accent fill — different from default hover */
}
.suggestion-item.mod-complex.suggestion-secret-key .flair { color: var(--text-accent); }
.suggestion-item.mod-complex.suggestion-secret-key .suggestion-content {
  align-items: center;
  flex-direction: row;
}
.suggestion-item.mod-complex.suggestion-secret-key .suggestion-secret-text {
  margin: 0 var(--size-4-1);
}
```

Specialized shape for the secret-key suggester (used during password import). Bigger checkbox (18 px), accent-tinted selection background.

---

## 4. `.suggestion-flair`, `.suggestion-icon` shared icon sizing (`app.css:8219-8225`)

```css
.suggestion-flair .svg-icon,
.menu-item-icon .svg-icon,
.workspace-tab-header-inner-icon .svg-icon { …(see icons-and-assets.md)… }
```

Icons inside suggestion-flair, menu-item-icon, and tab-header-inner-icon all share a shared `.svg-icon` size rule (defined elsewhere). See `icons-and-assets.md`.

---

## 5. Reproducer build order

### `.prompt`
1. Mount `.prompt` inside `.modal-container` so it gets the modal backdrop. Position is `absolute; top: 80px; width: 700px; max-width: 80vw; max-height: 70vh`.
2. The input is **flat** — no border, no shadow, no rounded corners. Only a 1 px bottom divider in `--background-secondary` that does not change on focus.
3. Padding 24 px all sides + extra 24 px on inline-end for the clear button (total 48 px).
4. Results list is a `<ul>` with 12 px padding and `overflow-y: auto`.
5. Bottom instructions strip is centered, 12 px font, 8 px padding, 12 px gap between hint groups; commands (the symbol) are bold.

### `.suggestion-container`
1. Mount as a direct body child or inside the editor (CodeMirror creates its own `.cm-tooltip.cm-tooltip-autocomplete` inside the editor's overlay layer). Use the shared base shape: 1 px border, `--shadow-s`, 8 px radius, `--background-primary` fill.
2. Default `max-width: 500px; max-height: 300px`. Mobile drops to `100vw - 20px - safe-area` × 240 px.
3. z-index is **60** — higher than the generic `.popover` z-index (30). This is what keeps autocomplete above hover-previews.

### `.suggestion-item`
1. Default item is `padding: 6px 12px; margin-bottom: 1px; border-radius: 4px`. The 1 px margin between items is the only "separator" — there is no actual separator element.
2. `.is-selected` uses `--background-modifier-hover` — same as `.menu-item.selected`.
3. `.mod-complex` is the multi-column form: `flex; justify-content: space-between; align-items: baseline`. The middle column's `margin-inline-end: auto` is what produces the "title left, hotkey/action right" arrangement.
4. `.suggestion-note` uses `flex-basis: 100%` to break onto a new line below the title.
5. `.suggestion-action` is the purple "Open" label — uses `--interactive-accent`. Always at the inline-end of the item.
6. `.suggestion-highlight` and `.suggestion-prefix:after { content: ': ' }` are CSS-only — JS just emits the spans.
