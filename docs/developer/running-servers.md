# Running the servers

Granite ships with two Vite-driven local servers — a development server with
HMR, and a preview server that hosts the production build. There is no
Granite backend; everything else runs in the browser against the user's
vault folder.

## Prerequisites

- [Bun](https://bun.sh) (matches the `bun.lock` lockfile in the repo).
- A Chromium-based browser. The File System Access API used for user-picked
  vaults is currently best supported in Chrome, Edge, and other Chromium
  derivatives.
- macOS, Linux, or Windows.

Install dependencies once:

```sh
bun install
```

## Development server

Start Vite in dev mode:

```sh
bun run dev
```

This runs `vite --host 0.0.0.0 --port 8080` (see `package.json`). The app is
served at:

```text
http://localhost:8080
```

Hot module reloading is enabled. Editing files under `src/` causes Vite to
push module updates without a full reload. State held in the React tree —
including the workspace store and active editor — survives most edits; CSS
changes are applied without losing scroll or focus.

### Changing the port

`vite.config.ts` sets `strictPort: true` and `port: 8080`, so Vite will not
silently fall back to another port. To run on a different port, invoke Vite
directly:

```sh
bunx vite --host 0.0.0.0 --port 8081
```

### Accessing from another device on the LAN

The `--host 0.0.0.0` flag makes Vite bind to every network interface. From
another device on the same network, browse to the dev machine's address:

```text
http://<dev-machine-ip>:8080
```

File System Access vaults still live on whichever machine's browser opened
them — OPFS and IndexedDB are per-browser-profile. Use a network share if you
need the same vault on two devices.

`vite.config.ts` whitelists a couple of preview hostnames
(`.preview.dev.igent.ai`, `.preview.igent.ai`) so the dev server can be
fronted by a tunnel. To allow another hostname, extend `server.allowedHosts`.

### HMR notes

- The CodeMirror editor is mounted imperatively; edits to its setup module
  trigger a full leaf remount, which discards uncommitted view state for that
  leaf. Save before swapping editor modules.
- The Effect runtime is constructed lazily on first use. If you change
  layers, do a full reload — HMR will not re-thread an already-running
  runtime.
- Workspace, settings, plugins-enabled, and recovery state survive a full
  reload; vault handles are persisted in IndexedDB. The Vault Picker resumes
  the last vault on load.

## Preview server

After a production build, serve `dist/` locally:

```sh
bun run build
bun run preview
```

The preview server runs at the same address as dev:

```text
http://localhost:8080
```

The preview build is what gets shipped (modulo any native host integration).
Use it to verify chunk splitting, bundle size, and any code that branches on
`import.meta.env.PROD`.

To preview on a different port:

```sh
bunx vite preview --host 0.0.0.0 --port 8081
```

## Browser support

Granite targets a modern Chromium browser for development:

- **File System Access API** — required to open a user-picked folder as a
  vault. Available in Chromium 86+.
- **OPFS** (Origin Private File System) — used for sandboxed vaults that
  don't need a folder picker. Available across modern browsers but has
  practical limits in private/incognito modes.
- **IndexedDB** — used for vault handles and recovery snapshots.

Firefox and Safari work for parts of the UI but cannot open user-picked
vaults via FSA today. Use Chromium for the full experience.

### HTTPS and File System Access

Most browsers gate the File System Access API behind a secure context
(`https://` or `http://localhost`). Plain `http://` over the LAN may refuse
to show the folder picker. Options:

- Use `localhost` directly on the dev machine.
- Front the dev server with an HTTPS tunnel (e.g. a reverse proxy you trust,
  the included `.preview.*` allowlist, or any local TLS terminator).
- Use OPFS-backed vaults from the Vault Picker — those do not require a
  picker dialog.

## Host integration: `window.graniteHost`

Granite is normally a pure web app, but a native host (Electron, Tauri, a
custom WebView wrapper) can inject extra capabilities on the global window.
The only documented hook today is the native trash bridge:

```ts
window.graniteHost = {
  fs: {
    moveToSystemTrash(request: { rootName: string; path: string }): void | Promise<void> {
      // host implementation
    },
  },
};
```

If present, `detectNativeSystemTrashBridge()`
(`src/core/fs/native-trash.ts`) returns the bridge and the FileSystem
adapter wires it into `moveToSystemTrash`. The Files / Trash settings page
then offers "System trash" as a deletion target. When no bridge is detected,
Granite falls back to vault `.trash/` or permanent deletion based on the
user's choice.

See [Build and deploy](./build-and-deploy.md) for how to wrap the production
build into a native host.

## Troubleshooting

### Port already in use

`strictPort: true` means Vite errors instead of choosing another port. Free
the port or pick a new one:

```sh
lsof -i :8080            # find the process
kill <pid>               # or pick a new port:
bunx vite --port 8081
```

### "Workspace has no active group" or weird hydration errors after edits

The workspace store rebuilds from `.granite/workspace.json` on load. If you
hand-edited that file or interrupted a write, reset it by deleting
`.granite/workspace.json` inside the vault and reloading. Granite will
rebuild the default layout.

### OPFS errors in incognito / private windows

Browsers throttle or disable OPFS in private modes. Use a normal window
during development, or switch to a File System Access vault.

### Stale Vite cache

If a dependency change is not picked up, clear the Vite cache:

```sh
rm -rf node_modules/.vite
```

A re-run of `bun install` is generally not needed.

### Stale workers / animation timers after HMR

CodeMirror, Mermaid, and PDF.js each spin up workers and animation frames.
After many HMR cycles, performance can drift. Force a full reload (`Ctrl/Cmd
+ Shift + R`) when this happens.

### Verifiers refuse to attach

Browser verifiers (`scripts/verify-*-browser.mjs`) launch their own
Chromium via Playwright and do not depend on your `bun run dev` server. If
they hang at boot, install Playwright's browser binaries:

```sh
bunx playwright install chromium
```

## Tips and tricks

- Use the `__pseudo__` locale (Settings → Appearance → Locale) to surface
  any UI string that bypassed `t(...)`. Pseudo-translated strings appear in
  brackets with accented characters; un-translated strings stand out
  immediately. See [Internationalisation](./i18n.md).
- The Command Palette (`Mod-P`) lists every registered command and is the
  fastest way to exercise built-in plugins during development.
- The Help modal (`F1`) embeds the same Markdown documentation, so changes
  to `docs/` show up in-app on next reload of the doc pipeline.
- `bun run docs:check` re-validates that the public `PluginApi` matches its
  documentation. Run it whenever you edit `src/core/plugins/types.ts`.
- For typing-latency work, the verifier `verify:typing-perf-browser` and the
  in-app perf budgets in `src/core/perf/` give reproducible numbers.

---

[← repo-layout](./repo-layout.md) · [Index](../README.md) · [next →](./build-and-deploy.md)
