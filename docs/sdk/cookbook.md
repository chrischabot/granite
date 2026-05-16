# Cookbook

Copy-pasteable patterns for the most common plugin tasks. Each recipe is
self-contained.

## Register a command and unregister on unload

```js
const disposers = [];

module.exports = {
  onLoad(api) {
    disposers.push(
      api.commands.register({
        id: "my-plugin:say-hi",
        category: "My plugin",
        name: "Say hi",
        callback: () => api.notice.show("Hi!"),
      }),
    );
  },
  onUnload() {
    for (const d of disposers.splice(0)) d();
  },
};
```

## Add and update a status bar item

```js
let item = null;
let count = 0;

module.exports = {
  onLoad(api) {
    item = api.statusBar.add({
      text: `Count: ${count}`,
      tooltip: "Click to increment",
      onClick() {
        count += 1;
        item.setText(`Count: ${count}`);
      },
    });
  },
  onUnload() {
    item?.remove();
    item = null;
  },
};
```

`item.setText`, `item.setTooltip`, and `item.setOnClick` mutate the live
entry — call them anytime your model changes.

## Save and load plugin-local data

`api.loadData<T>()` returns `T | null`. `api.saveData(data)` writes
`.granite/plugins/<id>/data.json` atomically.

```js
let state = { count: 0, lastUpdated: null };

module.exports = {
  async onLoad(api) {
    const loaded = await api.loadData();
    if (loaded && typeof loaded === "object") {
      state = { ...state, ...loaded };
    }

    // …mutate state as the user interacts…
    const onClick = async () => {
      state.count += 1;
      state.lastUpdated = new Date().toISOString();
      await api.saveData(state);
    };
  },
};
```

Tip: call `saveData` from each mutation rather than from a debounce loop —
the writer already does an atomic temp-sibling-then-rename, so churn is
cheap and you don't risk losing data on close.

## Add a settings tab with form controls

```js
let removeTab = null;

module.exports = {
  async onLoad(api) {
    const state = (await api.loadData()) ?? { greeting: "Hello" };

    removeTab = api.addSettingsTab({
      name: "My plugin",
      render(container) {
        const label = document.createElement("label");
        label.style.display = "block";
        label.textContent = "Greeting";

        const input = document.createElement("input");
        input.type = "text";
        input.value = state.greeting;
        input.addEventListener("input", async () => {
          state.greeting = input.value;
          await api.saveData(state);
        });

        label.appendChild(input);
        container.appendChild(label);

        return () => {
          // optional — host clears the container itself
          input.removeEventListener("input", () => {});
        };
      },
    });
  },
  onUnload() {
    removeTab?.();
    removeTab = null;
  },
};
```

## React to `file-open` and `file-rename`

```js
const disposers = [];

module.exports = {
  onLoad(api) {
    disposers.push(
      api.events.on("file-open", ({ path }) => {
        api.log("opened", path);
      }),
    );
    disposers.push(
      api.events.on("file-rename", ({ from, to }) => {
        api.log(`renamed ${from} → ${to}`);
      }),
    );
  },
  onUnload() {
    for (const d of disposers.splice(0)) d();
  },
};
```

Listener exceptions are caught by the host and logged with
`console.error("[granite] plugin event listener \"<name>\" threw:", err)`.
The other listeners still run.

## Iterate every markdown file and read each

```js
async function totalWordCount(api) {
  const files = await api.vault.listMarkdown();
  let total = 0;
  for (const f of files) {
    try {
      const text = await api.vault.read(f.path);
      const matches = text.match(/[A-Za-z0-9]+/g) ?? [];
      total += matches.length;
    } catch {
      /* skip unreadable file */
    }
  }
  return { total, fileCount: files.length };
}
```

This is the word-counter example in full. `api.vault.listMarkdown()` is
fast — it's backed by an indexed list — but each `api.vault.read(path)` is
an async filesystem call. For large vaults consider chunking the work or
yielding to the event loop with `await new Promise(r => setTimeout(r, 0))`.

## Read frontmatter / tags from the metadata cache

```js
function activeMarkdownPath(workspace) {
  const s = workspace.getState();
  const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
  const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
  return leaf?.state.type === "markdown" ? leaf.state.path : null;
}

api.commands.register({
  id: "my-plugin:dump-cache",
  name: "Dump active note metadata",
  callback() {
    const path = activeMarkdownPath(api.workspace);
    if (!path) {
      api.notice.show("Open a markdown note first.", { kind: "warning" });
      return;
    }
    const cache = api.metadataCache.getFileCache(path);
    api.log("cache for", path, cache);
  },
});
```

`api.metadataCache.getAllTags()` and `getAllProperties()` give you
vault-wide aggregations.

## Show notices for progress and errors

```js
async function runJob(api) {
  const noticeId = api.notice.show("Scanning vault…", {
    kind: "info",
    timeoutMs: 0, // sticky
  });
  try {
    await doWork(api);
    api.notice.dismiss(noticeId);
    api.notice.show("Scan complete", { kind: "success" });
  } catch (err) {
    api.notice.dismiss(noticeId);
    api.notice.show(`Scan failed: ${err.message}`, {
      kind: "error",
      timeoutMs: 0,
    });
  }
}
```

`timeoutMs: 0` makes the notice sticky. Capture the returned id so you can
`dismiss` it explicitly.

## Provide a default hotkey safely

```js
api.commands.register({
  id: "my-plugin:toggle-foo",
  name: "Toggle foo",
  hotkeys: [{ modifiers: ["Mod", "Shift"], key: "F" }],
  callback: () => { /* … */ },
});
```

Things to know:

- `Mod` is `Cmd` on macOS and `Ctrl` elsewhere. Prefer it over hard-coding
  `Cmd` or `Ctrl`.
- The user can override any default in **Settings → Hotkeys**. Your
  defaults are *suggestions*.
- Conflicts: the dispatcher picks the last-registered command for a given
  binding. If two plugins claim `Mod+Shift+F`, whichever loaded last wins.
  Pick a binding nobody else uses — `Mod+Shift+<letter>` is usually safe,
  bare `Mod+<letter>` is usually not.
- The dispatcher ignores key events whose target is an `<input>`,
  `<textarea>`, or `contenteditable` element unless `Ctrl` or `Meta` is
  held. Plain-letter hotkeys won't fire inside the editor.

## Detect the active markdown file from any command

```js
function activeMarkdown(api) {
  const s = api.workspace.getState();
  const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
  const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
  return leaf?.state.type === "markdown" ? leaf.state : null;
}

api.commands.register({
  id: "my-plugin:wrap-in-quote",
  name: "Wrap active note in quote",
  checkCallback: () => activeMarkdown(api) !== null,
  async callback() {
    const state = activeMarkdown(api);
    if (!state) return;
    const text = await api.vault.read(state.path);
    const wrapped = text.replace(/^(?!$)/gm, "> ");
    await api.vault.write(state.path, wrapped);
  },
});
```

Setting `checkCallback` keeps the command out of the palette when no
markdown note is open — and stops the hotkey from firing in that case too.

## See also

- [Plugin API reference](../reference/plugin-api.md)
- [Lifecycle](./lifecycle.md) for cleanup invariants.
- [Publishing](./publishing.md) for shipping your plugin.

[← types](./types.md) · [Index](./README.md) · [publishing →](./publishing.md)
