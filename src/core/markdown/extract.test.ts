import { describe, it, expect } from "vitest";
import { extractBlock, extractHeadingSection } from "./extract";

describe("extractHeadingSection", () => {
  const doc = [
    "# Top",
    "intro paragraph",
    "",
    "## First",
    "first body",
    "",
    "### Nested",
    "nested body",
    "",
    "## Second",
    "second body",
  ].join("\n");

  it("captures a section up to the next equal-or-higher heading", () => {
    const section = extractHeadingSection(doc, "First");
    expect(section).not.toBeNull();
    expect(section).toContain("first body");
    expect(section).toContain("nested body");
    expect(section).not.toContain("## Second");
  });

  it("matches case-insensitively", () => {
    const section = extractHeadingSection(doc, "first");
    expect(section).not.toBeNull();
  });

  it("returns null when the heading is missing", () => {
    expect(extractHeadingSection(doc, "Missing")).toBeNull();
  });
});

describe("extractBlock", () => {
  it("captures a paragraph ending with ^blockid", () => {
    const doc = [
      "First para.",
      "",
      "Second para line 1",
      "second para line 2 ^abc",
      "",
      "Third para.",
    ].join("\n");
    const block = extractBlock(doc, "abc");
    expect(block).not.toBeNull();
    expect(block).toContain("Second para line 1");
    expect(block).toContain("second para line 2");
    expect(block).not.toContain("^abc");
    expect(block).not.toContain("Third para");
  });

  it("returns null for an unknown block id", () => {
    expect(extractBlock("p1\np2 ^x", "y")).toBeNull();
  });
});