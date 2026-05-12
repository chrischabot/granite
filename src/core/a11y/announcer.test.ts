import { beforeEach, describe, expect, it } from "vitest";
import { a11yAnnouncer } from "./announcer";

describe("a11yAnnouncer", () => {
  beforeEach(() => {
    a11yAnnouncer.reset();
  });

  it("publishes trimmed announcements with a new id", () => {
    const calls: number[] = [];
    const unsubscribe = a11yAnnouncer.subscribe(() => {
      calls.push(a11yAnnouncer.getSnapshot().id);
    });

    a11yAnnouncer.announce("  Saved note  ");

    expect(a11yAnnouncer.getSnapshot()).toEqual({ id: 1, message: "Saved note" });
    expect(calls).toEqual([1]);
    unsubscribe();
  });

  it("ignores empty announcements", () => {
    a11yAnnouncer.announce("   ");
    expect(a11yAnnouncer.getSnapshot()).toEqual({ id: 0, message: "" });
  });
});
