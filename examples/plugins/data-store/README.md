# Data Store Demo

Sample Granite plugin showing how to use the plugin platform's persistence,
chrome, and event APIs.

## What it does

- **`loadData` / `saveData`** — persists a small counter to
  `.granite/plugins/data-store/data.json`. The value survives reloads and
  vault re-opens.
- **`statusBar.add`** — adds a counter readout to the bottom-right status
  bar. Clicking it increments and saves.
- **`addSettingsTab`** — registers a "Counter Demo" tab inside Settings →
  Plugin options. The tab renders a reset button and a "last updated"
  timestamp.
- **`events.on("file-open", …)`** — logs every active-leaf file change to
  the console (look for `[plugin:data-store]` entries).

## Installing locally

1. Open the vault you want to use.
2. Create `<vault>/.granite/plugins/data-store/` and copy `main.js` and
   `manifest.json` into it.
3. Open **Settings → Plugins**, find "Data Store Demo", and flip the
   toggle on.

## Files

- `manifest.json` — required; declares `id`, `name`, `version`, etc.
- `main.js` — the plugin body. Must assign to `module.exports`.
- `granite-api.d.ts` — drop this from `examples/plugins/` alongside
  `main.js` if you want editor IntelliSense for the `api` parameter.