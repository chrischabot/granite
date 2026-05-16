# Themes and CSS snippets

Granite is themable from top to bottom. Three extension surfaces
shape the look:

| Surface | What it is | How many |
|---------|------------|----------|
| **Theme** | A single CSS file replacing the active style. | One at a time. |
| **CSS snippet** | A small CSS file applied on top of the active theme. | As many as you like. |
| **Plugin styling** | A plugin's optional `styles.css`. | Per plugin. |

Granite uses design tokens (CSS custom properties) for every colour,
size, font, and spacing decision. A theme overrides those variables;
a snippet overrides individual rules without replacing the whole
theme.

## Choosing a theme

Open *Settings → Appearance*:

| Control | Effect |
|---------|--------|
| **Base color scheme** | *Adapt to system* / *Light* / *Dark*. |
| **Accent color** | Sets `--accent-h/-s/-l`; affects links, focus rings, callouts. |
| **Themes** | Dropdown of installed themes. |
| *Manage* button | Opens the community-themes browser. |
| *Open themes folder* icon | Reveals `.granite/themes/` in your OS file manager. |

The default Granite theme supports both light and dark mode. Switching
schemes does not reload the app.

## Installing a community theme

1. *Settings → Appearance → Manage* (themes browser).
2. Browse, filter, or search.
3. Click *Install*. Granite downloads the theme into
   `.granite/themes/<theme-name>/` and adds it to the dropdown.
4. Pick the new theme from the *Themes* dropdown.

Updates are manual: *Settings → Appearance → Check for updates*. An
*Update* button appears next to themes with a newer version.

To remove a theme, switch away from it, then delete the folder under
`.granite/themes/<theme-name>/` from disk. Granite will pick up the
change.

## Light, dark, and high-contrast modes

Themes opt in to light and/or dark mode by defining their variables
under the corresponding classes:

```css
.theme-light {
  --background-primary: #ffffff;
  --text-normal: #1f1f1f;
  /* … */
}

.theme-dark {
  --background-primary: #1e1e1e;
  --text-normal: #e8e8e8;
  /* … */
}
```

Themes that only set `:root` or `body` directly are discouraged —
they break Granite's *Adapt to system* switching.

Granite ships with a **high-contrast** theme variant that follows the
operating system's high-contrast preference. When the OS reports
`prefers-contrast: more`, focus rings are thicker, link underlines
become solid, and colour combinations meet WCAG AAA contrast ratios.

## Reduced motion

Granite respects `prefers-reduced-motion: reduce` automatically:

- Animations that fade or slide become instantaneous.
- Notice toasts and sidebar transitions skip their easing curves.
- The graph view's force-layout animation is replaced by a single
  layout pass.

No setting is required — the rule is applied at the CSS layer.

## CSS snippets

A **snippet** is a small CSS file you write yourself (or copy from
the community) to tweak Granite. Snippets layer on top of the active
theme.

### Where snippets live

`.granite/snippets/*.css` inside your vault. Each `.css` file becomes
a snippet whose name is its filename without the extension.

You can edit snippets in your favourite editor — Granite watches the
folder and live-reloads any change.

### Managing snippets

*Settings → Appearance → CSS snippets*:

- Each snippet has an **enable** toggle.
- *Reload snippets* re-reads the folder (useful if you just added a
  new file).
- *Open snippets folder* reveals the folder in your OS file manager.

Multiple snippets can be enabled at the same time. They cascade in
enable order — later-enabled snippets win on conflicting rules.

### Anatomy of a snippet

A minimal example:

```css
/* Make headings a touch heavier */
.markdown-source-view h1,
.markdown-source-view h2,
.markdown-rendered h1,
.markdown-rendered h2 {
  font-weight: 800;
}

/* Tint backlinks panel */
.workspace-leaf-content[data-type="backlinks"] {
  --background-secondary: #1a1d2b;
}
```

Snippets have access to:

- Every CSS variable defined by the theme and by Granite itself
  (colours, fonts, spacing, layer ordering — see *Reference → Design
  tokens*).
- The full DOM of the app.

### Per-note styling with `cssclasses`

Any note can declare classes that get applied to its container:

```yaml
---
cssclasses:
  - red-border
  - centered
---
```

Then in a snippet:

```css
.markdown-source-view.red-border .image-embed img {
  border: 2px solid var(--callout-warning, red);
}

.markdown-rendered.centered {
  text-align: center;
}
```

This is the recommended way to apply special styling to specific
notes (book reviews, fiction, meeting minutes…) without touching the
note's content.

## What snippets and themes cannot do

Themes and snippets are CSS, so they cannot:

- Register new views or tabs.
- Add commands or hotkeys.
- Process Markdown.
- Read or write files.

For those, you need a **plugin** — see [Plugins](./plugins.md) and
the [Plugin SDK](../sdk/README.md).

## RTL support

Granite supports right-to-left languages globally and per-note:

- **Global** — *Settings → Editor → Right-to-left (RTL)*. Sets the
  default text direction for new notes.
- **Per-note** — write `direction: rtl` (or `ltr`) in the note's
  frontmatter to override.

Sidebars, toolbars, and editor gutters mirror automatically in RTL
mode. Snippets that hard-code `left:` / `right:` properties should
use logical equivalents (`inset-inline-start`, `padding-inline`,
etc.) to remain correct in both directions.

## Writing your own theme

A theme is one CSS file plus a manifest.

`.granite/themes/<theme-name>/theme.css` contains your CSS. The
manifest sits next to it:

`.granite/themes/<theme-name>/manifest.json`:

```json
{
  "name": "My Theme",
  "version": "1.0.0",
  "minAppVersion": "0.1.0",
  "author": "Your Name",
  "authorUrl": "https://example.com"
}
```

Guidelines:

- Override variables under `.theme-light { ... }` and
  `.theme-dark { ... }`. Never style `body` directly.
- Use Granite's design tokens (`--background-primary`,
  `--text-normal`, `--callout-info`, …) rather than hard-coded
  colours.
- Avoid hard-coded sizes that conflict with Granite's spacing grid.
- Test in both light and dark mode.

A theme template repo, a token catalog, and a "self-critique
checklist" live under the developer docs.

## Distributing a theme

Themes are distributed as public Git repos. To publish:

1. Push your `theme.css` + `manifest.json` to a public repo.
2. Tag a release.
3. Submit a PR to the community-themes directory (one entry with
   your repo URL).

After approval, your theme appears in the in-app *Manage* browser.

## See also

- [Plugins](./plugins.md) — for behaviour that CSS cannot express.
- [Reference → Design tokens](../reference/settings.md) — every CSS
  variable Granite exposes.
- [Developer guide → CSS architecture](../developer/css-and-tokens.md)
  — how the styles are organised.

---

[← Settings](./settings.md) · [Index](./README.md) · [next: Plugins →](./plugins.md)
