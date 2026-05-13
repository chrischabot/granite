import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { FsError, VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { resetSettingsForTests } from "@core/settings/store";
import { Effect, Layer } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { MarkdownView } from "./MarkdownView";

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

describe("MarkdownView modes", () => {
  beforeEach(async () => {
    await disposeRuntime();
    resetSettingsForTests();
    const fs = makeFs(new Map([["Note.md" as VaultPath, "Body **bold**"]]));
    setAppLayer(() => Layer.succeed(FileSystem, fs) as Layer.Layer<AppServices, never, never>);
  });

  it("uses the leaf livePreview prop instead of the global settings default", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    try {
      await act(async () => {
        root.render(
          <MarkdownView leafId="leaf" path={"Note.md" as VaultPath} livePreview={false} />,
        );
      });

      expect(host.querySelector(".cm-host")?.classList.contains("is-live-preview")).toBe(false);

      await act(async () => {
        root.render(<MarkdownView leafId="leaf" path={"Note.md" as VaultPath} livePreview />);
      });

      expect(host.querySelector(".cm-host")?.classList.contains("is-live-preview")).toBe(true);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});
