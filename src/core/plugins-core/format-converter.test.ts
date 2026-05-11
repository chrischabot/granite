import { describe, it, expect } from "vitest";
import { convertWikilinksToMarkdown } from "./format-converter";

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