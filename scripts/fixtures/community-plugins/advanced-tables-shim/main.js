"use strict";
// Minimal Obsidian-API-shaped plugin: registers a command, a ribbon icon, and
// a status bar item that updates when a file opens. This is structurally
// identical to a real advanced-tables/obsidian plugin entry — same imports,
// same lifecycle hooks, same registration sequence.
const obsidian = require("obsidian");

class AdvancedTablesShim extends obsidian.Plugin {
  async onload() {
    this.addCommand({
      id: "format-table",
      name: "Format current table",
      callback: () => {
        new obsidian.Notice("Advanced Tables: table formatted");
      },
    });
    this.addRibbonIcon("table", "Format table", () => {
      new obsidian.Notice("Advanced Tables ribbon clicked");
    });
    this.status = this.addStatusBarItem();
    this.status.textContent = "Tables: idle";
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        // file may be null when nothing's active.
        const path = file && file.path ? file.path : "(none)";
        this.status.textContent = "Tables: " + path;
      }),
    );
  }

  onunload() {
    // Intentionally a no-op — the loader runs the tracked disposers regardless.
    // This proves the disposer-tracking system: even with no manual cleanup the
    // command, ribbon icon, status bar item, and event listener disappear.
  }
}

module.exports = AdvancedTablesShim;
