# Installation

Granite is a TypeScript + Vite + React application. The supported runtime and
package manager is [Bun](https://bun.sh/). Granite has no compiled binary at the
moment — you run it from source or host the built bundle yourself.

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Bun | The repo's `package.json` is Bun-managed (`bun install`, `bun run dev`). Node-only flows are not supported. |
| Chromium-based browser | Required for the File System Access API used by Granite's vault adapter. Firefox and Safari can run Granite against OPFS-only vaults but cannot pick a system folder. |
| Operating system | macOS, Linux, or Windows. No platform-specific toolchain is needed for development. |

## Install dependencies

```sh
git clone <repo-url> granite
cd granite
bun install
```

`bun install` reads `bun.lock` and writes `node_modules/`. The first install
pulls roughly 200 packages; subsequent installs are near-instant.

## Sanity-check the install

```sh
bun run typecheck
bun run lint
bun run test
```

- `typecheck` runs `tsgo --noEmit` — fast, native-preview TypeScript.
- `lint` runs Biome over `src/`.
- `test` runs the Vitest unit/integration suite.

Browser verifiers and the Lighthouse a11y audit are not part of the basic
sanity check; see the [Developer guide](../developer/testing.md) once you start
contributing code.

## Update later

```sh
git pull
bun install
```

Run `bun install` after every pull — `bun.lock` is committed and you want your
`node_modules/` in sync with the lockfile.

← [Getting started](./README.md) · [Index](../README.md) · [First run](./first-run.md) →
