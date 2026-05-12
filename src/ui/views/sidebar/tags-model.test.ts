import { describe, expect, it } from "vitest";
import { buildTagsModel, sortTagNodes } from "./tags-model";

describe("buildTagsModel", () => {
  const tags = [
    { name: "work/client", count: 2 },
    { name: "work/internal", count: 1 },
    { name: "home", count: 3 },
  ];

  it("builds hierarchical tag nodes when nested tags are shown", () => {
    const root = buildTagsModel(tags, true);
    const work = root.children.get("work");

    expect(work?.count).toBe(3);
    expect(work?.children.get("client")?.fullName).toBe("work/client");
    expect(work?.children.get("internal")?.fullName).toBe("work/internal");
  });

  it("keeps slash-separated tags flat when nested tags are hidden", () => {
    const root = buildTagsModel(tags, false);

    expect(root.children.get("work")).toBeUndefined();
    expect(root.children.get("work/client")?.segment).toBe("work/client");
    expect(root.children.get("work/internal")?.segment).toBe("work/internal");
  });

  it("sorts by count descending, then segment ascending", () => {
    const root = buildTagsModel(
      [
        { name: "b", count: 1 },
        { name: "a", count: 1 },
        { name: "c", count: 2 },
      ],
      false,
    );

    expect(sortTagNodes(root.children.values()).map((node) => node.segment)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});
