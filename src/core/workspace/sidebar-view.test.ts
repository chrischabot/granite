import { beforeEach, describe, expect, it } from "vitest";
import { workspaceStore } from "./store";

beforeEach(() => {
  workspaceStore.reset();
});

function activeLeafState() {
  const state = workspaceStore.getState();
  const activeGroupId = state.activeGroupId;
  expect(activeGroupId).toBeDefined();
  if (!activeGroupId) throw new Error("Missing active group id");
  const group = state.groups.get(activeGroupId);
  expect(group).toBeDefined();
  if (!group) throw new Error("Missing active group");
  const activeLeafId = group.activeLeafId;
  expect(activeLeafId).toBeDefined();
  if (!activeLeafId) throw new Error("Missing active leaf id");
  const leaf = state.leaves.get(activeLeafId);
  expect(leaf).toBeDefined();
  if (!leaf) throw new Error("Missing active leaf");
  return leaf.state;
}

function activeGroupLeafCount(): number {
  const state = workspaceStore.getState();
  const activeGroupId = state.activeGroupId;
  if (!activeGroupId) return 0;
  return state.groups.get(activeGroupId)?.leafIds.length ?? 0;
}

describe("workspaceStore.openSidebarView", () => {
  it("opens a sidebar view as a central workspace leaf", () => {
    workspaceStore.openSidebarView("right", "outline");

    expect(activeGroupLeafCount()).toBe(1);
    expect(activeLeafState()).toEqual({ type: "sidebar", side: "right", id: "outline" });
  });

  it("focuses an existing sidebar leaf instead of duplicating it", () => {
    workspaceStore.openSidebarView("right", "outline");
    workspaceStore.openSidebarView("left", "tags", { newTab: true });
    workspaceStore.openSidebarView("right", "outline", { newTab: true });

    expect(activeGroupLeafCount()).toBe(2);
    expect(activeLeafState()).toEqual({ type: "sidebar", side: "right", id: "outline" });
  });
});
