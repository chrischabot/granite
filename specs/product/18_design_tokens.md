# 18 — Design tokens (foundational CSS variables)

Every visible value in the UI must derive from one of these foundational tokens. Component-level tokens are documented in `19_component_styling.md`.

The implementation must:
- Define both light- and dark-mode default values.
- Apply `theme-light` or `theme-dark` to the root `<body>` element.
- Allow the active theme/snippets to override any of these.

## 18.1 Base color palette (neutral)

The base palette is a 12-step neutral ramp from background to text. Themes typically override these.

| Variable | Light | Dark |
|----------|-------|------|
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
| `--color-base-70` | `#5a5a5a` | `#bababa` |
| `--color-base-100` | `#222222` | `#dadada` |

## 18.2 Accent color

The user-customizable accent (Settings → Appearance → Accent color). Stored as HSL components so derivative shades are easy:

| Variable | Default |
|----------|---------|
| `--accent-h` | `254` |
| `--accent-s` | `80%` |
| `--accent-l` | `68%` |

Construct accent shades via `hsl(var(--accent-h), var(--accent-s), var(--accent-l))` plus `calc()` lightness offsets.

## 18.3 Extended (semantic) colors

Eight named hues used for callouts, status messages, syntax highlighting, graph node groups, canvas card colors, etc. Each has a paired `-rgb` triple for use with `rgba()`.

| Hue | Light hex | Dark hex | Light rgb | Dark rgb |
|-----|-----------|----------|-----------|----------|
| Red | `#e93147` | `#fb464c` | `233, 49, 71` | `251, 70, 76` |
| Orange | `#ec7500` | `#e9973f` | `236, 117, 0` | `233, 151, 63` |
| Yellow | `#e0ac00` | `#e0de71` | `224, 172, 0` | `224, 222, 113` |
| Green | `#08b94e` | `#44cf6e` | `8, 185, 78` | `68, 207, 110` |
| Cyan | `#00bfbc` | `#53dfdd` | `0, 191, 188` | `83, 223, 221` |
| Blue | `#086ddd` | `#027aff` | `8, 109, 221` | `2, 122, 255` |
| Purple | `#7852ee` | `#a882ff` | `120, 82, 238` | `168, 130, 255` |
| Pink | `#d53984` | `#fa99cd` | `213, 57, 132` | `250, 153, 205` |

Variable names: `--color-red`, `--color-orange`, `--color-yellow`, `--color-green`, `--color-cyan`, `--color-blue`, `--color-purple`, `--color-pink`. Each plus a `-rgb` suffix variant.

## 18.4 Mono RGB

| Variable | Light | Dark |
|----------|-------|------|
| `--mono-rgb-0` | `255, 255, 255` | `0, 0, 0` |
| `--mono-rgb-100` | `0, 0, 0` | `255, 255, 255` |

For overlay masks via `rgba(var(--mono-rgb-100), 0.05)`. Themes should not override these.

## 18.5 Surface (background) colors

Derived from the base palette by convention. Components reference these — not the raw base steps — so themes can adjust the surface model independently.

| Variable | Description |
|----------|-------------|
| `--background-primary` | Main editor surface. |
| `--background-primary-alt` | A surface drawn *on* the primary surface (e.g. inside an embed). |
| `--background-secondary` | Sidebars, ribbon, modals' chrome. |
| `--background-secondary-alt` | A surface on top of the secondary (e.g. selected nav row). |
| `--background-modifier-hover` | Hovered interactive element overlay. |
| `--background-modifier-active-hover` | Hover state of an already-active element. |
| `--background-modifier-border` | Default 1-px border color. |
| `--background-modifier-border-hover` | Border on hover. |
| `--background-modifier-border-focus` | Border when focused. |
| `--background-modifier-error` | Error state background. |
| `--background-modifier-error-hover` | Error background on hover. |
| `--background-modifier-error-rgb` | RGB triple of error background. |
| `--background-modifier-success` | Success state background. |
| `--background-modifier-success-rgb` | RGB triple. |
| `--background-modifier-message` | Message/info background. |
| `--background-modifier-form-field` | Form field background. |

Default mapping (light → dark):

```css
.theme-light {
  --background-primary: var(--color-base-00);
  --background-primary-alt: var(--color-base-10);
  --background-secondary: var(--color-base-20);
  --background-secondary-alt: var(--color-base-25);
  --background-modifier-hover: rgba(0,0,0,0.075);
  --background-modifier-active-hover: rgba(0,0,0,0.125);
  --background-modifier-border: var(--color-base-30);
  --background-modifier-border-hover: var(--color-base-35);
  --background-modifier-border-focus: var(--color-base-50);
  --background-modifier-error-rgb: var(--color-red-rgb);
  --background-modifier-error: var(--color-red);
  --background-modifier-success-rgb: var(--color-green-rgb);
  --background-modifier-success: var(--color-green);
}
.theme-dark {
  --background-primary: var(--color-base-00);
  --background-primary-alt: var(--color-base-10);
  --background-secondary: var(--color-base-20);
  --background-secondary-alt: var(--color-base-25);
  --background-modifier-hover: rgba(255,255,255,0.075);
  --background-modifier-active-hover: rgba(255,255,255,0.125);
  --background-modifier-border: var(--color-base-30);
  --background-modifier-border-hover: var(--color-base-35);
  --background-modifier-border-focus: var(--color-base-50);
}
```

## 18.6 Interactive (button-style) backgrounds

| Variable | Description |
|----------|-------------|
| `--interactive-normal` | Standard interactive surface (e.g. button). |
| `--interactive-hover` | Standard interactive on hover. |
| `--interactive-accent` | Accent-tinted interactive (primary CTA). |
| `--interactive-accent-hsl` | HSL form for derivations. |
| `--interactive-accent-hover` | Accent on hover. |

Default `--interactive-accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l))`.

## 18.7 Text foreground

| Variable | Description |
|----------|-------------|
| `--text-normal` | Main text. |
| `--text-muted` | De-emphasized text (labels, captions). |
| `--text-faint` | Heavily de-emphasized (placeholders). |
| `--text-on-accent` | Text painted on top of `--interactive-accent` when accent is dark. |
| `--text-on-accent-inverted` | Text on top of accent when accent is light. |
| `--text-success` | Green success text. |
| `--text-warning` | Orange/yellow warning text. |
| `--text-error` | Red error text. |
| `--text-accent` | Accent-colored text (links, focus). |
| `--text-accent-hover` | Accent text on hover. |

Default mapping:

```css
.theme-light {
  --text-normal: var(--color-base-100);
  --text-muted: var(--color-base-70);
  --text-faint: var(--color-base-50);
  --text-on-accent: white;
  --text-success: var(--color-green);
  --text-warning: var(--color-orange);
  --text-error: var(--color-red);
  --text-accent: hsl(var(--accent-h), var(--accent-s), 49%);
  --text-accent-hover: hsl(var(--accent-h), var(--accent-s), 60%);
}
.theme-dark {
  --text-accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
  --text-accent-hover: hsl(var(--accent-h), var(--accent-s), 80%);
}
```

## 18.8 Text backgrounds

| Variable | Description |
|----------|-------------|
| `--text-selection` | Background of selected text. |
| `--text-highlight-bg` | `==highlight==` background. |

## 18.9 Caret

| Variable | Description |
|----------|-------------|
| `--caret-color` | Color of the blinking text caret. |

Default: `--text-normal` in light, `--text-accent` in dark. Themes typically follow `--text-normal`.

## 18.10 Typography — font families

Three named families that everything else references:

| Variable | Description | Default |
|----------|-------------|---------|
| `--font-interface-theme` | UI font (menus, ribbon, sidebar). | system-ui stack |
| `--font-text-theme` | Editor body font. | system-ui stack |
| `--font-monospace-theme` | Code blocks and frontmatter. | platform monospace |

System-ui stacks (recommended fallbacks):

- macOS: `-apple-system, BlinkMacSystemFont, ...`
- Windows: `"Segoe UI", Tahoma, ...`
- Linux: `"Cantarell", "Ubuntu", ...`
- Mono: `ui-monospace, "SF Mono", "Cascadia Mono", "JetBrains Mono", "Roboto Mono", monospace`

## 18.11 Typography — sizes

Editor body uses *relative* sizes; UI chrome uses *fixed* px sizes.

| Variable | Default | Used for |
|----------|---------|----------|
| `--font-text-size` | `16px` | Editor base size; user-set in Appearance. |
| `--font-smallest` | `0.8em` | Editor metadata text. |
| `--font-smaller` | `0.875em` | Editor secondary text. |
| `--font-small` | `0.933em` | Editor minor headings. |
| `--font-ui-smaller` | `12px` | Tooltips, micro-labels. |
| `--font-ui-small` | `13px` | Tab titles, sidebar items. |
| `--font-ui-medium` | `15px` | Default UI body. |
| `--font-ui-large` | `20px` | Modal titles, prompt input. |

## 18.12 Typography — weights

| Variable | Default |
|----------|---------|
| `--font-thin` | `100` |
| `--font-extralight` | `200` |
| `--font-light` | `300` |
| `--font-normal` | `400` |
| `--font-medium` | `500` |
| `--font-semibold` | `600` |
| `--font-bold` | `700` |
| `--font-extrabold` | `800` |
| `--font-black` | `900` |

## 18.13 Typography — bold modifier system

| Variable | Description |
|----------|-------------|
| `--font-weight` | Default editor weight. |
| `--bold-modifier` | Weight delta added when bolding (recommended 100–300). |
| `--bold-weight` | Resolved weight for bolded text. |
| `--bold-color` | Bold text color. |
| `--italic-color` | Italic text color. |

The reason for `--bold-modifier` is to allow bolding within already-bolded text (e.g. inside an H2 that's already font-weight 600, `**bold**` adds another 200 to render as 800).

## 18.14 Line heights and paragraph spacing

| Variable | Default |
|----------|---------|
| `--line-height-normal` | `1.5` |
| `--line-height-tight` | `1.3` |
| `--heading-spacing` | `2em` (above headings) |
| `--p-spacing` | `1rem` (between paragraphs) |

## 18.15 Spacing (4-pixel grid)

The grid base is 4 px. Two scales: a 2-px sub-grid for fine spacing and the 4-px primary grid.

| Variable | Default |
|----------|---------|
| `--size-2-1` | `2px` |
| `--size-2-2` | `4px` |
| `--size-2-3` | `6px` |
| `--size-4-1` | `4px` |
| `--size-4-2` | `8px` |
| `--size-4-3` | `12px` |
| `--size-4-4` | `16px` |
| `--size-4-5` | `20px` |
| `--size-4-6` | `24px` |
| `--size-4-8` | `32px` |
| `--size-4-9` | `36px` |
| `--size-4-12` | `48px` |
| `--size-4-16` | `64px` |
| `--size-4-18` | `72px` |

Rule: every padding/margin/gap value in the codebase must be one of these tokens. Hard-coded `8px` etc. is forbidden.

## 18.16 Borders

| Variable | Default |
|----------|---------|
| `--border-width` | `1px` |

## 18.17 Radii

| Variable | Default |
|----------|---------|
| `--radius-s` | `4px` |
| `--radius-m` | `8px` |
| `--radius-l` | `12px` |
| `--radius-xl` | `16px` |

## 18.18 Layers (z-index)

| Variable | Default | Used for |
|----------|---------|----------|
| `--layer-cover` | `5` | Backdrop dimmer behind modals. |
| `--layer-sidedock` | `10` | Mobile floating sidebar. |
| `--layer-status-bar` | `15` | Status bar. |
| `--layer-popover` | `30` | Hover-previews, autocomplete. |
| `--layer-slides` | `45` | Slide overlay. |
| `--layer-modal` | `50` | Modal dialogs. |
| `--layer-notice` | `60` | Toast notices. |
| `--layer-menu` | `65` | Context menus. |
| `--layer-tooltip` | `70` | Tooltips. |
| `--layer-dragged-item` | `80` | Floating drag ghost. |

## 18.19 Icons (Lucide)

| Variable | Description | Default |
|----------|-------------|---------|
| `--icon-size` | Shorthand for width and height. | (per size variant below) |
| `--icon-stroke` | Shorthand for stroke width. | (per size below) |
| `--icon-color` | Default icon stroke color. | `--text-muted` |
| `--icon-color-hover` | Hover. | `--text-normal` |
| `--icon-color-active` | Pressed. | `--text-accent` |
| `--icon-color-focused` | Focused. | `--text-accent` |
| `--icon-opacity` | Default opacity. | `0.85` |
| `--icon-opacity-hover` | Hover. | `1` |
| `--icon-opacity-active` | Pressed. | `1` |
| `--clickable-icon-radius` | Radius of icon buttons. | `--radius-s` |

### Icon size variants

| Variable | Size | Stroke |
|----------|------|--------|
| `--icon-xs` | `14px` | `--icon-xs-stroke-width: 2px` |
| `--icon-s` | `16px` | `--icon-s-stroke-width: 2px` |
| `--icon-m` | `18px` | `--icon-m-stroke-width: 1.75px` |
| `--icon-l` | `18px` | `--icon-l-stroke-width: 1.75px` |
| `--icon-xl` | `32px` | `--icon-xl-stroke-width: 1.25px` |

The icon set must be Lucide. Custom icons must follow Lucide's design grid (24 × 24 view box, rounded line caps, 2 px stroke at base size).

## 18.20 Cursor

| Variable | Default |
|----------|---------|
| `--cursor` | `default` (arrow on interactive elements) |
| `--cursor-link` | `pointer` |

The app deliberately uses the OS-style arrow cursor for buttons rather than the web-style pointer hand, because the app is a native desktop application and should match OS conventions.

## 18.21 What every theme MUST override

A complete theme overrides at minimum:
- The 12-step base palette in both `theme-light` and `theme-dark` selectors.
- The 8 extended color hues (and their `-rgb` companions).
- `--font-interface-theme`, `--font-text-theme`, `--font-monospace-theme` if it intends to set a different font family.

A theme MAY override:
- Surface, interactive, and text variables for finer-grain control.
- Per-component variables documented in `19_component_styling.md`.

A theme SHOULD NOT override:
- `--mono-rgb-0` / `--mono-rgb-100` (used as masks).
- Layer z-indices.
- Spacing scale (the grid is structural).