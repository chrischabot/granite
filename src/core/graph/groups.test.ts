import { describe, expect, it } from "vitest";
import { firstMatchingGroup, matchGraphGroup } from "./groups";

const baseCtx = {
  path: "notes/project/x.md",
  tags: [] as string[],
  frontmatter: {} as Record<string, unknown>,
};

describe("matchGraphGroup", () => {
  it("matches by tag operator", () => {
    expect(
      matchGraphGroup(
        { id: "g1", name: "Work", query: "tag:work", color: "red" },
        { ...baseCtx, tags: ["work"] },
      ),
    ).toBe(true);
    expect(
      matchGraphGroup(
        { id: "g1", name: "Work", query: "tag:work", color: "red" },
        { ...baseCtx, tags: ["home"] },
      ),
    ).toBe(false);
  });

  it("matches by path: operator", () => {
    expect(
      matchGraphGroup(
        { id: "g2", name: "Project", query: "path:project/", color: "blue" },
        baseCtx,
      ),
    ).toBe(true);
    expect(
      matchGraphGroup(
        { id: "g2", name: "Project", query: "path:archive/", color: "blue" },
        baseCtx,
      ),
    ).toBe(false);
  });

  it("matches a property constraint against frontmatter", () => {
    expect(
      matchGraphGroup(
        { id: "g3", name: "Done", query: "[status:done]", color: "green" },
        { ...baseCtx, frontmatter: { status: "done" } },
      ),
    ).toBe(true);
  });

  it("supports free-term matches against the path/stem", () => {
    expect(matchGraphGroup({ id: "g4", name: "x", query: "x", color: "red" }, baseCtx)).toBe(true);
    expect(matchGraphGroup({ id: "g4", name: "x", query: "z", color: "red" }, baseCtx)).toBe(false);
  });
});

describe("firstMatchingGroup", () => {
  it("returns the first matching group in array order", () => {
    const groups = [
      { id: "a", name: "tagged work", query: "tag:work", color: "red" },
      { id: "b", name: "in project/", query: "path:project/", color: "blue" },
    ];
    const ctx = {
      path: "notes/project/x.md",
      tags: ["work"],
      frontmatter: {},
    };
    expect(firstMatchingGroup(groups, ctx)?.id).toBe("a");
  });

  it("returns null when nothing matches", () => {
    expect(firstMatchingGroup([], baseCtx)).toBeNull();
  });
});
