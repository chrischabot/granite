import type { VaultPath } from "@core/fs/types";
import { beforeEach, describe, expect, it } from "vitest";
import {
  bindPersistence,
  clearPersistedFor,
  flushWorkspacePersistence,
  restoreFor,
} from "./persist";
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

function markdownPaths(): string[] {
  return [...workspaceStore.getState().leaves.values()]
    .map((leaf) => leaf.state)
    .filter((state) => state.type === "markdown")
    .map((state) => state.path);
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

  it("persists real tabs even when the first tab is the initial empty leaf", async () => {
    const unbind = bindPersistence(VAULT_ID);
    workspaceStore.openSidebarView("left", "search", { newTab: true });
    await flushBindDebounce();

    const raw = localStorage.getItem(`granite.workspace.last.${VAULT_ID}`);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(expectPresent(raw, "persisted workspace snapshot"));
    expect(parsed.columns[0][0].leaves.map((leaf: LeafState) => leaf.type)).toEqual([
      "empty",
      "sidebar",
    ]);

    unbind();
    workspaceStore.reset();
    expect(restoreFor(VAULT_ID)).toBe(true);
    const restored = [...workspaceStore.getState().leaves.values()].map((leaf) => leaf.state);
    expect(restored.some((state) => state.type === "sidebar" && state.id === "search")).toBe(
      true,
    );
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

  it("round-trips central sidebar leaves via restoreFor", async () => {
    const unbind = bindPersistence(VAULT_ID);
    workspaceStore.openSidebarView("right", "outline");
    await flushBindDebounce();

    unbind();
    workspaceStore.reset();

    expect(restoreFor(VAULT_ID)).toBe(true);
    expect(markdownPaths()).toEqual([]);
    const restoredSidebarLeaves = [...workspaceStore.getState().leaves.values()].filter(
      (leaf) =>
        leaf.state.type === "sidebar" && leaf.state.side === "right" && leaf.state.id === "outline",
    );
    expect(restoredSidebarLeaves.length).toBe(1);
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

  it("flushes a pending debounced workspace snapshot when unbound", () => {
    const unbind = bindPersistence(VAULT_ID);
    workspaceStore.openFile("Fast-close.md" as VaultPath);

    unbind();
    workspaceStore.reset();

    expect(restoreFor(VAULT_ID)).toBe(true);
    expect(markdownPaths()).toContain("Fast-close.md");
  });

  it("flushes a pending debounced workspace snapshot before unload", () => {
    const unbind = bindPersistence(VAULT_ID);
    workspaceStore.openFile("Before-unload.md" as VaultPath);

    window.dispatchEvent(new Event("beforeunload"));
    unbind();
    workspaceStore.reset();

    expect(restoreFor(VAULT_ID)).toBe(true);
    expect(markdownPaths()).toContain("Before-unload.md");
  });

  it("survives 100 kill-and-restart workspace cycles without losing the latest note", () => {
    let unbind = bindPersistence(VAULT_ID);

    for (let cycle = 0; cycle < 100; cycle += 1) {
      const path = `Cycle-${cycle}.md` as VaultPath;
      const leafId = workspaceStore.openFile(path, {
        newTab: cycle > 0,
        mode: cycle % 2 === 0 ? "source" : "live-preview",
      });
      if (cycle % 5 === 0) {
        workspaceStore.setMarkdownFolds(leafId, [{ from: cycle, to: cycle + 10 }]);
      }
      if (cycle % 11 === 0) {
        workspaceStore.splitLeaf(leafId, cycle % 22 === 0 ? "right" : "down");
      }

      flushWorkspacePersistence();
      unbind();
      workspaceStore.reset();

      expect(restoreFor(VAULT_ID), `restore cycle ${cycle}`).toBe(true);
      expect(markdownPaths(), `restored markdown leaves cycle ${cycle}`).toContain(path);

      unbind = bindPersistence(VAULT_ID);
    }

    unbind();
  });
});
