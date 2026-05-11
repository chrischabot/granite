import { describe, it, expect } from "vitest";
import { replaceInText } from "./vault-find-replace";

describe("replaceInText — literal mode", () => {
  it("replaces every occurrence", () => {
    const { text, count } = replaceInText(
      "hello hello hello",
      "hello",
      "hi",
      { caseSensitive: true, regex: false },
    );
    expect(text).toBe("hi hi hi");
    expect(count).toBe(3);
  });

  it("case-insensitive matches", () => {
    const { text, count } = replaceInText(
      "Hello hello HELLO",
      "hello",
      "hi",
      { caseSensitive: false, regex: false },
    );
    expect(text).toBe("hi hi hi");
    expect(count).toBe(3);
  });

  it("case-sensitive misses different cases", () => {
    const { text, count } = replaceInText(
      "Hello hello",
      "Hello",
      "hi",
      { caseSensitive: true, regex: false },
    );
    expect(text).toBe("hi hello");
    expect(count).toBe(1);
  });

  it("escapes regex metacharacters in literal mode", () => {
    const { text, count } = replaceInText(
      "a.b a.b a?b",
      "a.b",
      "x",
      { caseSensitive: true, regex: false },
    );
    expect(text).toBe("x x a?b");
    expect(count).toBe(2);
  });

  it("preserves literal `$` characters in the replacement", () => {
    const { text } = replaceInText(
      "price: 100",
      "100",
      "$100",
      { caseSensitive: true, regex: false },
    );
    expect(text).toBe("price: $100");
  });

  it("preserves literal `$1` in the replacement (no expansion in literal mode)", () => {
    const { text } = replaceInText(
      "abc",
      "abc",
      "$1foo",
      { caseSensitive: true, regex: false },
    );
    expect(text).toBe("$1foo");
  });

  it("returns text unchanged when no match", () => {
    const src = "nothing here";
    const { text, count } = replaceInText(src, "missing", "?", {
      caseSensitive: true,
      regex: false,
    });
    expect(text).toBe(src);
    expect(count).toBe(0);
  });

  it("treats empty find as no-op", () => {
    expect(
      replaceInText("hello", "", "x", { caseSensitive: true, regex: false }),
    ).toEqual({ text: "hello", count: 0 });
  });
});

describe("replaceInText — regex mode", () => {
  it("treats find as a regex pattern", () => {
    const { text, count } = replaceInText(
      "foo123 bar45",
      "[a-z]+\\d+",
      "X",
      { caseSensitive: true, regex: true },
    );
    expect(text).toBe("X X");
    expect(count).toBe(2);
  });

  it("respects case-insensitive flag", () => {
    const { text, count } = replaceInText(
      "Foo foo FOO",
      "foo",
      "x",
      { caseSensitive: false, regex: true },
    );
    expect(text).toBe("x x x");
    expect(count).toBe(3);
  });

  it("expands numbered capture groups with $1/$2", () => {
    const { text, count } = replaceInText(
      "foo123 bar456",
      "([a-z]+)(\\d+)",
      "$1-$2",
      { caseSensitive: true, regex: true },
    );
    expect(text).toBe("foo-123 bar-456");
    expect(count).toBe(2);
  });

  it("supports the `$&` whole-match token", () => {
    const { text } = replaceInText(
      "abc",
      "[a-z]+",
      "[$&]",
      { caseSensitive: true, regex: true },
    );
    expect(text).toBe("[abc]");
  });

  it("supports named capture groups", () => {
    const { text } = replaceInText(
      "John, age 30",
      "(?<name>[A-Z][a-z]+), age (?<age>\\d+)",
      "$<name> is $<age>",
      { caseSensitive: true, regex: true },
    );
    expect(text).toBe("John is 30");
  });
});