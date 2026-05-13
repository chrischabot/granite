import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";
import { t } from "../i18n";
import { FileSystem, type FileSystemImpl } from "./FileSystem";
import { deleteVaultPath } from "./trash";
import type { VaultFile, VaultPath } from "./types";

function makeFs(): { fs: FileSystemImpl; calls: string[]; files: Set<string> } {
  const calls: string[] = [];
  const files = new Set<string>();
  const fs: FileSystemImpl = {
    rootName: "vault",
    list: () => {
      throw new Error("not used");
    },
    listAll: () => {
      throw new Error("not used");
    },
    readText: () => {
      throw new Error("not used");
    },
    readBytes: () => {
      throw new Error("not used");
    },
    writeText: () => {
      throw new Error("not used");
    },
    writeBytes: () => {
      throw new Error("not used");
    },
    mkdir: (dir) => {
      calls.push(`mkdir:${dir}`);
      return Effect.succeed(undefined);
    },
    rename: (from, to) => {
      calls.push(`rename:${from}->${to}`);
      files.delete(from);
      files.add(to);
      return Effect.succeed(undefined);
    },
    remove: (path) => {
      calls.push(`remove:${path}`);
      files.delete(path);
      return Effect.succeed(undefined);
    },
    stat: (path) => Effect.succeed(files.has(path) ? fileEntry(path) : null),
    watch: () => () => undefined,
  };
  return { fs, calls, files };
}

function fileEntry(path: VaultPath): VaultFile {
  const name = path.split("/").at(-1) ?? path;
  const dot = name.lastIndexOf(".");
  return {
    type: "file",
    path,
    name,
    size: 1,
    mtimeMs: 1,
    ctimeMs: 1,
    extension: dot === -1 ? "" : name.slice(dot + 1),
  };
}

async function runWithFs<A>(fs: FileSystemImpl, effect: Effect.Effect<A, unknown, FileSystem>) {
  const runtime = ManagedRuntime.make(Layer.succeed(FileSystem, fs));
  try {
    return await runtime.runPromise(effect);
  } finally {
    await runtime.dispose();
  }
}

describe("deleteVaultPath", () => {
  it("permanently removes paths in permanent mode", async () => {
    const { fs, calls, files } = makeFs();
    files.add("Notes/A.md");

    await runWithFs(fs, deleteVaultPath("Notes/A.md", "permanent"));

    expect(calls).toEqual(["remove:Notes/A.md"]);
    expect(files.has("Notes/A.md")).toBe(false);
  });

  it("moves paths to .trash while preserving subpaths in vault mode", async () => {
    const { fs, calls, files } = makeFs();
    files.add("Notes/A.md");

    await runWithFs(fs, deleteVaultPath("Notes/A.md", "vault"));

    expect(calls).toEqual(["mkdir:.trash/Notes", "rename:Notes/A.md->.trash/Notes/A.md"]);
    expect(files.has("Notes/A.md")).toBe(false);
    expect(files.has(".trash/Notes/A.md")).toBe(true);
  });

  it("renames vault-trash targets when a deleted file already exists there", async () => {
    const { fs, calls, files } = makeFs();
    files.add("Notes/A.md");
    files.add(".trash/Notes/A.md");

    await runWithFs(fs, deleteVaultPath("Notes/A.md", "vault"));

    expect(calls).toEqual(["mkdir:.trash/Notes", "rename:Notes/A.md->.trash/Notes/A 1.md"]);
    expect(files.has(".trash/Notes/A 1.md")).toBe(true);
  });

  it("reports a localized error when every vault-trash candidate is taken", async () => {
    const { fs, calls, files } = makeFs();
    files.add("Notes/A.md");
    files.add(".trash/Notes/A.md");
    for (let suffix = 1; suffix < 1000; suffix++) {
      files.add(`.trash/Notes/A ${suffix}.md`);
    }

    await expect(runWithFs(fs, deleteVaultPath("Notes/A.md", "vault"))).rejects.toMatchObject({
      _tag: "FsUnsupported",
      feature: t("fs.trash.error.vaultPathUnavailable", { path: "Notes/A.md" }),
    });
    expect(calls).toEqual([]);
  });

  it("does not fake system trash when the adapter lacks an OS-trash capability", async () => {
    const { fs, calls } = makeFs();

    await expect(runWithFs(fs, deleteVaultPath("Notes/A.md", "system"))).rejects.toMatchObject({
      _tag: "FsUnsupported",
      feature: t("fs.trash.error.systemUnavailable"),
    });
    expect(calls).toEqual([]);
  });

  it("uses the adapter's OS-trash capability when present", async () => {
    const { fs, calls } = makeFs();
    const withSystemTrash: FileSystemImpl = {
      ...fs,
      moveToSystemTrash: (path) => {
        calls.push(`system:${path}`);
        return Effect.succeed(undefined);
      },
    };

    await runWithFs(withSystemTrash, deleteVaultPath("Notes/A.md", "system"));

    expect(calls).toEqual(["system:Notes/A.md"]);
  });
});
