import { describe, expect, it } from "vitest";
import { closeSidebarGroup, setSidebarGroupActive, splitSidebarGroup } from "./sidebar-groups";

describe("sidebar group model", () => {
  it("sets the active tab for one sidebar group", () => {
    expect(
      setSidebarGroupActive(
        [
          { id: "a", active: "files" },
          { id: "b", active: "tags" },
        ],
        "b",
        "search",
      ),
    ).toEqual([
      { id: "a", active: "files" },
      { id: "b", active: "search" },
    ]);
  });

  it("splits a group below the source and copies its active tab", () => {
    expect(splitSidebarGroup([{ id: "a", active: "outline" }], "a", "b")).toEqual([
      { id: "a", active: "outline" },
      { id: "b", active: "outline" },
    ]);
  });

  it("does not close the last remaining group", () => {
    const groups = [{ id: "a", active: "outline" }];
    expect(closeSidebarGroup(groups, "a")).toBe(groups);
  });

  it("closes a non-final group", () => {
    expect(
      closeSidebarGroup(
        [
          { id: "a", active: "outline" },
          { id: "b", active: "backlinks" },
        ],
        "a",
      ),
    ).toEqual([{ id: "b", active: "backlinks" }]);
  });
});
