# Accessibility

Granite is built to be usable from the keyboard, friendly to screen
readers, and respectful of operating-system accessibility preferences.
This page documents what Granite does, where the options live, and a
few tips for power users.

## Keyboard-first by design

Every meaningful action in Granite is exposed as a **command**.
Commands are reachable from:

- The **Command palette** (`Mod+P`).
- A user-assignable **hotkey** (*Settings → Hotkeys*).
- **Slash commands** inside the editor (`/`).
- Where appropriate, a **ribbon icon** (which has a keyboard-focusable
  button).

You can drive Granite end-to-end without a pointer:

- `Mod+O` to open a note.
- `Mod+P` to run any command.
- Arrow keys, `Home`, `End`, `PageUp`, `PageDown` for navigation in
  every list and prompt.
- `Tab` and `Shift+Tab` to walk focus.
- `Esc` to close the current overlay, dismiss a popover, or collapse
  multi-cursor selection.

See [Hotkeys](./hotkeys.md) and [Command palette and Quick
Switcher](./command-palette.md) for details.

## Screen reader announcements

Granite emits live announcements for state changes that a screen
reader cannot infer from the DOM alone.

The mechanism: a single ARIA live region (`role="status"`,
`aria-live="polite"`, `aria-atomic="true"`) is rendered in the
document with the class `sr-only`. Granite pushes a short message to
this region whenever something noteworthy happens.

Examples of announced events:

- **Active tab changed.** When you switch tabs (by click, hotkey, or
  Quick Switcher), the new tab's title is announced as *Switched to
  "Note title"*.
- **Notices.** Toast notices announced once their text is rendered.
- **Long-running operations.** Save complete, search complete, plugin
  loaded, settings imported, file recovered.
- **Modal opened / closed.** The modal's title is announced when it
  opens so assistive technology knows where focus has landed.

Announcements are `polite` rather than `assertive`, so they queue
behind whatever the screen reader is currently reading and never
interrupt mid-word.

The component that owns this is `A11yAnnouncer` (see
`src/ui/A11yAnnouncer.tsx`). Plugins can push their own announcements
via the `a11yAnnouncer.announce(message)` helper exposed on the
plugin API.

## Focus management

Granite uses CSS focus rings rather than the browser default outline
so that the style is consistent across themes and respects the active
accent colour:

- Every interactive control has a visible focus ring of at least 2 px
  with sufficient contrast against the surrounding background.
- `:focus-visible` is honoured — focus rings appear for keyboard
  focus but stay out of the way for mouse clicks.
- In high-contrast mode, the focus ring is thicker and uses a darker
  colour.

Modals trap focus while open: `Tab` cycles inside the modal, and
`Esc` closes it and restores focus to whatever triggered the modal.

The Command palette, Quick Switcher, and every other suggestion modal
return focus to the active editor when dismissed.

## High contrast theme

Granite ships a high-contrast theme variant that activates
automatically when the operating system reports
`prefers-contrast: more`. You can also pick it manually under
*Settings → Appearance → Themes*.

Differences in high-contrast mode:

- Foreground / background pairs meet WCAG AAA contrast ratios.
- Focus rings are thicker (3 px) and use a hard-edged colour.
- Link underlines become solid (rather than the default fainter
  dotted underline for unresolved links).
- Callout backgrounds use higher opacity tints.
- Selected list rows use a stronger highlight.

Snippets you write can target high-contrast mode using the standard
media query:

```css
@media (prefers-contrast: more) {
  .my-component {
    border-width: 2px;
  }
}
```

## Reduced motion

Granite respects `prefers-reduced-motion: reduce` automatically. No
toggle is required — the rule is applied at the CSS layer.

When reduced motion is on:

- Fades and slides become instantaneous.
- Notice toasts appear and disappear without animation.
- Sidebar collapse/expand transitions skip their easing curves.
- The graph view's force-layout animation is replaced by a single
  layout pass instead of progressive convergence.
- The Canvas zoom-to-fit and zoom-to-selection actions skip their
  smoothing.

You can confirm the setting at the OS level:

- **macOS**: *System Settings → Accessibility → Display → Reduce
  motion*.
- **Windows**: *Settings → Accessibility → Visual effects → Animation
  effects*.
- **Linux (GNOME)**: *Settings → Accessibility → Reduce animation*.

## Font size and zoom

- **Font size**: *Settings → Appearance → Font size* sets the base
  editor and reading-view font size in pixels.
- **Zoom**: *Settings → Appearance → Zoom level* applies a global
  zoom (1.0 = 100%). Useful for scaling the whole UI without
  per-component tweaks.
- **Quick font size adjustment** *(on by default)* — `Mod++` and
  `Mod+-` bump the font size up or down without opening Settings.
  `Mod+0` resets it.

## Spellcheck

The browser's spellchecker is used inside the editor. Configure under
*Settings → Editor → Spellcheck*:

- **Spellcheck** toggle — on by default.
- **Spellcheck languages** — on Windows and Linux, a multi-select; on
  macOS, follows the system language preferences.

## Right-to-left languages

RTL is supported globally and per-note:

- *Settings → Editor → Right-to-left (RTL)* sets the default text
  direction.
- Add `direction: rtl` (or `ltr`) to a note's frontmatter to override
  per-note.

Sidebars, toolbars, and gutters mirror in RTL mode automatically.

## Native menus

If you prefer your OS's native menu bar to Granite's in-app menus,
turn on *Settings → Appearance → Native menus*. On macOS this also
gives you the system spellchecker for free.

Native menus are off by default because the in-app implementation
gives Granite finer control over menu structure and consistent
keyboard navigation across platforms.

## Window frame style

*Settings → Appearance → Window frame style* offers three options:

- **Custom frame** *(default)* — a slim title bar that integrates with
  Granite's chrome.
- **Native frame** — the standard OS title bar.
- **Hidden frame** — no title bar at all; you drag the window from
  its top edge. Not recommended for keyboard-only use unless you
  remember the window-management shortcuts for your OS.

## Tips for users of assistive technology

- **Pin the commands you run most often.** Pinned commands appear at
  the top of the Command palette so they are one `Mod+P`, one
  `Enter` away.
- **Bind hotkeys for sidebar toggles.** *Settings → Hotkeys* lets you
  bind *Toggle left sidebar* and *Toggle right sidebar* — by default
  neither is bound.
- **Use `Mod+E` to switch into Reading view** for distraction-free
  reading. Reading view's HTML is simpler than the editor's, which
  often reads better.
- **The Outline panel** (right sidebar) gives you a heading-by-heading
  table of contents that responds to `Enter` and arrow keys.
- **Plugins** can affect accessibility for better or worse.
  Well-behaved plugins announce their own state changes through the
  same live region; poorly written ones may not. Test a new plugin
  with your screen reader before adopting it.

## Reporting accessibility issues

If something is hard to use with a screen reader, keyboard, or under
your OS accessibility settings, please open a GitHub issue with:

- Your OS and assistive-technology versions.
- Granite version (from *Settings → General*).
- A short reproduction.
- The expected behaviour.

See [Troubleshooting → Reporting bugs](./troubleshooting.md#reporting-bugs)
for the *Show debug info* command that collects the version data
automatically.

## See also

- [Hotkeys](./hotkeys.md)
- [Themes and CSS snippets](./themes-and-snippets.md) — high-contrast
  and reduced-motion details.
- [Troubleshooting](./troubleshooting.md) — the *Show debug info*
  command.

---

[← Plugins](./plugins.md) · [Index](./README.md) · [next: Troubleshooting →](./troubleshooting.md)
