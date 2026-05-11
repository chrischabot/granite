import { describe, it, expect } from "vitest";
import {
  countTagOccurrences,
  rewriteFrontmatterTags,
  rewriteInlineTags,
  rewriteTags,
} from "./tag-rename";

describe("rewriteInlineTags", () => {
  it("renames a single occurrence", () => {
    expect(rewriteInlineTags("hello #foo there", "foo", "bar")).toBe(
      "hello #bar there",
    );
  });

  it("preserves hierarchy under the renamed tag", () => {
    expect(rewriteInlineTags("#foo and #foo/sub", "foo", "bar")).toBe(
      "#bar and #bar/sub",
    );
  });

  it("does not match unrelated tags or substrings", () => {
    // `foo` should not match inside `fool` or `foobar`, but `foo-bar` is
    // treated as the full tag `foo-bar` — which still contains `foo` as a
    // distinct hierarchy-eligible prefix? No: hierarchy uses `/`, not `-`,
    // so `foo-bar` is its own tag and must remain unchanged.
    expect(rewriteInlineTags("#fool", "foo", "bar")).toBe("#fool");
    expect(rewriteInlineTags("#foobar", "foo", "bar")).toBe("#foobar");
    expect(rewriteInlineTags("#foo-bar", "foo", "bar")).toBe("#foo-bar");
    expect(rewriteInlineTags("#foo #foobar #foo/sub", "foo", "bar")).toBe(
      "#bar #foobar #bar/sub",
    );
  });

  it("respects boundary characters", () => {
    expect(rewriteInlineTags("(#foo) [#foo]", "foo", "bar")).toBe("(#bar) [#bar]");
  });
});

describe("rewriteFrontmatterTags — inline list", () => {
  it("renames a value in a YAML inline-list", () => {
    const src = "---\ntags: [foo, baz]\n---\nbody";
    const next = rewriteFrontmatterTags(src, "foo", "bar");
    expect(next).toContain("tags: [bar, baz]");
  });

  it("preserves quoting style", () => {
    const src = '---\ntags: ["foo", \'foo/sub\']\n---\nb';
    const next = rewriteFrontmatterTags(src, "foo", "bar");
    expect(next).toContain('"bar"');
    expect(next).toContain("'bar/sub'");
  });
});

describe("rewriteFrontmatterTags — block list", () => {
  it("renames items in a YAML `-`-prefixed tag list", () => {
    const src = "---\ntags:\n  - foo\n  - foo/sub\n  - baz\n---\nbody";
    const next = rewriteFrontmatterTags(src, "foo", "bar");
    expect(next).toContain("- bar");
    expect(next).toContain("- bar/sub");
    expect(next).toContain("- baz");
  });

  it("ends the block when the next key starts", () => {
    const src = "---\ntags:\n  - foo\nother: value\n  - foo\n---\nbody";
    const next = rewriteFrontmatterTags(src, "foo", "bar");
    expect(next).toMatch(/tags:\n\s+- bar\nother: value\n\s+- foo/);
  });
});

describe("rewriteTags", () => {
  it("rewrites both body and frontmatter", () => {
    const src = "---\ntags: [foo]\n---\n#foo body";
    const next = rewriteTags(src, "foo", "bar");
    expect(next).toContain("tags: [bar]");
    expect(next).toContain("#bar body");
  });

  it("returns identical text when no occurrences", () => {
    const src = "---\ntags: [baz]\n---\n#qux";
    expect(rewriteTags(src, "foo", "bar")).toBe(src);
  });
});

describe("countTagOccurrences", () => {
  it("counts inline tag matches and hierarchy variants", () => {
    const src = "#foo #foo #foo/sub #other";
    expect(countTagOccurrences(src, "foo")).toBe(3);
  });

  it("counts YAML inline-list entries", () => {
    const src = "---\ntags: [foo, foo/sub, baz]\n---\nbody";
    expect(countTagOccurrences(src, "foo")).toBe(2);
  });

  it("counts YAML block-list entries", () => {
    const src = "---\ntags:\n  - foo\n  - foo/sub\n  - baz\n---\nbody";
    expect(countTagOccurrences(src, "foo")).toBe(2);
  });

  it("counts body + frontmatter together", () => {
    const src = "---\ntags: [foo]\n---\n#foo and #foo/sub";
    expect(countTagOccurrences(src, "foo")).toBe(3);
  });

  it("returns 0 when no occurrences", () => {
    expect(countTagOccurrences("nothing here", "foo")).toBe(0);
  });

  it("does not count YAML `-` items outside a tags: block", () => {
    const src =
      "---\naliases:\n  - foo\n  - foo/sub\ntags:\n  - foo\n---\n";
    expect(countTagOccurrences(src, "foo")).toBe(1);
  });
});