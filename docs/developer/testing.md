# Testing

Granite's quality bar is enforced by a layered suite: a fast unit/integration
tier in Vitest, a headed browser-verifier tier in Playwright/Chromium, a
Lighthouse accessibility audit, a Biome lint pass, and a documentation
pipeline check. Most contributors only need the standard local gate; the
rest is reachable as named `bun run` scripts.

## Standard local gate

Run this before every commit:

```sh
bun run lint
bun run typecheck
bun run test
bun run build
```

What each step covers:

- `bun run lint` — Biome lint over `src/`.
- `bun run typecheck` — `tsgo --noEmit`. The build also runs this first.
- `bun run test` — Vitest, every `*.test.ts(x)` under `src/`.
- `bun run build` — typecheck + `vite build`. Catches build-only regressions
  (chunk boundaries, dynamic imports, asset URLs).

`git diff --check` is a useful follow-up to catch trailing whitespace before
a push.

## Vitest (unit and integration)

```sh
bun run test          # one shot
bun run test:watch    # interactive watcher
```

Configuration is in the `test:` block of `vite.config.ts`:

- Environment: `happy-dom`.
- Setup file: `src/test/setup.ts`.
- Globs: `src/**/*.test.ts`, `src/**/*.test.tsx`.
- Excludes: `node_modules/**`, `dist/**`, `.bun/**`, `specs/**`.

Tests live next to the code they cover (e.g.
`src/core/notices/notice.test.ts`). Conventions:

- Prefer testing public behavior (`noticeManager.show(…)` resolves to a
  visible notice) over implementation details (the internal `notices`
  array).
- For parser / compatibility / performance / data-safety work, document the
  severe-test claim in `severe-testing.md` — see [Contributing](./contributing.md).
- React component tests use `@testing-library/react` against happy-dom.

## Browser verifiers (Playwright / Chromium)

Each verifier under `scripts/verify-*-browser.mjs` launches Playwright's
bundled Chromium, loads a static HTML fixture, exercises a specific
end-to-end scenario, and reports pass/fail. Verifiers are slower than unit
tests but exercise the real CodeMirror, the real markdown-it pipeline, the
real OPFS / File System Access, and the real layout.

```sh
bunx playwright install chromium      # one-time setup
bun run verify:keyboard-browser       # run a single verifier
```

See [Browser verifiers](./verifiers.md) for the full enumerated list and
running-all instructions.

## Lighthouse accessibility audit

```sh
bun run audit:lighthouse-a11y
```

Runs `scripts/audit-lighthouse-a11y.mjs`. The build is loaded in Chromium,
Lighthouse runs the accessibility category, and the script fails on
regressions against a stored baseline.

## A11y unit audit

```sh
bun run audit:a11y
```

A Vitest subset focused on accessibility:

- `src/core/a11y/icon-buttons.test.ts`
- `src/core/a11y/announcer.test.ts`
- `src/ui/A11yAnnouncer.test.tsx`
- `src/ui/overlay/Modal.test.tsx`
- `src/ui/overlay/NoticeContainer.test.tsx`
- `src/styles/contrast.test.ts`

Use this as a fast gate when working on overlays, focus management,
contrast, or the live region.

## Documentation checks

```sh
bun run docs:check
```

Runs `src/core/docs/public-docs.test.ts`. This walks every public member of
`PluginApi` (`src/core/plugins/types.ts`) and checks that the corresponding
section exists in `docs/reference/plugin-api.md` (and that the d.ts in
`examples/plugins/granite-api.d.ts` is kept in sync). The check is the
contract that the [Plugin SDK](../sdk/README.md) and
[Plugin API reference](../reference/plugin-api.md) stay accurate.

```sh
bun run docs:verify-browser
```

Runs `scripts/verify-docs-browser.mjs` — a Playwright-driven verifier that
makes sure the in-app help viewer can load the documentation tree.

## Biome (lint and format)

```sh
bun run lint              # biome check src
bun run format            # biome format --write src
```

Biome's configuration is in `biome.json`. Both commands operate on `src/`.

## Severe testing

For changes that could damage user data (vault writes, frontmatter, format
conversion, plugin lifecycle) or that change a parser / performance budget,
add a "severe test" claim — a sentence describing the regression a
particular test or verifier would catch. See [Contributing](./contributing.md)
for the convention.

## CI gate

A reasonable CI configuration runs:

```sh
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run docs:check
```

Adding `bun run audit:a11y` and a curated subset of verifiers (e.g.
`verify:obsidian-vault-browser`, `verify:save-roundtrip-browser`,
`verify:community-plugin-browser`) is recommended for any branch that
touches the relevant areas.

---

[← web-app](./web-app.md) · [Index](../README.md) · [next →](./verifiers.md)
