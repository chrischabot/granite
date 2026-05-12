/**
 * Granite sample plugin — Data Store Demo.
 *
 * Demonstrates every "Phase 9" plugin API surface:
 *   - loadData() / saveData() backed by .granite/plugins/data-store/data.json
 *   - statusBar.add() with live updates
 *   - addSettingsTab() with imperative DOM rendering
 *   - events.on("file-open", …) for workspace event subscription
 *
 * Granite plugins are CommonJS modules. `module.exports` is the contract.
 */

let state = { counter: 0, lastUpdated: null };
let statusItem = null;
let removeSettingsTab = null;
let removeFileOpenListener = null;

function statusText() {
  return `Counter: ${state.counter}`;
}

module.exports = {
  async onLoad(api) {
    // Hydrate from disk. Missing data ⇒ stay on the defaults.
    const loaded = await api.loadData();
    if (loaded && typeof loaded === "object") {
      state = { ...state, ...loaded };
    }

    statusItem = api.statusBar.add({
      text: statusText(),
      tooltip: "Click to increment the counter",
      onClick: async () => {
        state.counter += 1;
        state.lastUpdated = new Date().toISOString();
        statusItem.setText(statusText());
        await api.saveData(state);
        api.notice.show(`Counter is now ${state.counter}`, { timeoutMs: 1500 });
      },
    });

    removeSettingsTab = api.addSettingsTab({
      name: "Counter Demo",
      render(el) {
        const intro = document.createElement("p");
        intro.style.color = "var(--text-muted)";
        intro.style.marginTop = "0";
        intro.textContent =
          "This sample plugin exercises loadData/saveData, statusBar items, settings tabs, and the file-open event.";
        el.appendChild(intro);

        const counterRow = document.createElement("div");
        counterRow.style.padding = "var(--size-4-3) 0";
        counterRow.style.fontSize = "var(--font-ui-medium)";
        counterRow.textContent = statusText();
        el.appendChild(counterRow);

        const lastRow = document.createElement("div");
        lastRow.style.color = "var(--text-muted)";
        lastRow.style.fontSize = "var(--font-ui-smaller)";
        lastRow.textContent = state.lastUpdated
          ? `Last updated ${state.lastUpdated}`
          : "Never incremented yet.";
        el.appendChild(lastRow);

        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.style.marginTop = "var(--size-4-3)";
        resetBtn.textContent = "Reset counter";
        resetBtn.onclick = async () => {
          state.counter = 0;
          state.lastUpdated = new Date().toISOString();
          await api.saveData(state);
          if (statusItem) statusItem.setText(statusText());
          counterRow.textContent = statusText();
          lastRow.textContent = `Last updated ${state.lastUpdated}`;
        };
        el.appendChild(resetBtn);
      },
    });

    removeFileOpenListener = api.events.on("file-open", (ev) => {
      api.log("file-open", ev.path);
    });
  },

  async onUnload() {
    if (statusItem) statusItem.remove();
    if (removeSettingsTab) removeSettingsTab();
    if (removeFileOpenListener) removeFileOpenListener();
    statusItem = null;
    removeSettingsTab = null;
    removeFileOpenListener = null;
  },
};