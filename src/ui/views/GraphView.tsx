import { useEffect, useMemo, useRef, useState } from "react";
import { metadataCache } from "@core/metadata/cache";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import { stem } from "@core/fs/path";
import { workspaceStore } from "@core/workspace/store";

interface GraphNode {
  id: string;
  path: string;
  display: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weight: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

const REPULSION = 6000;
const ATTRACTION = 0.005;
const DAMPING = 0.85;
const CENTER_FORCE = 0.0008;
const MIN_VELOCITY = 0.05;

export function GraphView() {
  const metadataVersion = useMetadataVersion();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [hover, setHover] = useState<string | null>(null);
  const [, force] = useState(0);
  const draggingRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(
    null,
  );

  // Build the graph from the metadata cache. Re-runs when metadata changes.
  const { nodes, edges, neighbors } = useMemo(() => {
    const out: { nodes: GraphNode[]; edges: GraphEdge[]; neighbors: Map<string, Set<string>> } = {
      nodes: [],
      edges: [],
      neighbors: new Map(),
    };
    const fileEntries = metadataCache.getAllSwitcherEntries().filter((e) => e.alias === null);
    const nodeIds = new Set<string>();
    const stemToId = new Map<string, string>();
    for (const e of fileEntries) {
      const id = e.path;
      nodeIds.add(id);
      stemToId.set(stem(e.path).toLowerCase(), id);
      out.nodes.push({
        id,
        path: e.path,
        display: stem(e.path),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        weight: 1,
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
        out.neighbors.get(node.id)!.add(candidate);
        out.neighbors.get(candidate)?.add(node.id);
      }
    }
    const r = 160;
    out.nodes.forEach((n, i) => {
      const angle = (i / Math.max(1, out.nodes.length)) * Math.PI * 2;
      n.x = Math.cos(angle) * r;
      n.y = Math.sin(angle) * r;
      n.weight = 1 + (out.neighbors.get(n.id)?.size ?? 0);
    });
    return out;
  }, [metadataVersion]);

  // Resize observer.
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

  // Force-directed simulation in a rAF loop.
  useEffect(() => {
    if (nodes.length === 0) return;
    let raf = 0;
    let frame = 0;
    const maxFrames = 600;
    const step = () => {
      frame += 1;
      let totalEnergy = 0;
      const byId = new Map<string, GraphNode>();
      for (const n of nodes) byId.set(n.id, n);
      // Repulsion (pairwise; O(n^2) is fine up to a few hundred nodes).
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            dist2 = dx * dx + dy * dy;
          }
          const dist = Math.sqrt(dist2);
          const f = REPULSION / dist2;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
      // Attraction along edges.
      for (const e of edges) {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        a.vx += dx * ATTRACTION;
        a.vy += dy * ATTRACTION;
        b.vx -= dx * ATTRACTION;
        b.vy -= dy * ATTRACTION;
      }
      // Gentle pull toward origin.
      for (const n of nodes) {
        n.vx -= n.x * CENTER_FORCE;
        n.vy -= n.y * CENTER_FORCE;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx;
        n.y += n.vy;
        totalEnergy += Math.abs(n.vx) + Math.abs(n.vy);
      }
      force((c) => c + 1);
      if (frame < maxFrames && totalEnergy > MIN_VELOCITY * nodes.length) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges]);

  // Pan + zoom handlers.
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      viewX: view.x,
      viewY: view.y,
    };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const drag = draggingRef.current;
    if (!drag) return;
    setView((v) => ({
      ...v,
      x: drag.viewX + (e.clientX - drag.startX),
      y: drag.viewY + (e.clientY - drag.startY),
    }));
  };
  const onMouseUp = () => {
    draggingRef.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setView((v) => ({ ...v, scale: Math.max(0.2, Math.min(3, v.scale * factor)) }));
  };

  if (nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-faint)",
          padding: "var(--size-4-6)",
          textAlign: "center",
        }}
      >
        Vault has no markdown files yet — create some notes to populate the graph.
      </div>
    );
  }

  const byIdRender = new Map<string, GraphNode>();
  for (const n of nodes) byIdRender.set(n.id, n);

  const cx = size.w / 2 + view.x;
  const cy = size.h / 2 + view.y;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "var(--background-primary)",
        cursor: draggingRef.current ? "grabbing" : "grab",
        overflow: "hidden",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel as unknown as React.WheelEventHandler}
    >
      <svg ref={svgRef} width={size.w} height={size.h} style={{ display: "block" }}>
        <g transform={`translate(${cx},${cy}) scale(${view.scale})`}>
          {edges.map((e, i) => {
            const a = byIdRender.get(e.source);
            const b = byIdRender.get(e.target);
            if (!a || !b) return null;
            const dim =
              hover && hover !== a.id && hover !== b.id && !neighbors.get(hover)?.has(a.id) && !neighbors.get(hover)?.has(b.id);
            return (
              <line
                key={`e-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--text-muted)"
                strokeWidth={0.7 / view.scale}
                opacity={dim ? 0.1 : 0.45}
              />
            );
          })}
          {nodes.map((n) => {
            const isHover = hover === n.id;
            const isNeighbor = !!hover && neighbors.get(hover)?.has(n.id);
            const dim = !!hover && !isHover && !isNeighbor;
            const r = Math.max(2.5, Math.min(7, Math.sqrt(n.weight) * 2)) / Math.max(0.7, view.scale);
            const fontScale = 1 / Math.max(0.7, view.scale);
            return (
              <g
                key={n.id}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover((h) => (h === n.id ? null : h))}
                onClick={(ev) => {
                  ev.stopPropagation();
                  workspaceStore.openFile(n.path, { newTab: ev.metaKey || ev.ctrlKey });
                }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r * (isHover ? 1.4 : 1)}
                  fill={
                    isHover ? "var(--text-accent)" : isNeighbor ? "var(--color-accent)" : "var(--text-muted)"
                  }
                  opacity={dim ? 0.25 : 1}
                  stroke="var(--background-primary)"
                  strokeWidth={1 / view.scale}
                />
                {(isHover || view.scale > 1.3) && (
                  <text
                    x={n.x}
                    y={n.y + r + 8 * fontScale}
                    textAnchor="middle"
                    fontSize={11 * fontScale}
                    fill="var(--text-normal)"
                    style={{
                      userSelect: "none",
                      fontFamily: "var(--font-interface)",
                      pointerEvents: "none",
                    }}
                    opacity={dim ? 0.4 : 1}
                  >
                    {n.display}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          padding: "4px 10px",
          fontSize: "var(--font-ui-smaller)",
          color: "var(--text-muted)",
          background: "var(--background-secondary)",
          border: "1px solid var(--background-modifier-border)",
          borderRadius: "var(--radius-s)",
          pointerEvents: "none",
        }}
      >
        {nodes.length} nodes · {edges.length} links · drag to pan, scroll to zoom
      </div>
    </div>
  );
}