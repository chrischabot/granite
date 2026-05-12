import { describe, expect, it } from "vitest";
import { parseWikilink, renderMarkdown, renderNoteMarkdown, slugify } from "./renderer";

describe("parseWikilink", () => {
  it("parses bare target", () => {
    expect(parseWikilink("Note")).toEqual({
      target: "Note",
      display: null,
      heading: null,
      block: null,
    });
  });

  it("captures alias", () => {
    expect(parseWikilink("Note|Display")).toEqual({
      target: "Note",
      display: "Display",
      heading: null,
      block: null,
    });
  });

  it("captures heading", () => {
    expect(parseWikilink("Note#Section")).toEqual({
      target: "Note",
      display: null,
      heading: "Section",
      block: null,
    });
  });

  it("captures block id", () => {
    expect(parseWikilink("Note#^abc")).toEqual({
      target: "Note",
      display: null,
      heading: null,
      block: "abc",
    });
  });

  it("captures alias + heading", () => {
    expect(parseWikilink("Note#H|D")).toEqual({
      target: "Note",
      display: "D",
      heading: "H",
      block: null,
    });
  });
});

describe("renderMarkdown — custom rules", () => {
  it("renders a wikilink as an internal-link anchor", () => {
    const html = renderMarkdown("See [[Note]]");
    expect(html).toContain('class="internal-link"');
    expect(html).toContain('data-href="Note"');
    expect(html).toContain(">Note</a>");
  });

  it("renders an alias wikilink with the display text", () => {
    const html = renderMarkdown("[[Note|Hello]]");
    expect(html).toContain(">Hello</a>");
    expect(html).toContain('data-href="Note"');
  });

  it("renders an embed wikilink as a span", () => {
    const html = renderMarkdown("![[Note]]");
    expect(html).toContain('class="internal-embed"');
    expect(html).toContain('data-href="Note"');
  });

  it("preserves heading + block fragment in data-href", () => {
    expect(renderMarkdown("[[Note#Heading]]")).toContain('data-href="Note#Heading"');
    expect(renderMarkdown("[[Note#^abc]]")).toContain('data-href="Note#^abc"');
  });

  it("renders a tag as an anchor", () => {
    const html = renderMarkdown("hello #project");
    expect(html).toContain('class="tag"');
    expect(html).toContain('data-tag="project"');
  });

  it("does not match purely numeric tags", () => {
    const html = renderMarkdown("see #1234 here");
    expect(html).not.toContain('class="tag"');
  });

  it("renders ==highlight== as <mark>", () => {
    const html = renderMarkdown("This is ==important== text");
    expect(html).toContain("<mark>important</mark>");
  });

  it("renders a task list item with the checkbox + data-line", () => {
    const html = renderMarkdown("- [ ] not done\n- [x] done");
    expect(html).toContain('class="task-list-item"');
    expect(html).toContain('class="task-list-item-checkbox"');
    expect(html).toContain('data-checked=" "');
    expect(html).toContain('data-checked="x"');
    expect(html).toContain('data-line="0"');
    expect(html).toContain('data-line="1"');
  });

  it("preserves custom task markers as completed-style task states", () => {
    const html = renderMarkdown("- [?] waiting\n- [-] cancelled");
    expect(html).toContain('data-task="?"');
    expect(html).toContain('data-checked="?" checked');
    expect(html).toContain('data-task="-"');
    expect(html).toContain('data-checked="-" checked');
    expect(html).not.toContain("[?] waiting");
    expect(html).not.toContain("[-] cancelled");
  });

  it("renders GFM strikethrough", () => {
    expect(renderMarkdown("~~removed~~")).toContain("<s>removed</s>");
  });

  it("renders GFM tables with alignment", () => {
    const html = renderMarkdown("| A | B |\n| :-- | --: |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain('<th style="text-align:left">A</th>');
    expect(html).toContain('<th style="text-align:right">B</th>');
    expect(html).toContain('<td style="text-align:left">1</td>');
    expect(html).toContain('<td style="text-align:right">2</td>');
  });

  it("renders GFM bare URL and email autolinks", () => {
    const html = renderMarkdown("Visit https://example.com/a_(b). Email test@example.com.");
    expect(html).toContain('<a href="https://example.com/a_(b)">https://example.com/a_(b)</a>.');
    expect(html).toContain('<a href="mailto:test@example.com">test@example.com</a>.');
  });

  it("renders CommonMark angle autolinks without linkifying trailing punctuation", () => {
    const html = renderMarkdown("<https://example.com?q=1>, <user@example.com>.");
    expect(html).toContain('<a href="https://example.com?q=1">https://example.com?q=1</a>,');
    expect(html).toContain('<a href="mailto:user@example.com">user@example.com</a>.');
  });

  it("renders a callout with data-callout = canonical type", () => {
    const html = renderMarkdown("> [!warning] Title\n> body");
    expect(html).toContain('class="callout"');
    expect(html).toContain('data-callout="warning"');
    expect(html).toContain("Title");
  });

  it("aliases callout types (`tip`, `caution`, `tldr`) to canonical", () => {
    expect(renderMarkdown("> [!caution] x")).toContain('data-callout="warning"');
    expect(renderMarkdown("> [!tldr] x")).toContain('data-callout="abstract"');
    expect(renderMarkdown("> [!fail] x")).toContain('data-callout="failure"');
  });

  it("hides inline `%%comments%%` from output", () => {
    const html = renderMarkdown("hello %%hidden%% world");
    expect(html).not.toContain("hidden");
    expect(html).toContain("hello");
    expect(html).toContain("world");
  });

  it("hides block-level `%% ... %%` comments", () => {
    const src = "before\n\n%%\nhidden block content\n%%\n\nafter";
    const html = renderMarkdown(src);
    expect(html).not.toContain("hidden block content");
    expect(html).toContain("before");
    expect(html).toContain("after");
  });
});

describe("renderNoteMarkdown", () => {
  it("renders without frontmatter rendered as hr/paragraph", () => {
    const text = "---\ntitle: Hello\n---\n# Heading\nBody";
    const html = renderNoteMarkdown(text);
    expect(html).toMatch(/<h1[^>]*>Heading<\/h1>/);
    expect(html).toContain("Body");
    expect(html).not.toContain("title: Hello");
  });

  it("rewrites task-list data-line to reference the original source line", () => {
    const text = "---\ntitle: T\n---\n- [ ] task";
    const html = renderNoteMarkdown(text);
    expect(html).toContain('data-line="3"');
    expect(html).toContain('data-checked=" "');
  });

  it("is a no-op when no frontmatter is present", () => {
    const text = "# Heading\n- [ ] task";
    const html = renderNoteMarkdown(text);
    expect(html).toBe(renderMarkdown(text));
  });
});

describe("slugify", () => {
  it("lowercases + hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips non-ASCII letters", () => {
    expect(slugify("Café au lait")).toBe("cafe-au-lait");
  });

  it("collapses internal whitespace", () => {
    expect(slugify("a   b\tc")).toBe("a-b-c");
  });

  it("trims punctuation", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("returns empty for symbol-only input", () => {
    expect(slugify("!@#$%")).toBe("");
  });
});

describe("renderMarkdown — heading slugs", () => {
  it("adds id to each rendered heading", () => {
    const html = renderMarkdown("# Hello World\n## Sub Heading");
    expect(html).toContain('id="hello-world"');
    expect(html).toContain('id="sub-heading"');
  });

  it("de-duplicates colliding slugs with a numeric suffix", () => {
    const html = renderMarkdown("# Notes\nsome text\n# Notes");
    expect(html).toContain('id="notes"');
    expect(html).toContain('id="notes-1"');
  });
});
