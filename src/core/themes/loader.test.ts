import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { FsError, VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activeThemePath, bindThemes, listThemes, setActiveTheme, unbindThemes } from "./loader";

type ThemeWatcher = Parameters<FileSystemImpl["watch"]>[0];

function makeThemeFs(
  files: Map<VaultPath, string>,
  writes: VaultPath[],
  watchers: ThemeWatcher[],
): FileSystemImpl {
  return {
    rootName: "theme-vault",
    list: () => Effect.succeed([] as ReadonlyArray<VaultEntry>),
    listAll: (opts) => {
      const extensions = new Set(opts?.extensions ?? []);
      return Effect.succeed(
        [...files.entries()]
          .filter(([path]) => extensions.size === 0 || extensions.has(extension(path)))
          .map<VaultFile>(([path, text]) => ({
            type: "file",
            path,
            name: path.split("/").pop() ?? path,
            size: text.length,
            mtimeMs: 0,
            ctimeMs: 0,
            extension: extension(path),
          })),
      );
    },
    readText: (path) => {
      const text = files.get(path);
      if (text === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      }
      return Effect.succeed(text);
    },
    readBytes: (path) => {
      const text = files.get(path);
      if (text === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      }
      return Effect.succeed(new TextEncoder().encode(text));
    },
    writeText: (path, content) => {
      writes.push(path);
      files.set(path, content);
      return Effect.succeed(undefined);
    },
    writeBytes: (path, bytes) => {
      writes.push(path);
      files.set(path, new TextDecoder().decode(bytes));
      return Effect.succeed(undefined);
    },
    mkdir: () => Effect.succeed(undefined),
    rename: (from, to) => {
      const text = files.get(from);
      if (text === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path: from } as unknown as FsError);
      }
      writes.push(from, to);
      files.delete(from);
      files.set(to, text);
      return Effect.succeed(undefined);
    },
    remove: (path) => {
      writes.push(path);
      files.delete(path);
      return Effect.succeed(undefined);
    },
    stat: (path) => {
      const text = files.get(path);
      if (text === undefined) return Effect.succeed(null);
      return Effect.succeed<VaultFile>({
        type: "file",
        path,
        name: path.split("/").pop() ?? path,
        size: text.length,
        mtimeMs: 0,
        ctimeMs: 0,
        extension: extension(path),
      });
    },
    watch: (listener) => {
      watchers.push(listener);
      return () => {
        const index = watchers.indexOf(listener);
        if (index >= 0) watchers.splice(index, 1);
      };
    },
  };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const started = performance.now();
  while (!predicate()) {
    if (performance.now() - started > 500) throw new Error("Timed out waiting for theme loader");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("theme loader", () => {
  let files: Map<VaultPath, string>;
  let writes: VaultPath[];
  let watchers: ThemeWatcher[];

  beforeEach(async () => {
    await disposeRuntime();
    unbindThemes();
    localStorage.clear();
    document.head.innerHTML = "";
    files = new Map([
      [
        ".obsidian/themes/Minimal/theme.css",
        ".theme-light { --background-primary: #ffffff; }\n.theme-dark { --background-primary: #000000; }\n",
      ],
      [".obsidian/themes/Minimal/manifest.json", '{"name":"Minimal"}'],
      [".granite/themes/Workbench.css", ".theme-light { --text-normal: #111111; }\n"],
      [".granite/snippets/not-a-theme.css", "body { color: red; }\n"],
    ]);
    writes = [];
    watchers = [];
    setAppLayer(
      () =>
        Layer.succeed(FileSystem, makeThemeFs(files, writes, watchers)) as Layer.Layer<AppServices>,
    );
  });

  afterEach(async () => {
    unbindThemes();
    localStorage.clear();
    document.head.innerHTML = "";
    await disposeRuntime();
  });

  it("discovers Granite and Obsidian community theme layouts", async () => {
    bindThemes("vault-1");
    await waitFor(() => listThemes().length === 2);

    expect(listThemes()).toEqual([
      { path: ".obsidian/themes/Minimal/theme.css", name: "Minimal" },
      { path: ".granite/themes/Workbench.css", name: "Workbench" },
    ]);
  });

  it("mounts an Obsidian-layout community theme without rewriting the theme file", async () => {
    bindThemes("vault-1");
    await waitFor(() => listThemes().length === 2);

    await setActiveTheme(".obsidian/themes/Minimal/theme.css");

    expect(activeThemePath()).toBe(".obsidian/themes/Minimal/theme.css");
    const style = document.head.querySelector<HTMLStyleElement>(
      'style[data-granite-theme=".obsidian/themes/Minimal/theme.css"]',
    );
    expect(style?.textContent).toContain("--background-primary");
    expect(writes).toEqual([".granite/active-theme.json"]);
    expect(files.get(".obsidian/themes/Minimal/theme.css")).toContain(".theme-light");
  });

  it("keeps the active community theme live when its CSS changes on disk", async () => {
    document.body.classList.add("theme-light");
    bindThemes("vault-1");
    await waitFor(() => listThemes().length === 2);

    await setActiveTheme(".obsidian/themes/Minimal/theme.css");
    await waitFor(
      () =>
        getComputedStyle(document.body).getPropertyValue("--background-primary").trim() ===
        "#ffffff",
    );

    files.set(
      ".obsidian/themes/Minimal/theme.css",
      ".theme-light { --background-primary: #123456; }\n.theme-dark { --background-primary: #654321; }\n",
    );
    watchers[0]?.({ type: "modify", path: ".obsidian/themes/Minimal/theme.css" });

    await waitFor(() => {
      const style = document.head.querySelector<HTMLStyleElement>(
        'style[data-granite-theme=".obsidian/themes/Minimal/theme.css"]',
      );
      return style?.textContent?.includes("#123456") ?? false;
    });
    expect(getComputedStyle(document.body).getPropertyValue("--background-primary").trim()).toBe(
      "#123456",
    );
  });
});
