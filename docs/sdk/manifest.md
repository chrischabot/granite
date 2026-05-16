# Manifest

Every plugin directory must contain a `manifest.json` file. The loader reads
it before evaluating `main.js`; without a valid manifest the plugin is
invisible to Granite.

Source: `PluginManifest` in `src/core/plugins/types.ts`. Parsed by
`readManifest(id)` in `src/core/plugins/loader.ts`.

## Schema

```ts
export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: string;
  readonly main?: string;
  readonly manifestUrl?: string;
  readonly minAppVersion?: string;
}
```

## Fields

### `id` (required)

Lowercase identifier. **Must match the directory name** under
`.granite/plugins/`. The loader uses the directory name as the canonical id
when it builds the manifest object, so a mismatched `id` field is silently
overwritten — but you should still set it correctly so the file is
self-documenting.

Conventionally lowercase ASCII with `-` for word separators. The community
registry validates ids against `/^[a-z0-9_-]+$/i` (see
`src/core/plugins/community-registry.ts`).

### `name` (required)

Display name shown in:

- The Settings → Plugins list.
- The "Plugin options" tab labels.
- Update / load-failure notices.

Free-form Unicode. Keep it short — settings tab labels can elide long names.

### `version` (required)

Semver-ish string. The update checker (`compareVersions`) splits on `.`,
`+`, and `-` and treats missing parts as 0, so `1.0`, `1.0.0`,
`1.0.0-rc.1`, and `1.0.0+build.5` all compare sensibly.

### `description` (optional)

One-line description. Shown alongside the plugin in the plugin list.

### `author` (optional)

Free-form author or organisation name.

### `main` (optional, default `"main.js"`)

Filename of the entry-point JS file relative to the plugin directory. Set
this if you ship your code under a different name (`index.js`,
`plugin.js`, …).

### `manifestUrl` (optional)

HTTPS URL pointing at a stable, ungated `manifest.json`. Used by
**Plugins → Check for updates** (`src/core/plugins/update-check.ts`):

1. Granite fetches the URL with `credentials: "omit"`.
2. Parses the response as JSON.
3. Reads `version` and `minAppVersion` from the parsed object.
4. If `compareVersions(currentVersion, remoteVersion) < 0`, the plugin is
   flagged as having an update.
5. If `compareVersions(APP_VERSION, remoteMinAppVersion) < 0`, the plugin
   is flagged as incompatible (sticky warning notice).

Set this to a stable raw-content URL — typically your release tag's
`manifest.json` (so the version it points at always matches the version it
declares):

```text
https://raw.githubusercontent.com/<owner>/<repo>/main/manifest.json
```

The community registry helpers in `community-registry.ts` build this URL
from `repo` for you.

### `minAppVersion` (optional)

Minimum required Granite `APP_VERSION`. The build's `APP_VERSION` is in
`src/core/app/version.ts` — currently `0.1.0-dev`.

The update checker uses this to flag installed plugins that need a newer
Granite. The loader does **not** currently refuse to load a plugin whose
`minAppVersion` is higher than the running app — but it will if a remote
manifest update raises the bar.

## Example

A complete manifest from `examples/plugins/data-store/manifest.json`:

```json
{
  "id": "data-store",
  "name": "Data Store Demo",
  "version": "0.1.0",
  "description": "Demonstrates loadData/saveData, statusBar items, settings tabs, and event subscriptions.",
  "author": "Granite",
  "main": "main.js"
}
```

A manifest set up for the update checker:

```json
{
  "id": "my-plugin",
  "name": "My plugin",
  "version": "1.2.0",
  "description": "Does the thing.",
  "author": "Me",
  "manifestUrl": "https://raw.githubusercontent.com/me/my-plugin/main/manifest.json",
  "minAppVersion": "0.1.0"
}
```

## Validation

`readManifest(id)` in `src/core/plugins/loader.ts` returns `null` when the
file:

- doesn't exist,
- isn't parseable JSON, or
- doesn't have a `name` or `version` string.

A `null` manifest causes the plugin to be skipped entirely on the next
`refreshAll`. The loader does not show an error notice for missing-manifest
cases — by design, a partial install should be silently skipped rather
than spamming the user.

## See also

- [Plugin API → PluginManifest](../reference/plugin-api.md#pluginmanifest)
- [Publishing](./publishing.md) for `manifestUrl` deployment guidance.

[← quickstart](./quickstart.md) · [Index](./README.md) · [lifecycle →](./lifecycle.md)
