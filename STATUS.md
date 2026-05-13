# Granite — Project Status Report

_Updated: 2026-05-13._

## Headline

Granite's v1 acceptance checklist is implemented and the local release gates are
green on `main`.

- `specs/product/24_acceptance_criteria.md` is fully checked.
- `todo.md` has no unchecked forward-work items.
- `/Users/chabotc/Desktop/severe-testing.md` contains severe-test versions for
  every acceptance section plus the renderer, docs, i18n, and cross-cutting
  gates.
- `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build` pass.

## Current Evidence

- Unit suite: 84 test files, 631 tests passing.
- Browser verifiers cover the shipped severe-test paths for startup,
  search/perf, graph panning, live preview, save round-trip, keyboard,
  populated keyboard, Obsidian vault compatibility, community themes,
  community plugins, i18n/RTL, native formats, trash settings, sidebars, tags,
  properties, format converter, Canvas, hotkeys, settings persistence,
  CommonMark/GFM, accessibility announcements, contrast, file recovery,
  external edits, error boundaries, debug info, fold persistence, Vim,
  multi-cursor, workspace restart, external drag/drop, multi-window vaults,
  icon accessibility, docs, and renderer visuals.
- Public docs are checked by `bun run docs:check` and
  `bun run docs:verify-browser`.
- The Biome baseline is cleared; repo-wide `bun run lint` now passes.

## Notes

- The native app configuration folder is `.granite/`, not `.obsidian/`, per
  `specs/product/25_legal_branding_notes.md`. Compatibility coverage verifies
  existing `.obsidian/` vault data opens and round-trips without Granite writing
  into `.obsidian/`.
- Browser verifiers prove host contracts and rendered behavior. OS-level
  integrations that cannot be proven inside Chromium, such as the operating
  system's actual recycle-bin/trash placement, remain the responsibility of
  packaged native-host smoke testing.
- Renderer visual coverage verifies representative state rendering and module
  wiring. It is not a curated pixel review of every possible third-party theme
  or every renderer table value.

## Recent Shipped Slices

- Repo-wide Biome lint gate.
- Native trash bridge browser flow.
- FSA vault-window permission handshake.
- Renderer visual browser verifier.
- Public docs browser verifier.
- Runtime i18n browser coverage.
- Populated keyboard browser verifier.
- Obsidian compatibility browser verifier.
