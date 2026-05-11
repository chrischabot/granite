# Granite plugin examples

Sample plugins demonstrating Granite's plugin API.

## Installing a plugin

1. Open the vault you want to extend.
2. Inside the vault, create a folder `.granite/plugins/<plugin-id>/`. The
   `<plugin-id>` is the directory name and must match the `id` in the
   plugin's `manifest.json` (lowercased, no spaces).
3. Copy the plugin's `manifest.json` and `main.js` into that directory.
4. Open Granite → **Settings → Plugins** and toggle the plugin on. Plugins
   are disabled by default (Restricted mode).

## Plugin API

A plugin is a CommonJS-style script: `module.exports` should expose
`onLoad(api)` and (optionally) `onUnload(api)` lifecycle hooks. Both receive
the `PluginApi`:

```ts
interface PluginApi {
  commands: typeof commandRegistry;   // .register(cmd) → disposer
  workspace: typeof workspaceStore;   // .openFile, .openWebviewer, etc.
  notice: typeof noticeManager;       // .show(message, { kind, timeoutMs })
  vault: {
    active: { id; name; kind: "fsa" | "opfs" };
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    listMarkdown(): Promise<Array<{ path; size; mtimeMs }>>;
  };
  granite: { version: string; activeThemePath: string | null };
  log: (...args: unknown[]) => void;  // console.log prefixed with `[plugin:<id>]`
}
```

Drop the included `granite-api.d.ts` next to your plugin to get full editor
autocomplete.

## Examples in this directory

### `word-counter/`

Adds a "Count words across vault" command that scans every markdown file via
`api.vault.listMarkdown()` + `api.vault.read()` and surfaces the total via
`api.notice.show()`. A good starting point for plugins that produce
vault-wide reports.

### `auto-tagger/`

Adds a "Scan active note for tag candidates" command. Reads the active
markdown note's body, extracts capitalized multi-word phrases, and merges
them into the frontmatter `tags` array via `api.vault.write()`. Demonstrates
read-modify-write workflows and lightweight frontmatter manipulation.