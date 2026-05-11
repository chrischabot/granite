import { describe, it, expect } from "vitest";
import { parseMetadata } from "./parser";

describe("parseMetadata", () => {
  it("parses frontmatter and aliases", () => {
    const src = `---
title: Hello
aliases:
  - Hi
  - Hey
tags: [a, b]
---
Body`;
    const m = parseMetadata(src);
    expect(m.frontmatter["title"]).toBe("Hello");
    expect(m.aliases).toEqual(["Hi", "Hey"]);
    expect(m.tags.map((t) => t.name).sort()).toEqual(["a", "b"]);
  });

  it("captures headings with line numbers", () => {
    const src = `# Top\n\nbody\n\n## Sub\n\n### Sub-sub\n`;
    const m = parseMetadata(src);
    expect(m.headings.map((h) => h.text)).toEqual(["Top", "Sub", "Sub-sub"]);
    expect(m.headings.map((h) => h.level)).toEqual([1, 2, 3]);
  });

  it("captures wikilinks and embeds", () => {
    const src = `See [[Note A]] and ![[Image.png]] and [[Note B|Display]] and [[Note C#Heading]]\n`;
    const m = parseMetadata(src);
    const targets = m.links.map((l) => l.target);
    expect(targets).toEqual(["Note A", "Image.png", "Note B", "Note C"]);
    expect(m.links.find((l) => l.target === "Image.png")?.embed).toBe(true);
    expect(m.links.find((l) => l.target === "Note B")?.display).toBe("Display");
    expect(m.links.find((l) => l.target === "Note C")?.heading).toBe("Heading");
  });

  it("extracts inline tags but skips numeric-only", () => {
    const src = `body #project/work and #y2024 but not #1234\n`;
    const m = parseMetadata(src);
    const names = m.tags.map((t) => t.name);
    expect(names).toContain("project/work");
    expect(names).toContain("y2024");
    expect(names).not.toContain("1234");
  });

  it("captures block IDs", () => {
    const src = `Some paragraph. ^abc-123\n`;
    const m = parseMetadata(src);
    expect(m.blocks.map((b) => b.id)).toEqual(["abc-123"]);
  });

  it("ignores tags inside fenced code", () => {
    const src = "```\n#fake\n```\n#real\n";
    const m = parseMetadata(src);
    const names = m.tags.map((t) => t.name);
    expect(names).toContain("real");
    expect(names).not.toContain("fake");
  });

  it("captures footnotes with definitions and references", () => {
    const src = [
      "Body with a ref [^one] and another [^two] and the orphan [^orphan].",
      "",
      "[^one]: First definition.",
      "[^two]: Second definition.",
      "[^unused]: Defined but never referenced.",
      "",
    ].join("\n");
    const m = parseMetadata(src);
    const ids = m.footnotes.map((f) => f.id);
    expect(ids).toContain("one");
    expect(ids).toContain("two");
    expect(ids).toContain("orphan");
    expect(ids).toContain("unused");

    const one = m.footnotes.find((f) => f.id === "one")!;
    expect(one.definitionLine).not.toBeNull();
    expect(one.references.length).toBe(1);
    expect(one.definitionBody).toContain("First definition");

    const orphan = m.footnotes.find((f) => f.id === "orphan")!;
    expect(orphan.definitionLine).toBeNull();
    expect(orphan.references.length).toBe(1);

    const unused = m.footnotes.find((f) => f.id === "unused")!;
    expect(unused.definitionLine).not.toBeNull();
    expect(unused.references.length).toBe(0);
  });

  it("sorts footnotes by definition or first-reference line", () => {
    const src = [
      "ref [^z] later",
      "ref [^a] earlier orphan",
      "[^z]: zee",
      "[^a]: aye",
    ].join("\n");
    const m = parseMetadata(src);
    expect(m.footnotes.map((f) => f.id)).toEqual(["z", "a"]);
  });

  it("ignores footnote refs inside inline code", () => {
    const src = "real [^a], code `[^b]` here.\n[^a]: ay";
    const m = parseMetadata(src);
    const ids = m.footnotes.map((f) => f.id);
    expect(ids).toContain("a");
    expect(ids).not.toContain("b");
  });
});