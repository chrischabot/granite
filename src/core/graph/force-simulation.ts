import { type QuadBody, buildQuadtree } from "./quadtree";

/**
 * Force-directed layout for the graph view.
 *
 * Design choices:
 *   - Repulsion uses a Barnes-Hut quadtree (O(n log n)) instead of pairwise
 *     loops. Theta defaults to 0.85 — empirically a sweet spot between speed
 *     and visual quality.
 *   - Edge attraction is a Hooke spring with `linkDistance` rest length and
 *     `attraction` stiffness.
 *   - Gentle center gravity prevents the cloud from drifting off-screen.
 *   - Velocity-Verlet style integrator with explicit damping per step. This
 *     handles large repulsion magnitudes without exploding because we cap
 *     per-step displacement at `maxStep`.
 *   - All numeric state lives in plain Float64Arrays so the simulation can be
 *     stepped from a rAF loop without allocating per frame.
 */

export const DEFAULT_THETA = 0.85;

export interface ForceParams {
  /** Repulsion magnitude (k in -k*m_i*m_j/r^2). */
  readonly repulsion: number;
  /** Spring stiffness for edges. */
  readonly attraction: number;
  /** Pull toward origin. */
  readonly centerForce: number;
  /** Spring rest length. */
  readonly linkDistance: number;
  /** Barnes-Hut opening angle. */
  readonly theta?: number;
  /** Velocity damping (0..1, 1 = no damping). */
  readonly damping?: number;
  /** Integration timestep — kept around 1 for stability with our forces. */
  readonly dt?: number;
  /** Hard cap on per-step displacement to avoid blow-ups. */
  readonly maxStep?: number;
  /**
   * Starting "temperature". Forces (except center pull) scale by alpha so that
   * an annealing schedule lets the system cool toward a low-energy minimum.
   */
  readonly alpha?: number;
  /** Multiplicative cooling factor applied each step (d3-style). */
  readonly alphaDecay?: number;
  /** Floor below which the simulation is considered settled. */
  readonly alphaMin?: number;
}

export interface SimEdge {
  /** Index into the node array. */
  readonly source: number;
  /** Index into the node array. */
  readonly target: number;
}

export interface SimNodeInput {
  readonly x: number;
  readonly y: number;
  /** Mass (defaults to 1 + degree-based weight when omitted). */
  readonly mass?: number;
}

export class ForceSimulation {
  readonly count: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly vx: Float64Array;
  readonly vy: Float64Array;
  readonly mass: Float64Array;
  private readonly edgeSrc: Int32Array;
  private readonly edgeDst: Int32Array;
  private readonly edgeCount: number;
  private readonly params: Required<ForceParams>;
  /** Last reported total kinetic energy — useful for stopping early. */
  energy = Number.POSITIVE_INFINITY;
  /** Current annealing temperature. Decays each step. */
  alpha: number;

  constructor(
    nodes: ReadonlyArray<SimNodeInput>,
    edges: ReadonlyArray<SimEdge>,
    params: ForceParams,
  ) {
    this.count = nodes.length;
    this.x = new Float64Array(this.count);
    this.y = new Float64Array(this.count);
    this.vx = new Float64Array(this.count);
    this.vy = new Float64Array(this.count);
    this.mass = new Float64Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const n = nodes[i];
      if (!n) continue;
      this.x[i] = Number.isFinite(n.x) ? n.x : 0;
      this.y[i] = Number.isFinite(n.y) ? n.y : 0;
      this.mass[i] = typeof n.mass === "number" && n.mass > 0 ? n.mass : 1;
    }
    this.edgeCount = edges.length;
    this.edgeSrc = new Int32Array(this.edgeCount);
    this.edgeDst = new Int32Array(this.edgeCount);
    for (let i = 0; i < this.edgeCount; i++) {
      const e = edges[i];
      if (!e) continue;
      this.edgeSrc[i] = e.source;
      this.edgeDst[i] = e.target;
    }
    this.params = {
      repulsion: params.repulsion,
      attraction: params.attraction,
      centerForce: params.centerForce,
      linkDistance: params.linkDistance,
      theta: params.theta ?? DEFAULT_THETA,
      damping: params.damping ?? 0.6,
      dt: params.dt ?? 1,
      maxStep: params.maxStep ?? 32,
      alpha: params.alpha ?? 1,
      alphaDecay: params.alphaDecay ?? 0.0228,
      alphaMin: params.alphaMin ?? 0.001,
    };
    this.alpha = this.params.alpha;
  }

  /** Re-anneal: bump alpha back up so the layout reacts to a graph change. */
  reheat(alpha = 1): void {
    this.alpha = alpha;
  }

  /** Advance the simulation by one step, returning the total kinetic energy. */
  step(): number {
    const {
      repulsion,
      attraction,
      centerForce,
      linkDistance,
      theta,
      damping,
      dt,
      maxStep,
      alphaDecay,
      alphaMin,
    } = this.params;

    // Anneal: cool the system each step. Once alpha < alphaMin we hold it
    // there and the simulation is essentially frozen.
    if (this.alpha > alphaMin) {
      this.alpha = Math.max(alphaMin, this.alpha - (this.alpha - alphaMin) * alphaDecay);
    }
    const alpha = this.alpha;

    // 1) Build quadtree from current positions.
    const bodies: QuadBody[] = new Array(this.count);
    for (let i = 0; i < this.count; i++) {
      bodies[i] = {
        x: this.x[i] ?? 0,
        y: this.y[i] ?? 0,
        mass: this.mass[i] ?? 1,
        index: i,
      };
    }
    const tree = buildQuadtree(bodies);

    // Force accumulators.
    const fx = new Float64Array(this.count);
    const fy = new Float64Array(this.count);

    // 2) Repulsion via Barnes-Hut.
    // Each cell exerts -repulsion * mi * mj / r^2 on the query point, directed
    // away from the cell's center of mass.
    for (let i = 0; i < this.count; i++) {
      const px = this.x[i] ?? 0;
      const py = this.y[i] ?? 0;
      const pm = this.mass[i] ?? 1;
      let ax = 0;
      let ay = 0;
      tree.forEachAt(
        px,
        py,
        theta,
        (agg) => {
          let dx = px - agg.comX;
          let dy = py - agg.comY;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1e-6) {
            // Jitter coincident bodies deterministically based on indices.
            const seed = (i * 16807 + agg.leafIndex * 2147483647) | 0;
            dx = ((seed & 0xffff) / 0xffff - 0.5) * 0.02;
            dy = (((seed >> 16) & 0xffff) / 0xffff - 0.5) * 0.02;
            d2 = dx * dx + dy * dy + 1e-6;
          }
          // Soft minimum distance — avoid singularities.
          if (d2 < 1) d2 = 1;
          const invD = 1 / Math.sqrt(d2);
          const f = (repulsion * pm * agg.mass * alpha) / d2;
          ax += dx * invD * f;
          ay += dy * invD * f;
        },
        i,
      );
      fx[i] = (fx[i] ?? 0) + ax;
      fy[i] = (fy[i] ?? 0) + ay;
    }

    // 3) Spring attraction along edges.
    for (let e = 0; e < this.edgeCount; e++) {
      const a = this.edgeSrc[e] ?? -1;
      const b = this.edgeDst[e] ?? -1;
      if (a < 0 || b < 0 || a >= this.count || b >= this.count) continue;
      const ax = this.x[a] ?? 0;
      const ay = this.y[a] ?? 0;
      const bx = this.x[b] ?? 0;
      const by = this.y[b] ?? 0;
      let dx = bx - ax;
      let dy = by - ay;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1e-6) {
        dx = 1;
        dy = 0;
        dist = 1;
      }
      const stretch = dist - linkDistance;
      const f = stretch * attraction * alpha;
      const fxComp = (dx / dist) * f;
      const fyComp = (dy / dist) * f;
      fx[a] = (fx[a] ?? 0) + fxComp;
      fy[a] = (fy[a] ?? 0) + fyComp;
      fx[b] = (fx[b] ?? 0) - fxComp;
      fy[b] = (fy[b] ?? 0) - fyComp;
    }

    // 4) Center pull + integrate (Verlet-style with damping).
    let energy = 0;
    for (let i = 0; i < this.count; i++) {
      const px = this.x[i] ?? 0;
      const py = this.y[i] ?? 0;
      const m = this.mass[i] ?? 1;
      // Center gravity scales with position (linear pull).
      const cx = -px * centerForce * m * alpha;
      const cy = -py * centerForce * m * alpha;
      const accX = ((fx[i] ?? 0) + cx) / m;
      const accY = ((fy[i] ?? 0) + cy) / m;

      let nvx = ((this.vx[i] ?? 0) + accX * dt) * damping;
      let nvy = ((this.vy[i] ?? 0) + accY * dt) * damping;

      // Clamp step length so a single huge repulsion can't fling a node out.
      const stepLen = Math.hypot(nvx * dt, nvy * dt);
      if (stepLen > maxStep) {
        const k = maxStep / stepLen;
        nvx *= k;
        nvy *= k;
      }

      // Guard against NaN / Infinity poisoning the simulation.
      if (!Number.isFinite(nvx) || !Number.isFinite(nvy)) {
        nvx = 0;
        nvy = 0;
      }

      this.vx[i] = nvx;
      this.vy[i] = nvy;
      this.x[i] = px + nvx * dt;
      this.y[i] = py + nvy * dt;
      energy += 0.5 * m * (nvx * nvx + nvy * nvy);
    }

    this.energy = energy;
    return energy;
  }

  /** Snapshot positions into caller-provided typed arrays (avoids allocation). */
  copyPositionsInto(outX: Float64Array, outY: Float64Array): void {
    outX.set(this.x);
    outY.set(this.y);
  }
}

/**
 * Convenience: run `steps` iterations and return final positions. Caller can
 * also pass `onStep` to observe per-step energy (e.g. for the test oracle).
 */
export function runSimulation(
  nodes: ReadonlyArray<SimNodeInput>,
  edges: ReadonlyArray<SimEdge>,
  params: ForceParams,
  steps: number,
  onStep?: (i: number, energy: number) => void,
): ForceSimulation {
  const sim = new ForceSimulation(nodes, edges, params);
  for (let i = 0; i < steps; i++) {
    const e = sim.step();
    onStep?.(i, e);
  }
  return sim;
}
