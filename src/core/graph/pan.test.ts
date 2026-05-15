import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ForceSimulation, type SimEdge, type SimNodeInput } from "./force-simulation";
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

  it("keeps GraphView routed through the shared pan helpers", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/GraphView.tsx`, "utf8");

    expect(source).toContain(
      'import { transformForGraphViewport, viewportForPanDrag } from "@core/graph/pan";',
    );
    expect(source.match(/transformForGraphViewport/g)).toHaveLength(3);
    expect(source.match(/viewportForPanDrag/g)).toHaveLength(2);
  });

  it("simulates and renders a 1000-node graph under the per-frame budget", () => {
    // Severe perf gate: if anyone reverts the simulation to O(n^2) loops this
    // test must fail. 60 frames on 1000 nodes is well above the rAF cadence
    // budget at 30 fps (2000 ms).
    const N = 1000;
    const nodes: SimNodeInput[] = [];
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      nodes.push({ x: Math.cos(angle) * 200, y: Math.sin(angle) * 200, mass: 1 });
    }
    const edges: SimEdge[] = [];
    for (let i = 0; i < N - 1; i++) edges.push({ source: i, target: i + 1 });
    const sim = new ForceSimulation(nodes, edges, {
      repulsion: 6000,
      attraction: 0.005,
      centerForce: 0.001,
      linkDistance: 80,
    });

    const view = { x: 0, y: 0, scale: 1 };
    const size = { w: 1200, h: 800 };
    const start = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      sim.step();
      // Apply the same pan/transform math the canvas would use.
      const next = viewportForPanDrag(
        view,
        { startX: 0, startY: 0, viewX: 0, viewY: 0 },
        frame,
        -frame,
      );
      transformForGraphViewport(next, size);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});
