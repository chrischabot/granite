"use strict";
// Calendar-shim: a ribbon icon, an interval that ticks while loaded, and a
// document-level keydown listener. Mirrors how obsidian-calendar wires global
// keyboard shortcuts. We expose tick/keydown counts on `window` so the
// verifier can prove the interval really fires while loaded AND really stops
// after unload (regression test for interval leaks).
const obsidian = require("obsidian");

class CalendarShim extends obsidian.Plugin {
  async onload() {
    if (!window.__graniteCalendarFixture) {
      window.__graniteCalendarFixture = { ticks: 0, keydowns: 0 };
    } else {
      // Reset on every load so each enable/disable cycle is observable.
      window.__graniteCalendarFixture.ticks = 0;
      window.__graniteCalendarFixture.keydowns = 0;
    }
    const state = window.__graniteCalendarFixture;

    this.addRibbonIcon("calendar", "Open calendar", () => {
      new obsidian.Notice("Calendar opened");
    });

    const id = window.setInterval(() => {
      state.ticks += 1;
    }, 25);
    this.registerInterval(id);

    this.registerDomEvent(document, "keydown", () => {
      state.keydowns += 1;
    });
  }

  onunload() {
    // No-op — the loader cleans everything via tracked disposers.
  }
}

module.exports = CalendarShim;
