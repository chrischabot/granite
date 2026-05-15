import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { FsError, VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { Effect, Layer } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, bindSettings, resetSettingsForTests, settingsStore } from "./store";

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

describe("settingsStore disk persistence", () => {
  let files: Map<VaultPath, string>;

  beforeEach(async () => {
    await disposeRuntime();
    localStorage.clear();
    resetSettingsForTests();
    files = new Map();
    const fs = makeFs(files);
    setAppLayer(() => Layer.succeed(FileSystem, fs) as Layer.Layer<AppServices, never, never>);
  });

  it("writes default settings to .granite on bind", async () => {
    await bindSettings();

    expect(JSON.parse(files.get(".granite/settings.json") ?? "null")).toEqual(DEFAULT_SETTINGS);
  });

  it("prefers disk settings over legacy localStorage", async () => {
    localStorage.setItem(
      "granite.settings.v1",
      JSON.stringify({ ...DEFAULT_SETTINGS, fontSize: 21 }),
    );
    files.set(".granite/settings.json", JSON.stringify({ ...DEFAULT_SETTINGS, fontSize: 18 }));

    await bindSettings();

    expect(settingsStore.getState().fontSize).toBe(18);
    expect(JSON.parse(localStorage.getItem("granite.settings.v1") ?? "{}").fontSize).toBe(18);
  });

  it("migrates legacy localStorage settings to .granite", async () => {
    localStorage.setItem(
      "granite.settings.v1",
      JSON.stringify({ ...DEFAULT_SETTINGS, fontSize: 20 }),
    );

    await bindSettings();

    expect(settingsStore.getState().fontSize).toBe(20);
    expect(JSON.parse(files.get(".granite/settings.json") ?? "{}").fontSize).toBe(20);
  });

  it("writes updates to .granite after bind", async () => {
    await bindSettings();

    settingsStore.update({ readableLineWidth: false });
    await Promise.resolve();

    expect(JSON.parse(files.get(".granite/settings.json") ?? "{}").readableLineWidth).toBe(false);
  });

  // Restricted-mode default (spec §24.17): new vaults must boot with the flag
  // ON; existing vaults whose settings.json predates the field must also see
  // it as ON. Both branches funnel through `normalizeSettings`, which spreads
  // DEFAULT_SETTINGS first — so the default value is the load-bearing fact.
  it("defaults pluginRestrictedMode to true in DEFAULT_SETTINGS (new vaults)", () => {
    expect(DEFAULT_SETTINGS.pluginRestrictedMode).toBe(true);
  });

  it("defaults pluginRestrictedMode to true on bind when no settings.json exists", async () => {
    await bindSettings();
    expect(settingsStore.getState().pluginRestrictedMode).toBe(true);
    expect(JSON.parse(files.get(".granite/settings.json") ?? "{}").pluginRestrictedMode).toBe(true);
  });

  it("defaults pluginRestrictedMode to true when an existing settings.json lacks the key", async () => {
    // Simulate an upgrade from a pre-restricted-mode build: every other key
    // is present, but `pluginRestrictedMode` is missing. We build the legacy
    // object by destructuring the field out, which avoids the `delete`
    // operator and stays compatible with biome's noDelete rule.
    const { pluginRestrictedMode: _omitted, ...legacyOnDisk } = DEFAULT_SETTINGS;
    void _omitted;
    files.set(".granite/settings.json", JSON.stringify(legacyOnDisk));

    await bindSettings();
    expect(settingsStore.getState().pluginRestrictedMode).toBe(true);
  });
});
