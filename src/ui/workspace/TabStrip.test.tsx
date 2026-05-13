import type { VaultPath } from "@core/fs/types";
import { workspaceStore } from "@core/workspace/store";
import type { Leaf } from "@core/workspace/types";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TabStrip } from "./TabStrip";

function activeGroupLeaves(): {
  readonly groupId: string;
  readonly activeLeafId: string | null;
  readonly leaves: ReadonlyArray<Leaf>;
} {
  const state = workspaceStore.getState();
  const groupId = state.activeGroupId;
  if (!groupId) throw new Error("missing active group");
  const group = state.groups.get(groupId);
  if (!group) throw new Error("missing group");
  return {
    groupId,
    activeLeafId: group.activeLeafId,
    leaves: group.leafIds.map((id) => {
      const leaf = state.leaves.get(id);
      if (!leaf) throw new Error(`missing leaf ${id}`);
      return leaf;
    }),
  };
}

describe("TabStrip keyboard navigation", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    workspaceStore.reset();
    workspaceStore.openFile("A.md" as VaultPath);
    workspaceStore.openFile("B.md" as VaultPath, { newTab: true });
    workspaceStore.openFile("C.md" as VaultPath, { newTab: true });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    workspaceStore.reset();
  });

  it("moves focus among ARIA tabs with arrow, Home, and End keys", async () => {
    const snapshot = activeGroupLeaves();
    await act(async () => {
      root.render(
        <TabStrip
          leaves={snapshot.leaves}
          activeLeafId={snapshot.activeLeafId}
          groupId={snapshot.groupId}
          canCloseGroup={false}
          stacked={false}
        />,
      );
    });

    const tabs = host.querySelectorAll<HTMLElement>("[role='tab']");
    expect(tabs).toHaveLength(3);

    await act(async () => {
      tabs[2]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(workspaceStore.getState().groups.get(snapshot.groupId)?.activeLeafId).toBe(
      snapshot.leaves[0]?.id,
    );

    await act(async () => {
      tabs[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    });
    expect(workspaceStore.getState().groups.get(snapshot.groupId)?.activeLeafId).toBe(
      snapshot.leaves[2]?.id,
    );

    await act(async () => {
      tabs[2]?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    });
    expect(workspaceStore.getState().groups.get(snapshot.groupId)?.activeLeafId).toBe(
      snapshot.leaves[0]?.id,
    );
  });

  it("uses vertical arrow keys when tabs are stacked", async () => {
    const snapshot = activeGroupLeaves();
    await act(async () => {
      root.render(
        <TabStrip
          leaves={snapshot.leaves}
          activeLeafId={snapshot.activeLeafId}
          groupId={snapshot.groupId}
          canCloseGroup={false}
          stacked
        />,
      );
    });

    const tabs = host.querySelectorAll<HTMLElement>("[role='tab']");
    await act(async () => {
      tabs[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });

    expect(workspaceStore.getState().groups.get(snapshot.groupId)?.activeLeafId).toBe(
      snapshot.leaves[1]?.id,
    );
  });
});
