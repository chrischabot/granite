# TODO

> Forward-work tracker. Items shipped move into `done.md`. The phase numbers
> reference `PLAN.md`.

---

## Outstanding by acceptance-criteria section

### §24.1 Vault & files
- [ ] Configurable trash setting (system trash / vault `.trash/` / permanent) — vault/permanent policy and host-hooked system path shipped 2026-05-12; native OS-trash adapter still required for full System trash acceptance
- [ ] External-edit-detected ≤ 500 ms perf assertion — Phase 14
- [ ] Multi-window simultaneous vaults

### §24.2 Editor — Phase 12
- [x] Vim key bindings (CM6 vim addon) ← _shipped 2026-05-12 Phase 12 sweep_
- [x] Multi-cursor (Alt+click) + rectangular Alt-drag ← _shipped 2026-05-12 Phase 12 sweep_
- [x] Code folding (heading + indent) with persisted fold state ← _shipped 2026-05-12 Phase 12 sweep_
- [ ] Full live-preview decoration replacement (expanded in Phase 12 sweep; table cells, nested/block-level edge cases, and browser verification remain)

### §24.3 Parser fidelity — Phase 14
- [ ] CommonMark conformance harness
- [ ] GFM autolink coverage tests

### §24.4 Linking & metadata
- [x] `[[##term]]` vault-wide heading search
- [x] `[[^^term]]` vault-wide block search ← _shipped 2026-05-12 sweep_
- [ ] Quoted-string preservation inside Text/List properties on save

### §24.5 Properties
- [ ] Date / Date&time locale rendering
- [ ] Format Converter migration of legacy `tag`/`alias`/`cssclass` singular keys
- [ ] JSON-style frontmatter → YAML on save rewrite path

### §24.6 Tags
- [ ] Tags from body and YAML are unified in Tags view
- [x] Nested tags display hierarchically when *Show nested tags* is on ← _shipped 2026-05-12 tags sweep_
- [ ] Case-insensitive matching but case-preserved display
- [x] All-numeric tags rejected; alphanumeric/Unicode tags accepted

### §24.7 Search — closed in Phase 10

### §24.8 Graph — closed in Phase 11

### §24.9 Canvas
- [ ] Marquee select / alt-duplicate / shift-axis-lock
- [ ] Embedded canvas interaction inside host note
- [ ] Snap toggle

### §24.10 Bases — closed in Phase 10 sweep
- [x] List view + Cards view
- [x] Formula evaluator + summaries + group-by
- [x] `this` context resolution ← _shipped 2026-05-12 sweep_
- [x] ` ```base ` fenced markdown block ← _shipped 2026-05-12 sweep_
- [ ] Map view (deferred)

### §24.12 Sidebars
- [ ] Pop-out sidebar tabs into the central area
- [ ] Multiple vertical tab groups within a sidebar

### §24.13 Status bar
- [x] CJK-aware word count ← _shipped 2026-05-12 sweep_
- [x] Editing-mode chip ← _shipped during Phase 9_
- [x] Plugin-added status items ← _shipped in Phase 9 (PluginApi.statusBar.add)_

### §24.14 Hotkeys
- [ ] Multi-binding per command — Phase 16
- [ ] US-layout normalization with physical-key trigger

### §24.15 Settings — Phase 16
- [x] Live filter input ← _shipped 2026-05-12 settings sweep_
- [ ] All defaults persisted to `.granite/`

### §24.16 Themes & snippets — closed

### §24.17 Plugins — substantially closed in Phase 9
- [x] `loadData()` / `saveData()`
- [x] `addSettingsTab()`
- [x] `statusBar.add()`
- [x] `events.on()`
- [x] `metadataCache` read-only window
- [x] Update check + minAppVersion handling
- [ ] Community plugin browser (URL install exists; no registry browse yet)

### §24.18 Drag & drop
- [ ] External-OS-drag handling with `Ctrl/Option` modifier

### §24.19 Performance — Phase 14
- [ ] 10 k-note cold start < 3 s
- [ ] Quick-switcher keystroke update < 16 ms
- [ ] 10 k search regex < 500 ms
- [ ] 10 k graph pan ≥ 30 fps
- [ ] Save round-trip < 50 ms

### §24.20 Accessibility — Phase 16
- [ ] Full keyboard-only audit
- [ ] Screen-reader announcement of tab changes / modal opens / notice content
- [ ] 4.5:1 contrast assertion

### §24.21 i18n — Phase 15
- [ ] String externalisation across UI
- [ ] RTL demo locale
- [ ] Per-note `dir: rtl` frontmatter property

### §24.22 Crash safety
- [ ] 100-cycle kill-and-restart fixture (Phase 14)
- [ ] File-recovery restore UI

### §24.23 Compatibility round-trip
- [ ] Obsidian vault round-trip fixture (Phase 14)
- [ ] Community theme cross-render

---

## Renderer fidelity backlog

Phase 13 schedules per-component CSS module reorganization across 5 batches.
27 of the 75 spec files have no dedicated CSS module yet (e.g. `animations.md`,
`typography.md`, `buttons.md`, `inputs.md`, `checkbox.md`, `slider.md`,
`tree-item.md`, `flair-and-pill.md`, `multi-select.md`, `notice.md`,
`modal.md`, `drag-and-drop.md`, `splash.md`, `scrollbars.md`,
`view-pdf.md`, `view-release-notes.md`, `view-history-sync.md`,
`settings-community-plugins.md`, `settings-community-themes.md`,
`view-bases.md`, `view-graph.md`, etc.). See PLAN.md §3.2 for the full
mapping.

---

## Cross-cutting

- [ ] Sentry-style error boundary integrated with Effect's error channel
- [ ] Lighthouse a11y audit
- [ ] Public docs site (vault format + plugin API)

---

_Items move to `done.md` as they ship. The "Phase N" annotations reference
`PLAN.md`._
