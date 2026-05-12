import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetEventsForTesting,
  emitFileRename,
  onPluginEvent,
  removeAllListenersForPlugin,
} from "./events";

beforeEach(() => {
  _resetEventsForTesting();
});

describe("plugin events", () => {
  it("delivers file-rename events", () => {
    const seen: Array<{ from: string; to: string }> = [];
    const off = onPluginEvent("p1", "file-rename", (e) => seen.push(e));
    emitFileRename("a.md", "b.md");
    expect(seen).toEqual([{ from: "a.md", to: "b.md" }]);
    off();
    emitFileRename("c.md", "d.md");
    expect(seen).toEqual([{ from: "a.md", to: "b.md" }]);
  });

  it("removeAllListenersForPlugin removes the plugin's listeners only", () => {
    const seenA: string[] = [];
    const seenB: string[] = [];
    onPluginEvent("p1", "file-rename", (e) => seenA.push(`${e.from}->${e.to}`));
    onPluginEvent("p2", "file-rename", (e) => seenB.push(`${e.from}->${e.to}`));
    emitFileRename("a", "b");
    expect(seenA).toEqual(["a->b"]);
    expect(seenB).toEqual(["a->b"]);
    removeAllListenersForPlugin("p1");
    emitFileRename("c", "d");
    expect(seenA).toEqual(["a->b"]);
    expect(seenB).toEqual(["a->b", "c->d"]);
  });

  it("listener exceptions are swallowed and don't break siblings", () => {
    const seen: string[] = [];
    onPluginEvent("p1", "file-rename", () => {
      throw new Error("boom");
    });
    onPluginEvent("p2", "file-rename", (e) => seen.push(`${e.from}->${e.to}`));
    expect(() => emitFileRename("a", "b")).not.toThrow();
    expect(seen).toEqual(["a->b"]);
  });

  it("rejects unknown event names", () => {
    expect(() =>
      onPluginEvent("p1", "not-an-event" as unknown as "file-rename", () => {}),
    ).toThrow();
  });
});
