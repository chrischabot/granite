import { disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "./FileSystem";
import type { VaultFile, VaultPath } from "./types";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findOrphanAtomicWriteTemps, scanOrphanAtomicWriteTemps } from "./orphan-temp";

function file(path: string): VaultFile {
  return {
    type: "file",
    path: path as VaultPath,
    name: path.split("/").at(-1) ?? path,
    size: 1,
    mtimeMs: 1,
    ctimeMs: 1,
    extension: path.split(".").at(-1) ?? "",
  };
}

beforeEach(async () => {
  await disposeRuntime();
});

afterEach(async () => {
  await disposeRuntime();
});

describe("orphan atomic write temp scan", () => {
  it("finds Granite and legacy tmp-write leftovers in stable order", () => {
    expect(
      findOrphanAtomicWriteTemps([
        file("Notes/B.md.granite-tmp~"),
        file("Notes/A.md"),
        file("Notes/A.md.tmp~"),
        file("Notes/tmp-not-a-match.md"),
      ]),
    ).toEqual(["Notes/A.md.tmp~", "Notes/B.md.granite-tmp~"]);
  });

  it("scans the active FileSystem service", async () => {
    const fs: FileSystemImpl = {
      rootName: "vault",
      list: () => Effect.succeed([]),
      listAll: () =>
        Effect.succeed([
          file("Inbox.md"),
          file("Inbox.md.granite-tmp~"),
          file("Draft.md.tmp~"),
        ]),
      readText: () => Effect.succeed(""),
      readBytes: () => Effect.succeed(new Uint8Array()),
      writeText: () => Effect.void,
      writeBytes: () => Effect.void,
      mkdir: () => Effect.void,
      rename: () => Effect.void,
      remove: () => Effect.void,
      stat: () => Effect.succeed(null),
      watch: () => () => {},
    };
    setAppLayer(() => Layer.succeed(FileSystem, fs));

    await expect(scanOrphanAtomicWriteTemps()).resolves.toEqual([
      "Draft.md.tmp~",
      "Inbox.md.granite-tmp~",
    ]);
  });
});
