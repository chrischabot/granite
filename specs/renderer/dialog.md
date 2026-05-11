# Dialog

> The standard small-modal "are you sure?" / "give input" surface. **`.dialog` is not the standard Obsidian modal** — see [`modal.md`](modal.md) for that. The selector `.dialog` in `app.css:335-700` is the **pdf.js password-prompt and pdf-internal dialog** styling, vendored from upstream pdf.js.

Source: `renderer/app.css:335-700` (pdf.js dialogs). Tokens: see [`design-tokens.md`](design-tokens.md) §6.

---

## 1. The Obsidian "dialog" token family

Obsidian exposes three width/height tokens for what users typically call "a dialog" (`design-tokens.md` §6):

```
--dialog-width:      560px
--dialog-max-width:  80vw
--dialog-max-height: 85vh
```

These are consumed by `.modal { width: var(--dialog-width); max-width: var(--dialog-max-width); max-height: var(--dialog-max-height); }` (see `modal.md` §4.1). So **the standard Obsidian dialog is just a default-size `.modal`** — there is no separate `.dialog` class for it.

---

## 2. The `.dialog` selector (pdf.js)

`.dialog` in `app.css:335-700` styles pdf.js's internal dialogs (password prompt, save-as confirmation, etc.). The styling is upstream pdf.js with theme-token mapping:

```css
.dialog { /* container styling */ }
.dialog * { /* generic resets */ }
.dialog .mainContainer *:focus-visible { /* focus ring */ }
.dialog .mainContainer .title { /* title bar */ }
.dialog .mainContainer .title > span { /* title text */ }
.dialog .mainContainer .dialogSeparator { /* hairline between sections */ }
/* … many more rules … */
```

Reproducer should ship pdf.js's `.dialog` styling verbatim (it lives in `renderer/lib/pdfjs/`). The only Obsidian-specific changes are color-token mappings (replacing pdf.js's hardcoded colors with `--background-primary`, `--text-normal`, etc.).

---

## 3. The `.pdf-password-dialog` (Obsidian wrapper)

Obsidian wraps pdf.js's password dialog with its own chrome — see [`view-pdf.md`](view-pdf.md) §9. This uses Obsidian's modal chrome on top of pdf.js's dialog content.

---

## 4. Reproducer build order

1. For Obsidian-style "are you sure?" surfaces, use a default `.modal` (560 × max-80vw × max-85vh). Don't introduce a separate `.dialog` class.
2. The `.dialog` selector is **pdf.js internal**. Ship pdf.js as-is; only override the color tokens.
3. `.pdf-password-dialog` is a custom Obsidian-wrapper around pdf.js's password-prompt logic.
