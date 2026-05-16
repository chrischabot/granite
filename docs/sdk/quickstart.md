# Quickstart

We'll build a plugin called **hello-granite** that:

1. Shows a notice on load.
2. Registers a command.
3. Adds a status bar item.
4. Adds a settings tab.

Total file count: two. Total lines of code: ~60.

## 1. Create the plugin directory

Inside your vault:

```text
<vault>/
  .granite/
    plugins/
      hello-granite/
        manifest.json
        main.js
```

## 2. Write the manifest

`hello-granite/manifest.json`:

```json
{
  "id": "hello-granite",
  "name": "Hello Granite",
  "version": "0.1.0",
  "description": "Says hi.",
  "author": "You"
}
```

`id` **must** equal the directory name. See
[Manifest reference](./manifest.md) for every field.

## 3. Write `main.js`

`hello-granite/main.js`:

```js
const disposers = [];

module.exports = {
  onLoad(api) {
    api.log("hello-granite loaded");
    api.notice.show("Hello from Granite!", { kind: "success" });

    disposers.push(
      api.commands.register({
        id: "hello-granite:say-hi",
        category: "Hello Granite",
        name: "Say hi",
        hotkeys: [{ modifiers: ["Mod", "Shift"], key: "h" }],
        callback: () => {
          api.notice.show("Hi!", { kind: "info" });
        },
      }),
    );
  },

  onUnload(api) {
    api.log("hello-granite unloading");
    for (const d of disposers.splice(0)) d();
  },
};
```

Save it. Granite's plugin loader watches `.granite/plugins/**`, so it will
pick the new directory up within 250 ms — no app restart needed.

## 4. Enable it

1. Open **Settings** (`Mod+,`).
2. Go to **Community plugins**.
3. If **Restricted mode** is on, flip it off (Granite refuses to load
   community plugins while restricted mode is enabled — see
   [Settings → pluginRestrictedMode](../reference/settings.md#fields)).
4. Find **Hello Granite** in the installed list and toggle it on.

You should see the **"Hello from Granite!"** notice in the bottom-right
corner. Press `Mod+Shift+H` (or `Cmd+Shift+H` on macOS) and you should see
"Hi!".

## 5. Add a status bar item

Replace `onLoad` with:

```js
let item;

onLoad(api) {
  let count = 0;
  item = api.statusBar.add({
    text: `Clicks: ${count}`,
    tooltip: "Click to increment",
    onClick() {
      count += 1;
      item.setText(`Clicks: ${count}`);
    },
  });
}
```

Add to `onUnload`:

```js
item?.remove();
item = null;
```

Reload (toggle the plugin off and on). A "Clicks: 0" item now appears in the
status bar.

## 6. Add a settings tab

Inside `onLoad`:

```js
disposers.push(
  api.addSettingsTab({
    name: "Hello Granite",
    render(container) {
      const p = document.createElement("p");
      p.textContent = "Hello Granite settings go here.";
      container.appendChild(p);
    },
  }),
);
```

Open **Settings → Plugin options → Hello Granite** — your paragraph is
rendered there. The host clears the container on cleanup; if you want to
clean up DOM listeners yourself, return a cleanup function from `render`.

## 7. Persist data

Append to `onLoad`:

```js
const state = (await api.loadData()) ?? { count: 0 };
api.log("starting at", state.count);

// on every click:
state.count += 1;
await api.saveData(state);
```

Data lives at `<vault>/.granite/plugins/hello-granite/data.json`. It
survives reload and vault switches.

## Next steps

- [SDK cookbook](./cookbook.md) — copy-pasteable recipes for the common
  patterns.
- [Lifecycle](./lifecycle.md) — what runs when, and how cleanup works.
- [Plugin API reference](../reference/plugin-api.md) — the full surface.
- Browse `examples/plugins/word-counter`, `auto-tagger`, and `data-store`
  in the repo for richer examples.

[← overview](./overview.md) · [Index](./README.md) · [manifest →](./manifest.md)
