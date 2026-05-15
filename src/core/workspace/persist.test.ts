import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { FsError, VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";
import { Effect, Layer } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import {
  bindPersistence,
  clearPersistedFor,
  flushWorkspacePersistence,
  restoreFor,
  restoreForAsync,
} from "./persist";
import { workspaceStore } from "./store";
import { channelNameFor, createInProcessChannelHub } from "./sync";
import type { LeafState } from "./types";

function makeInMemoryFs(): FileSystemImpl & { _files: Map<VaultPath, string> } {
  const files = new Map<VaultPath, string>();
  const dirs = new Set<VaultPath>();
  return {
    _files: files,
    rootName: "test-vault",
    list: () => Effect.succeed([] as ReadonlyArray<VaultEntry>),
    listAll: () =>
      Effect.succeed(
        [...files.keys()].map<VaultFile>((path) => ({
          type: "file",
          path,
          name: path.split("/").pop() ?? path,
          size: files.get(path)?.length ?? 0,
          mtimeMs: 0,
          ctimeMs: 0,
          extension: extension(path),
        })),
      ),
    readText: (path) => {
      const v = files.get(path);
      if (v === undefined) return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      return Effect.succeed(v);
    },
    readBytes: (path) => {
      const v = files.get(path);
      if (v === undefined) return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      return Effect.succeed(new TextEncoder().encode(v));
    },
    writeText: (path, content) => {
      files.set(path, content);
      return Effect.succeed(undefined);
    },
    writeBytes: (path, bytes) => {
      files.set(path, new TextDecoder().decode(bytes));
      return Effect.succeed(undefined);
    },
    mkdir: (dir) => {
      dirs.add(dir);
      return Effect.succeed(undefined);
    },
    rename: (from, to) => {
      const v = files.get(from);
      if (v === undefined)
        return Effect.fail({ _tag: "FsNotFound", path: from } as unknown as FsError);
      files.delete(from);
      files.set(to, v);
      return Effect.succeed(undefined);
    },
    remove: (path) => {
      files.delete(path);
      return Effect.succeed(undefined);
    },
    stat: (path) => {
      const v = files.get(path);
      if (v === undefined) return Effect.succeed(null);
      return Effect.succeed<VaultFile>({
        type: "file",
        path,
        name: path,
        size: v.length,
        mtimeMs: 0,
        ctimeMs: 0,
        extension: extension(path),
      });
    },
    watch: () => () => {
      /* no-op disposer */
    },
  };
}

async function withFs(): Promise<ReturnType<typeof makeInMemoryFs>> {
  await disposeRuntime();
  const impl = makeInMemoryFs();
  setAppLayer(() => Layer.succeed(FileSystem, impl) as Layer.Layer<AppServices, never, never>);
  return impl;
}

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
    expect(restored.some((state) => state.type === "sidebar" && state.id === "search")).toBe(true);
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

  it("binds: writes the workspace envelope to .granite/workspace.json on changes", async () => {
    const fs = await withFs();
    const unbind = bindPersistence(VAULT_ID);
    workspaceStore.openFile("Disk.md" as VaultPath);
    flushWorkspacePersistence();
    const raw = fs._files.get(".granite/workspace.json" as VaultPath);
    expect(raw, "disk workspace.json").toBeDefined();
    const parsed = JSON.parse(raw ?? "{}");
    expect(parsed.version).toBe(2);
    expect(typeof parsed.updatedMs).toBe("number");
    expect(parsed.updatedMs).toBeGreaterThan(0);
    expect(parsed.snapshot.shape).toBe("columns");
    unbind();
  });

  it("hydrate prefers the disk envelope over localStorage on async restore", async () => {
    const fs = await withFs();
    // Wait for any deferred clearPersistedFor disk-removal to complete on
    // the new FS layer before seeding.
    await new Promise((r) => setTimeout(r, 0));
    fs._files.delete(".granite/workspace.json" as VaultPath);
    // Seed localStorage with one path and disk with a different one. Disk
    // must win — otherwise a stale localStorage from another browser profile
    // would clobber the canonical vault state.
    const localSnap = {
      shape: "columns",
      columns: [
        [{ leaves: [{ type: "markdown", path: "Local.md", mode: "source" }], activeIndex: 0 }],
      ],
      activeGroupIndex: 0,
    };
    localStorage.setItem(`granite.workspace.last.${VAULT_ID}`, JSON.stringify(localSnap));
    const diskSnap = {
      shape: "columns",
      columns: [
        [{ leaves: [{ type: "markdown", path: "Disk.md", mode: "source" }], activeIndex: 0 }],
      ],
      activeGroupIndex: 0,
    };
    await writeConfigJson("workspace", {
      version: 2,
      updatedMs: 1_234_567,
      snapshot: diskSnap,
    });

    workspaceStore.reset();
    const ok = await restoreForAsync(VAULT_ID);
    expect(ok).toBe(true);
    expect(markdownPaths()).toContain("Disk.md");
    expect(markdownPaths()).not.toContain("Local.md");
  });

  it("migrate: writes disk from localStorage when disk is missing on first run", async () => {
    const fs = await withFs();
    const localSnap = {
      shape: "columns",
      columns: [
        [{ leaves: [{ type: "markdown", path: "Migrate.md", mode: "source" }], activeIndex: 0 }],
      ],
      activeGroupIndex: 0,
    };
    localStorage.setItem(`granite.workspace.last.${VAULT_ID}`, JSON.stringify(localSnap));
    expect(fs._files.has(".granite/workspace.json" as VaultPath)).toBe(false);

    workspaceStore.reset();
    const ok = await restoreForAsync(VAULT_ID);
    expect(ok).toBe(true);
    expect(markdownPaths()).toContain("Migrate.md");

    const written = await readConfigJson<{
      version: number;
      updatedMs: number;
      snapshot: { shape: string };
    }>("workspace");
    expect(written).not.toBeNull();
    expect(written?.version).toBe(2);
    // Migration stamps updatedMs=0 so any real in-window save beats it.
    expect(written?.updatedMs).toBe(0);
    expect(written?.snapshot?.shape).toBe("columns");
  });

  it("vault swap: restoreForAsync reads the new vault's workspace.json, not the old one's", async () => {
    const fs = await withFs();
    // Seed disk as if vault A had a snapshot when we were bound to it.
    await writeConfigJson("workspace", {
      version: 2,
      updatedMs: 100,
      snapshot: {
        shape: "columns",
        columns: [
          [{ leaves: [{ type: "markdown", path: "VaultA.md", mode: "source" }], activeIndex: 0 }],
        ],
        activeGroupIndex: 0,
      },
    });
    // Also poison localStorage for vault B so we can detect "vault B used
    // its own disk (empty) and ignored vault A's disk and vault A's local".
    localStorage.setItem(
      "granite.workspace.last.vault-A",
      JSON.stringify({
        shape: "columns",
        columns: [
          [
            {
              leaves: [{ type: "markdown", path: "VaultA-local.md", mode: "source" }],
              activeIndex: 0,
            },
          ],
        ],
        activeGroupIndex: 0,
      }),
    );

    // Switch to a NEW FileSystem layer (vault B): the new vault's
    // workspace.json does not exist on disk.
    const fsB = await withFs();
    expect(fsB).not.toBe(fs);
    workspaceStore.reset();
    const ok = await restoreForAsync("vault-B");
    expect(ok).toBe(false);
    // The active store stays at the buildInitial single-empty-leaf state.
    expect(markdownPaths()).toEqual([]);
  });

  // Severe test: the `suppressPersistOnce` feedback-loop guard is the only
  // thing breaking an A→B→A→B infinite broadcast loop. Without it, every
  // peer `workspaceUpdated` we apply would itself trigger our debounced save
  // → broadcast back → peer applies → broadcasts again, ad infinitum.
  //
  // This test wires a real `bindPersistence` to a shared in-process hub, has
  // a separate peer channel post snapshots, and asserts the channel sees
  // exactly N originals — no echoes from the persistence side.
  it("does NOT re-broadcast when applying an inbound peer snapshot (loop guard)", async () => {
    const hub = createInProcessChannelHub();
    const VID = `loop-${Date.now()}`;
    const channelName = channelNameFor(VID);
    const unbind = bindPersistence(VID, { syncOptions: { channelFactory: hub.factory } });
    // Peer channel: simulates window B. It only POSTS; whatever it posts
    // becomes the expected message count on the bus.
    const peer = hub.factory(channelName);

    // Single peer update: persistence must hydrate AND must not echo.
    peer.postMessage({
      type: "workspaceUpdated",
      writerId: "peer-1",
      updatedMs: 1_000,
      snapshot: {
        shape: "columns",
        columns: [
          [
            {
              leaves: [{ type: "markdown", path: "Loop-1.md", mode: "source" }],
              activeIndex: 0,
            },
          ],
        ],
        activeGroupIndex: 0,
      },
    });
    await hub.flush();
    // Flush any debounce. If the suppression is broken, this fires the echo.
    flushWorkspacePersistence();
    await hub.flush();
    expect(markdownPaths()).toContain("Loop-1.md");
    expect(hub.postCount(channelName)).toBe(1);

    // 5-cycle interleave: peer posts a fresh snapshot each round. After all
    // rounds, the channel log must contain exactly 5 messages — every
    // additional message would be an unsuppressed echo. Without the guard
    // we'd see ≥ 10 (peer + persistence echo, per round).
    for (let i = 0; i < 5; i += 1) {
      peer.postMessage({
        type: "workspaceUpdated",
        writerId: `peer-${i + 2}`,
        updatedMs: 2_000 + i,
        snapshot: {
          shape: "columns",
          columns: [
            [
              {
                leaves: [{ type: "markdown", path: `Loop-cycle-${i}.md`, mode: "source" }],
                activeIndex: 0,
              },
            ],
          ],
          activeGroupIndex: 0,
        },
      });
      await hub.flush();
      flushWorkspacePersistence();
      await hub.flush();
    }

    // 1 from the first single update, 5 from the cycles — strictly 6.
    // β< 0.1: this assertion catches any echo (every echo would add ≥ 1
    // message per cycle) and any debounce-coalescing surprise.
    expect(hub.postCount(channelName)).toBe(6);
    // The final applied state should be the last cycle's snapshot, proving
    // the apply path is exercised (not silently no-op'd).
    expect(markdownPaths()).toContain("Loop-cycle-4.md");

    unbind();
    peer.close();
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
