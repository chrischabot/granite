# Reference

Canonical, parameter-level reference for every public surface Granite exposes.
These pages mirror the TypeScript source in `src/core/` line for line — if a
type here differs from the code, the code wins and the doc is wrong.

For prose-style guides to the same material see the
[User guide](../user-guide/README.md) and [Plugin SDK](../sdk/README.md).

## Pages

- [Plugin API](./plugin-api.md) — every method on `PluginApi`, parameter by
  parameter.
- [Vault format](./vault-format.md) — on-disk layout, `.granite/` config files,
  accepted extensions, atomic writes, trash modes.
- [File formats](./file-formats.md) — schemas for `.md`, `.canvas`, `.base`.
- [Commands](./commands.md) — the `Command` type, the registry surface, and
  the ID of every built-in core command.
- [Events](./events.md) — the four plugin events: payload, when fired,
  cleanup.
- [Settings](./settings.md) — every key in `UserSettings` with type, default,
  and behaviour.
- [Hotkeys](./hotkeys.md) — every default key binding for every core command.
- [Glossary](./glossary.md) — quick definitions for vault, leaf, tab, ribbon,
  callout, restricted mode, OPFS, etc.

## Conventions

- Code paths look like `src/core/plugins/types.ts` — relative to the repo
  root.
- TypeScript signatures are reproduced verbatim from the source so they can
  be searched and copy-pasted.
- The `Mod` modifier means **Cmd** on macOS and **Ctrl** on Windows/Linux.
- Granite reports its version through `APP_VERSION` in
  `src/core/app/version.ts`. The current build identifies as `0.1.0-dev`.

[Index](../README.md) · [SDK overview →](../sdk/README.md)
