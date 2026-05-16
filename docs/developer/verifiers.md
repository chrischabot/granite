# Browser verifiers

A verifier is a self-contained Node script under `scripts/` that launches
Playwright's bundled Chromium, loads a fixture from
`scripts/*-browser-fixture.html`, drives a specific end-to-end scenario, and
exits non-zero on failure. Verifiers are slow next to Vitest but exercise
real layout, real CodeMirror, the real markdown-it pipeline, and real
storage adapters.

Every verifier is exposed as a `bun run verify:*` script in `package.json`.

## One-time setup

```sh
bunx playwright install chromium
```

This downloads Playwright's Chromium binary into your project. The verifiers
do not depend on your `bun run dev` server.

## Running a single verifier

```sh
bun run verify:keyboard-browser
```

The script prints progress to stdout and exits 0 on success. Fixtures and
helpers live alongside the verifier so a single script can be inspected and
re-run in isolation.

## Verifier index

Grouped by area; the script name is what you pass to `bun run`.

### Startup and lifecycle

- `verify:startup-browser` — boot-time perf budget and first-paint sanity.
- `verify:workspace-restart-browser` — workspace state survives reload.
- `verify:multi-window-vault-browser` — multiple windows on the same vault
  cooperate.
- `verify:debug-info-browser` — `collectDebugInfo()` and the copy-to-clipboard
  command produce the documented shape.
- `verify:error-boundary-browser` — the root error boundary catches react,
  window, and promise errors and renders the recovery surface.
- `verify:file-recovery-browser` — IDB-backed snapshots populate, list, and
  restore correctly.

### Editor

- `verify:live-preview-browser` — live-preview decorations render correctly.
- `verify:save-roundtrip-browser` — atomic write + reload round-trips
  content losslessly.
- `verify:fold-persistence-browser` — code folds persist across reload.
- `verify:vim-mode-browser` — Vim bindings behave correctly.
- `verify:multi-cursor-browser` — multi-cursor and rectangular selection.
- `verify:keyboard-browser` — keyboard-only navigation of the shell and
  editor.
- `verify:keyboard-populated-browser` — keyboard nav with a populated vault.
- `verify:typing-perf-browser` — typing-latency perf budget.

### Markdown and rendering

- `verify:commonmark-browser` — CommonMark spec coverage.
- `verify:gfm-browser` — GitHub Flavored Markdown coverage.
- `verify:renderer-visual-browser` — visual regression for the renderer.

### Vault and files

- `verify:obsidian-vault-browser` — opens an Obsidian-style vault without
  rewriting it.
- `verify:severe-vault-browser` — large/edge-case vault scenarios
  (Unicode paths, deep nesting, name collisions).
- `verify:native-formats-browser` — image, audio, video, PDF asset loading.
- `verify:external-edit-browser` — external file changes propagate via the
  watcher.
- `verify:external-dnd-browser` — external drag-and-drop file ingestion.
- `verify:trash-settings-browser` — deletion target setting (system /
  vault `.trash/` / permanent).
- `verify:format-converter-browser` — format-converter plugin round-trips.

### Search, tags, properties

- `verify:search-performance-browser` — search index latency budget.
- `verify:tags-browser` — tag indexing and the tags sidebar.
- `verify:properties-browser` — YAML frontmatter properties UI.

### Workspace surfaces

- `verify:sidebar-central-browser` — sidebar tab grouping and resizing.
- `verify:sidebar-groups-browser` — sidebar groups persist correctly.
- `verify:hotkeys-browser` — default hotkey audit and reassignment.

### Canvas

- `verify:canvas-snap-browser` — canvas snap-to-grid behavior.
- `verify:canvas-marquee-browser` — marquee selection.
- `verify:canvas-embed-browser` — embedded canvas blocks in notes.

### Graph

- `verify:graph-pan-browser` — graph view pan/zoom and persistence.

### Bases

- `verify:bases-map-browser` — bases map view.

### Plugins

- `verify:community-plugin-browser` — community-plugin install / enable /
  disable / data round-trip.
- `verify:community-theme-browser` — community theme load and switch.

### Accessibility and visuals

- `verify:a11y-announcements-browser` — `a11yAnnouncer` messages reach the
  live region.
- `verify:icon-a11y-browser` — every icon button has an accessible label.
- `verify:theme-contrast-browser` — theme contrast spot checks.
- `verify:rtl-browser` — right-to-left layout.

### Internationalisation

- `verify:i18n-browser` — `t(...)` lookups and pseudo-locale behavior.

### Settings

- `verify:settings-persistence-browser` — settings round-trip through
  localStorage and the disk mirror.

## Running everything

A one-liner that walks `package.json` and runs every `verify:*`, `audit:*`,
and `docs:*` script in sequence:

```sh
node - <<'NODE' | while read script; do
  echo "== $script =="
  bun run "$script" || exit $?
done
const pkg = JSON.parse(require("fs").readFileSync("package.json", "utf8"));
for (const name of Object.keys(pkg.scripts)) {
  if (
    name.startsWith("verify:") ||
    name.startsWith("audit:") ||
    name === "docs:check" ||
    name === "docs:verify-browser"
  ) console.log(name);
}
NODE
```

The full sweep takes several minutes. For local development, pick the
verifiers that map to your change. For CI, a curated subset is usually
enough — see [Testing](./testing.md).

## Writing a new verifier

1. Add a fixture under `scripts/<name>-browser-fixture.html` that imports
   the production-ish bundle and stubs whatever the test needs.
2. Add `scripts/verify-<name>-browser.mjs` using the helpers in
   `scripts/_lib/`.
3. Register a `verify:<name>-browser` script in `package.json`.
4. Make the script exit non-zero on any assertion failure; print a clear
   diagnostic before exiting.
5. Mention the verifier in the relevant section of this page.

---

[← testing](./testing.md) · [Index](../README.md) · [next →](./reporting.md)
