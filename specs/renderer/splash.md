# Splash

> The first-launch / vault-loading splash screen. Shows the Obsidian logo, version, and a small description.

Source: `renderer/app.css:20282-20313`. Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. DOM scaffold

```
.starter-screen-inner
  └─ .splash
       ├─ .splash-brand
       │    ├─ <svg class="splash-logo">          ← Obsidian logo
       │    ├─ .splash-brand-logo-text             ← "Obsidian" wordmark
       │    └─ .splash-brand-version               ← version string
       └─ .help-options-container                  ← optional help links below
```

---

## 2. `.splash` (`app.css:20288-20297`)

```css
.splash {
  align-items: center;
  background-color: var(--background-primary);
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1 1 auto;
  text-align: center;
  padding: 36px 0 0;                              /* 36px top */
}
```

Centered flex column filling the parent. 36 px top padding so the logo doesn't sit too tight against the top edge.

---

## 3. Brand block (`app.css:20299-20313`)

```css
.splash-brand {
  flex: 0 0 content;
  padding: 20px 0;
}

.splash-brand-logo-text {
  margin-top: 20px;
  color: white;                                    /* fixed white — splash brand is theme-independent */
}

.splash-brand-version {
  color: var(--text-muted);
  margin-top: 8px;
  font-size: var(--font-ui-small);                 /* 13px */
}
```

- `.splash-brand` wraps the logo + wordmark + version with 20 px vertical padding.
- The logo wordmark is **always white** — fixed color regardless of theme. Pairs with the dark-themed splash background (themes typically keep splash dark for branding).
- Version string is muted at 13 px, 8 px below the wordmark.

---

## 4. `.starter-screen-inner` (`app.css:20282-20286`)

```css
.starter-screen-inner {
  flex-grow: 1;
  display: flex;
  height: calc(100% - 24px);
}
```

The outer wrapper of the starter (first-run) screen. Full height minus 24 px (room for the close button or status hint at the bottom).

---

## 5. `.help-options-container` (`app.css:20315-20329+`)

When the splash includes help links (links to documentation, changelogs, etc.):

```css
.help-options-container {
  flex: 1 0 0;
  overflow: auto;
  width: 100%;
  max-width: 82%;                                 /* leave 9% margin on each side */
  text-align: start;
  padding: var(--size-4-6) 0 0;                   /* 24px top */
}

.help-options-container::-webkit-scrollbar { display: none; }

.help-options-container .setting-item-description {
  max-width: 30em;                                /* readable line length */
}
```

A scrollable container for help links, capped at 82 % width. Setting-items inside cap their descriptions at 30em for readability.

---

## 6. Reproducer build order

1. The splash is a centered flex column with 36 px top padding.
2. Logo is fixed white text — splash branding doesn't theme.
3. Version string is `--text-muted`, 13 px, 8 px below the logo.
4. Help links use `.help-options-container` — 82 % width cap, scrollable, hidden scrollbar.
5. Splash is shown by `starter.html` / `starter.js` — these are out of scope for this spec but use the splash CSS rules listed here.
