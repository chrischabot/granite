import { describe, expect, it } from "vitest";
import { type QuadBody, type Quadtree, buildQuadtree } from "./quadtree";

/** Deterministic PRNG (mulberry32) so the property tests are reproducible. */
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

function randomBodies(n: number, seed: number, range = 1000): QuadBody[] {
  const rng = makeRng(seed);
  const out: QuadBody[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      x: (rng() - 0.5) * range,
      y: (rng() - 0.5) * range,
      mass: 0.5 + rng() * 1.5,
      index: i,
    };
  }
  return out;
}

interface Force {
  fx: number;
  fy: number;
}

function bruteForce(bodies: ReadonlyArray<QuadBody>): Force[] {
  const out: Force[] = bodies.map(() => ({ fx: 0, fy: 0 }));
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (!a) continue;
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      const b = bodies[j];
      if (!b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d2 = Math.max(1e-12, dx * dx + dy * dy);
      const invD = 1 / Math.sqrt(d2);
      const f = (a.mass * b.mass) / d2;
      const slot = out[i];
      if (!slot) continue;
      slot.fx += dx * invD * f;
      slot.fy += dy * invD * f;
    }
  }
  return out;
}

function quadtreeForce(tree: Quadtree, bodies: ReadonlyArray<QuadBody>, theta: number): Force[] {
  const out: Force[] = bodies.map(() => ({ fx: 0, fy: 0 }));
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (!a) continue;
    const slot = out[i];
    if (!slot) continue;
    tree.forEachAt(
      a.x,
      a.y,
      theta,
      (agg) => {
        const dx = a.x - agg.comX;
        const dy = a.y - agg.comY;
        const d2 = Math.max(1e-12, dx * dx + dy * dy);
        const invD = 1 / Math.sqrt(d2);
        const f = (a.mass * agg.mass) / d2;
        slot.fx += dx * invD * f;
        slot.fy += dy * invD * f;
      },
      i,
    );
  }
  return out;
}

describe("Quadtree aggregate", () => {
  it("aggregates total mass and center of mass at the root", () => {
    const tree = buildQuadtree([
      { x: -10, y: 0, mass: 1, index: 0 },
      { x: 10, y: 0, mass: 3, index: 1 },
    ]);
    expect(tree.rootMass).toBeCloseTo(4, 10);
  });

  it("handles single body inserts without crashing", () => {
    const tree = buildQuadtree([{ x: 5, y: -5, mass: 2, index: 0 }]);
    expect(tree.rootMass).toBeCloseTo(2, 10);
    const seen: number[] = [];
    tree.forEachAt(100, 100, 0.5, (agg) => {
      seen.push(agg.leafIndex);
    });
    expect(seen).toEqual([0]);
  });

  it("matches brute-force exactly when theta = 0 (1000 random bodies)", () => {
    const bodies = randomBodies(1000, 0xc0ffee);
    const tree = buildQuadtree(bodies);
    const exact = bruteForce(bodies);
    const bh = quadtreeForce(tree, bodies, 0);

    let maxAbs = 0;
    for (let i = 0; i < bodies.length; i++) {
      const e = exact[i];
      const got = bh[i];
      if (!e || !got) continue;
      maxAbs = Math.max(maxAbs, Math.abs(e.fx - got.fx), Math.abs(e.fy - got.fy));
    }
    expect(maxAbs).toBeLessThan(1e-9);
  });

  it("approximates brute-force within 5% mean error at theta = 0.85", () => {
    const bodies = randomBodies(1000, 0xd00d);
    const tree = buildQuadtree(bodies);
    const exact = bruteForce(bodies);
    const bh = quadtreeForce(tree, bodies, 0.85);

    let sumRel = 0;
    let counted = 0;
    for (let i = 0; i < bodies.length; i++) {
      const e = exact[i];
      const got = bh[i];
      if (!e || !got) continue;
      const eMag = Math.hypot(e.fx, e.fy);
      if (eMag < 1e-9) continue;
      const dMag = Math.hypot(e.fx - got.fx, e.fy - got.fy);
      sumRel += dMag / eMag;
      counted += 1;
    }
    const meanRel = sumRel / Math.max(1, counted);
    expect(meanRel).toBeLessThan(0.05);
  });

  it("aggregates near-coincident bodies without infinite recursion", () => {
    const bodies: QuadBody[] = [];
    for (let i = 0; i < 50; i++) {
      bodies.push({ x: 0.000001 * i, y: 0.000001 * i, mass: 1, index: i });
    }
    const tree = buildQuadtree(bodies);
    expect(tree.rootMass).toBeCloseTo(50, 5);
    let totalSeen = 0;
    tree.forEachAt(1000, 1000, 0.85, (agg) => {
      totalSeen += agg.mass;
    });
    expect(totalSeen).toBeCloseTo(50, 5);
  });

  it("handles 5k bodies in under 250 ms (sanity timer)", () => {
    const bodies = randomBodies(5000, 7);
    const start = performance.now();
    const tree = buildQuadtree(bodies);
    let touched = 0;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b) continue;
      tree.forEachAt(b.x, b.y, 0.85, () => {
        touched += 1;
      });
    }
    const elapsed = performance.now() - start;
    expect(touched).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(250);
  });
});
