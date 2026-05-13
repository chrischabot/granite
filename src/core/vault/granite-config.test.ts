import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { FsError, VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { Effect, Layer } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { readConfigJson, removeConfigJson, writeConfigJson } from "./granite-config";

function makeInMemoryFs(): FileSystemImpl {
  const files = new Map<VaultPath, string>();
  const dirs = new Set<VaultPath>();

  return {
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

beforeEach(async () => {
  await disposeRuntime();
  const impl = makeInMemoryFs();
  setAppLayer(() => Layer.succeed(FileSystem, impl) as Layer.Layer<AppServices, never, never>);
});

describe("granite-config", () => {
  it("returns null when no file exists", async () => {
    expect(await readConfigJson("workspace")).toBeNull();
  });

  it("round-trips an object via writeConfigJson + readConfigJson", async () => {
    await writeConfigJson("workspace", { hello: "world", n: 42 });
    const read = await readConfigJson<{ hello: string; n: number }>("workspace");
    expect(read).toEqual({ hello: "world", n: 42 });
  });

  it("removeConfigJson swallows missing files", async () => {
    await expect(removeConfigJson("nonexistent")).resolves.toBeUndefined();
  });

  it("removeConfigJson deletes existing files", async () => {
    await writeConfigJson("bookmarks", [{ id: 1 }]);
    expect(await readConfigJson("bookmarks")).toEqual([{ id: 1 }]);
    await removeConfigJson("bookmarks");
    expect(await readConfigJson("bookmarks")).toBeNull();
  });
});
