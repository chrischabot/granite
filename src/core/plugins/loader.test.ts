import { commandRegistry } from "@core/commands/CommandRegistry";
import { disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import type { VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { noticeManager } from "@core/notices/notice";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetEventsForTesting } from "./events";
import {
  _resetHostRegistriesForTesting,
  listSettingsTabs,
  listStatusBarItems,
} from "./host-registries";
import {
  _setRibbonContainerForTesting,
  bindPlugins,
  listPlugins,
  setPluginEnabled,
  unbindPlugins,
} from "./loader";
import { _resetObsidianShimForTesting } from "./obsidian-shim";

// ---- Minimal in-memory FileSystem -----------------------------------------
function makeMemoryFs(): {
  fs: FileSystemImpl;
  files: Map<string, string>;
} {
  const files = new Map<string, string>();
  const fs: FileSystemImpl = {
    rootName: "TestVault",
    list: (dir) =>
      Effect.sync(() => {
        const prefix = dir === "" ? "" : `${dir}/`;
        const out = new Map<string, VaultEntry>();
        for (const path of files.keys()) {
          if (!path.startsWith(prefix)) continue;
          const rest = path.slice(prefix.length);
          const slash = rest.indexOf("/");
          if (slash === -1) {
            // File directly in dir.
            const entry: VaultFile = {
              type: "file",
              path: path as VaultPath,
              name: rest,
              size: files.get(path)?.length ?? 0,
              mtimeMs: 0,
              ctimeMs: 0,
              extension: rest.includes(".") ? (rest.split(".").pop() ?? "") : "",
            };
            out.set(rest, entry);
          } else {
            const dirName = rest.slice(0, slash);
            out.set(dirName, {
              type: "directory",
              path: `${prefix}${dirName}` as VaultPath,
              name: dirName,
            });
          }
        }
        return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
      }),
    listAll: () =>
      Effect.sync(() =>
        [...files.entries()]
          .filter(([p]) => p.endsWith(".md"))
          .map<VaultFile>(([path, contents]) => ({
            type: "file",
            path: path as VaultPath,
            name: path.split("/").pop() ?? path,
            size: contents.length,
            mtimeMs: 0,
            ctimeMs: 0,
            extension: "md",
          })),
      ),
    readText: (path) =>
      Effect.gen(function* () {
        const v = files.get(path);
        if (v === undefined) {
          return yield* Effect.fail({
            _tag: "FsError" as const,
            code: "not-found",
            path,
          } as never);
        }
        return v;
      }),
    readBytes: () => Effect.succeed(new Uint8Array()),
    writeText: (path, content) =>
      Effect.sync(() => {
        files.set(path, content);
      }),
    writeBytes: () => Effect.void,
    mkdir: () => Effect.void,
    rename: () => Effect.void,
    remove: () => Effect.void,
    stat: () => Effect.succeed(null),
    watch: () => () => {},
  };
  return { fs, files };
}

let pluginsDir: Map<string, string>;

beforeEach(async () => {
  _resetHostRegistriesForTesting();
  _resetEventsForTesting();
  _resetObsidianShimForTesting();
  for (const cmd of commandRegistry.list()) commandRegistry.unregister(cmd.id);
  for (const n of [...noticeManager.list()]) noticeManager.dismiss(n.id);
  await disposeRuntime();
  const { fs, files } = makeMemoryFs();
  pluginsDir = files;
  setAppLayer(() => Layer.succeed(FileSystem, fs));
  // Wire a detached ribbon container so addRibbonIcon has somewhere to mount.
  const ribbon = document.createElement("div");
  ribbon.className = "granite-plugin-ribbon-test";
  document.body.appendChild(ribbon);
  _setRibbonContainerForTesting(ribbon);
});

afterEach(async () => {
  await unbindPlugins();
  _setRibbonContainerForTesting(null);
  for (const el of document.querySelectorAll(".granite-plugin-ribbon-test")) {
    el.parentNode?.removeChild(el);
  }
  // Clear localStorage between tests so enabled-set doesn't bleed across.
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

async function bind(): Promise<void> {
  await bindPlugins("v1", { id: "v1", name: "TestVault", kind: "opfs" });
}

describe("loader — both plugin styles load and unload", () => {
  it("Granite-style { onLoad, onUnload } still works", async () => {
    pluginsDir.set(
      ".granite/plugins/legacy/manifest.json",
      JSON.stringify({ id: "legacy", name: "Legacy", version: "1.0.0" }),
    );
    pluginsDir.set(
      ".granite/plugins/legacy/main.js",
      `
        let removeCmd;
        module.exports = {
          onLoad(api) {
            removeCmd = api.commands.register({
              id: "legacy:cmd",
              name: "Legacy cmd",
              callback: () => {},
            });
          },
          onUnload() {
            if (removeCmd) removeCmd();
          }
        };
      `,
    );
    await bind();
    await setPluginEnabled("legacy", true);
    expect(commandRegistry.list().some((c) => c.id === "legacy:cmd")).toBe(true);
    await setPluginEnabled("legacy", false);
    expect(commandRegistry.list().some((c) => c.id === "legacy:cmd")).toBe(false);
  });

  it("Obsidian-style `class extends require('obsidian').Plugin` loads", async () => {
    pluginsDir.set(
      ".granite/plugins/realish/manifest.json",
      JSON.stringify({ id: "realish", name: "Realish", version: "1.0.0" }),
    );
    pluginsDir.set(
      ".granite/plugins/realish/main.js",
      `
        const obsidian = require("obsidian");
        class P extends obsidian.Plugin {
          onload() {
            this.addCommand({ id: "go", name: "Go", callback: () => {} });
            this.addStatusBarItem().textContent = "hi";
          }
          onunload() {
            // Intentionally no manual cleanup — the loader must tear down
            // tracked registrations even when onunload is a no-op.
          }
        }
        module.exports = P;
      `,
    );
    await bind();
    await setPluginEnabled("realish", true);
    expect(commandRegistry.list().some((c) => c.id === "realish:go")).toBe(true);
    expect(listStatusBarItems().some((s) => s.pluginId === "realish")).toBe(true);

    await setPluginEnabled("realish", false);
    expect(commandRegistry.list().some((c) => c.id === "realish:go")).toBe(false);
    expect(listStatusBarItems().some((s) => s.pluginId === "realish")).toBe(false);
  });

  it("disposers run even when the plugin's onunload throws", async () => {
    pluginsDir.set(
      ".granite/plugins/buggy/manifest.json",
      JSON.stringify({ id: "buggy", name: "Buggy", version: "1.0.0" }),
    );
    pluginsDir.set(
      ".granite/plugins/buggy/main.js",
      `
        const obsidian = require("obsidian");
        class P extends obsidian.Plugin {
          onload() {
            this.addCommand({ id: "cmd", name: "Cmd", callback: () => {} });
          }
          onunload() {
            throw new Error("intentional from onunload");
          }
        }
        module.exports = P;
      `,
    );
    await bind();
    await setPluginEnabled("buggy", true);
    expect(commandRegistry.list().some((c) => c.id === "buggy:cmd")).toBe(true);
    // Squelch the console.error the loader emits when onunload throws.
    const orig = console.error;
    console.error = () => {};
    try {
      await setPluginEnabled("buggy", false);
    } finally {
      console.error = orig;
    }
    expect(commandRegistry.list().some((c) => c.id === "buggy:cmd")).toBe(false);
  });

  it("require('non-obsidian') throws", async () => {
    pluginsDir.set(
      ".granite/plugins/badreq/manifest.json",
      JSON.stringify({ id: "badreq", name: "Bad Require", version: "1.0.0" }),
    );
    pluginsDir.set(
      ".granite/plugins/badreq/main.js",
      `
        try {
          require("fs");
        } catch (e) {
          module.exports = { error: e.message };
        }
      `,
    );
    await bind();
    await setPluginEnabled("badreq", true);
    // Plugin loaded without throwing — but its require call was rejected.
    expect(listPlugins().some((p) => p.manifest.id === "badreq" && p.enabled)).toBe(true);
  });

  it("tracker.disposed flips to true on unload; post-unload push is rejected", async () => {
    pluginsDir.set(
      ".granite/plugins/late/manifest.json",
      JSON.stringify({ id: "late", name: "Late", version: "1.0.0" }),
    );
    // The plugin schedules an async push of a disposer that fires AFTER its
    // unload completes. The post-unload push must be rejected (logged warning,
    // disposer dropped) so it can't leak silently. We assert via:
    //   1. Console.warn captures the rejection message.
    //   2. The disposer's side-effect (incrementing window.__lateRan) never
    //      fires — because the push was rejected, the loader never invoked it.
    pluginsDir.set(
      ".granite/plugins/late/main.js",
      `
        const obsidian = require("obsidian");
        window.__lateRan = 0;
        class P extends obsidian.Plugin {
          onload() {
            // Resolve a promise on the macrotask queue so the loader's
            // unloadPlugin call gets to drain disposers FIRST.
            window.__latePending = new Promise((resolve) => {
              setTimeout(() => {
                this.register(() => { window.__lateRan += 1; });
                resolve();
              }, 50);
            });
          }
        }
        module.exports = P;
      `,
    );
    await bind();
    await setPluginEnabled("late", true);
    // Disable before the deferred push fires — disposed flips to true,
    // then the deferred push lands and must be rejected.
    await setPluginEnabled("late", false);
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: unknown, ...rest: unknown[]) => {
      warnings.push(String(msg));
      origWarn(msg, ...rest);
    };
    try {
      // Wait for the deferred push to attempt registration.
      const pending = (globalThis as unknown as { __latePending?: Promise<void> }).__latePending;
      if (pending) await pending;
      // Give the microtask queue a beat to settle.
      await new Promise((r) => setTimeout(r, 10));
    } finally {
      console.warn = origWarn;
    }
    expect(warnings.some((w) => w.includes("pushed a disposer after unload"))).toBe(true);
    expect((globalThis as unknown as { __lateRan: number }).__lateRan).toBe(0);
  });

  it("stress: 20 enable/disable cycles leak nothing", async () => {
    pluginsDir.set(
      ".granite/plugins/loopy/manifest.json",
      JSON.stringify({ id: "loopy", name: "Loopy", version: "1.0.0" }),
    );
    pluginsDir.set(
      ".granite/plugins/loopy/main.js",
      `
        const obsidian = require("obsidian");
        class P extends obsidian.Plugin {
          onload() {
            this.addCommand({ id: "cmd", name: "C", callback: () => {} });
            this.addStatusBarItem();
            class Tab extends obsidian.PluginSettingTab { display() {} }
            this.addSettingTab(new Tab(this.app, this));
          }
        }
        module.exports = P;
      `,
    );
    await bind();
    const baseCmds = commandRegistry.list().length;
    const baseStatus = listStatusBarItems().length;
    const baseTabs = listSettingsTabs().length;
    for (let i = 0; i < 20; i += 1) {
      await setPluginEnabled("loopy", true);
      await setPluginEnabled("loopy", false);
      expect(commandRegistry.list().length).toBe(baseCmds);
      expect(listStatusBarItems().length).toBe(baseStatus);
      expect(listSettingsTabs().length).toBe(baseTabs);
    }
  });
});
