# Progress Bar

> Three distinct progress indicators in the renderer:
>
> 1. **`.progress-bar`** — full-screen indeterminate "Obsidian is loading…" indicator with two-bar Material-style animation. Used during vault open / sync init.
> 2. **`.is-loading::before`** — thin 3 px accent bar at the top of any element. See [`inputs.md`](inputs.md) §10.
> 3. **`.setting-progress-bar`** — chunky settings progress pill (e.g. download progress). See [`inputs.md`](inputs.md) §9.

This file documents the first one — the full-screen loading bar.

Source: `renderer/app.css:9700-9801`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. DOM scaffold

```
.progress-bar-container                ← full-screen overlay (z-index 10000)
  └─ .progress-bar
       ├─ .progress-bar-message         ← "Loading vault…" text
       ├─ .progress-bar-indicator       ← the bar's track
       │    ├─ .progress-bar-line       ← faint background line (always visible)
       │    └─ .progress-bar-subline.mod-increase + .mod-decrease   ← the two animated bars
       ├─ .progress-bar-button-container
       │    └─ .progress-bar-context-button
       └─ .progress-bar-context          ← optional bubble caption below the bar
            └─ .progress-bar-message
```

---

## 2. Container (`app.css:9700-9714`)

```css
.progress-bar-container {
  position: absolute;
  height: 100vh;
  width:  100vw;
  top: 0;
  inset-inline-start: 0;
  background-color: var(--background-primary);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-left:  var(--safe-area-inset-left);
  padding-right: var(--safe-area-inset-right);
  z-index: 10000;                              /* above everything — even modals */
}
```

Full-viewport overlay with z-index 10000 — sits above the entire app including modals (which are at z-index 50). Used during initial vault load and major operations.

---

## 3. Inner layout (`app.css:9716-9744`)

```css
.progress-bar {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--size-4-2);                    /* 8px */
  width: 100%;
}

.progress-bar-context {
  position: absolute;
  top: 100%;                                    /* sits below the indicator */
  font-size: var(--font-ui-small);             /* 13px */
  border-radius: 50px;                          /* fully-pill bubble */
  padding: var(--size-4-2) var(--size-4-6);    /* 8px 24px */
}

.progress-bar-button-container {
  display: flex;
  flex-direction: column;
  gap: var(--size-4-2);                        /* 8px between buttons */
}

.progress-bar-message {
  margin-bottom: var(--size-4-8);              /* 32px below */
  opacity: 1;
  color: var(--text-muted);
}
```

Vertical layout with the message above the indicator, and a context bubble pinned below. Buttons stack vertically with 8 px gap.

---

## 4. The bar itself (`app.css:9746-9781`)

```css
.progress-bar-indicator {
  position: relative;
  height: 8px;
  margin: 0 10vw;                              /* 10 % of viewport on each side */
  width: 90vw;                                  /* gross — overlaps with margin */
  overflow-x: hidden;
  border-radius: 3px;
}

.progress-bar-line {
  position: absolute;
  opacity: 0.4;
  background-color: var(--interactive-accent);
  width: 150%;                                  /* extends past container; clipped by overflow-x: hidden */
  height: 8px;
}

.progress-bar-subline {
  position: absolute;
  background-color: var(--interactive-accent);
  height: 8px;
  width: 100%;
  transform-origin: left center;
}

.progress-bar-subline.mod-increase {
  animation: increase 2s infinite;
}

.progress-bar-subline.mod-decrease {
  animation: decrease 2s 0.5s infinite;          /* offset by 0.5s */
}

.progress-bar .progress-bar-subline {
  transition: transform 150ms ease-in-out;
}
```

Geometry:
- 8 px tall track, 90 vw wide, centered with 10 vw margin on each side, 3 px corner radius.
- A faint background line at 40 % accent opacity provides the always-on track color.
- Two **subline** elements run the Material-style indeterminate animation:
  - `.mod-increase` runs `@keyframes increase` (2 s loop, no delay).
  - `.mod-decrease` runs `@keyframes decrease` (2 s loop, 0.5 s offset).
- Both use `transform-origin: left center` so they grow from the left edge.

Keyframes (see `animations.md` §3.5):

```css
@keyframes increase {
  from { transform: translateX(-5%)  scaleX(0.05); }
  to   { transform: translateX(130%) scaleX(1);    }
}

@keyframes decrease {
  from { transform: translateX(-80%) scaleX(0.8);  }
  to   { transform: translateX(110%) scaleX(0.1);  }
}
```

The `increase` bar starts as a tiny bar at `-5%` and ends at full width past `130%`. The `decrease` bar (offset by 0.5 s) starts wide at `-80%` and shrinks as it travels off-screen. The overlapping waves produce the recognizable indeterminate-progress sweep.

---

## 5. Determinate variant

When the progress is determinate (known percentage), JS removes the `.mod-increase` / `.mod-decrease` animation classes and sets `transform: scaleX(<percent>)` directly on the `.progress-bar-subline`. The 150 ms ease-in-out transition smooths between updates.

---

## 6. Reproducer build order

1. The full-screen progress overlay is z-index 10000 — sits above modals.
2. Layout: vertical column with `.progress-bar-message` (32 px below margin) → `.progress-bar-indicator` → optional `.progress-bar-context` pill below.
3. Track is 90 vw × 8 px with 3 px corner radius. A 40 %-accent line provides the always-visible track color.
4. Two animated bars (`.mod-increase` runs `increase` keyframe; `.mod-decrease` runs `decrease` 0.5 s offset). Both 2 s infinite. The overlapping waves are the indeterminate animation.
5. For determinate progress, set `transform: scaleX(<n>)` on the subline directly; 150 ms ease-in-out transition smooths updates.
6. Use `--interactive-accent` (purple) as the bar fill — themes can swap this for branded colors.
7. Cross-reference: `.is-loading::before` is the **thin** indeterminate bar variant (3 px tall, runs `progress-bar` keyframe, 1 s loop) — see `inputs.md` §10.
