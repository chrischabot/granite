import { describe, expect, it } from "vitest";
import {
  canvasKeyboardStep,
  constrainCanvasDeltaToAxis,
  duplicateCanvasSelection,
  normalizeCanvasRect,
  selectCanvasNodesInRect,
  snapCanvasValue,
} from "./interactions";
import type { Canvas } from "./schema";

describe("snapCanvasValue", () => {
  it("rounds to the grid when snapping is enabled", () => {
    expect(snapCanvasValue(24, true, 10)).toBe(20);
    expect(snapCanvasValue(25, true, 10)).toBe(30);
  });

  it("rounds only to whole pixels when snapping is disabled", () => {
    expect(snapCanvasValue(24.4, false, 10)).toBe(24);
    expect(snapCanvasValue(24.6, false, 10)).toBe(25);
  });

  it("guards non-finite values", () => {
    expect(snapCanvasValue(Number.NaN, true, 10)).toBe(0);
  });
});

describe("canvasKeyboardStep", () => {
  it("uses grid-sized steps when snapping is enabled", () => {
    expect(canvasKeyboardStep(true, 10, false)).toBe(10);
    expect(canvasKeyboardStep(true, 10, true)).toBe(50);
  });

  it("uses pixel-sized steps when snapping is disabled", () => {
    expect(canvasKeyboardStep(false, 10, false)).toBe(1);
    expect(canvasKeyboardStep(false, 10, true)).toBe(10);
  });
});

describe("normalizeCanvasRect", () => {
  it("normalizes reverse marquee drags", () => {
    expect(normalizeCanvasRect({ x: 40, y: 50 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 30,
    });
  });
});

describe("selectCanvasNodesInRect", () => {
  const canvas: Canvas = {
    nodes: [
      { id: "a", type: "text", x: 0, y: 0, width: 100, height: 80, text: "A" },
      { id: "b", type: "text", x: 120, y: 0, width: 100, height: 80, text: "B" },
      { id: "c", type: "text", x: 300, y: 0, width: 100, height: 80, text: "C" },
    ],
    edges: [],
  };

  it("selects nodes intersecting the marquee rectangle", () => {
    expect(selectCanvasNodesInRect(canvas.nodes, { x: 90, y: 20, width: 80, height: 30 })).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("constrainCanvasDeltaToAxis", () => {
  it("keeps the dominant drag axis", () => {
    expect(constrainCanvasDeltaToAxis(30, 10)).toEqual({ x: 30, y: 0 });
    expect(constrainCanvasDeltaToAxis(10, -30)).toEqual({ x: 0, y: -30 });
  });
});

describe("duplicateCanvasSelection", () => {
  it("duplicates selected nodes and internal edges with fresh ids", () => {
    const canvas: Canvas = {
      nodes: [
        { id: "a", type: "text", x: 0, y: 0, width: 100, height: 80, text: "A" },
        { id: "b", type: "text", x: 120, y: 0, width: 100, height: 80, text: "B" },
        { id: "c", type: "text", x: 300, y: 0, width: 100, height: 80, text: "C" },
      ],
      edges: [
        { id: "ab", fromNode: "a", toNode: "b" },
        { id: "bc", fromNode: "b", toNode: "c" },
      ],
    };
    const ids = ["a2", "b2", "ab2"];
    const result = duplicateCanvasSelection(canvas, ["a", "b"], () => ids.shift() ?? "x");

    expect(result.selectedIds).toEqual(["a2", "b2"]);
    expect(result.canvas.nodes).toHaveLength(5);
    expect(result.canvas.edges).toContainEqual({ id: "ab2", fromNode: "a2", toNode: "b2" });
    expect(result.canvas.edges).not.toContainEqual({ id: "bc", fromNode: "b2", toNode: "c" });
  });
});
