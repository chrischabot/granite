import { describe, expect, it } from "vitest";
import {
  ForceSimulation,
  type SimEdge,
  type SimNodeInput,
  runSimulation,
} from "./force-simulation";

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomGraph(n: number, edgeProb: number, seed: number) {
  const rng = makeRng(seed);
  const nodes: SimNodeInput[] = [];
  for (let i = 0; i < n; i++) {
    const angle = rng() * Math.PI * 2;
    const r = 50 + rng() * 200;
    nodes.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r, mass: 1 });
  }
  const edges: SimEdge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rng() < edgeProb) edges.push({ source: i, target: j });
    }
  }
  return { nodes, edges };
}

const PARAMS = {
  repulsion: 6000,
  attraction: 0.005,
  centerForce: 0.001,
  linkDistance: 80,
  theta: 0.85,
  damping: 0.6,
  dt: 1,
  maxStep: 32,
  alphaDecay: 0.05,
};

describe("ForceSimulation", () => {
  it("converges on a 100-node random graph (final delta < 0.01 after warmup)", () => {
    const { nodes, edges } = randomGraph(100, 0.04, 11);
    const sim = new ForceSimulation(nodes, edges, PARAMS);
    let prevX = new Float64Array(sim.x);
    let prevY = new Float64Array(sim.y);
    let maxDeltaAfterWarmup = 0;
    for (let step = 0; step < 200; step++) {
      sim.step();
      if (step >= 150) {
        let md = 0;
        for (let i = 0; i < sim.count; i++) {
          const dx = (sim.x[i] ?? 0) - (prevX[i] ?? 0);
          const dy = (sim.y[i] ?? 0) - (prevY[i] ?? 0);
          md = Math.max(md, Math.hypot(dx, dy));
        }
        maxDeltaAfterWarmup = Math.max(maxDeltaAfterWarmup, md);
      }
      prevX = new Float64Array(sim.x);
      prevY = new Float64Array(sim.y);
    }
    expect(maxDeltaAfterWarmup).toBeLessThan(0.01);
  });

  it("trends toward lower energy on a 1000-node random graph", () => {
    const { nodes, edges } = randomGraph(1000, 0.002, 7);
    const sim = new ForceSimulation(nodes, edges, PARAMS);
    const samples: number[] = [];
    for (let step = 0; step < 200; step++) {
      const e = sim.step();
      if (step % 20 === 19) samples.push(e);
    }
    // The first sample is the very-noisy initial kick; compare 2nd to last.
    const first = samples[1] ?? Number.POSITIVE_INFINITY;
    const last = samples[samples.length - 1] ?? Number.POSITIVE_INFINITY;
    expect(last).toBeLessThan(first);
  });

  it("never produces NaN or Infinity at any step across the integration sweep", () => {
    const { nodes, edges } = randomGraph(80, 0.05, 42);
    for (const dt of [0.01, 0.1, 0.5, 1.0]) {
      const sim = new ForceSimulation(nodes, edges, { ...PARAMS, dt });
      for (let step = 0; step < 200; step++) {
        sim.step();
        // Per-step assertion: a transient NaN clamped to 0 by an internal
        // guard would slip past a final-only check. Reading the buffers
        // every step catches a one-frame divergence.
        for (let i = 0; i < sim.count; i++) {
          if (
            !Number.isFinite(sim.x[i] ?? 0) ||
            !Number.isFinite(sim.y[i] ?? 0) ||
            !Number.isFinite(sim.vx[i] ?? 0) ||
            !Number.isFinite(sim.vy[i] ?? 0)
          ) {
            throw new Error(
              `Non-finite simulation state at dt=${dt}, step=${step}, node=${i}: x=${sim.x[i]} y=${sim.y[i]} vx=${sim.vx[i]} vy=${sim.vy[i]}`,
            );
          }
        }
      }
    }
  });

  it("stays bounded — energy does not grow unbounded across the dt sweep", () => {
    const { nodes, edges } = randomGraph(120, 0.03, 99);
    for (const dt of [0.01, 0.1, 0.5, 1.0]) {
      const sim = new ForceSimulation(nodes, edges, { ...PARAMS, dt });
      let earlyEnergy = 0;
      let lateEnergy = 0;
      for (let step = 0; step < 200; step++) {
        const e = sim.step();
        if (step === 5) earlyEnergy = e;
        if (step >= 195) lateEnergy = Math.max(lateEnergy, e);
      }
      // Late energy should not exceed the early kinetic burst by more than
      // a small slack. If integration explodes, this jumps to thousands.
      expect(lateEnergy).toBeLessThan(earlyEnergy * 5 + 100);
    }
  });

  it("runs 60 steps on a 1000-node graph within the perf budget", () => {
    const { nodes, edges } = randomGraph(1000, 0.002, 5);
    const start = performance.now();
    runSimulation(nodes, edges, PARAMS, 60);
    const elapsed = performance.now() - start;
    // 60 steps at 1k nodes — with Barnes-Hut this should be far under 2s.
    expect(elapsed).toBeLessThan(2000);
  });
});
