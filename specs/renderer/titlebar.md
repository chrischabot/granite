# Titlebar

> The window's top chrome strip. Documented in full in [`app-shell.md`](app-shell.md) §6.

Source: `renderer/app.css:6129-6296`. Tokens: see [`design-tokens.md`](design-tokens.md) §24.

---

## 1. Cross-reference

- **Container** (`.titlebar`, `.titlebar-inner`, `.titlebar-text`): see `app-shell.md` §6.1-§6.2.
- **Buttons** (`.titlebar-button-container`, `.titlebar-button`, `.mod-back/-forward/-min/-max/-close/-logo`): see `app-shell.md` §6.3.
- **Frameless variants** (`.is-hidden-frameless.mod-macos/-windows/-linux`): see `app-shell.md` §6.4 and `os-modifiers.md` §5.
- **Drag region** (`-webkit-app-region: drag` rules): see `app-shell.md` §6.

---

## 2. Quick token reference

```
--traffic-lights-offset-x:        var(--header-height)           /* 40px (macOS only) */
--traffic-lights-offset-y:        var(--header-height)           /* 40px */
--titlebar-background:            var(--background-secondary)
--titlebar-background-focused:    var(--background-secondary-alt)
--titlebar-border-width:          0px
--titlebar-border-color:          var(--background-modifier-border)
--titlebar-text-color:            var(--text-muted)
--titlebar-text-color-focused:    var(--text-normal)
--titlebar-text-weight:           var(--font-bold)               /* 700 */
```

The titlebar is height `--header-height` (40px). Buttons are platform-specific:
- macOS: only back/forward arrows on left, offset 80 px to clear native traffic lights.
- Windows / Linux: full min/max/close on right.

Focused state (`body.is-focused`) brightens both the background and text.

See [`app-shell.md`](app-shell.md) §1 for `body.is-focused` semantics, §6 for the titlebar specifics.
