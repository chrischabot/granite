import { describe, expect, it } from "vitest";
import { canvasKeyboardStep, snapCanvasValue } from "./interactions";

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
