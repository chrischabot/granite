"use strict";
// Persists settings via loadData/saveData, registers a settings tab, registers
// a command. Mirrors obsidian-git's lifecycle skeleton.
const obsidian = require("obsidian");

class GitSettingsTab extends obsidian.PluginSettingTab {
  display() {
    const c = this.containerEl;
    if (typeof c.replaceChildren === "function") c.replaceChildren();
    else c.innerHTML = "";
    new obsidian.Setting(c)
      .setName("Auto-commit interval (minutes)")
      .setDesc("How often to auto-commit changes.")
      .addText((cmp) => {
        cmp
          .setValue(String(this.plugin.settings.intervalMinutes))
          .onChange(async (value) => {
            const n = parseInt(value, 10);
            this.plugin.settings.intervalMinutes = Number.isFinite(n) ? n : 0;
            await this.plugin.saveData(this.plugin.settings);
          });
      });
  }
}

class GitShim extends obsidian.Plugin {
  async onload() {
    const stored = await this.loadData();
    this.settings = Object.assign(
      { intervalMinutes: 5, lastCommit: null },
      stored && typeof stored === "object" ? stored : {},
    );
    // Expose what we read so the verifier can prove loadData restored what
    // a previous enable cycle's saveData wrote. The fixture deliberately
    // refreshes this on every onload (overwriting the previous value) so
    // the round-trip test only passes if the latest enable actually picked
    // up the latest saveData.
    if (typeof window !== "undefined") {
      window.__graniteGitFixture = {
        loadedLastCommit: this.settings.lastCommit,
        loadCount: (window.__graniteGitFixture?.loadCount ?? 0) + 1,
      };
    }

    this.addCommand({
      id: "commit-all",
      name: "Commit all changes",
      callback: async () => {
        this.settings.lastCommit = new Date().toISOString();
        await this.saveData(this.settings);
        new obsidian.Notice("Git: committed");
      },
    });
    // Explicit getter command — easier for the verifier to read in-memory
    // state without poking the plugin instance directly.
    this.addCommand({
      id: "get-last-commit",
      name: "Get last commit (test helper)",
      callback: () => {
        if (typeof window !== "undefined") {
          window.__graniteGitFixture = {
            ...(window.__graniteGitFixture ?? {}),
            commandReadLastCommit: this.settings.lastCommit,
          };
        }
      },
    });

    this.addSettingTab(new GitSettingsTab(this.app, this));
  }

  async onunload() {
    // No manual cleanup — exercises the disposer tracker.
  }
}

module.exports = GitShim;
