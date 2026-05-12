import type { VaultPath } from "@core/fs/types";
import { beforeEach, describe, expect, it } from "vitest";
import { bindPersistence, clearPersistedFor, restoreFor } from "./persist";
import { workspaceStore } from "./store";
import type { LeafState } from "./types";

const VAULT_ID = "test-vault";

beforeEach(() => {
  workspaceStore.reset();
  clearPersistedFor(VAULT_ID);
});

function flushBindDebounce(): Promise<void> {
  // The persist module debounces writes by 500 ms; wait long enough.
  return new Promise((r) => setTimeout(r, 600));
}

function expectPresent<T>(value: T | null | undefined, label: string): T {
  expect(value, label).toBeDefined();
  expect(value, label).not.toBeNull();
  if (value === null || value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

describe("workspace persistence", () => {
  it("saves the workspace columns shape to localStorage on changes", async () => {
    const unbind = bindPersistence(VAULT_ID);
    workspaceStore.openFile("A.md" as VaultPath);
    await flushBindDebounce();
    const raw = localStorage.getItem(`granite.workspace.last.${VAULT_ID}`);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(expectPresent(raw, "persisted workspace snapshot"));
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
      const activeGroupId = expectPresent(s.activeGroupId, "active group id");
      const group = expectPresent(s.groups.get(activeGroupId), "active group");
      return expectPresent(group.activeLeafId, "active leaf id");
    })();
    workspaceStore.setMarkdownFolds(sourceLeaf, [
      { from: 4, to: 20 },
      { from: 32, to: 48 },
    ]);
    workspaceStore.splitLeaf(sourceLeaf, "right");
    workspaceStore.splitLeaf(sourceLeaf, "down");
    // Toggle stacked on the active group.
    const activeGroupId = expectPresent(
      workspaceStore.getState().activeGroupId,
      "active group id after split",
    );
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
    expect(s.columns[0]?.length).toBe(2); // split-down → 2 groups in column 0
    // At least one stacked group was preserved.
    const anyStacked = [...s.groups.values()].some((g) => g.stacked);
    expect(anyStacked).toBe(true);
    const restoredMarkdownLeaves = [...s.leaves.values()].filter(
      (leaf) => leaf.state.type === "markdown" && leaf.state.path === "A.md",
    );
    expect(
      restoredMarkdownLeaves.some(
        (leaf) =>
          leaf.state.type === "markdown" &&
          JSON.stringify(leaf.state.folds) ===
            JSON.stringify([
              { from: 4, to: 20 },
              { from: 32, to: 48 },
            ]),
      ),
    ).toBe(true);
  });

  it("restores legacy flat-groups snapshots", () => {
    const legacy = {
      groups: [
        {
          leaves: [{ type: "markdown", path: "Note.md", mode: "source" } as LeafState],
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
    const firstColumn = expectPresent(s.columns[0], "first column");
    const firstGroupId = expectPresent(firstColumn[0], "first group id");
    const onlyGroup = expectPresent(s.groups.get(firstGroupId), "first group");
    const firstLeafId = expectPresent(onlyGroup.leafIds[0], "first leaf id");
    const leaf = expectPresent(s.leaves.get(firstLeafId), "first leaf");
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
