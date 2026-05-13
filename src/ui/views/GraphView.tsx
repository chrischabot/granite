import { stem } from "@core/fs/path";
import type { VaultFile } from "@core/fs/types";
import { colorForString, folderColorForPath, tagColorForFile } from "@core/graph/colors";
import { firstMatchingGroup } from "@core/graph/groups";
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

const MIN_VELOCITY = 0.05;
const DAMPING = 0.85;

export function GraphView() {
  const metadataVersion = useMetadataVersion();
  useSyncExternalStore(subscribeGraph, getGraphVersion, getGraphVersion);
  const config = getGraphConfig();
  const t = useI18n();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const viewRef = useRef(view);
  const [hover, setHover] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [, forceTick] = useState(0);
  const draggingRef = useRef<{
    startX: number;
    startY: number;
    viewX: number;
    viewY: number;
  } | null>(null);
  const { groups: wsGroups, activeGroupId, leaves } = useWorkspace();

  const applyViewportTransform = useCallback(
    (next = viewRef.current) => {
      const cx = size.w / 2 + next.x;
      const cy = size.h / 2 + next.y;
      viewportRef.current?.setAttribute("transform", `translate(${cx},${cy}) scale(${next.scale})`);
    },
    [size],
  );

  useEffect(() => {
    viewRef.current = view;
    applyViewportTransform(view);
  }, [view, applyViewportTransform]);

  // Hydrate config from disk once on mount.
  useEffect(() => {
    void hydrateGraphConfig();
  }, []);

  const activePath = useMemo(() => {
    const g = activeGroupId ? wsGroups.get(activeGroupId) : null;
    const leaf = g?.activeLeafId ? leaves.get(g.activeLeafId) : null;
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  }, [activeGroupId, wsGroups, leaves]);

  // Build the graph from the metadata cache. Re-runs when metadata changes
  // or when the user's filter / local-graph settings change.
  const { nodes, edges, neighbors } = useMemo(() => {
    void metadataVersion;
    const out: {
      nodes: GraphNode[];
      edges: GraphEdge[];
      neighbors: Map<string, Set<string>>;
    } = { nodes: [], edges: [], neighbors: new Map() };
    const fileEntries = metadataCache.getAllSwitcherEntries().filter((e) => e.alias === null);

    // Apply the user's filter (content-free — only path/stem/tags/properties).
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
            tags: tags.map((t, line) => ({ name: t, line })),
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
      const tags = meta ? [...new Set(meta.tags.map((t) => t.name))] : [];
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
        out.neighbors.get(node.id)?.add(candidate);
        out.neighbors.get(candidate)?.add(node.id);
      }
    }

    // Local-graph trim: keep only nodes within `localHops` of the active path.
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

    const r = 160;
    out.nodes.forEach((n, i) => {
      const angle = (i / Math.max(1, out.nodes.length)) * Math.PI * 2;
      n.x = Math.cos(angle) * r;
      n.y = Math.sin(angle) * r;
      n.weight = 1 + (out.neighbors.get(n.id)?.size ?? 0);
    });
    return out;
  }, [metadataVersion, config.filter, config.localGraph, config.localHops, activePath]);

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

  // Force-directed simulation in a rAF loop. Re-runs (and re-anneals) when
  // the user changes force params or the underlying graph changes.
  useEffect(() => {
    if (nodes.length === 0) return;
    const { repulsion, attraction, centerForce, linkDistance } = config.forces;
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
          const a = nodes[i];
          const b = nodes[j];
          if (!a || !b) continue;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            dist2 = dx * dx + dy * dy;
          }
          const dist = Math.sqrt(dist2);
          const f = repulsion / dist2;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
      // Spring attraction along edges with rest length linkDistance.
      // dist > rest pulls together, dist < rest pushes apart.
      for (const e of edges) {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const stretch = dist - linkDistance;
        const f = stretch * attraction;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // Gentle pull toward origin.
      for (const n of nodes) {
        n.vx -= n.x * centerForce;
        n.vy -= n.y * centerForce;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx;
        n.y += n.vy;
        totalEnergy += Math.abs(n.vx) + Math.abs(n.vy);
      }
      forceTick((c) => c + 1);
      if (frame < maxFrames && totalEnergy > MIN_VELOCITY * nodes.length) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges, config.forces]);

  // Pan + zoom handlers.
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      viewX: viewRef.current.x,
      viewY: viewRef.current.y,
    };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const drag = draggingRef.current;
    if (!drag) return;
    viewRef.current = {
      ...viewRef.current,
      x: drag.viewX + (e.clientX - drag.startX),
      y: drag.viewY + (e.clientY - drag.startY),
    };
    applyViewportTransform();
  };
  const onMouseUp = () => {
    if (draggingRef.current) {
      setView(viewRef.current);
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
        {config.filter || config.localGraph ? t("graph.empty.filtered") : t("graph.empty.noNotes")}
      </div>
    );
  }

  const byIdRender = new Map<string, GraphNode>();
  for (const n of nodes) byIdRender.set(n.id, n);

  const cx = size.w / 2 + view.x;
  const cy = size.h / 2 + view.y;

  const colorFor = (n: GraphNode): string => {
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
    return "var(--text-muted)";
  };

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
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        style={{ display: "block" }}
        aria-label={t("graph.aria")}
      >
        <title>{t("graph.aria")}</title>
        <g ref={viewportRef} transform={`translate(${cx},${cy}) scale(${view.scale})`}>
          {edges.map((e) => {
            const a = byIdRender.get(e.source);
            const b = byIdRender.get(e.target);
            if (!a || !b) return null;
            const dim =
              hover &&
              hover !== a.id &&
              hover !== b.id &&
              !neighbors.get(hover)?.has(a.id) &&
              !neighbors.get(hover)?.has(b.id);
            return (
              <line
                key={`${e.source}->${e.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--text-muted)"
                strokeWidth={config.display.linkThickness / view.scale}
                opacity={dim ? 0.1 : 0.45}
              />
            );
          })}
          {nodes.map((n) => {
            const isHover = hover === n.id;
            const isNeighbor = !!hover && neighbors.get(hover)?.has(n.id);
            const dim = !!hover && !isHover && !isNeighbor;
            const radius =
              (config.display.nodeSize * Math.max(0.6, Math.min(2.2, Math.sqrt(n.weight) * 0.6))) /
              Math.max(0.7, view.scale);
            const fontScale = 1 / Math.max(0.7, view.scale);
            const fill = isHover ? "var(--text-accent)" : colorFor(n);
            return (
              <g
                key={n.id}
                style={{ cursor: "pointer" }}
                tabIndex={0}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover((h) => (h === n.id ? null : h))}
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
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={radius * (isHover ? 1.4 : 1)}
                  fill={fill}
                  opacity={dim ? 0.25 : 1}
                  stroke="var(--background-primary)"
                  strokeWidth={1 / view.scale}
                />
                {(isHover || view.scale > config.display.textFadeThreshold) && (
                  <text
                    x={n.x}
                    y={n.y + radius + 8 * fontScale}
                    textAnchor="middle"
                    fontSize={config.display.textSize * fontScale}
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
        {t("graph.stats", {
          nodes: nodes.length,
          nodeLabel: t(nodes.length === 1 ? "graph.node" : "graph.nodes"),
          links: edges.length,
          linkLabel: t(edges.length === 1 ? "graph.link" : "graph.links"),
        })}
      </div>
      <button
        type="button"
        aria-label={t(showControls ? "graph.controls.hide" : "graph.controls.show")}
        onClick={(e) => {
          e.stopPropagation();
          setShowControls((v) => !v);
        }}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          padding: 6,
          background: "var(--background-secondary)",
          border: "1px solid var(--background-modifier-border)",
          borderRadius: "var(--radius-s)",
          color: "var(--text-muted)",
          cursor: "var(--cursor-link)",
          display: "flex",
          alignItems: "center",
          height: "auto",
        }}
      >
        <Settings2 size={14} />
      </button>
      {showControls && <GraphControlsPanel onClose={() => setShowControls(false)} />}
    </div>
  );
}

function GraphControlsPanel({ onClose }: { onClose: () => void }) {
  useSyncExternalStore(subscribeGraph, getGraphVersion, getGraphVersion);
  const config = getGraphConfig();
  const t = useI18n();
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 48,
        left: 12,
        width: 280,
        maxHeight: "calc(100% - 64px)",
        overflowY: "auto",
        padding: "var(--size-4-3)",
        background: "var(--background-secondary)",
        border: "1px solid var(--background-modifier-border)",
        borderRadius: "var(--radius-m)",
        fontSize: "var(--font-ui-smaller)",
        color: "var(--text-muted)",
        boxShadow: "var(--shadow-s)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--size-4-3)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontWeight: "var(--font-semibold)",
            color: "var(--text-normal)",
            fontSize: "var(--font-ui-small)",
          }}
        >
          {t("graph.controls.title")}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("graph.controls.close")}
          style={{
            padding: 2,
            background: "transparent",
            border: 0,
            color: "var(--text-muted)",
            cursor: "var(--cursor-link)",
            height: "auto",
            boxShadow: "none",
          }}
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
          style={{ width: "100%" }}
        />
        <p style={{ margin: "var(--size-2-2) 0 0", color: "var(--text-faint)" }}>
          {t("graph.controls.searchSyntax")} <code>tag:</code>, <code>path:</code>,{" "}
          <code>file:</code>, <code>[name]</code>, <code>[name:value]</code>, <code>-term</code>.
        </p>
      </ControlBlock>

      <ControlBlock title={t("graph.controls.localGraph")}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--size-4-2)",
            cursor: "var(--cursor-link)",
          }}
        >
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
          style={{ width: "100%" }}
        >
          <option value="none">{t("graph.color.neutral")}</option>
          <option value="tag">{t("graph.color.tag")}</option>
          <option value="folder">{t("graph.color.folder")}</option>
          <option value="groups">{t("graph.color.groups")}</option>
        </select>
      </ControlBlock>

      <ControlBlock title={t("graph.controls.groups")}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--size-2-3)" }}>
          {config.groups.length === 0 ? (
            <div style={{ color: "var(--text-faint)" }}>
              {t("graph.groups.emptyBefore")} <kbd>+</kbd> {t("graph.groups.emptyAfter")}
            </div>
          ) : (
            config.groups.map((g) => (
              <div
                key={g.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 36px 24px",
                  gap: "var(--size-2-2)",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  value={g.name}
                  onChange={(e) => updateGraphGroup(g.id, { name: e.currentTarget.value })}
                  placeholder={t("graph.groups.namePlaceholder")}
                  style={{ width: "100%", minWidth: 0 }}
                />
                <input
                  type="text"
                  value={g.query}
                  onChange={(e) => updateGraphGroup(g.id, { query: e.currentTarget.value })}
                  placeholder={t("graph.groups.queryPlaceholder")}
                  style={{ width: "100%", minWidth: 0, fontFamily: "var(--font-monospace)" }}
                />
                <input
                  type="color"
                  value={hslToHex(g.color) ?? "#7c52ed"}
                  onChange={(e) => updateGraphGroup(g.id, { color: e.currentTarget.value })}
                  style={{ width: 36, padding: 0 }}
                />
                <button
                  type="button"
                  aria-label={t("graph.groups.remove", { name: g.name })}
                  onClick={() => removeGraphGroup(g.id)}
                  style={{
                    padding: 2,
                    background: "transparent",
                    border: 0,
                    color: "var(--text-muted)",
                    cursor: "var(--cursor-link)",
                    height: "auto",
                    boxShadow: "none",
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={() =>
              addGraphGroup({
                name: t("graph.groups.newName"),
                query: "",
                color: colorForStringSafe(`g${config.groups.length + 1}`),
              })
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              alignSelf: "flex-start",
            }}
          >
            <Plus size={12} /> {t("graph.groups.add")}
          </button>
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
          onClick={() =>
            updateGraphConfig({
              display: DEFAULT_GRAPH_CONFIG.display,
              forces: DEFAULT_GRAPH_CONFIG.forces,
            })
          }
          style={{ alignSelf: "flex-start", marginTop: "var(--size-2-3)" }}
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--size-2-2)" }}>
      <div
        style={{
          fontWeight: "var(--font-semibold)",
          color: "var(--text-normal)",
          fontSize: "var(--font-ui-smaller)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </div>
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
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: "var(--size-4-2)",
      }}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        style={{ width: "100%" }}
      />
      <span
        style={{
          color: "var(--text-muted)",
          fontVariantNumeric: "tabular-nums",
          minWidth: 64,
          textAlign: "end",
          fontSize: "var(--font-ui-smaller)",
        }}
      >
        <span style={{ color: "var(--text-faint)" }}>{label}: </span>
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
