# Loading States

> Visual indicators for in-progress operations. Five distinct primitives.

Source: `renderer/app.css`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. `.is-loading` — thin top bar (`app.css:4423-4435`)

```css
.is-loading { position: relative; }
.is-loading:before {
  content: ' ';
  position: absolute;
  top: 0;
  width: 0;
  height: 3px;
  background-color: var(--interactive-accent);
  animation: 1000ms ease-in-out 300ms infinite progress-bar;
}
```

The most common loading indicator — a 3 px-tall accent-colored bar that grows-and-shrinks across the top of any element. JS adds `.is-loading` to the parent. Keyframe at `app.css:17941-17966` (see `animations.md` §3.9).

Used on: `.app-container.mod-loading`, `.search-result-container.is-loading`, plugin tabs during install, etc.

---

## 2. `.loader-spinner` — circular spinner (`app.css:4319-4330`)

```css
.loader-spinner {
  --icon-size:   var(--icon-xl);                    /* 32px */
  --icon-stroke: var(--icon-l-stroke-width);        /* 1.75px */
  width:  var(--size-4-8);                          /* 32px */
  height: var(--size-4-8);
  margin: 100px auto;
  color: var(--interactive-accent);
}

.loader-spinner svg {
  animation: spin 1s ease infinite;
}
```

A 32 × 32 Lucide loader icon (typically `loader-2`) rotating 360°/s with `ease` timing. 100 px auto-margin — used in centered loading contexts (e.g. middle of an empty modal).

When inside a view-header (`.app-container.mod-loading .view-header .loader-spinner`), the icon shrinks to `--icon-l` (18 px) and animation speed becomes 0.9 s.

---

## 3. `.loader-cube` — 9-cube grid spinner (`app.css:4332-4391`)

```css
.loader-cube {
  width:  40px;
  height: 40px;
  margin: 100px auto;
}

.loader-cube .sk-cube {
  width:  33%;
  height: 33%;
  background-color: var(--interactive-accent);
  float: inline-start;
  animation: sk-cubeGridScaleDelay 1.3s infinite ease-in-out;
}

.loader-cube .sk-cube1 { animation-delay: 0.2s; }
.loader-cube .sk-cube2 { animation-delay: 0.3s; }
…
.loader-cube .sk-cube9 { animation-delay: 0.2s; }
```

A 40 × 40 grid of 9 accent-colored squares pulsing in a wave pattern. Each cube has a different `animation-delay` to produce a left-to-right wave. See `animations.md` §3.3.

Less commonly used — typically only in long-running operations.

---

## 4. `button.mod-loading` — button spinner (`app.css:7411-7433`)

```css
button.mod-loading {
  color: transparent;                                /* hide label */
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  pointer-events: none;
}

button.mod-loading::after {
  content: '';
  position: absolute;
  width: 12px; height: 12px;
  top: 0; left: 0; right: 0; bottom: 0;
  margin: auto;
  border: 2px solid transparent;
  border-top-color: var(--text-color);              /* matches button text color */
  border-radius: 50%;
  animation: spin 1s ease infinite;
}
```

A button-internal spinner — keeps the button's outer dimensions stable while showing progress. The label is hidden via `color: transparent`; a 12 × 12 ring with only the top edge colored rotates in the center.

See `buttons.md` §1.2.

---

## 5. `.progress-bar` — full-screen indeterminate (`app.css:9700-9801`)

The full-screen "loading the vault" overlay. See [`progress-bar.md`](progress-bar.md) for the full spec.

---

## 6. `.is-flashing` — momentary highlight (`app.css:3224-3230`)

```css
.is-flashing {
  transition: color 0.25s ease, background-color 0.25s ease;
  background-color: var(--text-highlight-bg) !important;
  color: var(--text-normal);
  mix-blend-mode: var(--highlight-mix-blend-mode);
  border-radius: var(--radius-s);
}
```

Not a "loading" state per se, but related — flashes a target element yellow when the user navigates to it (e.g. block links, search results). 250 ms ease in, 250 ms ease out (when JS removes the class).

See `editor-reading-mode.md` §7.

---

## 7. `.is-mobile .clickable-icon` opacity transition (`app.css:8303-8309`)

```css
.is-mobile .clickable-icon { transition: opacity 0.1s ease-in-out; }
.clickable-icon.mobile-tap svg { opacity: var(--icon-opacity-hover); }
```

Mobile icons fade their opacity faster (100 ms vs the desktop 140 ms baseline) — a subtle "responsive feedback" loading hint.

---

## 8. State summary

| Indicator | Where used | Type |
| --- | --- | --- |
| `.is-loading::before` | Generic | Indeterminate top bar (3 px) |
| `.loader-spinner` | Empty modals, view headers | Circular spinner |
| `.loader-cube` | Long operations | Grid wave spinner |
| `button.mod-loading::after` | Buttons | In-place spinner |
| `.progress-bar.*` | Vault load, sync init | Full-screen indeterminate |
| `.is-flashing` | Navigation targets | One-shot yellow flash |

---

## 9. Reproducer build order

1. Use `.is-loading` for any container that should show "I'm working." It's just a class — JS adds and removes.
2. For centered spinners, use `.loader-spinner` (Lucide-style) or `.loader-cube` (9-cube grid) depending on theme — the grid is more "Material," the spinner is more standard.
3. Buttons should use `.mod-loading` rather than disabling — keeps the button width stable.
4. `.progress-bar` is the full-screen "Obsidian is doing something major" overlay — z-index 10000, blocks all input.
5. `.is-flashing` is for navigation — not for ongoing operations.
6. Reduced-motion users: spinning animations should be disabled. Most rules guard with `@media (prefers-reduced-motion: reduce) { .X { animation: none; } }` — see `animations.md` §5.
