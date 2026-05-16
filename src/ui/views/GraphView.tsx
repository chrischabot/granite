import { stem } from "@core/fs/path";
import type { VaultFile } from "@core/fs/types";
import { colorForString, folderColorForPath, tagColorForFile } from "@core/graph/colors";
import { ForceSimulation, type SimEdge, type SimNodeInput } from "@core/graph/force-simulation";
import { firstMatchingGroup } from "@core/graph/groups";
import { transformForGraphViewport, viewportForPanDrag } from "@core/graph/pan";
import {
  DEFAULT_GRAPH_CONFIG,
  type GraphColorMode,
  addGraphGroup,
  getGraphConfig,
  getGraphVersion,
  hydrateGraphConfig,
  removeGraphGroup,
  subscribeGraph,
  updateGraphConfig,
  updateGraphDisplay,
  updateGraphForces,
  updateGraphGroup,
} from "@core/graph/store";
import { metadataCache } from "@core/metadata/cache";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import { fileMatchesQuery, parseQuery } from "@core/search/query";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { Plus, Settings2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "../i18n/useI18n";

interface GraphNode {
  id: string;
  path: string;
  display: string;
  tags: string[];
  frontmatter: Record<string, unknown>;
  weight: number;
  /** Color resolved at build time so the render loop never re-evaluates. */
  color: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface BuiltGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  neighbors: Map<string, Set<string>>;
}

/**
 * Hit test against the rendered node positions in world coordinates.
 * Exported for unit tests / fixtures that want to drive interactions.
 */
export function hitTestNode(
  worldX: number,
  worldY: number,
  positionsX: Float64Array,
  positionsY: Float64Array,
  radius: number,
): number {
  const r2 = radius * radius;
  let best = -1;
  let bestD2 = r2;
  for (let i = 0; i < positionsX.length; i++) {
    const dx = (positionsX[i] ?? 0) - worldX;
    const dy = (positionsY[i] ?? 0) - worldY;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = i;
    }
  }
  return best;
}

/**
 * Render one frame of the graph into a 2D canvas. Pure function over the
 * passed-in arrays — no global state, so it's safe to share with the browser
 * verifier fixture.
 */
export function drawGraphFrame(
  ctx: CanvasRenderingContext2D,
  options: {
    size: { w: number; h: number };
    view: { x: number; y: number; scale: number };
    dpr: number;
    positionsX: Float64Array;
    positionsY: Float64Array;
    weights: Float64Array;
    colors: string[];
    edgeSrc: Int32Array;
    edgeDst: Int32Array;
    nodeSize: number;
    linkThickness: number;
    showLabels: boolean;
    labelSize: number;
    labels: string[];
    hoveredIndex: number;
    neighborMask: Uint8Array;
    focusedIndex: number;
    background: string;
    accent: string;
    edgeColor: string;
    nodeStroke: string;
    textColor: string;
  },
): void {
  const {
    size,
    view,
    dpr,
    positionsX,
    positionsY,
    weights,
    colors,
    edgeSrc,
    edgeDst,
    nodeSize,
    linkThickness,
    showLabels,
    labelSize,
    labels,
    hoveredIndex,
    neighborMask,
    focusedIndex,
    background,
    accent,
    edgeColor,
    nodeStroke,
    textColor,
  } = options;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size.w, size.h);

  const cx = size.w / 2 + view.x;
  const cy = size.h / 2 + view.y;
  ctx.translate(cx, cy);
  ctx.scale(view.scale, view.scale);

  // Edges first.
  const invScale = 1 / Math.max(0.7, view.scale);
  ctx.lineWidth = linkThickness * invScale;
  ctx.strokeStyle = edgeColor;
  const dimEdgeAlpha = hoveredIndex >= 0 ? 0.1 : 0.45;
  const highlightEdgeAlpha = 0.9;
  ctx.beginPath();
  for (let e = 0; e < edgeSrc.length; e++) {
    const a = edgeSrc[e] ?? -1;
    const b = edgeDst[e] ?? -1;
    if (a < 0 || b < 0) continue;
    const highlight = hoveredIndex >= 0 && (a === hoveredIndex || b === hoveredIndex);
    if (highlight) continue;
    ctx.moveTo(positionsX[a] ?? 0, positionsY[a] ?? 0);
    ctx.lineTo(positionsX[b] ?? 0, positionsY[b] ?? 0);
  }
  ctx.globalAlpha = dimEdgeAlpha;
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (hoveredIndex >= 0) {
    ctx.beginPath();
    for (let e = 0; e < edgeSrc.length; e++) {
      const a = edgeSrc[e] ?? -1;
      const b = edgeDst[e] ?? -1;
      if (a !== hoveredIndex && b !== hoveredIndex) continue;
      ctx.moveTo(positionsX[a] ?? 0, positionsY[a] ?? 0);
      ctx.lineTo(positionsX[b] ?? 0, positionsY[b] ?? 0);
    }
    ctx.globalAlpha = highlightEdgeAlpha;
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Nodes — batched by color so we do one path per fill style. At 10k nodes
  // this is the single biggest performance lever: 10k arc() calls in one
  // path are an order of magnitude cheaper than 10k individual fill+stroke
  // pairs because the canvas can short-circuit redundant state changes.
  const baseR = nodeSize * invScale;
  ctx.lineWidth = 1 * invScale;
  ctx.strokeStyle = nodeStroke;

  const hasHover = hoveredIndex >= 0;
  if (!hasHover && focusedIndex < 0) {
    // Fast path — no hover/focus, batch by color.
    const byColor = new Map<string, number[]>();
    for (let i = 0; i < positionsX.length; i++) {
      const c = colors[i] ?? "#888";
      let arr = byColor.get(c);
      if (!arr) {
        arr = [];
        byColor.set(c, arr);
      }
      arr.push(i);
    }
    for (const [color, indices] of byColor) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const i of indices) {
        const w = Math.max(0.6, Math.min(2.2, Math.sqrt(weights[i] ?? 1) * 0.6));
        const r = baseR * w;
        const px = positionsX[i] ?? 0;
        const py = positionsY[i] ?? 0;
        ctx.moveTo(px + r, py);
        ctx.arc(px, py, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Slow path — hover/focus needs per-node tinting and alpha.
    for (let i = 0; i < positionsX.length; i++) {
      const isHover = i === hoveredIndex;
      const isNeighbor = neighborMask[i] === 1;
      const dim = hasHover && !isHover && !isNeighbor;
      const w = Math.max(0.6, Math.min(2.2, Math.sqrt(weights[i] ?? 1) * 0.6));
      const r = baseR * w * (isHover ? 1.4 : 1);
      ctx.globalAlpha = dim ? 0.25 : 1;
      ctx.beginPath();
      ctx.fillStyle = isHover || i === focusedIndex ? accent : (colors[i] ?? "#888");
      ctx.arc(positionsX[i] ?? 0, positionsY[i] ?? 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (showLabels) {
    ctx.font = `${labelSize * invScale}px var(--font-interface, sans-serif)`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < positionsX.length; i++) {
      const isHover = i === hoveredIndex;
      const isNeighbor = neighborMask[i] === 1;
      const dim = hoveredIndex >= 0 && !isHover && !isNeighbor;
      const w = Math.max(0.6, Math.min(2.2, Math.sqrt(weights[i] ?? 1) * 0.6));
      const r = baseR * w;
      ctx.globalAlpha = dim ? 0.4 : 1;
      ctx.fillText(labels[i] ?? "", positionsX[i] ?? 0, (positionsY[i] ?? 0) + r + 4 * invScale);
    }
    ctx.globalAlpha = 1;
  }
}

export function GraphView() {
  const metadataVersion = useMetadataVersion();
  useSyncExternalStore(subscribeGraph, getGraphVersion, getGraphVersion);
  const config = getGraphConfig();
  const t = useI18n();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformLabelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const viewRef = useRef(view);
  const [hover, setHover] = useState<number>(-1);
  const hoverRef = useRef(-1);
  const [focusIdx, setFocusIdx] = useState<number>(-1);
  const focusIdxRef = useRef(-1);
  const [showControls, setShowControls] = useState(true);
  const draggingRef = useRef<{
    startX: number;
    startY: number;
    viewX: number;
    viewY: number;
    moved: boolean;
  } | null>(null);
  const { groups: wsGroups, activeGroupId, leaves } = useWorkspace();

  // Hydrate config from disk once on mount.
  useEffect(() => {
    void hydrateGraphConfig();
  }, []);

  const activePath = useMemo(() => {
    const g = activeGroupId ? wsGroups.get(activeGroupId) : null;
    const leaf = g?.activeLeafId ? leaves.get(g.activeLeafId) : null;
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  }, [activeGroupId, wsGroups, leaves]);

  // Build the graph from the metadata cache.
  const built: BuiltGraph = useMemo(() => {
    void metadataVersion;
    const out: BuiltGraph = { nodes: [], edges: [], neighbors: new Map() };
    const fileEntries = metadataCache.getAllSwitcherEntries().filter((e) => e.alias === null);
    const parsedFilter = config.filter.trim() ? parseQuery(config.filter) : null;
    const filterMatches = (path: string, tags: string[], fm: Record<string, unknown>) => {
      if (!parsedFilter) return true;
      const fakeFile: VaultFile = {
        type: "file",
        path,
        name: path.split("/").pop() ?? path,
        size: 0,
        mtimeMs: 0,
        ctimeMs: 0,
        extension: "md",
      } as VaultFile;
      return fileMatchesQuery(
        parsedFilter,
        {
          file: fakeFile,
          content: "",
          metadata: {
            frontmatter: fm,
            aliases: [],
            cssClasses: [],
            headings: [],
            links: [],
            tags: tags.map((tag, line) => ({ name: tag, line })),
            blocks: [],
            footnotes: [],
            isEmpty: false,
          },
        },
        { matchCase: false },
      );
    };

    const nodeIds = new Set<string>();
    const stemToId = new Map<string, string>();
    for (const e of fileEntries) {
      const meta = metadataCache.getMetadata(e.path);
      const tags = meta ? [...new Set(meta.tags.map((tag) => tag.name))] : [];
      const fm = meta ? meta.frontmatter : {};
      if (!filterMatches(e.path, tags, fm)) continue;
      const id = e.path;
      nodeIds.add(id);
      stemToId.set(stem(e.path).toLowerCase(), id);
      out.nodes.push({
        id,
        path: e.path,
        display: stem(e.path),
        tags,
        frontmatter: fm,
        weight: 1,
        color: "var(--text-muted)",
      });
      out.neighbors.set(id, new Set());
    }
    for (const node of out.nodes) {
      const meta = metadataCache.getMetadata(node.path);
      if (!meta) continue;
      const seenTargets = new Set<string>();
      for (const link of meta.links) {
        const candidate =
          stemToId.get(link.target.toLowerCase()) ??
          (nodeIds.has(`${link.target}.md`) ? `${link.target}.md` : null);
        if (!candidate || candidate === node.id) continue;
        if (seenTargets.has(candidate)) continue;
        seenTargets.add(candidate);
        out.edges.push({ source: node.id, target: candidate });
        out.neighbors.get(node.id)?.add(candidate);
        out.neighbors.get(candidate)?.add(node.id);
      }
    }

    if (config.localGraph && activePath) {
      const keep = new Set<string>();
      const seedId = activePath;
      if (nodeIds.has(seedId)) {
        let frontier = new Set([seedId]);
        keep.add(seedId);
        for (let h = 0; h < Math.max(1, config.localHops); h++) {
          const next = new Set<string>();
          for (const id of frontier) {
            for (const n of out.neighbors.get(id) ?? []) {
              if (!keep.has(n)) {
                keep.add(n);
                next.add(n);
              }
            }
          }
          frontier = next;
          if (frontier.size === 0) break;
        }
      }
      out.nodes = out.nodes.filter((n) => keep.has(n.id));
      const keptIds = new Set(out.nodes.map((n) => n.id));
      out.edges = out.edges.filter((e) => keptIds.has(e.source) && keptIds.has(e.target));
      const newNeighbors = new Map<string, Set<string>>();
      for (const id of keptIds) {
        const src = out.neighbors.get(id);
        if (!src) continue;
        newNeighbors.set(id, new Set([...src].filter((n) => keptIds.has(n))));
      }
      out.neighbors = newNeighbors;
    }

    for (const n of out.nodes) {
      n.weight = 1 + (out.neighbors.get(n.id)?.size ?? 0);
    }
    return out;
  }, [metadataVersion, config.filter, config.localGraph, config.localHops, activePath]);

  const colorFor = useCallback(
    (n: GraphNode): string => {
      if (config.colorMode === "groups") {
        const match = firstMatchingGroup(config.groups, {
          path: n.path,
          tags: n.tags,
          frontmatter: n.frontmatter,
        });
        if (match) return match.color;
      } else if (config.colorMode === "tag") {
        const c = tagColorForFile(n.tags);
        if (c) return c;
      } else if (config.colorMode === "folder") {
        return folderColorForPath(n.path);
      }
      // Canvas2D fillStyle silently rejects CSS var() strings, so resolve at
      // build time. The token is roughly --text-muted but we pick a hex that
      // reads OK against both the light and dark backgrounds.
      return "#888888";
    },
    [config.colorMode, config.groups],
  );

  // Pre-compute color array whenever the color mode / groups change.
  const resolvedColors = useMemo(
    () => built.nodes.map((n) => colorFor(n)),
    [built.nodes, colorFor],
  );
  const labels = useMemo(() => built.nodes.map((n) => n.display), [built.nodes]);
  const idToIndex = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < built.nodes.length; i++) {
      const n = built.nodes[i];
      if (n) m.set(n.id, i);
    }
    return m;
  }, [built.nodes]);

  // Edge index arrays in typed form for the render path.
  const edgeArrays = useMemo(() => {
    const src = new Int32Array(built.edges.length);
    const dst = new Int32Array(built.edges.length);
    for (let i = 0; i < built.edges.length; i++) {
      const e = built.edges[i];
      if (!e) continue;
      src[i] = idToIndex.get(e.source) ?? -1;
      dst[i] = idToIndex.get(e.target) ?? -1;
    }
    return { src, dst };
  }, [built.edges, idToIndex]);

  // Per-node neighbour bitmask used by the render to dim non-neighbours.
  const neighborMask = useMemo(() => {
    return new Uint8Array(built.nodes.length);
  }, [built.nodes.length]);

  // Live simulation reference + rAF loop.
  const simRef = useRef<ForceSimulation | null>(null);
  const rafRef = useRef<number>(0);
  const weightsRef = useRef<Float64Array>(new Float64Array(0));

  // Build a new simulation whenever the graph topology or forces change.
  useEffect(() => {
    if (built.nodes.length === 0) {
      simRef.current = null;
      weightsRef.current = new Float64Array(0);
      return;
    }
    const initial: SimNodeInput[] = built.nodes.map((n, i) => {
      const angle = (i / Math.max(1, built.nodes.length)) * Math.PI * 2;
      const r = 160 + Math.sqrt(built.nodes.length);
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        mass: n.weight,
      };
    });
    const simEdges: SimEdge[] = [];
    for (let i = 0; i < built.edges.length; i++) {
      const a = edgeArrays.src[i] ?? -1;
      const b = edgeArrays.dst[i] ?? -1;
      if (a >= 0 && b >= 0) simEdges.push({ source: a, target: b });
    }
    simRef.current = new ForceSimulation(initial, simEdges, {
      repulsion: config.forces.repulsion,
      attraction: config.forces.attraction,
      centerForce: config.forces.centerForce,
      linkDistance: config.forces.linkDistance,
      // Use a slightly faster decay than d3 default so the layout settles
      // within ~120-150 frames for typical vault sizes.
      alphaDecay: 0.04,
      damping: 0.6,
    });
    const w = new Float64Array(built.nodes.length);
    for (let i = 0; i < built.nodes.length; i++) w[i] = built.nodes[i]?.weight ?? 1;
    weightsRef.current = w;
  }, [built.nodes, built.edges, edgeArrays, config.forces]);

  // Resize observer; recalculates DPR + canvas backing-store size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Update the offscreen transform mirror element whenever view/size change.
  useEffect(() => {
    viewRef.current = view;
    if (transformLabelRef.current) {
      transformLabelRef.current.setAttribute(
        "data-transform",
        transformForGraphViewport(view, size),
      );
    }
  }, [view, size]);

  useEffect(() => {
    hoverRef.current = hover;
  }, [hover]);
  useEffect(() => {
    focusIdxRef.current = focusIdx;
  }, [focusIdx]);

  // Single rAF loop that owns both simulation stepping AND canvas redraw.
  // No React state is bumped per-frame, so render cost stays constant.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;

    canvas.width = Math.max(1, Math.floor(size.w * dpr));
    canvas.height = Math.max(1, Math.floor(size.h * dpr));
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;

    const bg = readCssVar(canvas, "--background-primary", "#1e1e1e");
    const accent = readCssVar(canvas, "--text-accent", "#7c52ed");
    const edgeColor = readCssVar(canvas, "--text-muted", "#888");
    const nodeStroke = readCssVar(canvas, "--background-primary", "#1e1e1e");
    const textColor = readCssVar(canvas, "--text-normal", "#ddd");

    const renderOnce = () => {
      const sim = simRef.current;
      const positionsX = sim ? sim.x : new Float64Array(0);
      const positionsY = sim ? sim.y : new Float64Array(0);
      const weights = weightsRef.current;
      const hoveredIndex = hoverRef.current;
      const focusedIndex = focusIdxRef.current;

      // Neighbour mask for dimming. Reset to 0 each frame.
      neighborMask.fill(0);
      if (hoveredIndex >= 0) {
        const hoveredNode = built.nodes[hoveredIndex];
        if (hoveredNode) {
          const set = built.neighbors.get(hoveredNode.id);
          if (set) {
            for (const id of set) {
              const idx = idToIndex.get(id);
              if (idx !== undefined) neighborMask[idx] = 1;
            }
          }
        }
      }

      drawGraphFrame(ctx, {
        size,
        view: viewRef.current,
        dpr,
        positionsX,
        positionsY,
        weights,
        colors: resolvedColors,
        edgeSrc: edgeArrays.src,
        edgeDst: edgeArrays.dst,
        nodeSize: config.display.nodeSize,
        linkThickness: config.display.linkThickness,
        showLabels: viewRef.current.scale > config.display.textFadeThreshold,
        labelSize: config.display.textSize,
        labels,
        hoveredIndex,
        neighborMask,
        focusedIndex,
        background: bg,
        accent,
        edgeColor,
        nodeStroke,
        textColor,
      });
    };

    const tick = () => {
      const sim = simRef.current;
      // Skip simulation work once the layout has cooled. Panning still
      // renders every frame, but we don't waste cycles recomputing forces
      // on a settled graph.
      if (sim && sim.alpha > 0.005) sim.step();
      renderOnce();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    size,
    built.nodes,
    built.neighbors,
    idToIndex,
    edgeArrays,
    resolvedColors,
    labels,
    config.display.nodeSize,
    config.display.linkThickness,
    config.display.textFadeThreshold,
    config.display.textSize,
    neighborMask,
  ]);

  // Pan + zoom handlers.
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const cx = size.w / 2 + viewRef.current.x;
      const cy = size.h / 2 + viewRef.current.y;
      return {
        x: (sx - cx) / viewRef.current.scale,
        y: (sy - cy) / viewRef.current.scale,
      };
    },
    [size],
  );

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      viewX: viewRef.current.x,
      viewY: viewRef.current.y,
      moved: false,
    };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const drag = draggingRef.current;
    if (drag) {
      const next = viewportForPanDrag(viewRef.current, drag, e.clientX, e.clientY);
      if (next.x !== viewRef.current.x || next.y !== viewRef.current.y) drag.moved = true;
      viewRef.current = next;
      return;
    }
    // Hover hit-test in world space.
    const sim = simRef.current;
    if (!sim) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const hitR = (config.display.nodeSize * 2.5) / Math.max(0.7, viewRef.current.scale);
    const idx = hitTestNode(world.x, world.y, sim.x, sim.y, hitR);
    if (idx !== hoverRef.current) setHover(idx);
  };
  const onMouseUp = (e: React.MouseEvent) => {
    const drag = draggingRef.current;
    if (drag) {
      setView(viewRef.current);
      if (!drag.moved) {
        // Treat as click on the hovered node.
        const sim = simRef.current;
        if (sim) {
          const world = screenToWorld(e.clientX, e.clientY);
          const hitR = (config.display.nodeSize * 2.5) / Math.max(0.7, viewRef.current.scale);
          const idx = hitTestNode(world.x, world.y, sim.x, sim.y, hitR);
          if (idx >= 0) {
            const node = built.nodes[idx];
            if (node) {
              workspaceStore.openFile(node.path, {
                newTab: e.metaKey || e.ctrlKey,
              });
            }
          }
        }
      }
    }
    draggingRef.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setView((v) => {
      const next = { ...v, scale: Math.max(0.2, Math.min(3, v.scale * factor)) };
      viewRef.current = next;
      return next;
    });
  };

  if (built.nodes.length === 0) {
    return (
      <div ref={containerRef} className="graph-view graph-view-empty">
        {config.filter || config.localGraph ? t("graph.empty.filtered") : t("graph.empty.noNotes")}
      </div>
    );
  }

  const focusedPath =
    focusIdx >= 0 && focusIdx < built.nodes.length ? (built.nodes[focusIdx]?.path ?? null) : null;

  return (
    <div
      ref={containerRef}
      className={`graph-view${draggingRef.current ? " is-dragging" : ""}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel as unknown as React.WheelEventHandler}
    >
      <canvas ref={canvasRef} className="graph-view-canvas" aria-label={t("graph.aria")} role="img">
        <title>{t("graph.aria")}</title>
      </canvas>
      {/* Accessibility mirror — focusable list of nodes for keyboard nav. */}
      <ul className="graph-node-interactive-list" aria-label={t("graph.aria")}>
        {built.nodes.map((n, i) => (
          <li key={n.id}>
            <button
              type="button"
              className="graph-node-interactive"
              data-graph-node-id={n.id}
              tabIndex={0}
              onFocus={() => setFocusIdx(i)}
              onBlur={() => setFocusIdx((cur) => (cur === i ? -1 : cur))}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? -1 : h))}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  workspaceStore.openFile(n.path, {
                    newTab: ev.metaKey || ev.ctrlKey,
                  });
                }
              }}
              onClick={(ev) => {
                ev.stopPropagation();
                workspaceStore.openFile(n.path, {
                  newTab: ev.metaKey || ev.ctrlKey,
                });
              }}
            >
              {n.display}
            </button>
          </li>
        ))}
      </ul>
      <div
        ref={transformLabelRef}
        className="graph-view-transform-mirror"
        aria-hidden="true"
        data-transform={transformForGraphViewport(view, size)}
      />
      <div className="graph-view-stats">
        {t("graph.stats", {
          nodes: built.nodes.length,
          nodeLabel: t(built.nodes.length === 1 ? "graph.node" : "graph.nodes"),
          links: built.edges.length,
          linkLabel: t(built.edges.length === 1 ? "graph.link" : "graph.links"),
        })}
        {focusedPath ? <span className="graph-view-focused-path"> · {focusedPath}</span> : null}
      </div>
      <button
        type="button"
        className="graph-controls-button"
        aria-label={t(showControls ? "graph.controls.hide" : "graph.controls.show")}
        onClick={(e) => {
          e.stopPropagation();
          setShowControls((v) => !v);
        }}
      >
        <Settings2 size={14} />
      </button>
      {showControls && <GraphControlsPanel onClose={() => setShowControls(false)} />}
    </div>
  );
}

function readCssVar(el: Element, name: string, fallback: string): string {
  try {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

function GraphControlsPanel({ onClose }: { onClose: () => void }) {
  useSyncExternalStore(subscribeGraph, getGraphVersion, getGraphVersion);
  const config = getGraphConfig();
  const t = useI18n();
  return (
    <div
      className="graph-controls"
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="graph-control-panel-header">
        <div className="graph-control-panel-title">{t("graph.controls.title")}</div>
        <button
          type="button"
          className="clickable-icon graph-control-icon-button"
          onClick={onClose}
          aria-label={t("graph.controls.close")}
        >
          <X size={12} />
        </button>
      </div>

      <ControlBlock title={t("graph.controls.filter")}>
        <input
          type="text"
          placeholder={t("graph.filterPlaceholder")}
          value={config.filter}
          onChange={(e) => updateGraphConfig({ filter: e.currentTarget.value })}
        />
        <p className="graph-control-help">
          {t("graph.controls.searchSyntax")} <code>tag:</code>, <code>path:</code>,{" "}
          <code>file:</code>, <code>[name]</code>, <code>[name:value]</code>, <code>-term</code>.
        </p>
      </ControlBlock>

      <ControlBlock title={t("graph.controls.localGraph")}>
        <label className="graph-control-toggle">
          <input
            type="checkbox"
            checked={config.localGraph}
            onChange={(e) => updateGraphConfig({ localGraph: e.currentTarget.checked })}
          />
          <span>{t("graph.controls.localOnly")}</span>
        </label>
        {config.localGraph && (
          <Slider
            label={t("graph.controls.hops")}
            min={1}
            max={4}
            step={1}
            value={config.localHops}
            onChange={(v) => updateGraphConfig({ localHops: v })}
          />
        )}
      </ControlBlock>

      <ControlBlock title={t("graph.controls.colorBy")}>
        <select
          className="dropdown"
          value={config.colorMode}
          onChange={(e) =>
            updateGraphConfig({ colorMode: e.currentTarget.value as GraphColorMode })
          }
        >
          <option value="none">{t("graph.color.neutral")}</option>
          <option value="tag">{t("graph.color.tag")}</option>
          <option value="folder">{t("graph.color.folder")}</option>
          <option value="groups">{t("graph.color.groups")}</option>
        </select>
      </ControlBlock>

      <ControlBlock title={t("graph.controls.groups")}>
        <div className="graph-color-list">
          {config.groups.length === 0 ? (
            <div className="graph-control-muted">
              {t("graph.groups.emptyBefore")} <kbd>+</kbd> {t("graph.groups.emptyAfter")}
            </div>
          ) : (
            config.groups.map((g) => (
              <div key={g.id} className="graph-color-group">
                <input
                  type="text"
                  value={g.name}
                  onChange={(e) => updateGraphGroup(g.id, { name: e.currentTarget.value })}
                  placeholder={t("graph.groups.namePlaceholder")}
                  className="graph-color-name"
                />
                <input
                  type="text"
                  value={g.query}
                  onChange={(e) => updateGraphGroup(g.id, { query: e.currentTarget.value })}
                  placeholder={t("graph.groups.queryPlaceholder")}
                  className="graph-color-query"
                />
                <input
                  type="color"
                  value={hslToHex(g.color) ?? "#7c52ed"}
                  onChange={(e) => updateGraphGroup(g.id, { color: e.currentTarget.value })}
                />
                <button
                  type="button"
                  className="clickable-icon graph-control-icon-button"
                  aria-label={t("graph.groups.remove", { name: g.name })}
                  onClick={() => removeGraphGroup(g.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
          <div className="graph-color-button-container">
            <button
              type="button"
              className="text-icon-button"
              onClick={() =>
                addGraphGroup({
                  name: t("graph.groups.newName"),
                  query: "",
                  color: colorForStringSafe(`g${config.groups.length + 1}`),
                })
              }
            >
              <Plus size={12} /> {t("graph.groups.add")}
            </button>
          </div>
        </div>
      </ControlBlock>

      <ControlBlock title={t("graph.controls.display")}>
        <Slider
          label={t("graph.display.nodeSize")}
          min={2}
          max={12}
          step={1}
          value={config.display.nodeSize}
          onChange={(v) => updateGraphDisplay({ nodeSize: v })}
        />
        <Slider
          label={t("graph.display.linkThickness")}
          min={0.2}
          max={3}
          step={0.1}
          value={config.display.linkThickness}
          onChange={(v) => updateGraphDisplay({ linkThickness: v })}
        />
        <Slider
          label={t("graph.display.labelSize")}
          min={8}
          max={20}
          step={1}
          value={config.display.textSize}
          onChange={(v) => updateGraphDisplay({ textSize: v })}
        />
        <Slider
          label={t("graph.display.labelThreshold")}
          min={0.4}
          max={3}
          step={0.1}
          value={config.display.textFadeThreshold}
          onChange={(v) => updateGraphDisplay({ textFadeThreshold: v })}
        />
      </ControlBlock>

      <ControlBlock title={t("graph.controls.forces")}>
        <Slider
          label={t("graph.forces.repulsion")}
          min={1000}
          max={15000}
          step={500}
          value={config.forces.repulsion}
          onChange={(v) => updateGraphForces({ repulsion: v })}
        />
        <Slider
          label={t("graph.forces.edgeAttraction")}
          min={0.001}
          max={0.05}
          step={0.001}
          value={config.forces.attraction}
          onChange={(v) => updateGraphForces({ attraction: v })}
        />
        <Slider
          label={t("graph.forces.linkDistance")}
          min={20}
          max={300}
          step={10}
          value={config.forces.linkDistance}
          onChange={(v) => updateGraphForces({ linkDistance: v })}
        />
        <Slider
          label={t("graph.forces.centerGravity")}
          min={0}
          max={0.005}
          step={0.0001}
          value={config.forces.centerForce}
          onChange={(v) => updateGraphForces({ centerForce: v })}
        />
        <button
          type="button"
          className="graph-reset-button"
          onClick={() =>
            updateGraphConfig({
              display: DEFAULT_GRAPH_CONFIG.display,
              forces: DEFAULT_GRAPH_CONFIG.forces,
            })
          }
        >
          {t("graph.reset")}
        </button>
      </ControlBlock>
    </div>
  );
}

function ControlBlock({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="graph-control-section">
      <div className="graph-control-section-header">{title}</div>
      {children}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="graph-slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
      <span className="graph-slider-value">
        <span className="graph-slider-label">{label}: </span>
        {Number.isInteger(value) ? value : value.toFixed(3)}
      </span>
    </label>
  );
}

/** Best-effort HSL/hex color → hex for the color input. Returns "#7c52ed" for
 *  values it can't parse (CSS variables, named colors, etc.). */
function hslToHex(color: string): string | null {
  const m = color.match(/^hsl\(\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\s*\)$/);
  if (!m) return color.startsWith("#") ? color : null;
  const h = Number(m[1]);
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  const r = f(0).toString(16).padStart(2, "0");
  const g = f(8).toString(16).padStart(2, "0");
  const b = f(4).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function colorForStringSafe(s: string): string {
  // Use the same deterministic hash as the colors module so new groups get
  // a stable, distinct default color.
  return colorForString(s);
}
