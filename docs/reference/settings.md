# Settings reference

Granite stores user settings as a `UserSettings` object. Source of truth:
`src/core/settings/store.ts`.

## Storage

- **localStorage key:** `granite.settings.v1`
- **Disk mirror:** `.granite/settings.json` (per vault)

Both are written on every `settingsStore.update(patch)` call. `bindSettings()`
runs at app startup and at every vault switch: it reads the disk file, merges
it on top of `DEFAULT_SETTINGS`, writes the result back to localStorage and
disk, and applies the document-level side effects (`--font-text-size` and
`body.is-translucent`).

`localStorage` is only ever the fallback; the disk file is the source of
truth across vaults and across browser profiles that share a folder.

## Fields

```ts
export interface UserSettings {
  fontSize: number;
  showLineNumbers: boolean;
  readableLineWidth: boolean;
  autoPairBrackets: boolean;
  newNoteFolder: string;
  defaultViewMode: "source" | "reading";
  defaultEditingMode: "live-preview" | "source";
  attachmentsFolder: string;
  confirmFileDeletion: boolean;
  deletedFiles: "system" | "vault" | "permanent";
  showNestedTags: boolean;
  excludedFiles: string;
  spellcheck: boolean;
  spellcheckLanguages: string;
  livePreview: boolean;
  editorKeymap: "standard" | "vim";
  fileExplorerSort:
    | "name-asc"
    | "name-desc"
    | "mtime-desc"
    | "mtime-asc"
    | "ctime-desc"
    | "ctime-asc";
  translucent: boolean;
  notifySlowStartup: boolean;
  pluginRestrictedMode: boolean;
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `fontSize` | `number` | `16` | Text font size in px. Applied as `--font-text-size` on `<html>`. |
| `showLineNumbers` | `boolean` | `false` | Show line numbers in the source editor. |
| `readableLineWidth` | `boolean` | `true` | Constrain the editor to a comfortable reading width. |
| `autoPairBrackets` | `boolean` | `true` | Auto-close `[`, `(`, `{`, `*`, `_`, `` ` ``, `"`, `'`, and wikilink brackets. |
| `newNoteFolder` | `string` | `""` | Folder new notes default to. Empty string = vault root. |
| `defaultViewMode` | `"source" \| "reading"` | `"source"` | Mode used when opening a file in a fresh leaf. `source` falls through to `defaultEditingMode`. |
| `defaultEditingMode` | `"live-preview" \| "source"` | `"live-preview"` | The editing mode applied when `defaultViewMode` is `source`. |
| `attachmentsFolder` | `string` | `"attachments"` | Folder used by paste-image / attach-file flows. |
| `confirmFileDeletion` | `boolean` | `true` | Whether `Delete` and `Mod+Backspace` show a confirm modal. |
| `deletedFiles` | `"system" \| "vault" \| "permanent"` | `"system"` | Where deletions go. See [Vault format → Trash modes](./vault-format.md#trash-modes). |
| `showNestedTags` | `boolean` | `true` | Render `#a/b/c` as a tree in the tags pane. |
| `excludedFiles` | `string` | `""` | Newline-separated glob list. Matching files are hidden from every vault listing (explorer, switcher, search, metadata cache, graph). |
| `spellcheck` | `boolean` | `false` | Enable the browser's spellchecker in the source editor. |
| `spellcheckLanguages` | `string` | `""` | Comma-separated BCP 47 tags. Empty falls back to system/default. |
| `livePreview` | `boolean` | `true` | Hide format markers (`**`, `==`, wikilink brackets) on non-cursor lines. |
| `editorKeymap` | `"standard" \| "vim"` | `"standard"` | Source-editor keybindings. |
| `fileExplorerSort` | enum | `"name-asc"` | Per-folder file sort. Folders always sort alphabetically first regardless. |
| `translucent` | `boolean` | `false` | Adds `body.is-translucent` so the workspace background goes transparent (PWA / future Electron host). |
| `notifySlowStartup` | `boolean` | `true` | Show a diagnostic notice when cold-start exceeds budget. |
| `pluginRestrictedMode` | `boolean` | `true` | Refuse to instantiate community plugins under `.granite/plugins/<id>/`. Default-on for new vaults. A missing key in `settings.json` is treated as `true`. Core plugins registered in-process are **not** gated. |

## Runtime API

```ts
export const settingsStore: {
  getState(): UserSettings;
  getServerSnapshot(): UserSettings;
  subscribe(listener: () => void): () => void;
  update(patch: Partial<UserSettings>): void;
};

export async function bindSettings(): Promise<void>;
export function unbindSettings(): void;
export function resetSettingsForTests(next?: UserSettings): void;
```

- `getState()` and `getServerSnapshot()` return the same object. The latter
  exists for `useSyncExternalStore` SSR compatibility.
- `subscribe(listener)` fires after every `update`.
- `update(patch)` shallow-merges `patch` over the current state, writes
  localStorage + disk, then re-applies the document-level side effects.

`resetSettingsForTests` is exported for unit tests; production code should
use `update`.

## Plugin access

Plugins do **not** receive `settingsStore` on `PluginApi`. If a plugin needs
to know e.g. `defaultViewMode`, it should import `settingsStore` directly —
but the recommended pattern is for plugins to keep their own state in
`api.loadData() / api.saveData()` and expose a settings tab via
`api.addSettingsTab(spec)`.

## See also

- [Plugin API → addSettingsTab](./plugin-api.md#settings-tabs)
- [Hotkeys reference](./hotkeys.md) — hotkey overrides are stored separately
  under `granite.hotkeys.v1`, not in `UserSettings`.

[← events](./events.md) · [Index](./README.md) · [hotkeys →](./hotkeys.md)
