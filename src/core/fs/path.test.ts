import { describe, expect, it } from "vitest";
import { basename, dirname, extension, isInvalidName, join, normalize, stem } from "./path";

describe("path utilities", () => {
  it("basename: returns last segment", () => {
    expect(basename("a/b/c.md")).toBe("c.md");
    expect(basename("c.md")).toBe("c.md");
    expect(basename("")).toBe("");
  });

  it("stem: drops the dotted extension", () => {
    expect(stem("a/b/c.md")).toBe("c");
    expect(stem("c.md")).toBe("c");
    expect(stem(".gitignore")).toBe(".gitignore"); // hidden file: keep as-is
    expect(stem("c")).toBe("c");
  });

  it("extension: lowercased, no leading dot", () => {
    expect(extension("c.MD")).toBe("md");
    expect(extension("c")).toBe("");
    expect(extension("a/b.tar.gz")).toBe("gz");
  });

  it("dirname: parent path", () => {
    expect(dirname("a/b/c.md")).toBe("a/b");
    expect(dirname("c.md")).toBe("");
  });

  it("join: drops empties + trims", () => {
    expect(join("a", "", "b", "c.md")).toBe("a/b/c.md");
    expect(join("a/", "/b/", "c")).toBe("a/b/c");
    expect(join(".", "a")).toBe("a");
  });

  it("normalize: collapses ..", () => {
    expect(normalize("a/b/../c")).toBe("a/c");
    expect(normalize("../a")).toBe("a"); // refuses to escape vault root
    expect(normalize("a//b/./c")).toBe("a/b/c");
  });

  it("isInvalidName: detects illegal chars and reserved", () => {
    expect(isInvalidName("")).toBe(true);
    expect(isInvalidName(".")).toBe(true);
    expect(isInvalidName("..")).toBe(true);
    expect(isInvalidName("name<")).toBe(true);
    expect(isInvalidName("name|")).toBe(true);
    expect(isInvalidName("normal.md")).toBe(false);
  });
});
