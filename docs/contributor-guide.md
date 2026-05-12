# Contributor Guide

## Verification

Run the strongest relevant checks before committing:

```sh
bun run test
bun run build
git diff --check
```

For accessibility work, also run:

```sh
bun run audit:a11y
```

## Testing Standard

Every feature should ship with a test that could fail for a real regression.
Prefer tests that exercise public behavior over implementation details. For
parser, compatibility, performance, and data-safety work, document the severe
test claim in `/Users/chabotc/Desktop/severe-testing.md`.

## CSS Discipline

Renderer CSS should follow the spec files in `specs/renderer/`. Prefer tokens
from `src/styles/tokens.css`, logical properties, visible focus states, and
reduced-motion guards. Avoid adding hard-coded colors or z-index values when a
token exists.

## Plugin API Discipline

Any change to the public `PluginApi` in `src/core/plugins/types.ts` must update
`docs/plugin-api.md` and `examples/plugins/granite-api.d.ts` in the same change.
