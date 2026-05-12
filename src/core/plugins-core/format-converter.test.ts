import { describe, expect, it } from "vitest";
import { convertWikilinksToMarkdown, migrateLegacyPropertyKeys } from "./format-converter";

describe("convertWikilinksToMarkdown", () => {
  it("converts a bare wikilink", () => {
    const { text, count } = convertWikilinksToMarkdown("See [[Note]]");
    expect(text).toBe("See [Note](Note.md)");
    expect(count).toBe(1);
  });

  it("uses the alias as display text", () => {
    const { text } = convertWikilinksToMarkdown("[[Note|Display]]");
    expect(text).toBe("[Display](Note.md)");
  });

  it("preserves heading anchors", () => {
    const { text } = convertWikilinksToMarkdown("[[Note#Section]]");
    expect(text).toBe("[Note](Note.md#Section)");
  });

  it("preserves block ids", () => {
    const { text } = convertWikilinksToMarkdown("[[Note#^abc]]");
    // # and ^ inside the URI don't need encoding here; just check the path
    expect(text).toMatch(/\[Note\]\(Note\.md#%5Eabc\)|\[Note\]\(Note\.md#\^abc\)/);
  });

  it("leaves embeds alone", () => {
    const src = "![[Image.png]]";
    const { text, count } = convertWikilinksToMarkdown(src);
    expect(text).toBe(src);
    expect(count).toBe(0);
  });

  it("counts every occurrence", () => {
    const { count } = convertWikilinksToMarkdown("[[A]] and [[B]] and [[C|c]]");
    expect(count).toBe(3);
  });

  it("encodes paths with spaces and special chars", () => {
    const { text } = convertWikilinksToMarkdown("[[Folder/Sub Note]]");
    expect(text).toContain("Sub%20Note.md");
  });

  it("preserves embeds adjacent to links", () => {
    const src = "![[image.png]] [[Note]]";
    const { text, count } = convertWikilinksToMarkdown(src);
    expect(text).toBe("![[image.png]] [Note](Note.md)");
    expect(count).toBe(1);
  });
});

describe("migrateLegacyPropertyKeys", () => {
  it("migrates singular tag to tags list and strips a leading hash", () => {
    const { text, count } = migrateLegacyPropertyKeys("---\ntag: '#work'\n---\nbody");

    expect(count).toBe(1);
    expect(text).toContain("tags:");
    expect(text).toContain("- work");
    expect(text).not.toContain("tag:");
  });

  it("migrates alias and cssclass to plural keys", () => {
    const { text, count } = migrateLegacyPropertyKeys(
      "---\nalias: Old name\ncssclass: wide-page\n---\nbody",
    );

    expect(count).toBe(2);
    expect(text).toContain("aliases:");
    expect(text).toContain("- Old name");
    expect(text).toContain("cssclasses:");
    expect(text).toContain("- wide-page");
    expect(text).not.toContain("alias:");
    expect(text).not.toContain("cssclass:");
  });

  it("merges into existing plural keys without duplicates", () => {
    const { text } = migrateLegacyPropertyKeys(
      "---\ntags: [work, home]\ntag: [work, deep]\n---\nbody",
    );

    expect(text).toContain("- work");
    expect(text).toContain("- home");
    expect(text).toContain("- deep");
    expect((text.match(/- work/g) ?? []).length).toBe(1);
    expect(text).not.toContain("tag:");
  });

  it("does nothing when no legacy keys are present", () => {
    const source = "---\ntags: [work]\n---\nbody";

    expect(migrateLegacyPropertyKeys(source)).toEqual({ text: source, count: 0 });
  });
});
