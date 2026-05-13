import { commandRegistry } from "@core/commands/CommandRegistry";
import { disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import type { VaultFile, VaultPath } from "@core/fs/types";
import { metadataCache } from "@core/metadata/cache";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectDebugInfo, formatDebugInfo, registerDebugInfoPlugin } from "./debug-info";

const files: VaultFile[] = [
  {
    type: "file",
    path: "Alpha.md" as VaultPath,
    name: "Alpha.md",
    size: 1024,
    mtimeMs: 1,
    ctimeMs: 1,
    extension: "md",
  },
  {
    type: "file",
    path: "image.png" as VaultPath,
    name: "image.png",
    size: 2048,
    mtimeMs: 2,
    ctimeMs: 2,
    extension: "png",
  },
];

function installFs() {
  const fs: FileSystemImpl = {
    rootName: "Debug Vault",
    list: () => Effect.succeed([]),
    listAll: () => Effect.succeed(files),
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
}

beforeEach(async () => {
  metadataCache.reset();
  workspaceStore.reset();
  for (const n of [...noticeManager.list()]) noticeManager.dismiss(n.id);
  await disposeRuntime();
  installFs();
});

afterEach(async () => {
  for (const n of [...noticeManager.list()]) noticeManager.dismiss(n.id);
  metadataCache.reset();
  workspaceStore.reset();
  await disposeRuntime();
  vi.restoreAllMocks();
});

describe("debug info core plugin", () => {
  it("collects vault, workspace, command, and plugin diagnostics", async () => {
    workspaceStore.openFile("Alpha.md" as VaultPath);
    const dispose = registerDebugInfoPlugin();

    const info = await collectDebugInfo();

    expect(info).toMatchObject({
      version: "0.1.0-dev",
      vaultRoot: "Debug Vault",
      totalFiles: 2,
      markdownFiles: 1,
      totalBytes: 3072,
      workspaceGroups: 1,
      workspaceLeaves: 1,
    });
    expect(info.commands).toBeGreaterThanOrEqual(1);
    expect(info.plugins).toEqual([]);

    dispose();
  });

  it("formats a stable support dump with localized labels", () => {
    const formatted = formatDebugInfo({
      version: "0.1.0-dev",
      platform: "MacIntel",
      userAgent: "Vitest",
      vaultRoot: "Debug Vault",
      totalFiles: 2,
      markdownFiles: 1,
      totalBytes: 3072,
      workspaceGroups: 1,
      workspaceLeaves: 2,
      commands: 3,
      plugins: [{ id: "sample", name: "Sample Plugin", version: "1.2.3", enabled: true }],
      tagCount: 4,
      propertyCount: 5,
    });

    expect(formatted).toContain("Granite debug info");
    expect(formatted).toContain("Version: 0.1.0-dev");
    expect(formatted).toContain("Vault root: Debug Vault");
    expect(formatted).toContain("Vault size: 3.0 KB");
    expect(formatted).toContain("Workspace: 1 groups, 2 leaves");
    expect(formatted).toContain("[x] sample (Sample Plugin) 1.2.3");
  });

  it("registers granite:show-debug-info and shows a sticky diagnostic notice", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const dispose = registerDebugInfoPlugin();

    await commandRegistry.run("granite:show-debug-info");

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]?.[0]).toContain("Granite debug info");
    const notice = noticeManager.list()[0];
    expect(notice?.message).toContain("Granite debug info");
    expect(notice?.timeoutMs).toBe(0);

    dispose();
  });
});
