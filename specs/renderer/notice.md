# Notice (toast)

> The transient floating message in the top-right corner — used for status updates ("Linked"), errors ("Vault could not be saved"), success confirmations ("Plugin installed"), and download progress.

Tokens: see [`design-tokens.md`](design-tokens.md). Source: `renderer/app.css`.

---

## 1. DOM scaffold

```
.notice-container               ← fixed wrapper, top-right
  ├─ .notice                     ← single toast
  │    ├─ (text content)
  │    ├─ <progress>             ← optional progress bar
  │    └─ .notice-button-container
  │         └─ .notice-cta       ← optional action link
  └─ … more notices stack vertically …
```

---

## 2. `.notice-container` (`app.css:8873-8881`)

```css
.notice-container {
  z-index: var(--layer-notice);          /* 60 */
  position: fixed;
  top: 22px;
  inset-inline-end: 0;
  padding: 10px;
  overflow: hidden;
  pointer-events: none;                  /* container itself is click-through */
}
```

Geometry:
- Mounts at `top: 22px; inset-inline-end: 0` — 22 px from the top of the viewport, flush with the right edge.
- 10 px container padding effectively means notices are 10 px from the actual top edge (12 px total inset = 22 − 10).
- `pointer-events: none` on the container — only the notices themselves receive clicks. This prevents the gutter around stacks from blocking the view-header below.
- z-index 60 — above modals (50), below menus (65) and tooltips (70). A modal cannot cover a toast.

There is no `is-mobile` override — toasts appear in the same position on phone (which is fine because phones use safe-area inset behavior elsewhere; the container's `top: 22px` is a fixed offset).

---

## 3. `.notice` (`app.css:8883-8901`)

```css
.notice {
  display: flex;
  flex-direction: column;
  gap: var(--size-4-2);                  /* 8px between text, progress, button row */
  background-color: var(--background-modifier-message);
                                          /* rgba(0, 0, 0, 0.9) — fixed, not theme-dependent */
  border-radius: var(--radius-m);        /* 8px */
  box-shadow: 0 2px 8px var(--background-modifier-box-shadow);
                                          /* light: rgba(0,0,0,0.1) | dark: rgba(0,0,0,0.3) */
  color: #FAFAFA;                         /* near-white, fixed */
  font-size: var(--font-ui-small);       /* 13px */
  line-height: var(--line-height-tight); /* 1.3 */
  padding: 0.75em 1em 0.75em 1em;        /* ~10px top/bottom, ~13px sides at 13px font */
  max-width: 300px;
  margin-bottom: 14px;                    /* gap between stacked toasts */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  cursor: var(--cursor);
  pointer-events: auto;                   /* opt back in for click-to-dismiss */
}
```

Reproducer rules:
- **Background is fixed** — `--background-modifier-message: rgba(0, 0, 0, 0.9)` (`design-tokens.md` §13). It is **not** themed; both light and dark show a near-black bubble. This is intentional — toasts should look the same regardless of vault theme so they remain recognizable.
- **Text color is fixed** at `#FAFAFA`, not `--text-normal` — so they're legible on the dark bubble.
- 8 px corner radius (medium, same as menus).
- 300 px max width; longer messages wrap.
- 14 px bottom margin between stacked notices.
- Click-to-dismiss is wired up in JS (`pointer-events: auto`).

---

## 4. `<progress>` inside a notice (`app.css:8903-8910`)

```css
.notice progress {
  width: 100%;
}
.theme-light .notice progress[value]::-webkit-progress-bar {
  background-color: #262626;             /* dark track even in light theme — matches notice bg */
  box-shadow: inset 0px 0px 0px 1px #363636;
}
```

Used by: download-progress notices, sync notices, etc. The progress element renders a native bar; the light-theme override ensures the bar's track stays dark to match the dark notice background.

The thumb/fill color (`::-webkit-progress-value`) is **not** overridden — it inherits the OS-default progress color (typically system accent), which works against the dark track without further intervention.

---

## 5. `.notice-button-container` (`app.css:8912-8918`)

```css
.notice-button-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  column-gap: var(--size-4-3);           /* 12px between buttons */
  row-gap: var(--size-4-1);              /* 4px when wrapping */
}
```

A row of action links beneath the message. Wraps if too many; tighter row-gap when wrapped to keep the toast compact.

---

## 6. `.notice-cta` (`app.css:8920-8935`)

```css
.notice-cta {
  display: flex;
  align-items: center;
  color: var(--text-accent);              /* purple even on the dark bubble — visible */
  white-space: nowrap;
}
.notice-cta.mobile-tap { color: var(--text-accent-hover); }

@media (hover: hover) {
  .notice-cta:hover { color: var(--text-accent-hover); }
}
```

CTA links use the accent color. Hover/tap brightens to `--text-accent-hover`. They are not styled as buttons — just colored text — to keep the toast visually quiet.

Note: the accent color in **light** theme is `#7c52ed` (purple). On the near-black notice background that's plenty contrasty. In dark theme accent is brighter (`#9c83f3`); also fine.

---

## 7. Lifecycle (from JS — `app.webcrack/deobfuscated.js`)

The notice manager (`new Notice(message, timeout)` API):
- `setMessage(text)` updates the body.
- Auto-dismiss after `timeout` ms (default ~5000 ms).
- Click anywhere on the notice dismisses it immediately.
- Notices stack — newest goes to the bottom.
- Calling `Notice.hide()` on a still-visible toast removes it early.

Animation:
- Enter: `opacity: 0 → 1` + slight `transform: translateY(-10px) → 0`. Implemented in JS, ~300 ms (the `--anim-duration-moderate`).
- Exit: same in reverse, then `display: none`.

There is no CSS keyframe for these — the JS adds inline styles on enter/exit.

---

## 8. Reproducer build order

1. Mount `.notice-container` as a child of `<body>` at `position: fixed; top: 22px; inset-inline-end: 0; z-index: 60`. The container itself must be `pointer-events: none`.
2. Each `.notice` is a 300 px-max black-on-white-text bubble with 8 px radius and a single 0 2 8 drop shadow.
3. The black background and #FAFAFA text are **fixed values** — do not theme them. This is what makes toasts feel like a system overlay rather than part of the vault chrome.
4. CTA links are accent-colored text, not buttons.
5. Wire click-to-dismiss on the notice element. Auto-dismiss timeout is set per-notice from JS.
6. New notices append to the bottom of the container; the 14 px `margin-bottom` on each notice creates the stacking gap.
7. Light-theme progress bar override is **load-bearing** — without it the progress track would render in the OS default light color and become invisible against the dark notice background.
