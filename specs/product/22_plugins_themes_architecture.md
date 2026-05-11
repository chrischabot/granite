# 22 — Plugin, theme, and snippet architecture

The replica's extensibility model. The original Obsidian publishes its plugin API as TypeScript definitions; that API surface is what the third-party ecosystem expects. The replica must offer at minimum the same conceptual surface (class names may differ).

## 22.1 Three extension surfaces

| Surface | What it is | Distribution |
|---------|------------|--------------|
| **Theme** | A single CSS file replacing the active style. One at a time. | Community theme directory. |
| **CSS snippet** | A small CSS file applied on top of the active theme. Many at once. | User-managed; lives in `<vault>/.obsidian/snippets/`. |
| **Plugin** | A JavaScript module that runs alongside the app. | Community plugin directory; gated by Restricted mode. |

## 22.2 Theme contract

A theme is one CSS file (`theme.css`) plus a manifest. It must:

- Override CSS variables under `.theme-light { ... }` and `.theme-dark { ... }` selectors. **Never** target `body` directly without one of these classes — themes that do break the user's color-scheme switching.
- Avoid hard-coded sizes that conflict with the spacing grid.
- Avoid setting `color`/`background` directly on container components — instead, set the relevant CSS variable so other components remain consistent.

### Manifest

`<vault>/.obsidian/themes/<theme-name>/manifest.json`:

```json
{
  "name": "Display Name",
  "version": "1.0.0",
  "minAppVersion": "0.16.0",
  "author": "Author Name",
  "authorUrl": "https://example.com"
}
```

### Distribution

- The user installs themes via Settings → Appearance → *Manage* (browses the directory).
- Behind the scenes the app downloads the theme repo and saves it under `<vault>/.obsidian/themes/<name>/theme.css`.
- One theme is "active" at a time; switching requires no restart.
- Update is manual (Settings → Appearance → *Check for updates*).

### Light/Dark mode opt-in

A theme can support only one mode by omitting one of the selectors, but the recommended practice is to support both.

## 22.3 CSS snippet contract

- Stored in `<vault>/.obsidian/snippets/*.css`. Filename without extension is the snippet's display name.
- Listed under Settings → Appearance → CSS snippets with per-snippet on/off toggles.
- Multiple snippets may be enabled simultaneously; later-enabled ones cascade after earlier ones.
- The app watches the snippets folder and live-reloads changes.

The snippet author can use:
- Any CSS variable defined in `18_design_tokens.md` and `19_component_styling.md`.
- The `cssclasses` frontmatter property to scope styles to specific notes:

```css
.markdown-source-view.is-readable-line-width.red-border .image-embed img {
  border-color: red;
}
```

```yaml
---
cssclasses:
  - red-border
---
```

## 22.4 Plugin contract

A plugin is a folder under `<vault>/.obsidian/plugins/<plugin-id>/` with at minimum:

```
plugins/<plugin-id>/
├── main.js          ← compiled CommonJS module
├── manifest.json
└── styles.css       ← optional
```

`main.js` must export a default class that extends `Plugin`. The app instantiates the class on enable and calls its `onload()` method; `onunload()` must clean up everything the plugin registered.

### Plugin lifecycle

| Phase | Method | When |
|-------|--------|------|
| Construction | `constructor(app, manifest)` | When the plugin is enabled or app starts (if previously enabled). |
| Load | `async onload()` | After construction. Register commands, ribbon icons, view types, settings tab, event handlers here. |
| Unload | `async onunload()` | When disabled or app shuts down. The implementation framework auto-unregisters anything registered through helper methods. |

### Plugin API surface (must implement)

The replica provides a `Plugin` base class with the following helpers (named identically to Obsidian's API for ecosystem compatibility, where reasonable):

- `addCommand({id, name, callback, hotkeys, checkCallback, editorCallback, icon})`
- `addRibbonIcon(iconId, tooltip, callback) → HTMLElement`
- `addStatusBarItem() → HTMLElement`
- `addSettingTab(tab: PluginSettingTab)`
- `registerView(type, viewCreator)`
- `registerExtensions(extensions, viewType)` — register handler for a file extension.
- `registerHoverLinkSource(id, info)`
- `registerEditorExtension(ext)` — CodeMirror extension.
- `registerMarkdownPostProcessor(fn, sortOrder)` — runs over rendered Markdown HTML.
- `registerMarkdownCodeBlockProcessor(language, fn)` — handles a fenced code block of the given language.
- `registerEvent(eventRef)` — auto-detach on unload.
- `registerInterval(id)`, `registerDomEvent(el, event, fn)`
- `registerObsidianProtocolHandler(action, fn)`
- `loadData() / saveData(data)` — persisted to `data.json` in the plugin folder.
- `app: App` — root API surface (see below).

### `App` surface (must expose)

- `app.workspace` — view/leaf/tab manipulation. Methods: `getActiveFile()`, `getActiveViewOfType(type)`, `iterateAllLeaves(cb)`, `splitActiveLeaf()`, `openLinkText(linkText, sourcePath, newLeaf?)`, `on(event, cb)`, etc.
- `app.vault` — file ops. `read(file)`, `cachedRead(file)`, `modify(file, content)`, `delete(file, force?)`, `rename(file, newPath)`, `create(path, content)`, `createFolder(path)`, `getFiles()`, `getMarkdownFiles()`, `getAbstractFileByPath(path)`, `on(event, cb)`. Events: `create`, `delete`, `rename`, `modify`.
- `app.metadataCache` — query parsed metadata. `getFileCache(file)`, `getFirstLinkpathDest(linktext, source)`, `getCache(path)`, `on('changed', cb)`, `on('resolved', cb)`.
- `app.fileManager` — high-level file ops. `renameFile`, `trashFile`, `generateMarkdownLink(file, sourcePath)`, etc.
- `app.commands` — `executeCommandById(id)`, `listCommands()`.
- `app.keymap` — key handling.
- `app.scope` — registers temporary handlers that intercept while a modal is open.
- `app.setting` — Settings UI access (programmatically open a tab).
- `app.plugins` — plugin registry: `enablePlugin`, `disablePlugin`, `installPlugin`, `getPlugin(id)`.

### View registration

```ts
this.registerView(MY_VIEW_TYPE, (leaf) => new MyView(leaf));
```

The view creator returns an object extending `ItemView` (with a tab) or `MarkdownView`/etc. The class must implement `getViewType()`, `getDisplayText()`, `onOpen()`, `onClose()`.

### Modal API

A `Modal` base class with `open()`, `close()`, `onOpen()`, `onClose()`. Plus `SuggestModal<T>` (for fuzzy pickers) and `FuzzySuggestModal<T>` (with built-in fuzzy ranking).

### Setting API

A `PluginSettingTab` extends `SettingTab` and overrides `display()` (rebuilds the page DOM). Each `Setting` row is a builder:

```ts
new Setting(containerEl)
  .setName("Default folder")
  .setDesc("Where to put new notes")
  .addText(text => text.setValue(this.settings.folder).onChange(async v => {
    this.settings.folder = v;
    await this.plugin.saveSettings();
  }));
```

### Editor API

`MarkdownView.editor` exposes a CodeMirror-like surface: `getCursor`, `getSelection`, `setSelection`, `getDoc`, `replaceRange`, `replaceSelection`, `getLine`, `lineCount`, `lastLine`, etc.

## 22.5 Plugin distribution

- Community-plugin directory: a list of plugin IDs with metadata.
- Each plugin is a public Git repo. Releases publish a tag containing `main.js`, `manifest.json`, `styles.css`. The app downloads from the release artifacts.
- After install, the plugin appears in Settings → Community plugins → Installed plugins; the user can enable, disable, configure, or uninstall.

### Restricted mode

By default, community plugins are blocked from running. The user must explicitly Turn on community plugins (one click in Settings) before any third-party plugin loads. This is the only "trust gate" — once on, plugins run unsandboxed.

## 22.6 Plugin security posture

Plugins run in the renderer process with full DOM access, full Node.js access (on desktop), and full vault access. There is no sandboxing. Consequences:
- A malicious plugin can read every file in the vault.
- A malicious plugin can read cookies in any active Web viewer tab.
- A malicious plugin can make arbitrary network requests.

The mitigations are:
- Restricted mode default-on.
- Manual review of plugins before they're admitted to the directory.
- The user must enable each installed plugin individually before it runs.

The app must surface these facts in the *Turn on community plugins* dialog so the user opts in informed.

## 22.7 Theme + snippet performance

CSS reload is fast. The implementation should cache the parsed style tree and only invalidate the affected sections when a snippet changes.

## 22.8 Plugin update flow

| Step | UX |
|------|-----|
| User clicks *Check for updates* in Community plugins | Fetches manifest from each plugin's repo. |
| If newer version exists | An *Update* button appears next to that plugin. |
| User clicks *Update* | Downloads release artifacts and replaces the plugin folder; reloads only that plugin. |

Auto-update of community plugins is intentionally **not** offered (security-by-friction).

## 22.9 Plugin disable on incompatibility

If a plugin's `minAppVersion` exceeds the current app version, it is disabled at load with a notice. The user must update the app to use it.

## 22.10 Author the API once

The replica should publish:
- TypeScript definitions for the API surface as an npm package.
- A sample plugin template repo.
- A "self-critique checklist" for plugin authors.
- A theme template repo and a "self-critique checklist" for themes.

The original ecosystem treats the API surface as a stable contract (with semver-like deprecation cycles). Honor the same discipline.

## 22.11 Summary table — what each surface controls

| Concern | Theme | Snippet | Plugin |
|---------|-------|---------|--------|
| Color, font, spacing | yes | yes | no (don't set CSS from JS for styling) |
| Add a new view / tab | no | no | yes |
| Add a new command / hotkey | no | no | yes |
| Process Markdown post-render | no | no | yes |
| Add a new fenced-code-block language | no | no | yes |
| Add a new file extension handler | no | no | yes |
| Replace built-in behavior | discouraged | discouraged | yes (with care) |