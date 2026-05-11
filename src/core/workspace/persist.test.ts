import { describe, it, expect, beforeEach } from "vitest";
import { bindPersistence, clearPersistedFor, restoreFor } from "./persist";
import { workspaceStore } from "./store";
import type { LeafState } from "./types";
import type { VaultPath } from "@core/fs/types";

const VAULT_ID = "test-vault";

beforeEach(() => {
  workspaceStore.reset();
  clearPersistedFor(VAULT_ID);
});

function flushBindDebounce(): Promise<void> {
  // The persist module debounces writes by 500 ms; wait long enough.
  return new Promise((r) => setTimeout(r, 600));
}

describe("workspace persistence", () => {
  it("saves the workspace columns shape to localStorage on changes", async () => {
    const unbind = bindPersistence(VAULT_ID);
    workspaceStore.openFile("A.md" as VaultPath);
    await flushBindDebounce();
    const raw = localStorage.getItem(`granite.workspace.last.${VAULT_ID}`);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.shape).toBe("columns");
    expect(Array.isArray(parsed.columns)).toBe(true);
    expect(parsed.columns.length).toBe(1);
    expect(parsed.columns[0][0].leaves[0].type).toBe("markdown");
    unbind();
  });

  it("does not persist a single empty leaf", async () => {
    const unbind = bindPersistence(VAULT_ID);
    // workspaceStore.reset() above means a single empty leaf — should not save.
    workspaceStore.reset();
    await flushBindDebounce();
    const raw = localStorage.getItem(`granite.workspace.last.${VAULT_ID}`);
    expect(raw).toBeNull();
    unbind();
  });

  it("round-trips a multi-column / stacked layout via restoreFor", async () => {
    const unbind = bindPersistence(VAULT_ID);
    workspaceStore.openFile("A.md" as VaultPath);
    const sourceLeaf = (() => {
      const s = workspaceStore.getState();
      return s.groups.get(s.activeGroupId!)!.activeLeafId!;
    })();
    workspaceStore.splitLeaf(sourceLeaf, "right");
    workspaceStore.splitLeaf(sourceLeaf, "down");
    // Toggle stacked on the active group.
    const activeGroupId = workspaceStore.getState().activeGroupId!;
    workspaceStore.toggleStacked(activeGroupId);
    await flushBindDebounce();

    // Tear down and reset the workspace, then restore from persistence.
    unbind();
    workspaceStore.reset();
    expect(workspaceStore.getState().columns.length).toBe(1);

    const ok = restoreFor(VAULT_ID);
    expect(ok).toBe(true);
    const s = workspaceStore.getState();
    expect(s.columns.length).toBe(2);
    expect(s.columns[0]!.length).toBe(2); // split-down → 2 groups in column 0
    // At least one stacked group was preserved.
    const anyStacked = [...s.groups.values()].some((g) => g.stacked);
    expect(anyStacked).toBe(true);
  });

  it("restores legacy flat-groups snapshots", () => {
    const legacy = {
      groups: [
        {
          leaves: [
            { type: "markdown", path: "Note.md", mode: "source" } as LeafState,
          ],
          activeIndex: 0,
        },
      ],
      activeGroupIndex: 0,
    };
    localStorage.setItem(`granite.workspace.last.${VAULT_ID}`, JSON.stringify(legacy));
    workspaceStore.reset();
    const ok = restoreFor(VAULT_ID);
    expect(ok).toBe(true);
    const s = workspaceStore.getState();
    expect(s.columns.length).toBe(1);
    const onlyGroup = s.groups.get(s.columns[0]![0]!)!;
    const leaf = s.leaves.get(onlyGroup.leafIds[0]!)!;
    expect(leaf.state.type).toBe("markdown");
    if (leaf.state.type === "markdown") {
      expect(leaf.state.path).toBe("Note.md");
    }
  });

  it("clearPersistedFor wipes the saved snapshot", async () => {
    const unbind = bindPersistence(VAULT_ID);
    workspaceStore.openFile("A.md" as VaultPath);
    await flushBindDebounce();
    expect(localStorage.getItem(`granite.workspace.last.${VAULT_ID}`)).not.toBeNull();
    clearPersistedFor(VAULT_ID);
    expect(localStorage.getItem(`granite.workspace.last.${VAULT_ID}`)).toBeNull();
    unbind();
  });
});