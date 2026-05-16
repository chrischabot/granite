# Plugins

Granite has two kinds of plugins:

- **Core plugins** — ship with the app. Toggleable in
  *Settings → Core plugins*. They are written by the Granite team and
  run without restriction.
- **Community plugins** — third-party JavaScript. Installed from the
  community plugin directory. Gated behind Restricted mode.

This page covers the community-plugin workflow: browsing, installing,
enabling, configuring, updating, and the security trade-offs you opt
into.

## Restricted mode

By default Granite refuses to load any community plugin. This is
**Restricted mode**, and it is *on* in every new vault.

Why: community plugins are full JavaScript modules. Once a plugin is
running, it has the same powers Granite itself has — read every file
in your vault, render any UI, make network requests, and (on desktop
hosts that expose it) talk to your filesystem outside the vault.
Restricted mode default-on means you must explicitly accept that
trade-off before any third-party code runs.

### Turning off Restricted mode

1. Open *Settings → Community plugins*.
2. Read the *Turn on community plugins* dialog carefully.
3. Click **Turn on community plugins**.

The dialog is **per vault**, not global. Each new vault starts
restricted again — a small friction that gives you a chance to
reconsider every time.

You can turn restricted mode back on at any time. Doing so disables
every community plugin in this vault without uninstalling them.

The corresponding setting is `pluginRestrictedMode`. It defaults to
`true` (safe by default) and is also treated as `true` when the key
is missing from an existing `settings.json`.

## The community plugins page

Once Restricted mode is off, *Settings → Community plugins* becomes
fully interactive. A toolbar offers:

- **Browse** — opens the marketplace.
- **Check for updates** — fetches manifests from each installed
  plugin's repo.
- **Reload plugins** — re-imports every enabled plugin.
- **Open plugins folder** — reveals `.granite/plugins/` in your OS
  file manager.

Below the toolbar is the **Installed plugins** list. Each row has:

| Icon | Action |
|------|--------|
| cog | Open the plugin's settings page (only when it has one). |
| `+` (plus-circle) | Filter Hotkeys to this plugin. |
| heart | Open the plugin author's funding URL. |
| trash | Uninstall. |
| toggle | Enable / disable. |

## Browsing the marketplace

*Settings → Community plugins → Browse* opens a modal with:

- Category list on the left.
- A search box and sort options at the top.
- A grid or list of plugins with their description, author, download
  count, and last updated date.
- An **Install** button on each plugin.

Click any plugin for a detail view with its full README, screenshots,
and changelog before deciding to install.

## Installing a plugin

1. *Browse* → find a plugin → **Install**.
2. Granite downloads the release artifacts (`main.js`, `manifest.json`,
   and optional `styles.css`) into
   `.granite/plugins/<plugin-id>/`.
3. The plugin appears in the *Installed plugins* list, **disabled** by
   default.
4. Flip the enable toggle to load it.

You can install many plugins and only enable some. The disabled ones
sit on disk but never run.

## Enabling and disabling

- **Enable** — runs the plugin's `onload()` and registers its
  commands, ribbon icons, sidebar tabs, settings page, and event
  handlers.
- **Disable** — calls `onunload()`. Everything the plugin registered
  through Granite's helper methods is auto-cleaned up.

Disabling does not delete a plugin's data. The plugin's `data.json`
(its own persistence — settings, cached state, etc.) is left on disk
so re-enabling restores everything.

## Updating

Community plugin updates are **not** automatic. This is intentional —
"security by friction" means you get to inspect updates before they
run on your machine.

To update:

1. *Settings → Community plugins → Check for updates*.
2. An **Update** button appears next to plugins with a newer version.
3. Click **Update**. Granite downloads the new release artifacts and
   replaces the plugin folder. Only that plugin reloads.

If a plugin's `minAppVersion` is higher than your installed Granite
version, the plugin is automatically disabled at load and a notice
appears explaining the mismatch. Update Granite to use it.

## Per-plugin settings

Every enabled plugin that exposes settings adds its own page to the
*Plugin options* section of the Settings sidebar. The layout is the
standard *Setting* rows.

Settings persist to `.granite/plugins/<plugin-id>/data.json`. The
plugin chooses what to store there; from your perspective it is an
opaque JSON file you generally do not need to touch.

## Plugin folder layout

Every installed plugin lives under `.granite/plugins/<plugin-id>/`:

```
.granite/plugins/my-plugin/
├── main.js          ← compiled JavaScript
├── manifest.json    ← id, name, version, description
├── styles.css       ← optional CSS
└── data.json        ← the plugin's persisted state (created at runtime)
```

The plugin ID matches the folder name. Granite refuses to load a
plugin whose manifest ID does not match its folder.

## Uninstalling

Click the trash icon on the *Installed plugins* row. Granite removes
the entire plugin folder, including its `data.json`. There is no
"keep my data" option — if you want to preserve settings before
uninstalling, copy `.granite/plugins/<plugin-id>/data.json` first.

To uninstall manually, quit Granite, delete the folder, then reopen.

## Security and trust

A few rules of thumb:

- **Read the plugin's README and recent commits.** Plugins are open
  source by directory rule.
- **Prefer popular, well-maintained plugins.** A plugin with thousands
  of downloads and frequent commits is less risky than one with
  twelve downloads and no history.
- **Disable plugins you do not actively use.** Disabled plugins do
  not run.
- **Be careful with Web viewer + plugins.** A malicious plugin can
  read cookies in any active Web viewer tab. Don't use Web viewer for
  banking, passwords, etc. when arbitrary plugins are enabled.
- **Backups still matter.** Even a well-meaning plugin can corrupt a
  file by accident. Keep regular vault backups (see [Vaults →
  Backing up](./vaults.md#backing-up-your-vault)).

Granite does not sandbox community plugins. The plugin directory's
manual review process is the main pre-install gate; **Restricted mode
default-on** is the second; everything after that is on you.

## Where plugin state lives

| File | Contents |
|------|---------|
| `.granite/community-plugins.json` | Array of plugin IDs that are currently enabled. |
| `.granite/plugins/<plugin-id>/manifest.json` | The plugin's manifest as published. |
| `.granite/plugins/<plugin-id>/main.js` | The plugin's compiled code. |
| `.granite/plugins/<plugin-id>/styles.css` | Optional plugin CSS. |
| `.granite/plugins/<plugin-id>/data.json` | The plugin's own persisted state. |

The plugin enable state is per vault — turning on a plugin in one
vault does not turn it on elsewhere.

## See also

- [Plugin SDK](../sdk/README.md) — building your own plugin.
- [Reference → Plugin API](../reference/plugin-api.md) — the public
  API surface a plugin can call.
- [Themes and CSS snippets](./themes-and-snippets.md) — when you do
  not need JS, just CSS.

---

[← Themes and CSS snippets](./themes-and-snippets.md) · [Index](./README.md) · [next: Accessibility →](./accessibility.md)
