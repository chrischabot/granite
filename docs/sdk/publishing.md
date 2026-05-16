# Publishing

Granite plugins ship as plain directories: a `manifest.json`, a `main.js`,
and an optional `styles.css`. There's no build system you have to use, no
package format to learn — just put the three files where Granite can find
them.

## Directory layout

```text
my-plugin/
  manifest.json
  main.js
  styles.css            (optional)
  README.md             (optional; not loaded by Granite)
```

Bundling is optional. If you write your plugin in TypeScript or use
modules, use any bundler (esbuild, rollup, tsup) to emit a single
`main.js` in CommonJS format. The runtime sandbox only provides `module`,
`exports`, `api`, and `require("obsidian")` (the shim).

## Hosting the manifest

For the in-app **Plugins → Check for updates** flow to work, point
`manifestUrl` in your shipped `manifest.json` at a stable URL that serves
the **same JSON**. Convention: a raw URL on a branch that always tracks
your latest release.

```json
{
  "id": "my-plugin",
  "name": "My plugin",
  "version": "1.0.0",
  "manifestUrl": "https://raw.githubusercontent.com/me/my-plugin/main/manifest.json"
}
```

When the user runs the update check:

1. Granite fetches your `manifestUrl` with `credentials: "omit"`.
2. Parses the JSON and reads `version` and `minAppVersion`.
3. Compares with `compareVersions(local, remote)` (see
   `src/core/plugins/update-check.ts`).
4. If `local < remote`, the user sees a "&lt;id&gt; &lt;remote-version&gt;
   is available" notice.
5. If `APP_VERSION < remote.minAppVersion`, the user sees an
   "incompatible" warning notice (sticky).

The manifest **at the URL** is what wins. The user is not auto-upgraded;
they have to download the new `main.js` and `manifest.json` themselves (or
use the community-registry install flow, below).

## Version bumping

`compareVersions(a, b)` splits on `.`, `+`, and `-` and treats missing
parts as 0. All of these compare as you'd expect:

- `1.0.0 < 1.0.1`
- `1.0 < 1.0.1` (treated as `1.0.0`)
- `1.0.0-rc.1 < 1.0.0`
- `1.0.0+build.5 == 1.0.0` (build metadata sorts equal as digits)

Stick to plain `MAJOR.MINOR.PATCH` if you want predictable behaviour.

## `minAppVersion` discipline

Bump `minAppVersion` only when your plugin **requires** an API or
behaviour added in a newer Granite. If you set it too aggressively, users
on older Granite installs see a permanent "incompatible" warning every
time they open the update checker.

The current Granite `APP_VERSION` is `0.1.0-dev`. Treat any release before
the first stable `0.1.0` as a moving target — plugins built against the
dev version may need adjustment when the API surface stabilises.

## Distributing via the in-app Plugin Browser

`src/core/plugins/community-registry.ts` defines the registry shape
Granite consumes:

```ts
export interface CommunityPluginRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly author: string;
  readonly description: string;
  readonly repo: string; // "<owner>/<repo>"
}
```

Validation:

- `id` must match `/^[a-z0-9_-]+$/i`.
- `repo` must match `/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/`.
- `name`, `author`, `description` must be non-empty strings.

Entries that fail validation are silently dropped. The default registry
URL is:

```text
https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json
```

Granite intentionally reads the Obsidian community-plugins registry so any
plugin already published for Obsidian-shaped community installs surfaces
in Granite's browser. When the user picks an entry, Granite resolves
install URLs via `getCommunityPluginInstallUrls(entry, version)`:

```ts
const tag = encodeURIComponent(version.trim());
const releaseBase = `https://github.com/${entry.repo}/releases/download/${tag}`;
return {
  manifestUrl: `${releaseBase}/manifest.json`,
  mainUrl: `${releaseBase}/main.js`,
  stylesUrl: `${releaseBase}/styles.css`,
  updateManifestUrl: `https://raw.githubusercontent.com/${entry.repo}/master/manifest.json`,
};
```

For a plugin to be installable from Granite's Plugin Browser, you must
publish a GitHub release tagged with your plugin version, with
`manifest.json`, `main.js`, and (optionally) `styles.css` attached as
release assets. The "raw" `manifest.json` on `master` is what the update
checker hits later.

## Releasing checklist

1. Bump `version` in `manifest.json`.
2. Verify `minAppVersion` is set to the lowest Granite version that
   actually works with your code.
3. Build / bundle to `main.js` if needed.
4. Commit and tag: `git tag v1.0.0 && git push --tags`.
5. Create a GitHub release for the tag. Attach `manifest.json`, `main.js`,
   and any `styles.css`.
6. Update the `manifest.json` on your default branch so the
   `updateManifestUrl` consumers see the new version.

## Security expectations for users

Plugins run with the same JS privileges as Granite itself. The host's
defences are limited to:

- **Restricted mode** (`settings.pluginRestrictedMode`) — on by default
  for new vaults. The loader refuses to evaluate community plugin code
  while it's on.
- **No node integration** — plugins cannot `require("fs")`,
  `require("child_process")`, or load native bindings.
- **Vault scoping** — `api.vault.read` / `api.vault.write` can only touch
  files under the vault root.

There is no per-permission prompt. If a user enables your plugin, your
code runs. Be considerate: don't ship surprise telemetry, don't make
network calls without the user opting in, and document any IO your plugin
does outside the active vault.

## See also

- [Manifest](./manifest.md) for every field.
- [Plugin API → update-check semantics](../reference/plugin-api.md#update-check-semantics).
- The Granite community-plugin browser at **Settings → Community plugins**.

[← cookbook](./cookbook.md) · [Index](./README.md)
