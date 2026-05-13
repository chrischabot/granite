# Granite — Completion Plan

_Updated: 2026-05-13._

This plan reconciles `todo.md`, `done.md`, `STATUS.md`,
`specs/product/24_acceptance_criteria.md`, the renderer specs, and the severe
testing matrix.

## 1. Current State

The original implementation phases are complete:

- Track A — product acceptance criteria: closed.
- Track B — renderer fidelity modules and representative visual verification:
  closed.
- Track C — performance, i18n, accessibility, crash-safety, compatibility, and
  observability infrastructure: closed.
- Track D — public docs: closed.

The forward tracker is `todo.md`; it has no unchecked items. Shipped work is
logged in `done.md`.

## 2. Source-Of-Truth Files

- `specs/product/24_acceptance_criteria.md` — fully checked v1 acceptance list.
- `/Users/chabotc/Desktop/severe-testing.md` — severe-test versions for each
  acceptance area and cross-cutting renderer/docs/i18n gates.
- `package.json` — runnable local gates and browser verifiers.
- `STATUS.md` — current project state.
- `done.md` — shipped-work journal.

## 3. Exit Gates

The local release gate is:

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`

Additional evidence gates are the browser verifier scripts in `package.json`
and the docs gates:

- `bun run docs:check`
- `bun run docs:verify-browser`

The severe-testing matrix names the targeted browser/unit verifier for each
acceptance area.

## 4. Completion Criteria

Granite v1 is considered complete when all of the following remain true:

1. Every checkbox in `specs/product/24_acceptance_criteria.md` is checked.
2. `todo.md` has no unchecked implementation work.
3. `/Users/chabotc/Desktop/severe-testing.md` has a severe-test version for
   every acceptance area and each cross-cutting renderer/docs/i18n gate.
4. `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`
   are green on `main`.
5. The browser verifiers referenced by the severe-testing matrix remain wired
   in `package.json`.

## 5. Known Evidence Boundaries

- Browser automation can verify native-host bridge contracts but cannot prove
  the operating system's actual recycle-bin/trash placement. That requires a
  packaged native-host smoke test.
- Renderer visual verification is representative and adversarial, not an
  exhaustive pixel-perfect review of every third-party theme or every value in
  every renderer state table.
- Lighthouse is retained as a page-level accessibility signal; full keyboard
  coverage lives in the dedicated keyboard browser verifiers.

## 6. If Work Reopens

For any future change:

- Root-cause the issue before patching symptoms.
- Add or update a unit/browser verifier that would have failed before the fix.
- Keep `done.md`, `todo.md`, `STATUS.md`, and the relevant spec/severe-test
  entry synchronized.
- Run the local release gate before pushing.
