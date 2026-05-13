import { beforeEach, describe, expect, it, vi } from "vitest";
import { addRecent, clearRecents, listRecents, removeRecent, subscribeRecents } from "./recents";

beforeEach(() => {
  clearRecents();
});

describe("recents", () => {
  it("starts empty", () => {
    expect(listRecents()).toEqual([]);
  });

  it("addRecent records most-recent first", () => {
    addRecent("A.md");
    addRecent("B.md");
    addRecent("C.md");
    expect(listRecents()).toEqual(["C.md", "B.md", "A.md"]);
  });

  it("addRecent dedupes existing entries by lifting them to the top", () => {
    addRecent("A.md");
    addRecent("B.md");
    addRecent("A.md");
    expect(listRecents()).toEqual(["A.md", "B.md"]);
  });

  it("removeRecent drops a single entry", () => {
    addRecent("A.md");
    addRecent("B.md");
    removeRecent("A.md");
    expect(listRecents()).toEqual(["B.md"]);
  });

  it("removeRecent is a no-op for unknown paths", () => {
    addRecent("A.md");
    removeRecent("Z.md");
    expect(listRecents()).toEqual(["A.md"]);
  });

  it("clearRecents empties the list", () => {
    addRecent("A.md");
    addRecent("B.md");
    clearRecents();
    expect(listRecents()).toEqual([]);
  });

  it("caps the list at 32 entries", () => {
    for (let i = 0; i < 40; i++) addRecent(`File-${i}.md`);
    const list = listRecents();
    expect(list.length).toBe(32);
    // Most-recent first → File-39 is at the top.
    expect(list[0]).toBe("File-39.md");
    // The oldest 8 should have been evicted.
    expect(list).not.toContain("File-0.md");
    expect(list).not.toContain("File-7.md");
  });

  it("subscribers are notified on add/remove/clear", () => {
    const cb = vi.fn();
    const unsub = subscribeRecents(cb);
    addRecent("A.md");
    expect(cb).toHaveBeenCalledTimes(1);
    removeRecent("A.md");
    expect(cb).toHaveBeenCalledTimes(2);
    addRecent("B.md");
    clearRecents();
    expect(cb).toHaveBeenCalledTimes(4);
    unsub();
    addRecent("C.md");
    expect(cb).toHaveBeenCalledTimes(4);
  });

  it("ignores empty-string adds", () => {
    addRecent("");
    expect(listRecents()).toEqual([]);
  });
});
