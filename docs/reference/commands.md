# Commands

A **command** is anything that can be invoked from the command palette, a
keyboard shortcut, the ribbon, a status bar item, or another plugin. Every
command has a unique id and a callback. This page documents the registry
interface and lists every built-in id.

Source: `src/core/commands/CommandRegistry.ts` (registry) and
`src/core/commands/core-commands.ts` (the built-ins).

## `Hotkey`

```ts
export interface Hotkey {
  readonly modifiers: ReadonlyArray<"Mod" | "Ctrl" | "Cmd" | "Alt" | "Shift">;
  readonly key: string;
}
```

`Mod` resolves to **Cmd** on macOS and **Ctrl** on Windows/Linux. `Cmd` and
`Ctrl` (and `Alt`, `Shift`) name themselves literally. `key` is a single
character (`"P"`, `";"`, ``"`"``) or a named key (`"ArrowLeft"`, `"Enter"`,
`"F1"`, `"Tab"`).

Single-character keys are case-folded to uppercase by the dispatcher; you
may write `"p"` or `"P"`.

## `Command`

```ts
export interface Command {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
  readonly icon?: ReactNode;
  readonly hotkeys?: ReadonlyArray<Hotkey>;
  readonly checkCallback?: (checking: boolean) => boolean;
  readonly callback: () => void | Promise<void>;
  readonly hidden?: boolean;
}
```

| Field | Notes |
|-------|-------|
| `id` | Globally unique. Convention: `<scope>:<verb-noun>` (e.g. `editor:split-right`, `plugins:check-updates`). Plugin commands should prefix with the plugin id. |
| `name` | The label shown in the palette and hotkey list. |
| `category` | Optional. Rendered faintly before the name in the palette and used as the grouping key in the Hotkeys settings tab. |
| `icon` | Optional React node — used by the ribbon, not the palette. |
| `hotkeys` | Default bindings. Users can override with `setUserHotkey` (see `src/core/commands/hotkeys.ts`). |
| `checkCallback` | Called with `checking = true` to decide whether to show in the palette, and again with `checking = false` right before `callback` runs. Return `false` to hide / skip. |
| `callback` | The action. May return a promise. |
| `hidden` | When `true`, the command never appears in the palette (`list()` filters it out) but can still be invoked by id or hotkey. Useful for chord bindings like `Mod+1..9`. |

## `commandRegistry`

```ts
register(command: Command): () => void;
unregister(id: string): void;
get(id: string): Command | undefined;
list(): ReadonlyArray<Command>;
listAll(): ReadonlyArray<Command>;
run(id: string): Promise<void>;
subscribe(listener: () => void): () => void;
```

- `register` returns a disposer. Re-registering an existing id logs
  `[granite] Command "<id>" already registered; overwriting.` and replaces
  the entry — but the *original* disposer becomes a no-op (it only removes
  the entry if the current value is still that command).
- `list()` filters out `hidden` commands and any whose
  `checkCallback(true)` returns `false`. The result is referentially
  stable across calls until the registry changes, which is required for
  `useSyncExternalStore` integration in the palette UI.
- `listAll()` returns every command, including hidden / disabled ones.
  Intended for audits (see `default-hotkeys-audit.test.ts`).
- `run(id)` **throws** `Error("Unknown command: <id>")` when the id is
  unknown, and silently returns when `checkCallback(false)` rejects.
- `subscribe(listener)` fires after every registry mutation.

## `createCommandRegistrar()`

A scoped registrar that tracks every registration into one disposer. Useful
when a plugin or feature registers many commands at once:

```ts
import { createCommandRegistrar } from "@core/commands/CommandRegistry";

const reg = createCommandRegistrar();
reg.register({ id: "demo:a", name: "A", callback: () => {} });
reg.register({ id: "demo:b", name: "B", callback: () => {} });
// later:
reg.disposer(); // unregisters every command added via this registrar in LIFO order
```

## Built-in commands

Registered by `registerCoreCommands(handlers)` in
`src/core/commands/core-commands.ts`. The "Category" column matches the
`command.category.*` i18n keys; the "Hotkey" column lists the default key
bindings (see [Hotkeys reference](./hotkeys.md) for platform-specific
display).

### Always-on shell

| Id | Hotkey | Category |
|----|--------|----------|
| `app:open-command-palette` | `Mod+P`, `Mod+Shift+P` | — |
| `app:open-quick-switcher` | `Mod+O` | — |
| `app:open-vault-switcher` | — | — |
| `app:open-settings` | `Mod+,` | — |
| `help:open-cheat-sheet` | `F1` | Help |
| `plugins:install-from-url` | — | Plugins |
| `plugins:check-updates` | — | Plugins |
| `app:toggle-theme` | — | Appearance |

### Editor / tab management

| Id | Hotkey | Category |
|----|--------|----------|
| `editor:split-right` | `` Mod+\ `` | Editor |
| `editor:split-down` | `` Mod+Shift+\ `` | Editor |
| `editor:close-group` | — | Editor |
| `editor:close-active-tab` | `Mod+W` | Editor |
| `tabs:cycle-next` | `Ctrl+Tab` | Tabs |
| `tabs:cycle-previous` | `Ctrl+Shift+Tab` | Tabs |
| `editor:insert-block-id` | — | Editor |
| `editor:focus-tab-1` … `editor:focus-tab-9` | `Mod+1` … `Mod+9` (hidden) | Editor |
| `editor:toggle-pin` | — | Editor |
| `editor:reveal-in-explorer` | — | Editor |

### File

| Id | Hotkey | Category |
|----|--------|----------|
| `file:new-note` | `Mod+N` | File |
| `file:new-note-in-new-tab` | `Mod+Shift+N` | File |
| `file:save` | `Mod+S` | File |
| `file:reopen-closed-tab` | `Mod+Shift+T` | File |
| `file:new-tab` | `Mod+T` | File |
| `file:rename` | `F2` | File |
| `file:print-active-note` | — | File |

### View / navigation

| Id | Hotkey | Category |
|----|--------|----------|
| `editor:toggle-reading-view` | `Mod+E` | Editor |
| `nav:back` | `Mod+Alt+ArrowLeft` | Navigation |
| `nav:forward` | `Mod+Alt+ArrowRight` | Navigation |
| `graph:open` | `Mod+G` | Graph |
| `graph:open-local` | `Mod+Shift+G` | Graph |
| `canvas:open` | — | Canvas |

### Search

| Id | Hotkey | Category |
|----|--------|----------|
| `search:current-file` | `Mod+F` | Search |
| `search:replace-in-current-file` | `Mod+H` | Search |
| `search:vault` | `Mod+Shift+F` | Search |

### Editor formatters

| Id | Hotkey | Category |
|----|--------|----------|
| `editor:toggle-bold` | `Mod+B` | Editor |
| `editor:toggle-italic` | `Mod+I` | Editor |
| `editor:toggle-code` | `` Mod+` `` | Editor |
| `editor:insert-link` | `Mod+K` | Editor |
| `editor:add-file-property` | `Mod+;` | Editor |

Some of these (`file:new-note`, `file:new-note-in-new-tab`,
`file:reopen-closed-tab`, …) are still wired to a "not yet implemented"
notice. They hold the canonical hotkey so the default-hotkeys audit passes
and a future implementation can take over without touching the binding.

## Default-hotkey audit

`src/core/commands/default-hotkeys-audit.test.ts` parses
`specs/product/17_hotkeys_reference.md §17.1` and asserts that every bound
row in the spec resolves to a registered command. Add new defaults to both
this command list and the spec to keep the audit green.

## User overrides

`src/core/commands/hotkeys.ts` exposes:

```ts
setUserHotkey(commandId: string, hotkey: Hotkey | null): void
addUserHotkey(commandId: string, hotkey: Hotkey): void
removeUserHotkey(commandId: string, hotkey: Hotkey): void
clearUserHotkey(commandId: string): void
getUserHotkey(commandId: string): Hotkey | null
getUserHotkeys(commandId: string): ReadonlyArray<Hotkey>
getEffectiveHotkeys(commandId: string): ReadonlyArray<Hotkey>
subscribeHotkeys(listener: () => void): () => void
initHotkeyDispatcher(): () => void
formatHotkey(h: Hotkey): string
captureHotkey(): Promise<Hotkey | null>
```

A user override **replaces** the command's default `hotkeys`. To layer a
user binding alongside the default, register the user binding under a
different command id or call `addUserHotkey`. User overrides are persisted
in `localStorage` under `granite.hotkeys.v1`.

## See also

- [Plugin API](./plugin-api.md#apicommands)
- [Hotkeys reference](./hotkeys.md)
- [User guide → Command palette and Quick Switcher](../user-guide/command-palette.md)

[← file formats](./file-formats.md) · [Index](./README.md) · [events →](./events.md)
