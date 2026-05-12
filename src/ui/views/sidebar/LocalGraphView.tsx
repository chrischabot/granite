import { stem } from "@core/fs/path";
import { metadataCache } from "@core/metadata/cache";
import { useFileMetadata, useMetadataVersion } from "@core/metadata/useMetadata";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n/useI18n";

interface Neighbor {
  path: string;
  direction: "out" | "in" | "both";
  weight: number;
}

const NODE_RADIUS = 6;
const ACTIVE_RADIUS = 8;
const HOVER_RADIUS = 9;
const PADDING = 24;

export function LocalGraphView() {
  const t = useI18n();
  useMetadataVersion();
  const { activeGroupId, groups, leaves } = useWorkspace();
  const activePath = (() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    if (!group?.activeLeafId) return null;
    const leaf = leaves.get(group.activeLeafId);
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  })();
  const meta = useFileMetadata(activePath);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 280, h: 280 });
  const [hover, setHover] = useState<string | null>(null);

  // Track container size with ResizeObserver.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dim = Math.max(160, Math.min(width, height));
        setSize({ w: width, h: Math.max(160, Math.min(420, dim)) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const neighbors = useMemo<Neighbor[]>(() => {
    if (!activePath || !meta) return [];
    const map = new Map<string, Neighbor>();
    // Outgoing: from meta.links — collapse to unique path with .md
    for (const link of meta.links) {
      const candidatePath = link.target.endsWith(".md") ? link.target : `${link.target}.md`;
      const cur = map.get(candidatePath);
      if (cur) {
        cur.weight += 1;
        if (cur.direction === "in") cur.direction = "both";
      } else {
        map.set(candidatePath, {
          path: candidatePath,
          direction: "out",
          weight: 1,
        });
      }
    }
    // Incoming: backlinks
    const incoming = metadataCache.getBacklinks(activePath);
    for (const inc of incoming) {
      const cur = map.get(inc.source);
      if (cur) {
        cur.weight += inc.lines.length;
        if (cur.direction === "out") cur.direction = "both";
      } else {
        map.set(inc.source, {
          path: inc.source,
          direction: "in",
          weight: inc.lines.length,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.weight - a.weight);
  }, [activePath, meta]);

  if (!activePath) {
    return <div className="workspace-sidedock-empty-state">{t("localGraph.empty.noActive")}</div>;
  }

  const cx = size.w / 2;
  const cy = size.h / 2;
  const radius = Math.max(40, Math.min(size.w, size.h) / 2 - PADDING);
  const count = neighbors.length;

  return (
    <div
      ref={containerRef}
      className="local-graph-pane"
      style={{
        flex: "1 1 auto",
        minHeight: 200,
        padding: "var(--size-4-2)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: "var(--font-ui-smaller)",
          color: "var(--text-muted)",
          marginBottom: "var(--size-2-2)",
        }}
      >
        {count === 0
          ? t("localGraph.empty.noLinks")
          : t(count === 1 ? "localGraph.neighbor" : "localGraph.neighbors", { count })}
      </div>
      <svg
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ display: "block" }}
      >
        <title>{t("sidebar.tab.localGraph")}</title>
        {neighbors.map((n, i) => {
          const angle = (i / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
          const nx = cx + Math.cos(angle) * radius;
          const ny = cy + Math.sin(angle) * radius;
          const stroke =
            n.direction === "in"
              ? "var(--text-muted)"
              : n.direction === "out"
                ? "var(--color-accent)"
                : "var(--text-accent)";
          return (
            <line
              key={`edge-${n.path}`}
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke={stroke}
              strokeWidth={hover === n.path ? 1.6 : 0.8}
              opacity={hover && hover !== n.path ? 0.25 : 0.7}
            />
          );
        })}
        {/* Center: active note */}
        <circle
          cx={cx}
          cy={cy}
          r={ACTIVE_RADIUS}
          fill="var(--color-accent)"
          stroke="var(--background-primary)"
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy + ACTIVE_RADIUS + 14}
          fontSize={11}
          textAnchor="middle"
          fill="var(--text-normal)"
          style={{ userSelect: "none", fontFamily: "var(--font-interface)" }}
        >
          {stem(activePath)}
        </text>

        {/* Neighbors */}
        {neighbors.map((n, i) => {
          const angle = (i / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
          const nx = cx + Math.cos(angle) * radius;
          const ny = cy + Math.sin(angle) * radius;
          const fill =
            n.direction === "in"
              ? "var(--text-muted)"
              : n.direction === "out"
                ? "var(--color-accent-2, var(--color-accent))"
                : "var(--text-accent)";
          // Position label outside the circle.
          const labelDx = Math.cos(angle) * (NODE_RADIUS + 4);
          const labelDy = Math.sin(angle) * (NODE_RADIUS + 4);
          const anchor =
            Math.cos(angle) > 0.5 ? "start" : Math.cos(angle) < -0.5 ? "end" : "middle";
          return (
            <a
              key={`node-${n.path}`}
              href={n.path}
              aria-label={t("localGraph.openNote", { path: n.path })}
              onMouseEnter={() => setHover(n.path)}
              onMouseLeave={() => setHover((h) => (h === n.path ? null : h))}
              onClick={(e) => {
                e.preventDefault();
                workspaceStore.openFile(n.path);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  workspaceStore.openFile(n.path);
                }
              }}
            >
              <circle
                cx={nx}
                cy={ny}
                r={hover === n.path ? HOVER_RADIUS : NODE_RADIUS}
                fill={fill}
                stroke="var(--background-primary)"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
              />
              <text
                x={nx + labelDx}
                y={ny + labelDy + 4}
                fontSize={10}
                textAnchor={anchor}
                fill="var(--text-muted)"
                style={{
                  userSelect: "none",
                  fontFamily: "var(--font-interface)",
                  pointerEvents: "none",
                }}
              >
                {stem(n.path)}
              </text>
            </a>
          );
        })}
      </svg>
      {hover && (
        <div
          style={{
            fontSize: "var(--font-ui-smaller)",
            color: "var(--text-muted)",
            marginTop: "var(--size-2-2)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {hover}
        </div>
      )}
    </div>
  );
}
