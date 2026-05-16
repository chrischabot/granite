# Contributing

Granite is built in the open. Patches are welcome — the rest of this guide
is about the small set of disciplines we ask every change to honor so the
codebase stays healthy.

Before you start, skim:

- [Architecture overview](./architecture.md)
- [Web app structure](./web-app.md)
- [Testing](./testing.md)
- The renderer spec for the area you are touching, under
  [`specs/renderer/`](../../specs/renderer/).

## Verification

Run the strongest relevant checks before committing:

```sh
bun run test
bun run docs:check
bun run build
git diff --check
```

When changing `src/core/plugins/types.ts`, run `bun run docs:check` before
and after updating the docs. The check should fail before the
[Plugin API reference](../reference/plugin-api.md) is updated and pass after
every public `PluginApi` member is documented.

For accessibility work, also run:

```sh
bun run audit:a11y
```

For broader gates, see [Testing](./testing.md) and
[Browser verifiers](./verifiers.md).

## Testing standard

Every feature should ship with a test that could fail for a real regression.
Prefer tests that exercise public behavior over implementation details. For
parser, compatibility, performance, and data-safety work, document the
severe-test claim in the project's `severe-testing.md` file — one sentence
describing the regression the test would catch.

When fixing a bug, add a test that would have failed before the fix.

## CSS discipline

Renderer CSS should follow the spec files in `specs/renderer/`. Prefer
tokens from `src/styles/tokens.css`, logical properties, visible focus
states, and reduced-motion guards. Avoid adding hard-coded colors or
`z-index` values when a token exists. See
[CSS architecture and design tokens](./css-and-tokens.md).

## Plugin API discipline

Any change to the public `PluginApi` in `src/core/plugins/types.ts` must
update the [Plugin API reference](../reference/plugin-api.md) and
`examples/plugins/granite-api.d.ts` in the same change. The
`bun run docs:check` test enforces this.

## Internationalisation

Every user-visible string must go through `t(...)`. Add the English entry
to `src/core/i18n/locales/en.ts` and use the key at the call site. The
externalization test (`src/core/i18n/externalization.test.ts`) catches
hard-coded strings. See [Internationalisation](./i18n.md).

## Reporting

Use the right surface for each failure mode. Notices for user-facing
outcomes, `reportCapturedError` for unexpected failures, `noticeError` plus
`reportCapturedError` together for "the user did something, it failed, and
we want diagnostics". See [Notices, errors, recovery, debug info](./reporting.md).

## Commit hygiene

- Root-cause bugs instead of papering over symptoms.
- Keep user-facing docs (`docs/`), API docs, and examples in sync when
  public behavior changes.
- One logical change per commit; mix-and-match commits are hard to review
  and to revert.
- No commented-out code; no `TODO` without an issue reference.

## Asking for help

If you are not sure where a change belongs, open a draft PR with a clear
description. The repository's `STATUS.md` and `PLAN.md` are the working
project log — skim them when starting a non-trivial change.

---

[← i18n](./i18n.md) · [Index](../README.md)

