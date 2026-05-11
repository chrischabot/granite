import { describe, it, expect } from "vitest";
import { findUnlinkedMentionsInText } from "./unlinked-mentions";

describe("findUnlinkedMentionsInText", () => {
  it("finds a literal mention by needle", () => {
    const matches = findUnlinkedMentionsInText("See John here.", ["John"]);
    expect(matches.length).toBe(1);
    expect(matches[0]!.line).toBe(0);
    expect(matches[0]!.needle).toBe("John");
  });

  it("is case-insensitive by default", () => {
    const matches = findUnlinkedMentionsInText("see JOHN", ["john"]);
    expect(matches.length).toBe(1);
  });

  it("respects caseSensitive when requested", () => {
    expect(
      findUnlinkedMentionsInText("JOHN", ["John"], { caseSensitive: true }),
    ).toEqual([]);
    expect(
      findUnlinkedMentionsInText("John", ["John"], { caseSensitive: true }).length,
    ).toBe(1);
  });

  it("requires word boundaries on both sides", () => {
    expect(findUnlinkedMentionsInText("Johnson", ["John"])).toEqual([]);
    expect(findUnlinkedMentionsInText("upJohn", ["John"])).toEqual([]);
    expect(findUnlinkedMentionsInText("Hi John!", ["John"]).length).toBe(1);
    expect(findUnlinkedMentionsInText("John, hello.", ["John"]).length).toBe(1);
    expect(findUnlinkedMentionsInText("(John)", ["John"]).length).toBe(1);
  });

  it("skips mentions inside wikilinks", () => {
    expect(findUnlinkedMentionsInText("see [[John]]", ["John"])).toEqual([]);
    expect(findUnlinkedMentionsInText("see [[John|alias]]", ["John"])).toEqual([]);
    expect(findUnlinkedMentionsInText("see ![[John]]", ["John"])).toEqual([]);
  });

  it("skips alias-display text inside wikilinks", () => {
    expect(findUnlinkedMentionsInText("see [[Other|John]]", ["John"])).toEqual([]);
    expect(findUnlinkedMentionsInText("see [[Some Note|Hello John]]", ["John"])).toEqual([]);
  });

  it("treats text after an unclosed [[ as inside-wikilink", () => {
    expect(findUnlinkedMentionsInText("oops [[ John no close", ["John"])).toEqual([]);
  });

  it("does not skip mentions after a closed wikilink on the same line", () => {
    const matches = findUnlinkedMentionsInText("[[Other]] mentions John", ["John"]);
    expect(matches.length).toBe(1);
  });

  it("skips mentions inside inline code spans", () => {
    expect(findUnlinkedMentionsInText("`John` is code", ["John"])).toEqual([]);
    expect(findUnlinkedMentionsInText("before `code John` after", ["John"])).toEqual(
      [],
    );
  });

  it("skips mentions inside fenced code blocks", () => {
    const text = "```\nJohn in code\n```\nJohn outside";
    const matches = findUnlinkedMentionsInText(text, ["John"]);
    expect(matches.length).toBe(1);
    expect(matches[0]!.line).toBe(3);
  });

  it("handles tilde-fenced code blocks", () => {
    const text = "~~~\nJohn in code\n~~~\nJohn outside";
    const matches = findUnlinkedMentionsInText(text, ["John"]);
    expect(matches.length).toBe(1);
    expect(matches[0]!.line).toBe(3);
  });

  it("returns at most maxPerFile matches", () => {
    const text = Array.from({ length: 20 }, () => "John").join("\n");
    const matches = findUnlinkedMentionsInText(text, ["John"], { maxPerFile: 5 });
    expect(matches.length).toBe(5);
  });

  it("captures preview trimmed and capped at 200 chars", () => {
    const matches = findUnlinkedMentionsInText("  Hello John world  ", ["John"]);
    expect(matches[0]!.preview).toBe("Hello John world");
  });

  it("matches the first needle to hit on a line", () => {
    const matches = findUnlinkedMentionsInText("alpha and beta", ["alpha", "beta"]);
    expect(matches.length).toBe(1);
    expect(matches[0]!.needle).toBe("alpha");
  });

  it("returns empty for empty / whitespace needles", () => {
    expect(findUnlinkedMentionsInText("text", [])).toEqual([]);
    expect(findUnlinkedMentionsInText("text", [""])).toEqual([]);
    expect(findUnlinkedMentionsInText("text", [" ", "\t"])).toEqual([]);
  });

  it("handles needles with spaces (multi-word names)", () => {
    const matches = findUnlinkedMentionsInText(
      "Jane Doe was here.",
      ["Jane Doe"],
    );
    expect(matches.length).toBe(1);
  });

  it("returns one match per line even if many needles match", () => {
    const matches = findUnlinkedMentionsInText("John and Jane meet", ["John", "Jane"]);
    expect(matches.length).toBe(1);
  });
});