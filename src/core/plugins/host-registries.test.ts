import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetHostRegistriesForTesting,
  addSettingsTab,
  addStatusBarItem,
  listSettingsTabs,
  listStatusBarItems,
  removeAllSettingsTabsForPlugin,
  removeAllStatusBarItemsForPlugin,
  subscribeSettingsTabs,
  subscribeStatusBarItems,
} from "./host-registries";

beforeEach(() => {
  _resetHostRegistriesForTesting();
});

describe("status bar items", () => {
  it("adds, lists, updates, removes", () => {
    expect(listStatusBarItems()).toEqual([]);
    const handle = addStatusBarItem("p1", { text: "Hi", tooltip: "ttip" });
    expect(listStatusBarItems()).toHaveLength(1);
    expect(listStatusBarItems()[0]).toMatchObject({
      pluginId: "p1",
      text: "Hi",
      tooltip: "ttip",
    });
    handle.setText("Hello");
    expect(listStatusBarItems()[0]?.text).toBe("Hello");
    handle.setTooltip(null);
    expect(listStatusBarItems()[0]?.tooltip).toBeNull();
    const fn = () => {};
    handle.setOnClick(fn);
    expect(listStatusBarItems()[0]?.onClick).toBe(fn);
    handle.remove();
    expect(listStatusBarItems()).toHaveLength(0);
  });

  it("removeAllStatusBarItemsForPlugin removes plugin items but leaves others", () => {
    addStatusBarItem("p1", { text: "a" });
    addStatusBarItem("p2", { text: "b" });
    addStatusBarItem("p1", { text: "c" });
    expect(listStatusBarItems()).toHaveLength(3);
    removeAllStatusBarItemsForPlugin("p1");
    const after = listStatusBarItems();
    expect(after).toHaveLength(1);
    expect(after[0]?.pluginId).toBe("p2");
  });

  it("notifies subscribers on mutations", () => {
    let calls = 0;
    const unsub = subscribeStatusBarItems(() => {
      calls += 1;
    });
    const h = addStatusBarItem("p1", { text: "x" });
    h.setText("y");
    h.remove();
    expect(calls).toBe(3);
    unsub();
  });

  it("list() returns a stable cached reference between mutations", () => {
    addStatusBarItem("p1", { text: "a" });
    const a = listStatusBarItems();
    const b = listStatusBarItems();
    expect(a).toBe(b);
  });
});

describe("settings tabs", () => {
  it("registers and removes a tab", () => {
    const remove = addSettingsTab("p1", { name: "My Tab", render: () => undefined });
    expect(listSettingsTabs()).toHaveLength(1);
    expect(listSettingsTabs()[0]).toMatchObject({ pluginId: "p1", name: "My Tab" });
    remove();
    expect(listSettingsTabs()).toHaveLength(0);
  });

  it("removeAllSettingsTabsForPlugin removes plugin tabs", () => {
    addSettingsTab("p1", { name: "A", render: () => undefined });
    addSettingsTab("p2", { name: "B", render: () => undefined });
    removeAllSettingsTabsForPlugin("p1");
    expect(listSettingsTabs()).toHaveLength(1);
    expect(listSettingsTabs()[0]?.pluginId).toBe("p2");
  });

  it("notifies subscribers on mutations", () => {
    let calls = 0;
    const unsub = subscribeSettingsTabs(() => {
      calls += 1;
    });
    const remove = addSettingsTab("p1", { name: "T", render: () => undefined });
    remove();
    expect(calls).toBe(2);
    unsub();
  });
});
