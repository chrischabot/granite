# First run

Once `bun install` has finished, you can boot Granite.

## Start the dev server

```sh
bun run dev
```

Vite serves the app at:

```
http://localhost:8080
```

Open that URL in a Chromium-based browser. If port `8080` is busy:

```sh
bunx vite --host 0.0.0.0 --port 8081
```

The dev server has hot module reload — edits to `src/` are picked up without
a full page refresh. CSS changes in `src/styles/` apply instantly.

## The Vault Picker

The first screen is the **Vault Picker**. It is also reachable later from the
vault profile chip in the bottom-left of the workspace, and from the command
palette ("Open another vault…").

You have three options:

| Option | What it does | Where it stores data |
|--------|--------------|----------------------|
| **Pick a folder** | Asks the browser for a folder via the File System Access API. Granite stores a permission handle in IndexedDB and reopens the same folder next time. | The folder you picked, on your disk. |
| **Open existing Obsidian vault** | Same as "pick a folder", but Granite reads any existing `.obsidian/` settings for compatibility without rewriting them. | Same. |
| **Create OPFS vault** | A browser-managed vault stored in Origin Private File System. No system permissions needed. | Inside the browser profile's OPFS. Not portable across browsers. |

Pick a folder for your first vault. Granite will create a `.granite/`
subdirectory inside it on the first edit — see the
[vault format reference](../reference/vault-format.md) for the layout.

## What happens after you choose

Granite shows the workspace shell:

- **Title bar** with vault name and window controls.
- **Ribbon** down the left edge with frequently used commands.
- **Left sidebar** (File explorer, Search, Bookmarks, Tags).
- **Workspace** (the central tab area, initially showing an empty tab).
- **Right sidebar** (Outline, Backlinks, Outgoing links, Properties).
- **Status bar** at the bottom right.

If the right sidebar is collapsed, press the sidebar toggle in the top-right
of the workspace. Same for the left sidebar.

## Granted permissions

Granite re-asks for filesystem permission when you reopen a Chromium tab in
some cases. This is browser policy, not Granite — accept the prompt and your
vault will reopen.

## Reset (if you need to)

To wipe Granite's local state without touching your vault contents:

1. DevTools → Application → IndexedDB → delete the `granite` and
   `granite-recovery` databases.
2. DevTools → Application → Local Storage → delete keys starting with
   `granite.*`.
3. DevTools → Application → Storage → "Clear site data".

Your Markdown files are untouched.

← [Installation](./installation.md) · [Index](../README.md) · [Your first note](./first-note.md) →
