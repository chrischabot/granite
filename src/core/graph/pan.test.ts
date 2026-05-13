import { describe, expect, it } from "vitest";
import { transformForGraphViewport, viewportForPanDrag } from "./pan";

describe("graph pan helpers", () => {
  it("keeps drag movement as viewport math without changing scale", () => {
    const next = viewportForPanDrag(
      { x: 3, y: 4, scale: 1.75 },
      { startX: 10, startY: 20, viewX: 100, viewY: 200 },
      16,
      11,
    );

    expect(next).toEqual({ x: 106, y: 191, scale: 1.75 });
  });

  it("formats the SVG viewport transform from center-offset view state", () => {
    expect(transformForGraphViewport({ x: 25, y: -10, scale: 1.5 }, { w: 800, h: 600 })).toBe(
      "translate(425,290) scale(1.5)",
    );
  });

  it("keeps 10k imperative pan transform calculations inside a frame budget", () => {
    let view = { x: 0, y: 0, scale: 1 };
    const drag = { startX: 100, startY: 100, viewX: 0, viewY: 0 };
    const size = { w: 1200, h: 800 };
    let transform = "";

    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      view = viewportForPanDrag(view, drag, 100 + i, 100 - i);
      transform = transformForGraphViewport(view, size);
    }
    const elapsed = performance.now() - start;

    expect(transform).toBe("translate(10599,-9599) scale(1)");
    expect(elapsed).toBeLessThan(16);
  });
});
