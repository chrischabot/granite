import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { FsError, VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { Effect, Layer } from "effect";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReadingView } from "./ReadingView";

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
        name: path.split("/").pop() ?? path,
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

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("ReadingView canvas embeds", () => {
  let host: HTMLDivElement;
  let root: Root;
  let files: Map<VaultPath, string>;

  beforeEach(async () => {
    await disposeRuntime();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    files = new Map<VaultPath, string>([
      ["Host.md", "# Host\n\n![[board.canvas]]"],
      [
        "board.canvas",
        JSON.stringify({
          nodes: [{ id: "a", type: "text", x: 0, y: 0, width: 200, height: 80, text: "A" }],
          edges: [],
        }),
      ],
    ]);
    const fs = makeFs(files);
    setAppLayer(() => Layer.succeed(FileSystem, fs) as Layer.Layer<AppServices, never, never>);
  });

  afterEach(async () => {
    await settle();
    await act(async () => root.unmount());
    await settle();
    host.remove();
    await disposeRuntime();
  });

  it("mounts an interactive CanvasView for .canvas embeds", async () => {
    await act(async () => root.render(<ReadingView path="Host.md" />));
    await settle();
    await settle();

    const embed = host.querySelector<HTMLElement>(".canvas-embed.is-interactive");
    expect(embed?.getAttribute("data-href")).toBe("board.canvas");
    expect(embed?.querySelector(".canvas-view")).toBeTruthy();
    expect(embed?.textContent).toContain("board · 1 node · 0 edges");
    expect(host.querySelector(".base-embed")).toBeNull();
  });

  it("applies per-note RTL direction from frontmatter", async () => {
    files.set("Host.md", "---\ndir: rtl\n---\n# שלום");

    await act(async () => root.render(<ReadingView path="Host.md" />));
    await settle();
    await settle();

    const rendered = host.querySelector<HTMLElement>(".markdown-rendered");
    expect(rendered?.classList.contains("rtl")).toBe(true);
    expect(rendered?.dir).toBe("rtl");
  });
});
