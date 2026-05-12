import type { VaultEntry, VaultPath } from "@core/fs/types";
import { describe, expect, it } from "vitest";
import {
  type ExternalFileLike,
  filePathToFileUrl,
  importExternalFileToVault,
  markdownFileUrlLink,
  sanitizeDroppedFileName,
  shouldDropExternalFileAsLink,
  uniqueImportedPath,
} from "./external-files";

function fileLike(name: string, path = ""): ExternalFileLike {
  return {
    name,
    path,
    async arrayBuffer() {
      return new Uint8Array([1, 2, 3]).buffer;
    },
  };
}

describe("external file drag/drop helpers", () => {
  it("uses Ctrl for file URL drops on Windows/Linux and Option on macOS", () => {
    expect(shouldDropExternalFileAsLink({ ctrlKey: true, altKey: false }, "Win32")).toBe(true);
    expect(shouldDropExternalFileAsLink({ ctrlKey: false, altKey: true }, "Win32")).toBe(false);
    expect(shouldDropExternalFileAsLink({ ctrlKey: false, altKey: true }, "MacIntel")).toBe(true);
    expect(shouldDropExternalFileAsLink({ ctrlKey: true, altKey: false }, "MacIntel")).toBe(false);
  });

  it("formats absolute host paths as encoded file URLs", () => {
    expect(filePathToFileUrl("/Users/me/My File.pdf")).toBe("file:///Users/me/My%20File.pdf");
    expect(filePathToFileUrl("C:\\Users\\me\\My File.pdf")).toBe(
      "file:///C:/Users/me/My%20File.pdf",
    );
    expect(filePathToFileUrl("//server/share/My File.pdf")).toBe(
      "file://server/share/My%20File.pdf",
    );
  });

  it("builds a markdown link only when the host exposes an external path", () => {
    expect(markdownFileUrlLink(fileLike("My File.pdf", "/tmp/My File.pdf"))).toBe(
      "[My File.pdf](file:///tmp/My%20File.pdf)",
    );
    expect(markdownFileUrlLink(fileLike("My File.pdf"))).toBeNull();
  });

  it("sanitizes dropped file names before importing", () => {
    expect(sanitizeDroppedFileName("bad:name?.md")).toBe("bad_name_.md");
    expect(sanitizeDroppedFileName("   ")).toBe("dropped-file");
  });

  it("chooses a collision-free imported path in the target folder", async () => {
    const taken = new Set(["Inbox/clip.md", "Inbox/clip-1.md"]);
    const path = await uniqueImportedPath("clip.md", "Inbox" as VaultPath, async (candidate) =>
      taken.has(candidate),
    );
    expect(path).toBe("Inbox/clip-2.md");
  });

  it("copies dropped file bytes to the selected vault folder", async () => {
    const writes: Array<{ path: VaultPath; bytes: number[] }> = [];
    const dirs: VaultPath[] = [];
    const imported = await importExternalFileToVault(fileLike("clip.md"), "Inbox" as VaultPath, {
      async mkdir(path) {
        dirs.push(path);
      },
      async stat(): Promise<VaultEntry | null> {
        return null;
      },
      async writeBytes(path, bytes) {
        writes.push({ path, bytes: [...bytes] });
      },
    });

    expect(imported).toBe("Inbox/clip.md");
    expect(dirs).toEqual(["Inbox"]);
    expect(writes).toEqual([{ path: "Inbox/clip.md", bytes: [1, 2, 3] }]);
  });
});
