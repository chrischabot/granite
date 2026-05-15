import { describe, expect, it } from "vitest";
import type { ParsedMetadata } from "../metadata/parser";
import { createInvertedIndex } from "./inverted-index";
import {
  fileMatchesQuery,
  fileMatchesQueryIndexed,
  findLineMatches,
  parseQuery,
  prefilterCandidatesByIndex,
} from "./query";

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

const file = {
  type: "file" as const,
  path: "docs/Notes.md",
  name: "Notes.md",
  size: 0,
  mtimeMs: 0,
  ctimeMs: 0,
  extension: "md",
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

  it("parses /regex/ literals into RegExp objects", () => {
    const q = parseQuery("/\\bTODO\\b/i");
    expect(q.regexes).toHaveLength(1);
    expect(q.regexes[0]?.source).toBe("\\bTODO\\b");
    expect(q.regexes[0]?.flags).toBe("i");
    expect(q.negatedRegexes).toEqual([]);
  });

  it("captures negated regex with leading -", () => {
    const q = parseQuery("-/draft/");
    expect(q.negatedRegexes).toHaveLength(1);
    expect(q.regexes).toEqual([]);
  });

  it("ignores malformed regex (no closing slash) — falls through to free term", () => {
    const q = parseQuery("/unterminated");
    expect(q.regexes).toEqual([]);
    expect(q.include).toEqual(["/unterminated"]);
  });

  it("parses property existence: [name]", () => {
    const q = parseQuery("[status]");
    expect(q.props).toHaveLength(1);
    expect(q.props[0]).toEqual({ key: "status", value: null });
  });

  it("parses property equality: [name:value]", () => {
    const q = parseQuery("[status:done]");
    expect(q.props).toHaveLength(1);
    expect(q.props[0]).toEqual({
      key: "status",
      value: { kind: "equals", value: "done" },
    });
  });

  it("parses [name:null] and [name:!null]", () => {
    const q1 = parseQuery("[status:null]");
    expect(q1.props[0]?.value).toEqual({ kind: "null" });
    const q2 = parseQuery("[status:!null]");
    expect(q2.props[0]?.value).toEqual({ kind: "not-null" });
  });

  it("supports negated property operators", () => {
    const q = parseQuery("-[status:draft]");
    expect(q.props).toEqual([]);
    expect(q.negatedProps).toHaveLength(1);
    expect(q.negatedProps[0]).toEqual({
      key: "status",
      value: { kind: "equals", value: "draft" },
    });
  });
});

describe("fileMatchesQuery — existing operators", () => {
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

describe("fileMatchesQuery — regex", () => {
  it("matches a regex against the file body", () => {
    const q = parseQuery("/\\bTODO\\b/");
    expect(
      fileMatchesQuery(q, {
        file,
        content: "things to do: TODO write tests",
        metadata: emptyMeta,
      }),
    ).toBe(true);
    expect(
      fileMatchesQuery(q, {
        file,
        content: "nothing here",
        metadata: emptyMeta,
      }),
    ).toBe(false);
  });

  it("respects regex flags", () => {
    const q = parseQuery("/todo/i");
    expect(
      fileMatchesQuery(q, {
        file,
        content: "Big TODO!",
        metadata: emptyMeta,
      }),
    ).toBe(true);
  });

  it("negated regex requires absence", () => {
    const q = parseQuery("-/draft/i");
    expect(
      fileMatchesQuery(q, {
        file,
        content: "this is a draft document",
        metadata: emptyMeta,
      }),
    ).toBe(false);
    expect(
      fileMatchesQuery(q, {
        file,
        content: "this is a final document",
        metadata: emptyMeta,
      }),
    ).toBe(true);
  });

  // NOTE: this is a per-construct watchdog for the regex code path. It is
  // NOT the §24.7 acceptance gate — see the indexed full-text test below.
  it("keeps 10k-note regex scans under the 500 ms regex watchdog", () => {
    const q = parseQuery("/target-[0-9]+/");
    const files = Array.from({ length: 10_000 }, (_, i) => ({
      file: { ...file, path: `Folder/Note ${i}.md`, name: `Note ${i}.md` },
      content:
        i % 250 === 0
          ? `# Note ${i}\nThis line contains target-${i} for the regex scan.`
          : `# Note ${i}\nThis note has ordinary searchable body text.`,
      metadata: emptyMeta,
    }));
    const first = files[0];
    if (!first) throw new Error("missing performance fixture");
    fileMatchesQuery(q, first);

    const start = performance.now();
    const matches = files.filter((ctx) => fileMatchesQuery(q, ctx));
    const elapsed = performance.now() - start;

    expect(matches).toHaveLength(40);
    expect(elapsed).toBeLessThan(500);
  });
});

describe("fileMatchesQuery — property constraints", () => {
  const metaWithProps = (props: Record<string, unknown>): ParsedMetadata => ({
    ...emptyMeta,
    frontmatter: props,
  });

  it("[name] requires existence with a non-null value", () => {
    const q = parseQuery("[status]");
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ status: "done" }),
      }),
    ).toBe(true);
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ status: null }),
      }),
    ).toBe(false);
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: emptyMeta,
      }),
    ).toBe(false);
  });

  it("[name:value] compares case-insensitive by default", () => {
    const q = parseQuery("[status:Done]");
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ status: "done" }),
      }),
    ).toBe(true);
  });

  it("[name:value] matches array contents (e.g. tags)", () => {
    const q = parseQuery("[tags:work]");
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ tags: ["home", "work"] }),
      }),
    ).toBe(true);
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ tags: ["home"] }),
      }),
    ).toBe(false);
  });

  it("[name:null] requires the property to be missing or null", () => {
    const q = parseQuery("[status:null]");
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: emptyMeta,
      }),
    ).toBe(true);
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ status: null }),
      }),
    ).toBe(true);
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ status: "done" }),
      }),
    ).toBe(false);
  });

  it("[name:!null] requires the property to have a non-null value", () => {
    const q = parseQuery("[status:!null]");
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ status: "done" }),
      }),
    ).toBe(true);
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: emptyMeta,
      }),
    ).toBe(false);
  });

  it("negated property — -[name:value] rejects files where the value matches", () => {
    const q = parseQuery("-[status:draft]");
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ status: "draft" }),
      }),
    ).toBe(false);
    expect(
      fileMatchesQuery(q, {
        file,
        content: "",
        metadata: metaWithProps({ status: "done" }),
      }),
    ).toBe(true);
  });
});

describe("findLineMatches matchCase", () => {
  it("respects the matchCase option (4th argument)", () => {
    const content = "first line\nHello World\nbye line";
    expect(findLineMatches(content, parseQuery("hello"), 5)).toEqual([
      { line: 1, preview: "Hello World" },
    ]);
    expect(findLineMatches(content, parseQuery("hello"), 5, { matchCase: true })).toEqual([]);
    expect(findLineMatches(content, parseQuery("Hello"), 5, { matchCase: true })).toEqual([
      { line: 1, preview: "Hello World" },
    ]);
  });
});

describe("fileMatchesQueryIndexed — §24.7 full-text 10k-note budget", () => {
  it("indexed full-text query over 10k notes completes in < 200 ms", () => {
    // Deterministic corpus: a sparse needle term ("granitemarker") appears
    // in every 250th note, plus an unrelated word vocabulary.
    const NOTE_COUNT = 10_000;
    const filler = "ordinary searchable body text with words and stuff";
    const files = Array.from({ length: NOTE_COUNT }, (_, i) => ({
      file: { ...file, path: `Folder/Note ${i}.md`, name: `Note ${i}.md` },
      content:
        i % 250 === 0
          ? `# Note ${i}\nThis note has the granitemarker keyword for the full-text scan.\n${filler}`
          : `# Note ${i}\n${filler}`,
      metadata: emptyMeta,
    }));

    const index = createInvertedIndex();
    for (const ctx of files) index.add(ctx.file.path, ctx.content);

    const query = parseQuery("granitemarker keyword");

    // Warm
    fileMatchesQueryIndexed(query, files[0] as (typeof files)[number], {}, index);

    const start = performance.now();
    const prefiltered = prefilterCandidatesByIndex(query, index);
    const matches = files.filter((ctx) =>
      fileMatchesQueryIndexed(query, ctx, {}, index, prefiltered),
    );
    const elapsed = performance.now() - start;

    expect(matches).toHaveLength(40);
    // §24.7 budget — keep generous margin for slow CI machines.
    expect(elapsed).toBeLessThan(200);
  });

  it("falls back to scan when no index is supplied", () => {
    const ctx = { file, content: "hello world", metadata: emptyMeta };
    expect(fileMatchesQueryIndexed(parseQuery("hello"), ctx)).toBe(true);
    expect(fileMatchesQueryIndexed(parseQuery("missing"), ctx)).toBe(false);
  });

  it("indexed path rejects files outside the candidate set without scanning content", () => {
    const index = createInvertedIndex();
    index.add("a.md", "alpha beta");
    index.add("b.md", "gamma delta");
    const query = parseQuery("alpha");
    // Even though we LIE about b.md's content containing "alpha", the index
    // says b.md is not a candidate, so the indexed predicate must reject it.
    expect(
      fileMatchesQueryIndexed(
        query,
        {
          file: { ...file, path: "b.md", name: "b.md" },
          content: "alpha alpha alpha", // a lie
          metadata: emptyMeta,
        },
        {},
        index,
      ),
    ).toBe(false);
  });
});

describe("findLineMatches", () => {
  it("returns lines containing any include term", () => {
    const matches = findLineMatches("first\nhello world\nbye world\n", parseQuery("hello"));
    expect(matches).toEqual([{ line: 1, preview: "hello world" }]);
  });

  it("treats line: terms as line-level matches", () => {
    const matches = findLineMatches("first\nhello world\nbye world\n", parseQuery("line:bye"));
    expect(matches).toEqual([{ line: 2, preview: "bye world" }]);
  });

  it("samples first nonempty line when no free or line terms", () => {
    const matches = findLineMatches("\n\nhello world\nmore", parseQuery("tag:foo"));
    expect(matches).toEqual([{ line: 2, preview: "hello world" }]);
  });
});
