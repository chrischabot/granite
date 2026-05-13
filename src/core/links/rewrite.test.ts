import { describe, expect, it } from "vitest";
import { rewriteWikilinksInText } from "./rewrite";

describe("rewriteWikilinksInText", () => {
  it("rewrites bare wikilinks by stem", () => {
    const { text, count } = rewriteWikilinksInText(
      "See [[Old]] and [[Other]].",
      "Old.md",
      "New.md",
    );
    expect(text).toBe("See [[New]] and [[Other]].");
    expect(count).toBe(1);
  });

  it("preserves alias, heading, and block suffixes", () => {
    const cases: Array<{ src: string; expected: string }> = [
      { src: "[[Old|Display]]", expected: "[[New|Display]]" },
      { src: "[[Old#Heading]]", expected: "[[New#Heading]]" },
      { src: "[[Old#^block-id]]", expected: "[[New#^block-id]]" },
      { src: "![[Old]]", expected: "![[New]]" },
      { src: "![[Old#Heading|alias]]", expected: "![[New#Heading|alias]]" },
    ];
    for (const c of cases) {
      const { text } = rewriteWikilinksInText(c.src, "Old.md", "New.md");
      expect(text).toBe(c.expected);
    }
  });

  it("rewrites full-path wikilinks", () => {
    const { text, count } = rewriteWikilinksInText(
      "Refer to [[folder/Old]] and [[folder/Old.md]].",
      "folder/Old.md",
      "folder/New.md",
    );
    expect(text).toBe("Refer to [[folder/New]] and [[folder/New]].");
    expect(count).toBe(2);
  });

  it("does not modify links to other targets", () => {
    const src = "Keep [[Untouched]] and [[Old/sub]].";
    const { text, count } = rewriteWikilinksInText(src, "Old.md", "New.md");
    expect(text).toBe(src);
    expect(count).toBe(0);
  });

  it("returns identity when oldPath === newPath", () => {
    const src = "[[Old]]";
    const { text, count } = rewriteWikilinksInText(src, "Old.md", "Old.md");
    expect(text).toBe(src);
    expect(count).toBe(0);
  });

  it("rewrites markdown-form links by stem", () => {
    const { text, count } = rewriteWikilinksInText(
      "See [Old](Old.md) and [Other](Other.md).",
      "Old.md",
      "New.md",
    );
    expect(text).toBe("See [Old](New.md) and [Other](Other.md).");
    expect(count).toBe(1);
  });

  it("rewrites markdown-form links with a fragment", () => {
    const { text } = rewriteWikilinksInText("Refer to [link](Old.md#Section).", "Old.md", "New.md");
    expect(text).toBe("Refer to [link](New.md#Section).");
  });

  it("does not touch external markdown-form links", () => {
    const src = "[OpenAI](https://openai.com)";
    const { text, count } = rewriteWikilinksInText(src, "Old.md", "New.md");
    expect(text).toBe(src);
    expect(count).toBe(0);
  });

  it("handles URL-encoded paths in markdown-form links", () => {
    const { text } = rewriteWikilinksInText(
      "[my note](folder%2FOld.md)",
      "folder/Old.md",
      "folder/New.md",
    );
    expect(text).toContain("folder/New.md");
  });
});
