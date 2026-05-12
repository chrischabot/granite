import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commandRegistry } from "./CommandRegistry";
import {
  addUserHotkey,
  clearUserHotkey,
  getEffectiveHotkeys,
  getUserHotkeys,
  initHotkeyDispatcher,
  removeUserHotkey,
  resetHotkeysForTests,
} from "./hotkeys";

function press(key: string): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("custom hotkeys", () => {
  let cleanupCommand: (() => void) | null = null;
  let cleanupDispatcher: (() => void) | null = null;
  let calls = 0;

  beforeEach(() => {
    resetHotkeysForTests();
    calls = 0;
    cleanupCommand = commandRegistry.register({
      id: "test:multi-hotkey",
      name: "Test multi hotkey",
      hotkeys: [{ modifiers: [], key: "F8" }],
      callback: () => {
        calls += 1;
      },
    });
    cleanupDispatcher = initHotkeyDispatcher();
  });

  afterEach(() => {
    cleanupDispatcher?.();
    cleanupCommand?.();
    resetHotkeysForTests();
  });

  it("allows multiple custom bindings for one command", () => {
    addUserHotkey("test:multi-hotkey", { modifiers: [], key: "F9" });
    addUserHotkey("test:multi-hotkey", { modifiers: [], key: "F10" });

    press("F8");
    press("F9");
    press("F10");

    expect(calls).toBe(2);
    expect(getUserHotkeys("test:multi-hotkey")).toHaveLength(2);
    expect(getEffectiveHotkeys("test:multi-hotkey").map((h) => h.key)).toEqual(["F9", "F10"]);
  });

  it("deduplicates and removes individual custom bindings", () => {
    addUserHotkey("test:multi-hotkey", { modifiers: [], key: "F9" });
    addUserHotkey("test:multi-hotkey", { modifiers: [], key: "F9" });
    removeUserHotkey("test:multi-hotkey", { modifiers: [], key: "F9" });

    expect(getUserHotkeys("test:multi-hotkey")).toEqual([]);
    expect(getEffectiveHotkeys("test:multi-hotkey").map((h) => h.key)).toEqual(["F8"]);
  });

  it("restores default bindings when custom bindings are cleared", () => {
    addUserHotkey("test:multi-hotkey", { modifiers: [], key: "F9" });
    clearUserHotkey("test:multi-hotkey");

    press("F8");
    press("F9");

    expect(calls).toBe(1);
  });
});
