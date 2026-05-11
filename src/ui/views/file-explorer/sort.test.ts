import { describe, it, expect } from "vitest";
import { compareFiles, sortNodes, type SortableTreeNode } from "./sort";
import type { VaultFile, VaultDirectory } from "@core/fs/types";

function file(name: string, opts: Partial<VaultFile> = {}): VaultFile {
  return {
    type: "file",
    path: name,
    name,
    size: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    extension: name.split(".").pop() ?? "",
    ...opts,
  };
}

function dir(name: string): VaultDirectory {
  return { type: "directory", path: name, name };
}

describe("compareFiles", () => {
  it("sorts by name ascending and descending", () => {
    expect(compareFiles(file("a.md"), file("b.md"), "name-asc")).toBeLessThan(0);
    expect(compareFiles(file("a.md"), file("b.md"), "name-desc")).toBeGreaterThan(0);
  });

  it("uses mtime newest-first then oldest-first", () => {
    const older = file("old.md", { mtimeMs: 1 });
    const newer = file("new.md", { mtimeMs: 2 });
    expect(compareFiles(newer, older, "mtime-desc")).toBeLessThan(0);
    expect(compareFiles(newer, older, "mtime-asc")).toBeGreaterThan(0);
  });

  it("uses ctime newest-first then oldest-first", () => {
    const older = file("old.md", { ctimeMs: 1 });
    const newer = file("new.md", { ctimeMs: 2 });
    expect(compareFiles(newer, older, "ctime-desc")).toBeLessThan(0);
    expect(compareFiles(newer, older, "ctime-asc")).toBeGreaterThan(0);
  });

  it("falls back to name when mtime is identical", () => {
    const a = file("a.md", { mtimeMs: 100 });
    const b = file("b.md", { mtimeMs: 100 });
    expect(compareFiles(a, b, "mtime-desc")).toBeLessThan(0);
    expect(compareFiles(a, b, "mtime-asc")).toBeLessThan(0);
  });

  it("falls back to name when ctime is identical", () => {
    const a = file("a.md", { ctimeMs: 50 });
    const b = file("b.md", { ctimeMs: 50 });
    expect(compareFiles(a, b, "ctime-desc")).toBeLessThan(0);
    expect(compareFiles(a, b, "ctime-asc")).toBeLessThan(0);
  });
});

describe("sortNodes", () => {
  const a = file("a.md", { mtimeMs: 3 });
  const b = file("b.md", { mtimeMs: 1 });
  const c = file("c.md", { mtimeMs: 2 });
  const folder1 = dir("alpha");
  const folder2 = dir("beta");

  it("puts directories first regardless of file order", () => {
    const nodes: SortableTreeNode[] = [
      { entry: a },
      { entry: folder2 },
      { entry: b },
      { entry: folder1 },
    ];
    const sorted = sortNodes(nodes, "name-asc");
    expect(sorted.map((n) => n.entry.name)).toEqual([
      "alpha",
      "beta",
      "a.md",
      "b.md",
    ]);
  });

  it("sorts directories alphabetically in any mode", () => {
    const nodes: SortableTreeNode[] = [
      { entry: folder2 },
      { entry: folder1 },
    ];
    const sorted = sortNodes(nodes, "mtime-desc");
    expect(sorted.map((n) => n.entry.name)).toEqual(["alpha", "beta"]);
  });

  it("sorts files by mtime descending when requested", () => {
    const nodes: SortableTreeNode[] = [{ entry: a }, { entry: b }, { entry: c }];
    const sorted = sortNodes(nodes, "mtime-desc");
    expect(sorted.map((n) => n.entry.name)).toEqual(["a.md", "c.md", "b.md"]);
  });

  it("recurses into directory children", () => {
    const nodes: SortableTreeNode[] = [
      {
        entry: folder1,
        children: [{ entry: b }, { entry: a }],
      },
    ];
    const sorted = sortNodes(nodes, "name-asc");
    expect(sorted[0]!.children?.map((c) => c.entry.name)).toEqual(["a.md", "b.md"]);
  });

  it("preserves nodes that have no children", () => {
    const nodes: SortableTreeNode[] = [{ entry: folder1 }];
    const sorted = sortNodes(nodes, "name-asc");
    expect(sorted[0]).toEqual({ entry: folder1 });
  });
});