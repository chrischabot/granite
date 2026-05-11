import { describe, it, expect } from "vitest";
import {
  EMPTY_CANVAS,
  newCanvasId,
  parseCanvas,
  serializeCanvas,
  type Canvas,
} from "./schema";

describe("parseCanvas", () => {
  it("returns the empty canvas on garbage input", () => {
    expect(parseCanvas("not json")).toEqual(EMPTY_CANVAS);
    expect(parseCanvas("null")).toEqual(EMPTY_CANVAS);
    expect(parseCanvas("[]")).toEqual(EMPTY_CANVAS);
  });

  it("parses all four node types", () => {
    const src = JSON.stringify({
      nodes: [
        { id: "t1", type: "text", x: 0, y: 0, width: 200, height: 80, text: "Hello" },
        {
          id: "f1",
          type: "file",
          x: 300,
          y: 0,
          width: 240,
          height: 120,
          file: "notes/Hello.md",
          subpath: "#Heading",
        },
        {
          id: "l1",
          type: "link",
          x: 0,
          y: 200,
          width: 320,
          height: 80,
          url: "https://example.com",
        },
        {
          id: "g1",
          type: "group",
          x: -100,
          y: -100,
          width: 500,
          height: 500,
          label: "Concepts",
          color: "3",
        },
      ],
      edges: [
        { id: "e1", fromNode: "t1", toNode: "f1", fromSide: "right", toSide: "left", toEnd: "arrow" },
      ],
    });
    const c = parseCanvas(src);
    expect(c.nodes.length).toBe(4);
    expect(c.edges.length).toBe(1);
    const t = c.nodes.find((n) => n.id === "t1");
    expect(t?.type).toBe("text");
    const f = c.nodes.find((n) => n.id === "f1");
    expect(f?.type).toBe("file");
    if (f && f.type === "file") expect(f.subpath).toBe("#Heading");
    const l = c.nodes.find((n) => n.id === "l1");
    expect(l?.type).toBe("link");
    const g = c.nodes.find((n) => n.id === "g1");
    expect(g?.type).toBe("group");
    if (g && g.type === "group") expect(g.label).toBe("Concepts");
  });

  it("fills missing dimensions with defaults", () => {
    const src = JSON.stringify({
      nodes: [{ id: "n", type: "text", text: "X" }],
      edges: [],
    });
    const c = parseCanvas(src);
    expect(c.nodes.length).toBe(1);
    const n = c.nodes[0]!;
    expect(n.width).toBeGreaterThan(0);
    expect(n.height).toBeGreaterThan(0);
  });

  it("drops nodes/edges missing required fields", () => {
    const src = JSON.stringify({
      nodes: [
        { id: "ok", type: "text", text: "X" },
        { id: "bad" }, // no type → dropped
        { type: "text", text: "X" }, // no id → dropped
        { id: "ok2", type: "unknown" }, // unknown type → dropped
      ],
      edges: [
        { id: "e1", fromNode: "ok", toNode: "ok" },
        { id: "e2", fromNode: "ok" }, // no toNode → dropped
        { fromNode: "a", toNode: "b" }, // no id → dropped
      ],
    });
    const c = parseCanvas(src);
    expect(c.nodes.map((n) => n.id)).toEqual(["ok"]);
    expect(c.edges.map((e) => e.id)).toEqual(["e1"]);
  });
});

describe("serializeCanvas", () => {
  it("round-trips a non-trivial canvas through parse + serialize", () => {
    const canvas: Canvas = {
      nodes: [
        {
          id: "t",
          type: "text",
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          text: "Hi",
          color: "2",
        },
      ],
      edges: [
        {
          id: "e",
          fromNode: "t",
          toNode: "t",
          fromSide: "right",
          toEnd: "arrow",
        },
      ],
    };
    const json = serializeCanvas(canvas);
    expect(parseCanvas(json)).toEqual(canvas);
  });

  it("ends with a newline (so file diffs stay clean)", () => {
    expect(serializeCanvas(EMPTY_CANVAS).endsWith("\n")).toBe(true);
  });
});

describe("newCanvasId", () => {
  it("produces unique-looking IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(newCanvasId());
    expect(ids.size).toBe(50);
  });
});