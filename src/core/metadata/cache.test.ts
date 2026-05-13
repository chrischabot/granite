import { disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import type { VaultFile, VaultPath } from "@core/fs/types";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { aggregateTagCounts, metadataCache } from "./cache";

beforeEach(async () => {
  metadataCache.reset();
  await disposeRuntime();
});

afterEach(async () => {
  metadataCache.reset();
  await disposeRuntime();
});

describe("aggregateTagCounts", () => {
  it("counts tags case-insensitively while preserving first display casing", () => {
    const counts = aggregateTagCounts([
      [{ name: "Work" }, { name: "work" }, { name: "Home" }],
      [{ name: "work" }, { name: "HOME" }],
    ]);

    expect(counts).toEqual([
      { name: "Home", count: 2 },
      { name: "Work", count: 2 },
    ]);
  });

  it("counts a tag once per file even when repeated", () => {
    expect(aggregateTagCounts([[{ name: "Project" }, { name: "project" }]])).toEqual([
      { name: "Project", count: 1 },
    ]);
  });
});

describe("metadataCache.indexVault", () => {
  it("indexes listed files without re-statting every path during cold start", async () => {
    let statCalls = 0;
    let readCalls = 0;
    const files: VaultFile[] = Array.from({ length: 1_000 }, (_, i) => ({
      type: "file",
      path: `Note ${i}.md` as VaultPath,
      name: `Note ${i}.md`,
      size: 32,
      mtimeMs: i,
      ctimeMs: i,
      extension: "md",
    }));
    const fs: FileSystemImpl = {
      rootName: "vault",
      list: () => Effect.succeed([]),
      listAll: () => Effect.succeed(files),
      readText: (path) =>
        Effect.sync(() => {
          readCalls += 1;
          return `---\naliases: [Alias ${path}]\n---\n# ${path}\n#tag`;
        }),
      readBytes: () => Effect.succeed(new Uint8Array()),
      writeText: () => Effect.void,
      writeBytes: () => Effect.void,
      mkdir: () => Effect.void,
      rename: () => Effect.void,
      remove: () => Effect.void,
      stat: () =>
        Effect.sync(() => {
          statCalls += 1;
          return null;
        }),
      watch: () => () => {},
    };
    setAppLayer(() => Layer.succeed(FileSystem, fs));

    await metadataCache.indexVault();

    expect(statCalls).toBe(0);
    expect(readCalls).toBe(files.length);
    expect(metadataCache.getAllSwitcherEntries()).toHaveLength(files.length * 2);
  });
});
