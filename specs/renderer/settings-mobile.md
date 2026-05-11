# Settings — Mobile

> On phone-sized screens, the Settings modal layout shifts from a left vertical-sidebar to a top horizontal nav with a slide-in detail pane.

Source: `renderer/app.css` (mobile-specific overrides scattered). Tokens: see [`design-tokens.md`](design-tokens.md).

---

## 1. Layout shift

On `.is-phone`:
- The modal goes full-screen (no rounded corners, fills viewport).
- The vertical-tab header collapses to a `.modal-setting-nav-bar` at the top — a horizontal row showing only the current section title + Back button.
- Tapping a section in the home view slides in the detail view (replacing it).

---

## 2. `.modal-setting-nav-bar` (`app.css:9315-9320`)

```css
.modal-setting-nav-bar {
  display: flex;
  flex: 0 1 auto;
  padding: var(--size-4-3);                      /* 12px */
  border-bottom: var(--border-width) solid var(--background-modifier-border);
}
```

12 px-padded flex row with a 1 px bottom hairline. Holds the back button (left), centered title, optional save/done action (right).

---

## 3. `.modal-nav-action` (`app.css:9322-9338`)

```css
.modal .modal-nav-action {
  background-color: unset;
  margin-top: var(--size-4-1);                   /* 4px */
  position: absolute;
  top: 0;
  width: unset;
}

.modal .modal-nav-action.mod-secondary {
  inset-inline-start: 0;                         /* "Back" / "Cancel" pinned to start */
}

.modal .modal-nav-action.mod-cta {
  color: var(--color-accent);
  font-weight: var(--font-semibold);             /* 600 */
  inset-inline-end: 0;                           /* "Done" / "Save" pinned to end */
}
```

Mobile nav actions:
- Absolutely positioned at the top of the modal.
- `.mod-secondary` (Cancel/Back): start side, default text color.
- `.mod-cta` (Save/Done): end side, accent color, semibold.
- 4 px top margin to clear the safe-area-inset-top.

---

## 4. Mobile setting item (`app.css:5230-5251`)

The container-query rule already documented in `settings-modal.md` §6 kicks in below 340 px:

```css
@container (max-width: 340px) {
  .setting-item:not(.mod-toggle):not(.setting-item-heading) {
    flex-direction: column;
  }
  /* control row goes full-width below the info row */
}
```

Toggle rows stay horizontal (the toggle is too small to need stacking). Other rows stack info above control.

---

## 5. Mobile-only setting items

```css
.mobile-option-setting-item {
  /* row layout for mobile-specific settings (e.g. permissions) */
}
.mobile-option-setting-item-name { /* primary label */ }
.mobile-option-setting-item-add-icon, /* + icon */
.mobile-option-setting-item-option-icon, /* option icon */
.mobile-option-setting-item-remove-icon { /* − icon */ }
```

Mobile settings often use these specialized rows for actions like "Add provider" / "Remove provider" — full-width tappable rows with leading/trailing icons.

---

## 6. Mobile vault chooser (`.mobile-vault-chooser*`)

A separate mobile-first surface (not a modal — typically the first-launch experience):

```css
.mobile-vault-chooser { /* outer container */ }
.mobile-vault-chooser-screen { /* full-screen wrapper */ }
.mobile-vault-chooser-header { /* top bar with logo */ }
.mobile-vault-chooser-header-icon { /* logo icon */ }
.mobile-vault-chooser-content { /* main content */ }
.mobile-vault-chooser-actions { /* row of action options */ }
.mobile-vault-chooser-action { /* single action card */ }
.mobile-vault-chooser-action-icon { /* icon */ }
.mobile-vault-chooser-action-name { /* label */ }
.mobile-vault-chooser-action-description { /* sub-label */ }
.mobile-vault-chooser-button-container { /* footer buttons */ }
.mobile-vault-chooser-empty-state { /* nothing-yet state */ }
.mobile-vault-chooser-field-name { /* form field label */ }
.mobile-vault-chooser-load-button { /* load action */ }
.mobile-vault-chooser-load-callout { /* explanation callout */ }
.mobile-vault-chooser-load-text { /* text inside load section */ }
.mobile-vault-chooser-logo-container { /* big logo */ }
.mobile-vault-logo-text { /* "Obsidian" wordmark */ }
.mobile-vault-chooser-version { /* version string at the bottom */ }
```

(All in `app.css` around lines 7000-8000 — too detailed to fully enumerate; the patterns follow standard Obsidian conventions: card layouts, action rows, full-screen flex columns.)

---

## 7. Mobile onboarding (`.mobile-onboarding*`)

```css
.mobile-onboarding { /* outer */ }
.mobile-onboarding-screen { /* full-screen wrapper */ }
.mobile-onboarding-feature-table { /* feature list */ }
.mobile-onboarding-navbar { /* top bar */ }
.mobile-onboarding-radio-button { /* tappable radio rows */ }
.mobile-onboarding-radio-group { /* group of radios */ }
.mobile-onboarding-radio-option { /* single radio + label */ }
.mobile-onboarding-radio-option-desc { /* sub-text */ }
.mobile-onboarding-radio-option-title { /* primary text */ }
```

The first-launch onboarding flow on mobile — full-screen swipable screens explaining each feature.

---

## 8. Reproducer build order

1. On `.is-phone`, the Settings modal becomes full-viewport (no padding, no border-radius).
2. The vertical-tab sidebar collapses into a single home page that lists all section names. Tapping a section slides in (or full-replaces) the detail page.
3. The top bar is `.modal-setting-nav-bar` — 12 px padded, 1 px bottom hairline, with `.modal-nav-action`s for Back/Done.
4. `.mod-secondary` action is at the inline-start; `.mod-cta` action is at the inline-end with accent color and semibold weight.
5. Settings rows below 340 px container width stack vertically (info on top, control below). Toggle rows stay horizontal.
6. Mobile-specific settings (permissions, vault chooser, onboarding) use their own class families but follow the same patterns — full-width rows, large touch targets (≥ 44 px), accent CTA buttons.
7. The vault chooser and onboarding are first-run experiences, separate from the regular settings modal.
