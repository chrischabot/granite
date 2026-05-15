"use strict";
// Misbehaving plugin — exercises the loader's *safety-net* sweep
// (removeAllStatusBarItemsForPlugin + removeAllSettingsTabsForPlugin +
// removeAllListenersForPlugin). Specifically, it grabs Granite's legacy
// `api.statusBar.add(...)`, `api.addSettingsTab(...)` and `api.events.on(...)`
// surfaces — these return disposers but are NOT auto-tracked by the
// Plugin-class disposer queue. A buggy real-world plugin can easily forget
// to call those disposers. Without the loader's safety net, the host
// registries would leak across enable/disable cycles.
//
// The plugin is intentionally written as `module.exports = { onLoad, onUnload }`
// (Granite-style) so the `api` parameter is in scope, AND its `onUnload` is a
// deliberate no-op so cleanup is entirely the safety net's responsibility.

module.exports = {
  onLoad(api) {
    // 1. Add a status bar item via the api — keep the handle but NEVER remove it.
    api.statusBar.add({ text: "misbehaving status", tooltip: "leaks if uncleaned" });
    // 2. Register a settings tab via the api — same thing, drop the disposer.
    api.addSettingsTab({
      name: "Misbehaving Tab",
      render(container) {
        container.textContent = "misbehaving";
      },
    });
    // 3. Subscribe to a plugin event — drop the disposer.
    api.events.on("layout-change", () => {});
  },
  onUnload() {
    // Intentionally empty — the loader's safety-net sweep is the ONLY
    // mechanism that releases the three registrations above. If you comment
    // out `removeAllStatusBarItemsForPlugin` / `removeAllSettingsTabsForPlugin`
    // / `removeAllListenersForPlugin` in `loader.ts unloadPlugin`, the storm
    // test will leak one status item + one settings tab per cycle.
  },
};
