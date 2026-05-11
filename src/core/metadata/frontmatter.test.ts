import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  removeFrontmatterValue,
  renameFrontmatterKey,
  updateFrontmatterValue,
  splitFrontmatter,
} from "./frontmatter";

describe("splitFrontmatter", () => {
  it("returns null when no frontmatter is present", () => {
    expect(splitFrontmatter("body only").yamlText).toBeNull();
  });

  it("captures the YAML between the fence markers", () => {
    const text = "---\ntitle: Hello\n---\nbody";
    const { yamlText, body } = splitFrontmatter(text);
    expect(yamlText).toBe("title: Hello");
    expect(body).toBe("body");
  });
});

describe("parseFrontmatter", () => {
  it("returns an empty object on missing frontmatter", () => {
    expect(parseFrontmatter("body")).toEqual({});
  });

  it("parses standard YAML maps", () => {
    expect(parseFrontmatter("---\nfoo: 1\nbar: hi\n---\nbody")).toEqual({
      foo: 1,
      bar: "hi",
    });
  });
});

describe("updateFrontmatterValue", () => {
  it("updates an existing key", () => {
    const next = updateFrontmatterValue("---\ntitle: Old\n---\nbody", "title", "New");
    expect(next).toContain("title: New");
    expect(next).toContain("body");
  });

  it("adds a key when frontmatter exists", () => {
    const next = updateFrontmatterValue("---\nfoo: 1\n---\nb", "bar", "x");
    expect(next).toMatch(/foo:\s*1/);
    expect(next).toMatch(/bar:\s*x/);
  });

  it("creates a frontmatter block when missing", () => {
    const next = updateFrontmatterValue("just body", "title", "Hi");
    expect(next.startsWith("---\n")).toBe(true);
    expect(next).toContain("title: Hi");
    expect(next).toContain("just body");
  });
});

describe("removeFrontmatterValue", () => {
  it("removes a single key", () => {
    const next = removeFrontmatterValue("---\nfoo: 1\nbar: 2\n---\nb", "foo");
    expect(next).not.toContain("foo:");
    expect(next).toContain("bar: 2");
  });

  it("drops the frontmatter entirely when last key is removed", () => {
    const next = removeFrontmatterValue("---\nfoo: 1\n---\nbody", "foo");
    expect(next).toBe("body");
  });
});

describe("renameFrontmatterKey", () => {
  it("renames in place and preserves the value", () => {
    const next = renameFrontmatterKey("---\nfoo: hi\n---\nb", "foo", "bar");
    expect(next).toContain("bar: hi");
    expect(next).not.toContain("foo:");
  });

  it("is a no-op when the key is missing", () => {
    const orig = "---\nfoo: 1\n---\nb";
    expect(renameFrontmatterKey(orig, "missing", "x")).toBe(orig);
  });

  it("is a no-op when old===new", () => {
    const orig = "---\nfoo: 1\n---\nb";
    expect(renameFrontmatterKey(orig, "foo", "foo")).toBe(orig);
  });
});