# Build and deploy

Granite is a single-page Vite app. The production build is a folder of static
assets that can be served from any HTTP server or wrapped in a native shell.

## Producing a build

```sh
bun run build
```

This runs `tsgo --noEmit && vite build`. The first step is a full TypeScript
type-check (no JS emitted — Vite handles transpilation); the second produces
the `dist/` directory.

A successful build looks like:

```text
dist/
├── index.html
├── assets/
│   ├── index-<hash>.js
│   ├── index-<hash>.css
│   ├── vendor-react-<hash>.js
│   ├── vendor-codemirror-<hash>.js
│   ├── vendor-mermaid-<hash>.js
│   ├── vendor-katex-<hash>.js
│   ├── vendor-prism-<hash>.js
│   ├── vendor-markdown-<hash>.js
│   ├── vendor-effect-<hash>.js
│   ├── vendor-lucide-<hash>.js
│   ├── vendor-utils-<hash>.js
│   └── vendor-<hash>.js
├── *.svg / *.png            (from public/)
└── workers/                 (pdf.js, mermaid)
```

Source maps are generated alongside each asset (`sourcemap: true`). Strip
them before shipping if you do not want to ship them.

## What `vite.config.ts` does

`vite.config.ts` is small and worth reading. Highlights:

- **React plugin** via `@vitejs/plugin-react`.
- **Dev server** on `0.0.0.0:8080` with `strictPort` and an allowlist for
  preview hostnames.
- **Path aliases**: `@`, `@core`, `@ui`, `@styles`, `@api` map to the
  matching directories under `src/`. Use these consistently — relative
  imports between top-level areas are discouraged.
- **Build target**: `es2022`. Granite assumes a modern Chromium runtime.
- **`chunkSizeWarningLimit: 1000`** — relaxes Vite's default 500 kB warning
  because the editor and Mermaid bundles cross that threshold.
- **`manualChunks`** — splits `node_modules` into a stable set of vendor
  chunks so changes in app code never re-hash the large vendor files.
  Vendor groups: `vendor-react`, `vendor-codemirror`, `vendor-mermaid`,
  `vendor-katex`, `vendor-prism`, `vendor-markdown`, `vendor-effect`,
  `vendor-lucide`, `vendor-utils`, and the catch-all `vendor`.
- **Vitest config** (`test:` block) — happy-dom environment, setup file at
  `src/test/setup.ts`, includes `src/**/*.test.{ts,tsx}`, excludes
  `node_modules`, `dist`, `.bun`, and `specs`.

## Static deployment

Serve `dist/` from any static host. There are no server-side endpoints to
proxy and no API base URL to configure.

Minimum requirements for the host:

- Serves arbitrary `Content-Type` correctly for `.js`, `.css`, `.wasm`,
  `.svg`, `.json`.
- Returns `dist/index.html` for unknown routes (Granite is a single page).
- Sets `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` if you want to take advantage
  of `crossOriginIsolated` features. None are strictly required today.
- Serves over HTTPS in production so that the File System Access API works.

The build does not embed any analytics, telemetry, auth, or remote
configuration. The only network traffic at runtime is:

- Fetching the user's own community-plugin manifest, when the user clicks
  "Check for updates" in the Community Plugins settings page.
- Whatever a community plugin makes — that is the plugin's concern.

## Wrapping in a native host

A native shell (Electron, Tauri, a custom WebView) can load `dist/` from the
filesystem and inject extra capabilities on `window.graniteHost` before the
app boots.

The single hook currently consumed is the system-trash bridge — see
`src/core/fs/native-trash.ts`:

```ts
// Inject before the Granite bundle runs.
window.graniteHost = {
  fs: {
    async moveToSystemTrash({ rootName, path }) {
      // Resolve `rootName + path` against the user's chosen folder
      // and shell-move it to the OS trash / recycle bin.
      await nativeShell.trash(resolveVaultPath(rootName, path));
    },
  },
};
```

When this bridge is present:

- The Files / Trash settings page exposes "System trash" as a deletion target.
- The FileSystem adapter wires the bridge into `moveToSystemTrash(path)`,
  which returns a typed `Effect.Effect<void, FsError>`.

Other native conveniences (window chrome integration, tray, deep-link
handling, file association) can be layered in the host shell — the web app
will keep working unchanged.

### Electron sketch

```ts
// main.ts (Electron main)
const win = new BrowserWindow({
  webPreferences: { preload: path.join(__dirname, "preload.js") },
});
win.loadFile("dist/index.html");

// preload.ts
import { contextBridge, shell, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("graniteHost", {
  fs: {
    moveToSystemTrash: ({ rootName, path }) =>
      ipcRenderer.invoke("trash", { rootName, path }),
  },
});

// in main process:
ipcMain.handle("trash", async (_e, { rootName, path }) => {
  await shell.trashItem(resolveVaultPath(rootName, path));
});
```

### Tauri sketch

Use Tauri's `dialog` and `fs` APIs in a small preload bundle, then expose
`window.graniteHost.fs.moveToSystemTrash` in the same shape.

## CI considerations

A reasonable CI gate runs:

```sh
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run docs:check
```

Headed browser verifiers (`bun run verify:*`) require Playwright's Chromium
binary; install it once on the runner:

```sh
bunx playwright install chromium
```

See [Testing](./testing.md) for the test taxonomy and [Browser
verifiers](./verifiers.md) for the verifier index.

---

[← running-servers](./running-servers.md) · [Index](../README.md) · [next →](./web-app.md)
