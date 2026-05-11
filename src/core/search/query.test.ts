import { describe, it, expect } from "vitest";
import { parseQuery, fileMatchesQuery, findLineMatches } from "./query";
import type { ParsedMetadata } from "../metadata/parser";

const emptyMeta: ParsedMetadata = {
  frontmatter: {},
  aliases: [],
  cssClasses: [],
  headings: [],
  links: [],
  tags: [],
  blocks: [],
  footnotes: [],
  isEmpty: false,
};

describe("parseQuery", () => {
  it("captures free terms by default", () => {
    const q = parseQuery("hello world");
    expect(q.include).toEqual(["hello", "world"]);
    expect(q.exclude).toEqual([]);
  });

  it("supports tag, path, file, line operators", () => {
    const q = parseQuery("tag:project path:docs/ file:Notes line:todo");
    expect(q.tags).toEqual(["project"]);
    expect(q.paths).toEqual(["docs/"]);
    expect(q.files).toEqual(["Notes"]);
    expect(q.lineTerms).toEqual(["todo"]);
  });

  it("strips a leading # on tag values", () => {
    const q = parseQuery("tag:#hash");
    expect(q.tags).toEqual(["hash"]);
  });

  it("supports quoted phrases for any operator", () => {
    const q = parseQuery('"hello world" tag:foo line:"see also"');
    expect(q.include).toEqual(["hello world"]);
    expect(q.tags).toEqual(["foo"]);
    expect(q.lineTerms).toEqual(["see also"]);
  });

  it("captures negations as excludes", () => {
    const q = parseQuery("hello -world");
    expect(q.include).toEqual(["hello"]);
    expect(q.exclude).toEqual(["world"]);
  });
});

describe("fileMatchesQuery", () => {
  const file = {
    type: "file" as const,
    path: "docs/Notes.md",
    name: "Notes.md",
    size: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    extension: "md",
  };

  it("matches by free term", () => {
    expect(
      fileMatchesQuery(parseQuery("hello"), {
        file,
        content: "Hello world",
        metadata: emptyMeta,
      }),
    ).toBe(true);
  });

  it("rejects negative free term", () => {
    expect(
      fileMatchesQuery(parseQuery("hello -world"), {
        file,
        content: "Hello world",
        metadata: emptyMeta,
      }),
    ).toBe(false);
  });

  it("matches a tag operator from metadata", () => {
    const meta: ParsedMetadata = {
      ...emptyMeta,
      tags: [{ name: "project", line: 0 }],
    };
    expect(
      fileMatchesQuery(parseQuery("tag:project"), {
        file,
        content: "",
        metadata: meta,
      }),
    ).toBe(true);
  });

  it("falls back to extracting tags from content when metadata is missing", () => {
    expect(
      fileMatchesQuery(parseQuery("tag:project"), {
        file,
        content: "see #project",
        metadata: null,
      }),
    ).toBe(true);
  });

  it("path operator filters by substring", () => {
    expect(
      fileMatchesQuery(parseQuery("path:docs/"), {
        file,
        content: "",
        metadata: emptyMeta,
      }),
    ).toBe(true);
    expect(
      fileMatchesQuery(parseQuery("path:other/"), {
        file,
        content: "",
        metadata: emptyMeta,
      }),
    ).toBe(false);
  });

  it("line:term requires a single line containing the term", () => {
    const content = "first line\nsecond line has todo here\nthird line";
    expect(
      fileMatchesQuery(parseQuery("line:todo"), {
        file,
        content,
        metadata: emptyMeta,
      }),
    ).toBe(true);
    expect(
      fileMatchesQuery(parseQuery("line:nowhere"), {
        file,
        content,
        metadata: emptyMeta,
      }),
    ).toBe(false);
  });

  it("multiple line: terms may be satisfied by different lines", () => {
    const content = "line one has alpha\nline two has beta";
    expect(
      fileMatchesQuery(parseQuery("line:alpha line:beta"), {
        file,
        content,
        metadata: emptyMeta,
      }),
    ).toBe(true);
  });

  it("matchCase distinguishes upper vs lowercase in fileMatchesQuery", () => {
    const content = "Hello World";
    expect(
      fileMatchesQuery(parseQuery("hello"), {
        file,
        content,
        metadata: emptyMeta,
      }),
    ).toBe(true);
    expect(
      fileMatchesQuery(
        parseQuery("hello"),
        { file, content, metadata: emptyMeta },
        { matchCase: true },
      ),
    ).toBe(false);
    expect(
      fileMatchesQuery(
        parseQuery("Hello"),
        { file, content, metadata: emptyMeta },
        { matchCase: true },
      ),
    ).toBe(true);
  });
});

describe("findLineMatches matchCase", () => {
  it("respects the matchCase option (4th argument)", () => {
    const content = "first line\nHello World\nbye line";
    expect(findLineMatches(content, parseQuery("hello"), 5)).toEqual([
      { line: 1, preview: "Hello World" },
    ]);
    expect(
      findLineMatches(content, parseQuery("hello"), 5, { matchCase: true }),
    ).toEqual([]);
    expect(
      findLineMatches(content, parseQuery("Hello"), 5, { matchCase: true }),
    ).toEqual([{ line: 1, preview: "Hello World" }]);
  });
});

describe("findLineMatches", () => {
  it("returns lines containing any include term", () => {
    const matches = findLineMatches(
      "first\nhello world\nbye world\n",
      parseQuery("hello"),
    );
    expect(matches).toEqual([{ line: 1, preview: "hello world" }]);
  });

  it("treats line: terms as line-level matches", () => {
    const matches = findLineMatches(
      "first\nhello world\nbye world\n",
      parseQuery("line:bye"),
    );
    expect(matches).toEqual([{ line: 2, preview: "bye world" }]);
  });

  it("samples first nonempty line when no free or line terms", () => {
    const matches = findLineMatches(
      "\n\nhello world\nmore",
      parseQuery("tag:foo"),
    );
    expect(matches).toEqual([{ line: 2, preview: "hello world" }]);
  });
});