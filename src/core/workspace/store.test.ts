import { describe, it, expect, beforeEach } from "vitest";
import { workspaceStore } from "./store";
import type { LeafState } from "./types";
import type { VaultPath } from "@core/fs/types";

beforeEach(() => {
  workspaceStore.reset();
});

function activeGroupLeaves(): string[] {
  const s = workspaceStore.getState();
  if (!s.activeGroupId) return [];
  const g = s.groups.get(s.activeGroupId);
  return g ? [...g.leafIds] : [];
}

describe("workspaceStore — initial state", () => {
  it("starts with one column, one group, one empty leaf", () => {
    const s = workspaceStore.getState();
    expect(s.columns.length).toBe(1);
    expect(s.columns[0]!.length).toBe(1);
    expect(s.rootGroupIds).toEqual(s.columns.flat());
    const groupId = s.columns[0]![0]!;
    const group = s.groups.get(groupId)!;
    expect(group.leafIds.length).toBe(1);
    const leaf = s.leaves.get(group.leafIds[0]!)!;
    expect(leaf.state.type).toBe("empty");
    expect(s.activeGroupId).toBe(groupId);
  });
});

describe("workspaceStore.openFile", () => {
  it("replaces the empty leaf with a markdown leaf", () => {
    workspaceStore.openFile("Note.md" as VaultPath);
    const ids = activeGroupLeaves();
    expect(ids.length).toBe(1);
    const leaf = workspaceStore.getState().leaves.get(ids[0]!)!;
    expect(leaf.state.type).toBe("markdown");
    if (leaf.state.type === "markdown") {
      expect(leaf.state.path).toBe("Note.md");
    }
  });

  it("focuses an existing tab when opening the same path", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    workspaceStore.openFile("A.md" as VaultPath);
    const ids = activeGroupLeaves();
    expect(ids.length).toBe(2);
    const active = workspaceStore.getState().groups.get(workspaceStore.getState().activeGroupId!)!.activeLeafId!;
    const activeLeaf = workspaceStore.getState().leaves.get(active)!;
    expect(activeLeaf.state.type === "markdown" && activeLeaf.state.path === "A.md").toBe(true);
  });

  it("with newTab appends a new tab", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    expect(activeGroupLeaves().length).toBe(2);
  });
});

describe("workspaceStore.splitLeaf", () => {
  it("right creates a new column with a duplicate leaf", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    const leafId = activeGroupLeaves()[0]!;
    workspaceStore.splitLeaf(leafId, "right");
    const s = workspaceStore.getState();
    expect(s.columns.length).toBe(2);
    expect(s.columns[0]!.length).toBe(1);
    expect(s.columns[1]!.length).toBe(1);
  });

  it("down adds a new group to the same column", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    const leafId = activeGroupLeaves()[0]!;
    workspaceStore.splitLeaf(leafId, "down");
    const s = workspaceStore.getState();
    expect(s.columns.length).toBe(1);
    expect(s.columns[0]!.length).toBe(2);
  });

  it("rootGroupIds remains the columns-flattened list", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    const leafId = activeGroupLeaves()[0]!;
    workspaceStore.splitLeaf(leafId, "right");
    workspaceStore.splitLeaf(leafId, "down");
    const s = workspaceStore.getState();
    expect(s.rootGroupIds).toEqual(s.columns.flat());
  });
});

describe("workspaceStore.closeTab + closeGroup", () => {
  it("closing the last tab in the only group keeps an empty leaf", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    const leafId = activeGroupLeaves()[0]!;
    workspaceStore.closeTab(leafId);
    const ids = activeGroupLeaves();
    expect(ids.length).toBe(1);
    const leaf = workspaceStore.getState().leaves.get(ids[0]!)!;
    expect(leaf.state.type).toBe("empty");
  });

  it("closeGroup with multiple groups removes the target column", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    const leafId = activeGroupLeaves()[0]!;
    const newGroupId = workspaceStore.splitLeaf(leafId, "right");
    expect(workspaceStore.getState().columns.length).toBe(2);
    workspaceStore.closeGroup(newGroupId);
    expect(workspaceStore.getState().columns.length).toBe(1);
  });

  it("closeGroup is a no-op when only one group remains", () => {
    const onlyGroupId = workspaceStore.getState().columns[0]![0]!;
    const before = workspaceStore.getState();
    workspaceStore.closeGroup(onlyGroupId);
    expect(workspaceStore.getState()).toBe(before);
  });
});

describe("workspaceStore.moveTab", () => {
  it("reorders within the same group", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    const ids = activeGroupLeaves();
    expect(ids.length).toBe(2);
    const [a, b] = ids;
    // Move A so it lands before nothing → end. Same group, A is currently
    // first; moveTab(a, group, null) appends → [B, A].
    const groupId = workspaceStore.getState().activeGroupId!;
    workspaceStore.moveTab(a!, groupId, null);
    expect(activeGroupLeaves()).toEqual([b!, a!]);
  });

  it("self-drop in the same group is a no-op", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    const id = activeGroupLeaves()[0]!;
    const groupId = workspaceStore.getState().activeGroupId!;
    const before = workspaceStore.getState();
    workspaceStore.moveTab(id, groupId, id);
    expect(workspaceStore.getState()).toBe(before);
  });

  it("moves a tab across groups (creates new column when source empties)", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    const ids = activeGroupLeaves();
    const sourceGroupId = workspaceStore.getState().activeGroupId!;
    const newGroupId = workspaceStore.splitLeaf(ids[0]!, "right");
    // Move B from source group to new group.
    workspaceStore.moveTab(ids[1]!, newGroupId, null);
    const s = workspaceStore.getState();
    expect(s.groups.get(sourceGroupId)?.leafIds.length).toBe(1);
    expect(s.groups.get(newGroupId)?.leafIds.length).toBe(2);
  });
});

describe("workspaceStore.openGraph + openCanvas + openBase", () => {
  it("opens a graph leaf and replaces the empty leaf", () => {
    workspaceStore.openGraph();
    const ids = activeGroupLeaves();
    expect(ids.length).toBe(1);
    expect(workspaceStore.getState().leaves.get(ids[0]!)!.state.type).toBe("graph");
  });

  it("focuses an existing graph instead of creating a duplicate", () => {
    workspaceStore.openGraph();
    workspaceStore.openFile("A.md" as VaultPath, { newTab: true });
    workspaceStore.openGraph();
    const s = workspaceStore.getState();
    const group = s.groups.get(s.activeGroupId!)!;
    expect(group.leafIds.length).toBe(2);
    const active = group.activeLeafId!;
    expect(s.leaves.get(active)!.state.type).toBe("graph");
  });

  it("openCanvas without a path creates an unsaved canvas leaf", () => {
    workspaceStore.openCanvas();
    const ids = activeGroupLeaves();
    const leaf = workspaceStore.getState().leaves.get(ids[0]!)!;
    expect(leaf.state.type).toBe("canvas");
  });

  it("openBase mirrors openCanvas semantics", () => {
    workspaceStore.openBase();
    const ids = activeGroupLeaves();
    expect(workspaceStore.getState().leaves.get(ids[0]!)!.state.type).toBe("bases");
  });

  it("openPath routes every native non-Markdown format to the correct leaf type", () => {
    const cases = [
      ["Board.canvas", "canvas", undefined],
      ["Books.base", "bases", undefined],
      ["Image.avif", "asset", "image"],
      ["Photo.jpeg", "asset", "image"],
      ["Scan.pdf", "asset", "pdf"],
      ["Song.mp3", "asset", "audio"],
      ["Voice.3gp", "asset", "audio"],
      ["Movie.webm", "asset", "video"],
      ["Clip.mkv", "asset", "video"],
    ] as const;

    for (const [path, type, kind] of cases) {
      workspaceStore.reset();
      workspaceStore.openPath(path as VaultPath);
      const leaf = workspaceStore.getState().leaves.get(activeGroupLeaves()[0]!)!;
      expect(leaf.state.type, path).toBe(type);
      if (leaf.state.type === "asset") expect(leaf.state.kind).toBe(kind);
    }
  });
});

describe("workspaceStore.hydrate", () => {
  it("restores columns from the columns shape", () => {
    const leafA: LeafState = { type: "markdown", path: "A.md" as VaultPath, mode: "source" };
    const leafB: LeafState = { type: "markdown", path: "B.md" as VaultPath, mode: "source" };
    const ok = workspaceStore.hydrate({
      shape: "columns",
      columns: [
        [{ leaves: [leafA], activeIndex: 0 }],
        [{ leaves: [leafB], activeIndex: 0, stacked: true }],
      ],
      activeGroupIndex: 1,
    });
    expect(ok).toBe(true);
    const s = workspaceStore.getState();
    expect(s.columns.length).toBe(2);
    const stackedGroupId = s.columns[1]![0]!;
    expect(s.groups.get(stackedGroupId)?.stacked).toBe(true);
    expect(s.activeGroupId).toBe(stackedGroupId);
  });

  it("restores legacy flat-groups shape into one column per group", () => {
    const leafA: LeafState = { type: "markdown", path: "A.md" as VaultPath, mode: "source" };
    const leafB: LeafState = { type: "markdown", path: "B.md" as VaultPath, mode: "source" };
    const ok = workspaceStore.hydrate({
      shape: "legacy",
      groups: [
        { leaves: [leafA], activeIndex: 0 },
        { leaves: [leafB], activeIndex: 0 },
      ],
      activeGroupIndex: 0,
    });
    expect(ok).toBe(true);
    const s = workspaceStore.getState();
    expect(s.columns.length).toBe(2);
    expect(s.columns.every((c) => c.length === 1)).toBe(true);
  });
});

describe("workspaceStore.togglePinned + closeOtherTabs + closeRightTabs", () => {
  it("togglePinned flips the pinned flag on a markdown leaf", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    const id = activeGroupLeaves()[0]!;
    workspaceStore.togglePinned(id);
    const leaf = workspaceStore.getState().leaves.get(id)!;
    expect(leaf.state.type === "markdown" && leaf.state.pinned === true).toBe(true);
  });

  it("closeOtherTabs leaves only the kept tab", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    workspaceStore.openFile("C.md" as VaultPath, { newTab: true });
    const ids = activeGroupLeaves();
    const keep = ids[1]!;
    workspaceStore.closeOtherTabs(keep);
    expect(activeGroupLeaves()).toEqual([keep]);
  });

  it("closeRightTabs trims trailing tabs and activates the kept one", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    workspaceStore.openFile("C.md" as VaultPath, { newTab: true });
    const ids = activeGroupLeaves();
    const keep = ids[1]!;
    workspaceStore.closeRightTabs(keep);
    expect(activeGroupLeaves()).toEqual([ids[0]!, keep]);
    const s = workspaceStore.getState();
    expect(s.groups.get(s.activeGroupId!)!.activeLeafId).toBe(keep);
  });
});

describe("workspaceStore.cycleTab", () => {
  it("advances active leaf forward + wraps", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    workspaceStore.openFile("C.md" as VaultPath, { newTab: true });
    const ids = activeGroupLeaves();
    expect(ids.length).toBe(3);
    const group = workspaceStore.getState().activeGroupId!;
    expect(workspaceStore.getState().groups.get(group)!.activeLeafId).toBe(ids[2]!);
    workspaceStore.cycleTab("next");
    expect(workspaceStore.getState().groups.get(group)!.activeLeafId).toBe(ids[0]!);
    workspaceStore.cycleTab("next");
    expect(workspaceStore.getState().groups.get(group)!.activeLeafId).toBe(ids[1]!);
  });

  it("previous goes backward + wraps", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    const ids = activeGroupLeaves();
    const group = workspaceStore.getState().activeGroupId!;
    workspaceStore.cycleTab("previous");
    expect(workspaceStore.getState().groups.get(group)!.activeLeafId).toBe(ids[0]!);
    workspaceStore.cycleTab("previous");
    expect(workspaceStore.getState().groups.get(group)!.activeLeafId).toBe(ids[1]!);
  });

  it("is a no-op for groups with <2 leaves", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    const before = workspaceStore.getState();
    workspaceStore.cycleTab("next");
    expect(workspaceStore.getState()).toBe(before);
  });
});

describe("workspaceStore.closeActiveTab", () => {
  it("closes the currently active leaf", () => {
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    expect(activeGroupLeaves().length).toBe(2);
    workspaceStore.closeActiveTab();
    expect(activeGroupLeaves().length).toBe(1);
  });

  it("is a no-op when nothing's active", () => {
    workspaceStore.reset();
    workspaceStore.closeActiveTab();
    expect(activeGroupLeaves().length).toBe(1);
  });
});
