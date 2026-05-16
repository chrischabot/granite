# Troubleshooting

When something goes wrong, this page is your first stop. It covers
file recovery, the *Show debug info* command, common issues, and how
to report a bug.

## File recovery

The **File recovery** core plugin maintains periodic on-disk
snapshots of every changed Markdown and canvas file. If a file gets
corrupted, overwritten, or accidentally cleared, you can roll back to
any recent snapshot.

### How snapshots work

- **What is snapshotted.** The full content of every `.md` and
  `.canvas` file that has changed since the previous snapshot — only
  the active document is snapshotted to avoid hammering the file
  system.
- **When.** Default cadence is every **5 minutes** when changes have
  occurred. The plugin checks every minute and skips intervals when
  nothing changed.
- **Where.** Snapshots are stored in your browser's IndexedDB
  database (named `granite-recovery`), not inside the vault. This
  means they survive a vault delete or rename, but they live on the
  browser profile and are not synced between devices.
- **Retention.** Default **7 days**. Snapshots older than that are
  pruned automatically.

Configure both numbers in *Settings → Plugin options → File
recovery*.

### Restoring a file

1. Open the file you want to recover.
2. Run **File recovery: View** from the Command palette.
3. A modal opens listing snapshots for this file, newest first. Each
   row shows the snapshot's modification time and size.
4. Pick a snapshot. A preview of the snapshot content appears.
5. Click **Restore** to overwrite the current file with the snapshot,
   or **Copy** to copy the snapshot content to your clipboard
   without touching the file.

The restore is a normal file write — it is itself snapshotted, so you
can undo by restoring the previous snapshot if needed.

### Taking a snapshot manually

Run **File recovery: Snapshot now** to force an immediate snapshot of
the active file, regardless of the interval. Handy before risky
edits or pasting large chunks.

### Clearing snapshots

The *File recovery* settings page exposes a **Clear** button that
removes every snapshot from IndexedDB after a confirmation. You
typically do not need to do this — automatic pruning handles old
snapshots — but it can free a little disk space if you have been
editing a huge file for a long time.

### Limitations

- Snapshots are **local to one browser profile**. Clearing site data
  for Granite, switching browsers, or using Granite from a different
  computer all start fresh.
- Snapshots are **only for `.md` and `.canvas` files**. Other files
  (images, PDFs, bases) are not snapshotted; back them up via your
  file system instead.

## Show debug info

When you hit a bug, the fastest way to give a useful report is to
run **Granite: Show debug info** from the Command palette (`Mod+P`).
This collects:

- Granite's version.
- Your operating system platform and browser user-agent.
- The vault's root folder name.
- Total file count, Markdown file count, and total vault size.
- Workspace structure: open tab groups and tabs.
- Registered command count.
- Indexed tag and property counts.
- The list of installed plugins with id, name, version, and enabled
  status.

The collected report is copied to your clipboard automatically and
also shown in a sticky notice you can read.

Example output:

```
Granite — debug info
Version: 0.4.0
Platform: MacIntel
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) ...
Vault: my-notes
Files: 1,234
Markdown files: 1,180
Vault size: 24.7 MB
Workspace: 2 group(s), 5 leaf/leaves
Commands: 217
Tags: 384
Properties: 42
Plugins:
  [x] my-plugin (My plugin) 1.2.0
  [ ] another-plugin (Another) 0.3.1
```

Paste that into your bug report and you have given the maintainer
80% of what they need.

## Reporting bugs

If you have hit a reproducible problem:

1. Run **Granite: Show debug info** and copy the report.
2. Try to find the smallest reproduction: which file, which command,
   which key sequence reproduces it?
3. Open a GitHub issue with:
   - A short, specific title.
   - The debug-info block.
   - Step-by-step reproduction.
   - What you expected to happen.
   - What actually happened.
   - Screenshots if relevant.

For security issues (a plugin behaving maliciously, a way to read
files outside the vault), please email the maintainers privately
rather than open a public issue.

## Common issues

A short catalogue of problems that come up.

### "Permission required" when opening a vault

The browser's File System Access API permission has lapsed. Open the
vault switcher (bottom of the left sidebar) and click *Reauthorize*
on the affected vault. You will see your browser's permission prompt
— grant **read and write**.

### My changes are not saving

A few likely causes:

1. **The browser denied write access.** See above.
2. **The disk is full** or the file is read-only. Check your file
   manager.
3. **Another program has the file locked** (rare on macOS/Linux; more
   common with Windows + sync tools). Close the other program and
   try again.

If unsure, run *Granite: Show debug info* — it will surface the
vault root path so you can sanity-check that Granite is writing where
you expect.

### Plugin causing problems

If a plugin freezes the UI, drops links, or throws errors:

1. Open *Settings → Community plugins*.
2. Toggle the suspect plugin **off**.
3. Restart Granite (close the tab and reopen the URL).
4. If the problem goes away, you have a suspect.

If you cannot reach Settings because the plugin is blocking the UI,
temporarily turn on **Restricted mode** by opening
`.granite/community-plugins.json` in any text editor and changing
its contents to `[]`. Granite will reload with no community plugins
running.

### Theme makes the UI illegible

Run **Themes: Use default theme** from the Command palette. If you
cannot open the palette because the theme has hidden it, edit
`.granite/appearance.json` and set the theme to `default`, or just
delete the file — Granite recreates it with defaults on the next
launch.

### Search is missing recent edits

The metadata cache may be stale. Run *Settings → Files and links →
Rebuild vault cache*. This rescans every file and rebuilds the
indexed metadata. It is safe to run any time.

### Quick Switcher feels slow

In vaults of more than ~10,000 files, the Quick Switcher
automatically switches to a coarser matcher to keep typing
responsive. If you still feel a stall, narrow the search — typing
even one extra character drops the candidate pool dramatically.

### Hotkey is doing the wrong thing

Two possibilities:

1. The hotkey is **bound to two commands**. Open *Settings →
   Hotkeys*, search for the hotkey symbol, and remove the conflict.
2. The hotkey is **the OS or browser's**, not Granite's. Hotkeys like
   `Mod+Q` (quit) or `Mod+T` (new browser tab in some hosts) may
   bubble up before Granite sees them.

### Live Preview is hiding syntax I need to edit

Switch to **Source mode** for that note: status-bar editing mode chip,
or bind a hotkey to *Toggle Live Preview / Source mode*. Source mode
shows every Markdown character verbatim.

### Properties panel is empty

If *Settings → Editor → Properties in document* is set to **Hidden**,
the inline editor does not render even when the note has YAML
frontmatter. Switch to *Visible* to see the editor at the top of the
note, or use the Properties sidebar.

### Notes from another tool look wrong

The **Format converter** core plugin migrates common legacy syntaxes
to Granite-native equivalents:

- Roam Research: `#tag` and `#[[tag]]` → `[[tag]]`; `^^highlight^^`
  → `==highlight==`; `{{[[TODO]]}}` → `[ ]`.
- Bear: `::highlight::` → `==highlight==`.
- Zettelkasten linker: `[[UID]]` → `[[UID File Name]]`.
- Deprecated singular YAML keys: `tag` → `tags`, `alias` → `aliases`,
  `cssclass` → `cssclasses`.

Run **Format converter: Open format converter**, check the
categories you want, and click *Start conversion*. Back up your vault
first — the conversion writes to every affected file in a single
pass.

### Granite forgot my settings

If `.granite/settings.json` is gone (you cleared site data, deleted
the folder, or copied the vault without it), Granite starts with
defaults. Settings are *per vault* — they do not sync across vaults
automatically. Restore the file from a backup, or reconfigure once
and let Granite write a fresh copy.

## When to delete `.granite/`

Generally, do not. But it is **safe**: nothing in `.granite/` is
content. You will lose customisations (settings, hotkeys, workspace
layout, plugin data, installed themes, snippets, bookmarks) but no
notes.

Cases where it is reasonable:

- You are giving the vault to someone else and want them to start
  clean.
- The vault state has become inconsistent (very rare) and you want to
  reset Granite without affecting your notes.
- You are debugging a plugin and want to confirm whether the bug
  follows the plugin or follows the vault.

Quit Granite, delete `.granite/`, reopen the vault. You will be
prompted for permission again because the browser tracks permission
per folder identity.

## See also

- [Vaults](./vaults.md) — vault layout and permissions.
- [Plugins](./plugins.md) — enabling, disabling, uninstalling.
- [Settings](./settings.md) — every option and its on-disk location.

---

[← Accessibility](./accessibility.md) · [Index](./README.md) · [Done — back to docs index →](../README.md)
