# Themes — Light vs Dark

> The complete diff between `.theme-light` and `.theme-dark` primitive token blocks. Every other spec file references this for theme resolution.

Source: `renderer/app.css:2886-2996`. Tokens: see [`design-tokens.md`](design-tokens.md) §13-§15. This file is a focused diff-style reference.

---

## 1. Common ground (defined on `body` — both themes inherit)

```
--accent-h: 258
--accent-s: 88%
--accent-l: 66%
```

Both themes use the **same accent hue** by default. Only the **derived** stops (`--color-accent`, `--color-accent-1`, `--color-accent-2`) differ slightly.

---

## 2. Diff table — primitive colors

| Token | Light | Dark |
| --- | --- | --- |
| `color-scheme` | `light` | `dark` |
| `--highlight-mix-blend-mode` | `darken` | `lighten` |
| `--mono-rgb-0` | `255, 255, 255` | `0, 0, 0` |
| `--mono-rgb-100` | `0, 0, 0` | `255, 255, 255` |
| `--color-red-rgb` | `233, 49, 71` | `251, 70, 76` |
| `--color-red` | `#e93147` | `#fb464c` |
| `--color-orange-rgb` | `236, 117, 0` | `233, 151, 63` |
| `--color-orange` | `#ec7500` | `#e9973f` |
| `--color-yellow-rgb` | `224, 172, 0` | `224, 222, 113` |
| `--color-yellow` | `#e0ac00` | `#e0de71` |
| `--color-green-rgb` | `8, 185, 78` | `68, 207, 110` |
| `--color-green` | `#08b94e` | `#44cf6e` |
| `--color-cyan-rgb` | `0, 191, 188` | `83, 223, 221` |
| `--color-cyan` | `#00bfbc` | `#53dfdd` |
| `--color-blue-rgb` | `8, 109, 221` | `2, 122, 255` |
| `--color-blue` | `#086ddd` | `#027aff` |
| `--color-purple-rgb` | `120, 82, 238` | `168, 130, 255` |
| `--color-purple` | `#7852ee` | `#a882ff` |
| `--color-pink-rgb` | `213, 57, 132` | `250, 153, 205` |
| `--color-pink` | `#d53984` | `#fa99cd` |

Color-base ramp (the gray scale):

| Token | Light | Dark |
| --- | --- | --- |
| `--color-base-00` | `#ffffff` | `#1e1e1e` |
| `--color-base-05` | `#fcfcfc` | `#212121` |
| `--color-base-10` | `#fafafa` | `#242424` |
| `--color-base-20` | `#f6f6f6` | `#262626` |
| `--color-base-25` | `#e3e3e3` | `#2a2a2a` |
| `--color-base-30` | `#e0e0e0` | `#363636` |
| `--color-base-35` | `#d4d4d4` | `#3f3f3f` |
| `--color-base-40` | `#bdbdbd` | `#555555` |
| `--color-base-50` | `#ababab` | `#666666` |
| `--color-base-60` | `#707070` | `#999999` |
| `--color-base-70` | `#5c5c5c` | `#b3b3b3` |
| `--color-base-100` | `#222222` | `#dadada` |

Note: in light, the ramp goes from white (00) to dark gray (100). In dark, the **same direction** of the ramp goes from dark (00) to light (100). This is intentional — semantic tokens like `--text-normal` (which resolves to `--color-base-100`) automatically pick the legible color regardless of theme.

Derived accent (slightly different formulas per theme):

| Token | Light formula | Dark formula |
| --- | --- | --- |
| `--color-accent` | `hsl(258, 88%, 66%)` | `hsl(258, 88%, 66%)` |
| `--color-accent-1` | `hsl(257, 88.88%, 70.95%)` | `hsl(255, 89.76%, 75.9%)` |
| `--color-accent-2` | `hsl(255, 89.76%, 75.9%)` | `hsl(253, 92.4%, 85.14%)` |

The dark theme pushes `--color-accent-1` and `-2` to lighter / more saturated values so they remain visible against dark backgrounds.

---

## 3. Diff table — semantic shifts

These tokens have **different** resolutions per theme:

| Token | Light resolution | Dark resolution |
| --- | --- | --- |
| `--background-secondary-alt` | `--color-base-05` (`#fcfcfc`) | `--color-base-30` (`#363636`) |
| `--background-modifier-form-field` | `--color-base-00` (white) | `--color-base-25` (`#2a2a2a`) |
| `--background-modifier-box-shadow` | `rgba(0,0,0,0.1)` | `rgba(0,0,0,0.3)` |
| `--background-modifier-cover` | `rgba(220,220,220,0.4)` | `rgba(10,10,10,0.4)` |
| `--interactive-normal` | `--color-base-00` (white) | `--color-base-30` (`#363636`) |
| `--interactive-hover` | `--color-base-10` (`#fafafa`) | `--color-base-35` (`#3f3f3f`) |
| `--text-accent` | `--color-accent` (`#7c52ed`) | `--color-accent-1` (`#9c83f3`) |
| `--interactive-accent` | `--color-accent-1` | `--color-accent` |
| `--interactive-accent-hover` | `--color-accent-2` | `--color-accent-1` |
| `--text-selection` | `hsla(--color-accent-hsl, 0.2)` | `hsla(--interactive-accent-hsl, 0.33)` |
| `--blur-background` | (light formula via color-mix on background-primary) | (dark formula via color-mix on interactive-normal) |
| `--raised-mask-background` | `linear-gradient(to bottom left, white, transparent, white) border-box no-repeat` | `transparent` |
| `--pdf-shadow` | `0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.1)` | `0 0 0 1px var(--background-modifier-border)` |
| `--pdf-thumbnail-shadow` | `0 0 0 1px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.2)` | `0 0 0 1px var(--background-modifier-border)` |
| `--shadow-xs` | `0 1px 6px rgba(0,0,0,0.015), 0 4px 24px rgba(0,0,0,0.065), …` | `0 1px 6px rgba(0,0,0,0.045), 0 4px 24px rgba(0,0,0,0.195), …` |
| `--shadow-s` | `0px 1px 2px rgba(0,0,0,0.028), 0px 3.4px 6.7px rgba(0,0,0,0.042), 0px 15px 30px rgba(0,0,0,0.07)` | `0px 1px 2px rgba(0,0,0,0.121), 0px 3.4px 6.7px rgba(0,0,0,0.179), 0px 15px 30px rgba(0,0,0,0.3)` |
| `--shadow-l` | `0px 1.8px 7.3px rgba(0,0,0,0.071), 0px 6.3px 24.7px rgba(0,0,0,0.112), 0px 15px 30px rgba(0,0,0,0.1)` | `0px 1.8px 7.3px rgba(0,0,0,0.071), 0px 6.3px 24.7px rgba(0,0,0,0.112), 0px 30px 90px rgba(0,0,0,0.2)` |
| `--input-shadow` | (3 inset + 4 drop, low alpha) | (1 inset highlight + 4 drop, higher alpha) |
| `--input-shadow-hover` | (deeper version of `--input-shadow`) | (deeper inset + drop) |

The **shadow alpha values are 3-4x larger in dark mode** because dark backgrounds need more intensity to make a shadow visible. This is the most-impactful theme difference after the gray ramp inversion.

---

## 4. The dark-input subtlety

In **light mode**, `--background-modifier-form-field` = `--color-base-00` = `#ffffff` (white) — inputs are flush with the page.

In **dark mode**, `--background-modifier-form-field` = `--color-base-25` = `#2a2a2a` — but the page (`--color-base-00`) is `#1e1e1e`. So **dark inputs are LIGHTER than the page** — they read as raised pills.

This inversion of relative shading is what gives dark mode its tactile feel.

---

## 5. Highlight blend mode

```
.theme-light { --highlight-mix-blend-mode: darken; }
.theme-dark  { --highlight-mix-blend-mode: lighten; }
```

Used by `.is-flashing`, callouts, search highlights, table selections. The mix-blend-mode automatically picks the perceptually correct way to "lighten or darken the underlying content" depending on theme.

`@media print { .theme-dark { --highlight-mix-blend-mode: darken; } }` — print always uses darken regardless of the active theme (so highlights paint correctly on paper).

---

## 6. The accent-hsl trio

`--color-accent-hsl` is just `var(--accent-h), var(--accent-s), var(--accent-l)` — exposed so callers can write `hsla(var(--color-accent-hsl), 0.1)` for tints.

Both themes define `--interactive-accent-hsl` to alias `--color-accent-hsl` — used in tag backgrounds, table selection, drop overlays, etc.

---

## 7. Reproducer build order

1. Themes override **only** the primitive layer — gray ramp + hue colors + a few semantic shadows.
2. The gray ramp goes from "page color" (00) to "primary text color" (100) in both themes — semantic tokens like `--text-normal` automatically resolve correctly.
3. Dark theme's input background is **lighter** than its page background. Light theme's matches.
4. Shadow alpha values in dark mode are ~3-4x higher to compensate for low-contrast dark backgrounds. Reproducer must keep these — copying the light values into dark produces invisible shadows.
5. Accent hue is constant; only the derived stops differ slightly per theme.
6. `--highlight-mix-blend-mode` flips per theme: `darken` for light, `lighten` for dark. Print always uses `darken`.
7. The `--mono-rgb-0` / `--mono-rgb-100` tokens flip per theme so RGB-with-alpha tints automatically pick the right base color (`rgba(var(--mono-rgb-100), 0.1)` is "10 % black" in light, "10 % white" in dark).
