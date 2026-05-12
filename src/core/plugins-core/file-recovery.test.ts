import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { FsError, VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { Effect, Layer } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRecoverySnapshots,
  listRecoverySnapshots,
  restoreRecoverySnapshot,
  saveRecoverySnapshotForTests,
} from "./file-recovery";

const idb = vi.hoisted(() => {
  type Range =
    | { readonly type: "only"; readonly value: string }
    | { readonly type: "upperBound"; readonly value: number };
  type Record = { readonly key: number; readonly value: unknown };
  let nextKey = 1;
  const records = new Map<number, unknown>();

  const matching = (indexName: string, range: Range): Record[] => {
    const all = [...records.entries()].map(([key, value]) => ({ key, value }));
    if (indexName === "by-path" && range.type === "only") {
      return all.filter((record) => {
        const value = record.value as { readonly path?: string };
        return value.path === range.value;
      });
    }
    if (indexName === "by-mtime" && range.type === "upperBound") {
      return all.filter((record) => {
        const value = record.value as { readonly mtimeMs?: number };
        return typeof value.mtimeMs === "number" && value.mtimeMs < range.value;
      });
    }
    return [];
  };

  const makeCursor = (items: Record[], position: number): unknown => {
    const item = items[position];
    if (!item) return null;
    return {
      primaryKey: item.key,
      value: item.value,
      delete: async () => {
        records.delete(item.key);
      },
      continue: async () => makeCursor(items, position + 1),
    };
  };

  return {
    clear: () => {
      nextKey = 1;
      records.clear();
    },
    openDB: vi.fn(async () => ({
      put: async (_store: string, value: unknown) => {
        records.set(nextKey++, value);
      },
      clear: async () => {
        records.clear();
      },
      transaction: () => ({
        done: Promise.resolve(),
        store: {
          index: (indexName: string) => ({
            openCursor: async (range: Range) => makeCursor(matching(indexName, range), 0),
          }),
        },
      }),
    })),
  };
});

vi.mock("idb", () => ({ openDB: idb.openDB }));

Object.defineProperty(globalThis, "IDBKeyRange", {
  value: {
    only: (value: string) => ({ type: "only", value }),
    upperBound: (value: number) => ({ type: "upperBound", value }),
  },
  configurable: true,
});

function makeFs(files: Map<VaultPath, string>): FileSystemImpl {
  return {
    rootName: "test-vault",
    list: () => Effect.succeed([] as ReadonlyArray<VaultEntry>),
    listAll: () =>
      Effect.succeed(
        [...files.entries()].map<VaultFile>(([path, content]) => ({
          type: "file",
          path,
          name: path.split("/").pop() ?? path,
          size: content.length,
          mtimeMs: 0,
          ctimeMs: 0,
          extension: extension(path),
        })),
      ),
    readText: (path) => {
      const content = files.get(path);
      if (content === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      }
      return Effect.succeed(content);
    },
    readBytes: (path) => {
      const content = files.get(path);
      if (content === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      }
      return Effect.succeed(new TextEncoder().encode(content));
    },
    writeText: (path, content) => {
      files.set(path, content);
      return Effect.succeed(undefined);
    },
    writeBytes: (path, bytes) => {
      files.set(path, new TextDecoder().decode(bytes));
      return Effect.succeed(undefined);
    },
    mkdir: () => Effect.succeed(undefined),
    rename: (from, to) => {
      const content = files.get(from);
      if (content === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path: from } as unknown as FsError);
      }
      files.delete(from);
      files.set(to, content);
      return Effect.succeed(undefined);
    },
    remove: (path) => {
      files.delete(path);
      return Effect.succeed(undefined);
    },
    stat: (path) => {
      const content = files.get(path);
      if (content === undefined) return Effect.succeed(null);
      return Effect.succeed<VaultFile>({
        type: "file",
        path,
        name: path,
        size: content.length,
        mtimeMs: 0,
        ctimeMs: 0,
        extension: extension(path),
      });
    },
    watch: () => () => {
      /* no-op */
    },
  };
}

describe("file recovery snapshots", () => {
  let files: Map<VaultPath, string>;

  beforeEach(async () => {
    await disposeRuntime();
    idb.clear();
    await clearRecoverySnapshots();
    files = new Map<VaultPath, string>([["note.md", "current text"]]);
    const fs = makeFs(files);
    setAppLayer(() => Layer.succeed(FileSystem, fs) as Layer.Layer<AppServices, never, never>);
  });

  it("lists snapshots for one file newest first", async () => {
    await saveRecoverySnapshotForTests({
      path: "note.md",
      mtimeMs: 100,
      content: "older",
    });
    await saveRecoverySnapshotForTests({
      path: "other.md",
      mtimeMs: 300,
      content: "other",
    });
    await saveRecoverySnapshotForTests({
      path: "note.md",
      mtimeMs: 200,
      content: "newer",
    });

    const snapshots = await listRecoverySnapshots("note.md");

    expect(snapshots.map((s) => s.content)).toEqual(["newer", "older"]);
  });

  it("restores the selected snapshot through the vault filesystem", async () => {
    await saveRecoverySnapshotForTests({
      path: "note.md",
      mtimeMs: 100,
      content: "restored text",
    });
    const [snapshot] = await listRecoverySnapshots("note.md");
    expect(snapshot).toBeDefined();
    if (!snapshot) throw new Error("Expected recovery snapshot");

    await restoreRecoverySnapshot(snapshot);

    expect(files.get("note.md")).toBe("restored text");
  });

  it("clears all snapshots", async () => {
    await saveRecoverySnapshotForTests({
      path: "note.md",
      mtimeMs: 100,
      content: "one",
    });
    await saveRecoverySnapshotForTests({
      path: "other.md",
      mtimeMs: 200,
      content: "two",
    });

    await clearRecoverySnapshots();

    expect(await listRecoverySnapshots("note.md")).toEqual([]);
    expect(await listRecoverySnapshots("other.md")).toEqual([]);
  });
});
