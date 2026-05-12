import { describe, expect, it } from "vitest";
import { getVisibleSettingsSections } from "./settings-filter";

describe("getVisibleSettingsSections", () => {
  it("returns every built-in and plugin settings section for an empty query", () => {
    const sections = getVisibleSettingsSections("", [{ id: "demo", name: "Demo plugin" }]);
    expect(sections.map((s) => s.id)).toContain("appearance");
    expect(sections.map((s) => s.id)).toContain("templates");
    expect(sections.map((s) => s.id)).toContain("plugin:demo");
  });

  it("filters built-in sections by visible title and searchable setting text", () => {
    expect(getVisibleSettingsSections("vim", []).map((s) => s.id)).toEqual(["editor"]);
    expect(getVisibleSettingsSections("css snippets", []).map((s) => s.id)).toEqual(["appearance"]);
  });

  it("matches all query terms instead of any single term", () => {
    expect(getVisibleSettingsSections("plugin date", []).map((s) => s.id)).toEqual([]);
    expect(getVisibleSettingsSections("daily date", []).map((s) => s.id)).toEqual(["daily-notes"]);
  });

  it("filters plugin settings tabs by plugin id or name", () => {
    const tabs = [
      { id: "kanban-board", name: "Kanban Board" },
      { id: "templater", name: "Templater" },
    ];
    expect(getVisibleSettingsSections("kanban", tabs).map((s) => s.id)).toEqual([
      "plugin:kanban-board",
    ]);
    expect(getVisibleSettingsSections("templater options", tabs).map((s) => s.id)).toEqual([
      "plugin:templater",
    ]);
  });
});
