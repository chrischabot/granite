# Granite — Project Status Report

_Generated: 2026-05-12 (post-Phase-11). Compares the project's specs (`specs/product/*`),
planning documents (`todo.md`, `done.md`, `PLAN.md`, `README.md`) against the actual
source tree under `src/`._

---

## 1. Headline

Phases 9–11 of `PLAN.md` are complete. The acceptance criteria sections that
those phases targeted (`§24.7` Search, `§24.8` Graph, `§24.10` Bases, `§24.17`
Plugins) have moved from substantially-red to substantially-green.

**Test footprint:** 365 test cases across 33 files (up from 279/25 at the
start of this work). The CI workflow (`typecheck + lint + test + build`) is
green; biome reports a pre-existing baseline of style errors across older
files that this work did not regress.

**Production bundle:** still builds; new graph-config / formula / Bases
view modules are split into the main app chunk.

---

## 2. What Phases 9–11 closed

### Phase 9 — Plugin platform completeness (§24.17)
- `PluginApi.loadData()` / `saveData()` backed by `.granite/plugins/<id>/data.json`.
- `PluginApi.addSettingsTab()` rendering custom panels into Settings → Plugin options.
- `PluginApi.statusBar.add()` with a live-update handle.
- `PluginApi.events.on()` for `file-open` / `active-leaf-change` / `layout-change` / `file-rename`.
- `PluginApi.metadataCache` read-only window.
- `plugins:check-updates` command + `manifestUrl` / `minAppVersion` manifest fields.
- Sample plugin demonstrating every surface at `examples/plugins/data-store/`.

### Phase 10 — Search & Bases parity (§24.7 + §24.10)
- Search regex: `/pattern/flags` and `-/pattern/flags`.
- Search property operators: `[name]`, `[name:value]`, `[name:null]`, `[name:!null]` + negation.
- Bases formula evaluator with 18 built-ins.
- Bases summaries: count / sum / avg / min / max / median.
- Bases `groupBy` rendering across all view types.
- Bases List + Cards views (Table view retained with the nested-tbody markup fix).
- `BaseConfig` schema extended with `view`, `groupBy`, `summaries`, `formulas`; legacy `.base` files still parse.

### Phase 11 — Graph completeness (§24.8)
- Graph filter input (uses the full search-query syntax).
- User-defined groups with color picker.
- `color by`: none / tag / folder / groups.
- Four display sliders (node size, link thickness, label size, label threshold).
- Four force sliders (repulsion, edge attraction, link distance as a real spring rest length, center gravity).
- Local-graph mode with N-hop selector.
- Persisted to `.granite/graph.json` (debounced) and localStorage (immediate).
- Sanitized hydration — corrupt persisted values cannot inject NaN into the simulation.

---

## 3. Outstanding acceptance-criteria gaps (post-Phase-11)

Items from `24_acceptance_criteria.md` that remain red or unmeasured. See
PLAN.md for the phased plan that addresses each.

### §24.1 Vault & files
- Configurable trash setting (system / vault `.trash/` / permanent). Phase 16.
- External-edit-detected ≤ 500 ms perf assertion. Phase 14.
- Multi-window simultaneous vaults.

### §24.2 Editor (Phase 12)
- Vim key bindings.
- Multi-cursor (`Alt+click`) + rectangular Alt-drag.
- Code folding (heading + indent) with persisted fold state.
- Full live-preview decoration replacement (the current decorations layer is "lite").
- Recursive markdown embeds.

### §24.3 Parser fidelity (Phase 14)
- CommonMark conformance harness.
- GFM autolink coverage.

### §24.4 Linking & metadata
- `[[^^term]]` vault-wide block search.
- Quoted-string preservation inside Text/List properties on save.

### §24.5 Properties
- Date / Date&time locale rendering.
- Format Converter migration of legacy `tag`/`alias`/`cssclass` singular keys.
- JSON-style frontmatter → YAML on save rewrite path.

### §24.9 Canvas
- Marquee select / alt-duplicate / shift-axis-lock.
- Embedded canvas interaction inside host note.
- Snap toggle.

### §24.10 Bases (post-Phase-10)
- Map view (only Table / List / Cards today).
- `this` context resolution for embedded base usage.
- ` ```base ` fenced markdown block.

### §24.12 Sidebars
- Pop-out sidebar tabs into the central area.
- Multiple vertical tab groups within a sidebar.

### §24.13 Status bar
- CJK-aware word count.
- Editing-mode chip.
- Plugin-added items ✓ (Phase 9 — gated only by individual plugins using it).

### §24.14 Hotkeys
- Multi-binding per command.
- US-layout normalization with physical-key trigger.

### §24.15 Settings (Phase 16)
- Live filter input.
- All defaults persisted to `.granite/` (some still localStorage).

### §24.17 Plugins (post-Phase-9)
- Community plugin browser (InstallPluginModal exists; no registry browse yet).

### §24.18 Drag & drop
- External-OS-drag handling with `Ctrl/Option` modifier.

### §24.19 Performance (Phase 14)
- All §23.5 perf budgets are unmeasured.

### §24.20 Accessibility (Phase 16)
- Full keyboard audit.
- Screen-reader announcements for tab change / modal open / notice content.
- 4.5:1 contrast assertion.

### §24.21 i18n (Phase 15)
- String externalisation across UI.
- RTL demo locale.
- Per-note `dir: rtl` frontmatter property.

### §24.22 Crash safety
- 100-cycle kill-and-restart fixture (Phase 14).
- File-recovery restore UI.

### §24.23 Compatibility round-trip
- Obsidian vault round-trip fixture (Phase 14).
- Community theme cross-render.

---

## 4. Renderer fidelity backlog

Unchanged from the pre-Phase-9 snapshot: 27 renderer specs still have no
dedicated CSS module. Phase 13 of `PLAN.md` schedules the per-spec CSS
reorganization in five batches. The new functional code in Phases 9–11
does not block that work.

---

## 5. Recommended next pieces of work

The next phase from `PLAN.md` is **Phase 12 — Editor fidelity** (Vim,
multi-cursor, rectangular selection, code folding, full live-preview
decorations). It's CM6 wiring with limited cross-cutting risk and unblocks
§24.2 of the acceptance gate.

After that:
- **Phase 13 — Renderer fidelity** (CSS-only; parallelizable batches).
- **Phase 14 — Performance harness + crash + compat fixtures**. Without
  this, §24.7 / §24.8 / §24.19 / §24.22 / §24.23 stay unmeasured.
- **Phase 15 — i18n / RTL** (mechanical sweep).
- **Phase 16 — A11y, observability, docs** (final polish for v1).

---

## 6. File-housekeeping recommendations (still applicable)

- `todo.md` — many items still marked outstanding are now done (translucent
  mode, sort orders, properties writeback, type registry on disk, recents
  in switcher, unresolved-wikilink widget, native browser history,
  aliases in unlinked-mentions, plus every Phase 9–11 item). Worth a
  bulk sweep into `done.md`.
- `done.md` — extended with the Phase 9–11 entry above.
- `specs/product/24_acceptance_criteria.md` — `.obsidian/` ↔ `.granite/`
  spec/code mismatch still needs reconciliation.