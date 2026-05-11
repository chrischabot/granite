# Settings — Community Themes

> The Community Themes browser is **the same component** as Community Plugins — see [`settings-community-plugins.md`](settings-community-plugins.md) for the full chrome. This file documents the theme-specific differences.

Source: `renderer/app.css`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. Same shell

Both browsers use:
- `.modal.mod-sidebar-layout.mod-community-modal` shell.
- `.modal-sidebar` (280 px) on the left for filters.
- `.community-modal-details` on the right for results / details.
- `.community-item` cards in the grid.
- Same details pane layout (h2 title, meta lines, action buttons, README).

The only visual differences are content-driven:

---

## 2. Theme-specific card content

Theme cards lean on the `.community-item-screenshot` more heavily than plugin cards — themes are visual products and the screenshot is the primary affordance. Cards use 16:9 cover screenshots showing each theme's appearance applied to a sample document.

`.community-item-screenshot.mod-unavailable` (an empty placeholder icon centered in the box) appears for themes whose screenshots aren't yet available — the same fallback as plugins.

---

## 3. Action buttons (theme variants)

The `.community-modal-button-container` shows different action labels for themes:
- "Use" — install + activate the theme.
- "Manage" — open theme-specific settings (some themes expose a settings panel).
- "Uninstall" — remove the theme.

Plus the standard "Visit on GitHub" / "Report issue" action links.

---

## 4. Theme readme (`.community-readme`)

Theme readmes typically contain more screenshots than plugin readmes. The same `.community-readme` rules apply:

```css
.community-readme {
  overflow-x: hidden;
  overflow-y: visible;
  height: auto;
  padding: var(--size-4-4) 0;
}

.community-readme video,
.community-readme svg,
.community-readme img {
  max-width: 100%;
}
```

Markdown is rendered with the standard `.markdown-rendered` chrome.

---

## 5. Theme application (no settings UI)

When the user clicks "Use" on a theme, JS:
1. Adds a `<link rel="stylesheet">` pointing at the theme's CSS to the document head.
2. The theme's CSS overrides the design tokens (typically by re-declaring `:root`, `.theme-light`, `.theme-dark` blocks).
3. No additional CSS in `app.css` is involved — theme switching is purely a stylesheet swap.

---

## 6. Reproducer build order

1. Same as `settings-community-plugins.md` — single component, both browsers share the chrome.
2. Theme-specific differences live entirely in the content data (screenshots, descriptions, action labels) — no separate CSS rules.
3. Theme installation is a stylesheet `<link>` inject, not an `app.css` override.
