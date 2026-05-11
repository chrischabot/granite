import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Type,
  FileText,
  LinkIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  EMPTY_CANVAS,
  newCanvasId,
  readCanvasFile,
  writeCanvasFile,
  type Canvas,
  type CanvasEdge,
  type CanvasNode,
  type EdgeSide,
  type FileNode,
  type GroupNode,
  type LinkNode,
  type TextNode,
} from "@core/canvas/schema";
import { stem } from "@core/fs/path";
import { renderMarkdown } from "@core/markdown/renderer";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";

export interface CanvasViewProps {
  path: string | undefined;
}

const GRID = 10;
const MIN_NODE_W = 80;
const MIN_NODE_H = 40;
const SAVE_DEBOUNCE_MS = 600;
const NODE_COLOR_SWATCHES: Array<string | null> = [null, "1", "2", "3", "4", "5", "6"];

const COLOR_MAP: Record<string, string> = {
  "1": "var(--color-red-rgb, 233, 49, 71)",
  "2": "var(--color-orange-rgb, 236, 117, 0)",
  "3": "var(--color-yellow-rgb, 224, 172, 0)",
  "4": "var(--color-green-rgb, 8, 185, 78)",
  "5": "var(--color-cyan-rgb, 0, 191, 188)",
  "6": "var(--color-purple-rgb, 120, 82, 238)",
};

function colorBg(c: string | undefined): string {
  if (!c) return "var(--background-primary)";
  if (c.startsWith("#")) return c;
  const rgb = COLOR_MAP[c];
  if (rgb) return `rgba(${rgb}, 0.08)`;
  return "var(--background-primary)";
}

function colorBorder(c: string | undefined): string {
  if (!c) return "var(--background-modifier-border)";
  if (c.startsWith("#")) return c;
  const rgb = COLOR_MAP[c];
  if (rgb) return `rgba(${rgb}, 0.5)`;
  return "var(--background-modifier-border)";
}

function swatchBg(c: string | null): string {
  if (c === null) return "var(--background-secondary)";
  const rgb = COLOR_MAP[c];
  return rgb ? `rgb(${rgb})` : "var(--background-secondary)";
}

interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function sideAnchor(box: NodeBox, side: EdgeSide | undefined): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: box.x + box.width / 2, y: box.y };
    case "bottom":
      return { x: box.x + box.width / 2, y: box.y + box.height };
    case "left":
      return { x: box.x, y: box.y + box.height / 2 };
    case "right":
      return { x: box.x + box.width, y: box.y + box.height / 2 };
    default:
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
}

export function CanvasView({ path }: CanvasViewProps) {
  const [canvas, setCanvas] = useState<Canvas>(EMPTY_CANVAS);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const panRef = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null);
  const dragRef = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startNodeX: number;
    startNodeY: number;
  } | null>(null);
  const resizeRef = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const edgeDraftRef = useRef<{ fromId: string; fromSide: EdgeSide } | null>(null);
  const [edgeDraftEnd, setEdgeDraftEnd] = useState<{ x: number; y: number } | null>(null);

  // Load on path change.
  useEffect(() => {
    if (!path) return;
    setLoading(true);
    let cancelled = false;
    void readCanvasFile(path).then((c) => {
      if (cancelled) return;
      setCanvas(c);
      setLoading(false);
      requestAnimationFrame(() => fitToContent(c));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const schedule = useCallback(() => {
    dirtyRef.current = true;
    if (!path) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void writeCanvasFile(path, canvasRef.current).catch((err) => {
        noticeManager.show(
          err instanceof Error ? err.message : "Could not save canvas",
          { kind: "error" },
        );
      });
      dirtyRef.current = false;
    }, SAVE_DEBOUNCE_MS);
  }, [path]);

  const canvasRef = useRef<Canvas>(canvas);
  useEffect(() => {
    canvasRef.current = canvas;
  }, [canvas]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (dirtyRef.current && path) {
        void writeCanvasFile(path, canvasRef.current).catch(() => {});
      }
    };
  }, [path]);

  const mutate = useCallback(
    (next: Canvas) => {
      setCanvas(next);
      canvasRef.current = next;
      schedule();
    },
    [schedule],
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<CanvasNode>) => {
      mutate({
        ...canvasRef.current,
        nodes: canvasRef.current.nodes.map((n) =>
          n.id === id ? ({ ...n, ...patch } as CanvasNode) : n,
        ),
      });
    },
    [mutate],
  );

  const setNodeColor = useCallback(
    (id: string, color: string | null) => {
      mutate({
        ...canvasRef.current,
        nodes: canvasRef.current.nodes.map((n) => {
          if (n.id !== id) return n;
          if (color === null) {
            const { color: _omit, ...rest } = n;
            return rest as CanvasNode;
          }
          return { ...n, color } as CanvasNode;
        }),
      });
    },
    [mutate],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    mutate({
      nodes: canvasRef.current.nodes.filter((n) => n.id !== selectedId),
      edges: canvasRef.current.edges.filter(
        (e) => e.fromNode !== selectedId && e.toNode !== selectedId,
      ),
    });
    setSelectedId(null);
  }, [mutate, selectedId]);

  const addTextNode = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = (rect.width / 2 - view.x) / view.scale;
    const cy = (rect.height / 2 - view.y) / view.scale;
    const text = prompt("Text for the new node:", "");
    if (text === null) return;
    const node: TextNode = {
      id: newCanvasId(),
      type: "text",
      x: Math.round((cx - 100) / GRID) * GRID,
      y: Math.round((cy - 40) / GRID) * GRID,
      width: 200,
      height: 80,
      text,
    };
    mutate({ ...canvasRef.current, nodes: [...canvasRef.current.nodes, node] });
    setSelectedId(node.id);
  }, [view, mutate]);

  const commitTextEdit = useCallback(
    (id: string, next: string) => {
      const node = canvasRef.current.nodes.find((n) => n.id === id);
      if (!node || node.type !== "text") return;
      if (node.text === next) return;
      updateNode(id, { text: next } as Partial<TextNode>);
    },
    [updateNode],
  );

  // Edge-draft finalization helper (shared by document mouseup).
  const finalizeEdgeDraft = useCallback(
    (target: HTMLElement | null) => {
      const draft = edgeDraftRef.current;
      edgeDraftRef.current = null;
      setEdgeDraftEnd(null);
      if (!draft) return;
      const dropAnchor = target?.closest<HTMLElement>("[data-canvas-anchor]");
      let toId: string | null = null;
      let toSide: EdgeSide | undefined;
      if (dropAnchor) {
        toId = dropAnchor.getAttribute("data-canvas-anchor-node");
        toSide = (dropAnchor.getAttribute("data-canvas-anchor-side") as EdgeSide) ?? undefined;
      } else {
        const dropNode = target?.closest<HTMLElement>("[data-canvas-node]");
        if (dropNode) toId = dropNode.getAttribute("data-canvas-node");
      }
      if (toId && toId !== draft.fromId) {
        const edge: CanvasEdge = {
          id: newCanvasId(),
          fromNode: draft.fromId,
          fromSide: draft.fromSide,
          toNode: toId,
          ...(toSide ? { toSide } : {}),
          toEnd: "arrow",
        };
        mutate({ ...canvasRef.current, edges: [...canvasRef.current.edges, edge] });
      }
    },
    [mutate],
  );

  // Document-level mouse handlers: keep edge-draft, node-drag, and pan
  // lifecycles consistent even when the mouse leaves the canvas container.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onMove = (ev: MouseEvent) => {
      if (edgeDraftRef.current) {
        const rect = root.getBoundingClientRect();
        setEdgeDraftEnd({
          x: (ev.clientX - rect.left - view.x) / view.scale,
          y: (ev.clientY - rect.top - view.y) / view.scale,
        });
        return;
      }
      const resize = resizeRef.current;
      if (resize) {
        const dx = (ev.clientX - resize.startMouseX) / view.scale;
        const dy = (ev.clientY - resize.startMouseY) / view.scale;
        const nw = Math.max(MIN_NODE_W, Math.round((resize.startW + dx) / GRID) * GRID);
        const nh = Math.max(MIN_NODE_H, Math.round((resize.startH + dy) / GRID) * GRID);
        updateNode(resize.id, { width: nw, height: nh } as Partial<CanvasNode>);
        return;
      }
      const drag = dragRef.current;
      if (drag) {
        const dx = (ev.clientX - drag.startMouseX) / view.scale;
        const dy = (ev.clientY - drag.startMouseY) / view.scale;
        const nx = Math.round((drag.startNodeX + dx) / GRID) * GRID;
        const ny = Math.round((drag.startNodeY + dy) / GRID) * GRID;
        updateNode(drag.id, { x: nx, y: ny } as Partial<CanvasNode>);
        return;
      }
      const pan = panRef.current;
      if (pan) {
        setView((v) => ({
          ...v,
          x: pan.viewX + (ev.clientX - pan.x),
          y: pan.viewY + (ev.clientY - pan.y),
        }));
      }
    };
    const onUp = (ev: MouseEvent) => {
      finalizeEdgeDraft(ev.target as HTMLElement | null);
      panRef.current = null;
      dragRef.current = null;
      resizeRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [view, updateNode, finalizeEdgeDraft]);

  const onBackgroundMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-canvas-node]")) return;
    if ((e.target as HTMLElement).closest("[data-canvas-anchor]")) return;
    panRef.current = { x: e.clientX, y: e.clientY, viewX: view.x, viewY: view.y };
    setSelectedId(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setView((v) => ({ ...v, scale: Math.max(0.2, Math.min(3, v.scale * factor)) }));
  };

  const onNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedId(node.id);
    dragRef.current = {
      id: node.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: node.x,
      startNodeY: node.y,
    };
  };

  const onNodeResizeStart = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(node.id);
    resizeRef.current = {
      id: node.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW: node.width,
      startH: node.height,
    };
  };

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if ((ev.key === "Delete" || ev.key === "Backspace") && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault();
        deleteSelected();
        return;
      }
      const step = ev.shiftKey ? GRID * 5 : GRID;
      let dx = 0;
      let dy = 0;
      if (ev.key === "ArrowLeft") dx = -step;
      else if (ev.key === "ArrowRight") dx = step;
      else if (ev.key === "ArrowUp") dy = -step;
      else if (ev.key === "ArrowDown") dy = step;
      if (dx !== 0 || dy !== 0) {
        ev.preventDefault();
        const node = canvasRef.current.nodes.find((n) => n.id === selectedId);
        if (node) updateNode(selectedId, { x: node.x + dx, y: node.y + dy } as Partial<CanvasNode>);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, deleteSelected, updateNode]);

  const fitToContent = useCallback((c: Canvas) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (c.nodes.length === 0) {
      setView({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of c.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const padding = 80;
    const scale = Math.max(
      0.2,
      Math.min(1, (rect.width - padding) / w, (rect.height - padding) / h),
    );
    setView({
      x: rect.width / 2 - ((minX + maxX) / 2) * scale,
      y: rect.height / 2 - ((minY + maxY) / 2) * scale,
      scale,
    });
  }, []);

  const edgesSvg = useMemo(() => {
    return canvas.edges.map((e: CanvasEdge) => {
      const a = canvas.nodes.find((n) => n.id === e.fromNode);
      const b = canvas.nodes.find((n) => n.id === e.toNode);
      if (!a || !b) return null;
      const p1 = sideAnchor(a, e.fromSide);
      const p2 = sideAnchor(b, e.toSide);
      const stroke = e.color
        ? e.color.startsWith("#")
          ? e.color
          : COLOR_MAP[e.color]
            ? `rgba(${COLOR_MAP[e.color]}, 0.7)`
            : "var(--text-muted)"
        : "var(--text-muted)";
      return (
        <g key={e.id}>
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={stroke}
            strokeWidth={1.5}
            markerEnd={e.toEnd === "arrow" ? "url(#granite-canvas-arrow)" : undefined}
            markerStart={e.fromEnd === "arrow" ? "url(#granite-canvas-arrow)" : undefined}
          />
          {e.label && (
            <text
              x={(p1.x + p2.x) / 2}
              y={(p1.y + p2.y) / 2 - 4}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-muted)"
              style={{ userSelect: "none" }}
            >
              {e.label}
            </text>
          )}
        </g>
      );
    });
  }, [canvas]);

  const selectedNode = selectedId ? canvas.nodes.find((n) => n.id === selectedId) ?? null : null;

  if (!path) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-faint)",
          padding: "var(--size-4-6)",
          textAlign: "center",
        }}
      >
        Open or create a `.canvas` file to use this view.
      </div>
    );
  }

  return (
    <div
      className="canvas-view"
      ref={containerRef}
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(circle, rgba(var(--mono-rgb-100, 0, 0, 0), 0.05) 1px, transparent 1px)",
        backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
        cursor: panRef.current ? "grabbing" : "grab",
      }}
      onMouseDown={onBackgroundMouseDown}
      onWheel={onWheel as unknown as React.WheelEventHandler}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("application/granite-vault-path")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(e) => {
        const droppedPath = e.dataTransfer.getData("application/granite-vault-path");
        if (!droppedPath) return;
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = Math.round(((e.clientX - rect.left - view.x) / view.scale - 100) / GRID) * GRID;
        const y = Math.round(((e.clientY - rect.top - view.y) / view.scale - 40) / GRID) * GRID;
        const node: FileNode = {
          id: newCanvasId(),
          type: "file",
          x,
          y,
          width: 240,
          height: 120,
          file: droppedPath,
        };
        mutate({ ...canvasRef.current, nodes: [...canvasRef.current.nodes, node] });
        setSelectedId(node.id);
      }}
    >
      {loading ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-faint)",
          }}
        >
          Loading canvas…
        </div>
      ) : (
        <>
          <svg
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <defs>
              <marker
                id="granite-canvas-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
              </marker>
            </defs>
            <g transform={`translate(${view.x}, ${view.y}) scale(${view.scale})`}>
              {edgesSvg}
              {edgeDraftEnd && edgeDraftRef.current
                ? (() => {
                    const src = canvas.nodes.find(
                      (n) => n.id === edgeDraftRef.current!.fromId,
                    );
                    if (!src) return null;
                    const p1 = sideAnchor(src, edgeDraftRef.current!.fromSide);
                    return (
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={edgeDraftEnd.x}
                        y2={edgeDraftEnd.y}
                        stroke="var(--interactive-accent)"
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                      />
                    );
                  })()
                : null}
            </g>
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "0 0",
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              pointerEvents: "none",
            }}
          >
            {canvas.nodes.map((node) => (
              <CanvasNodeView
                key={node.id}
                node={node}
                selected={selectedId === node.id}
                editing={editingId === node.id}
                onMouseDown={(e) => onNodeMouseDown(e, node)}
                onAnchorMouseDown={(side, e) => {
                  e.stopPropagation();
                  edgeDraftRef.current = { fromId: node.id, fromSide: side };
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setEdgeDraftEnd({
                      x: (e.clientX - rect.left - view.x) / view.scale,
                      y: (e.clientY - rect.top - view.y) / view.scale,
                    });
                  }
                }}
                onResizeStart={(e) => onNodeResizeStart(e, node)}
                onTextCommit={(text) => {
                  commitTextEdit(node.id, text);
                  setEditingId(null);
                }}
                onTextCancel={() => setEditingId(null)}
                onDoubleClick={() => {
                  if (node.type === "text") setEditingId(node.id);
                  else if (node.type === "file" && node.file) {
                    workspaceStore.openFile(node.file, {
                      newTab: true,
                      ...(node.subpath
                        ? { fragment: node.subpath.replace(/^#\^?/, "") }
                        : {}),
                    });
                  } else if (node.type === "link" && node.url) {
                    workspaceStore.openWebviewer(node.url, { newTab: true });
                  }
                }}
              />
            ))}
          </div>
        </>
      )}

      <div
        className="canvas-toolbar"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          gap: 6,
          background: "var(--background-secondary)",
          border: "1px solid var(--background-modifier-border)",
          borderRadius: "var(--radius-m)",
          padding: 4,
          alignItems: "center",
          zIndex: 5,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="clickable-icon"
          aria-label="Add text node"
          onClick={addTextNode}
          title="Add text node"
        >
          <Type size={14} />
        </button>
        <button
          type="button"
          className="clickable-icon"
          aria-label="Zoom in"
          onClick={() =>
            setView((v) => ({ ...v, scale: Math.min(3, v.scale * 1.2) }))
          }
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          className="clickable-icon"
          aria-label="Zoom out"
          onClick={() =>
            setView((v) => ({ ...v, scale: Math.max(0.2, v.scale * 0.83) }))
          }
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          className="clickable-icon"
          aria-label="Fit to content"
          onClick={() => fitToContent(canvas)}
          title="Fit to content"
        >
          <Maximize2 size={14} />
        </button>
        {selectedNode && (
          <>
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: "0 6px",
                borderLeft: "1px solid var(--background-modifier-border)",
                marginInlineStart: 4,
              }}
              role="group"
              aria-label="Node color"
            >
              {NODE_COLOR_SWATCHES.map((c) => (
                <button
                  key={c ?? "none"}
                  type="button"
                  title={c === null ? "No color" : `Color ${c}`}
                  aria-label={c === null ? "Clear color" : `Set color ${c}`}
                  onClick={() => {
                    setNodeColor(selectedNode.id, c);
                  }}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: swatchBg(c),
                    border:
                      (selectedNode.color ?? null) === c
                        ? "2px solid var(--interactive-accent)"
                        : "1px solid var(--background-modifier-border)",
                    cursor: "var(--cursor)",
                    padding: 0,
                    minHeight: 16,
                    minWidth: 16,
                    boxShadow: "none",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="clickable-icon"
              aria-label="Delete selected"
              onClick={deleteSelected}
              title="Delete selected (Cmd/Ctrl+Backspace)"
              style={{ color: "var(--text-error)" }}
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
        <span
          style={{
            color: "var(--text-faint)",
            fontSize: "var(--font-ui-smaller)",
            marginLeft: 6,
          }}
        >
          {Math.round(view.scale * 100)}% · {canvas.nodes.length} node
          {canvas.nodes.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

function CanvasNodeView({
  node,
  selected,
  editing,
  onMouseDown,
  onAnchorMouseDown,
  onResizeStart,
  onTextCommit,
  onTextCancel,
  onDoubleClick,
}: {
  node: CanvasNode;
  selected: boolean;
  editing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onAnchorMouseDown: (side: EdgeSide, e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onTextCommit: (text: string) => void;
  onTextCancel: () => void;
  onDoubleClick: () => void;
}) {
  const baseStyle: CSSProperties = {
    position: "absolute",
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    background: colorBg(node.color),
    border: `${selected ? 2 : 1}px solid ${
      selected ? "var(--interactive-accent)" : colorBorder(node.color)
    }`,
    borderRadius: 8,
    boxShadow: selected ? "0 0 0 4px hsla(var(--color-accent-hsl), 0.18)" : undefined,
    cursor: "move",
    pointerEvents: "auto",
    overflow: "hidden",
    fontSize: "var(--font-ui-small)",
    color: "var(--text-normal)",
    userSelect: "none",
    boxSizing: "border-box",
  };

  const renderAnchors = selected ? <NodeAnchors node={node} onMouseDown={onAnchorMouseDown} /> : null;
  const renderResize = selected ? <NodeResizeHandle node={node} onMouseDown={onResizeStart} /> : null;

  if (node.type === "group") {
    return (
      <>
        <CanvasGroupNode node={node} style={baseStyle} onMouseDown={onMouseDown} />
        {renderAnchors}
        {renderResize}
      </>
    );
  }
  if (node.type === "text") {
    return (
      <>
        <div
          data-canvas-node={node.id}
          style={baseStyle}
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
        >
          {editing ? (
            <CanvasTextEditor
              initial={node.text ?? ""}
              onCommit={onTextCommit}
              onCancel={onTextCancel}
            />
          ) : (
            <div
              className="markdown-rendered"
              style={{
                padding: 10,
                height: "100%",
                overflow: "auto",
                fontSize: "var(--font-text-size)",
              }}
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(node.text ?? ""),
              }}
            />
          )}
        </div>
        {renderAnchors}
        {renderResize}
      </>
    );
  }
  if (node.type === "file") {
    return (
      <>
        <CanvasFileNode node={node} style={baseStyle} onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} />
        {renderAnchors}
        {renderResize}
      </>
    );
  }
  if (node.type === "link") {
    return (
      <>
        <CanvasLinkNode node={node} style={baseStyle} onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} />
        {renderAnchors}
        {renderResize}
      </>
    );
  }
  return null;
}

function NodeAnchors({
  node,
  onMouseDown,
}: {
  node: CanvasNode;
  onMouseDown: (side: EdgeSide, e: React.MouseEvent) => void;
}) {
  const r = 6;
  const sides: Array<{ side: EdgeSide; cx: number; cy: number }> = [
    { side: "top", cx: node.x + node.width / 2, cy: node.y },
    { side: "right", cx: node.x + node.width, cy: node.y + node.height / 2 },
    { side: "bottom", cx: node.x + node.width / 2, cy: node.y + node.height },
    { side: "left", cx: node.x, cy: node.y + node.height / 2 },
  ];
  return (
    <>
      {sides.map((s) => (
        <div
          key={s.side}
          data-canvas-anchor
          data-canvas-anchor-node={node.id}
          data-canvas-anchor-side={s.side}
          onMouseDown={(e) => onMouseDown(s.side, e)}
          style={{
            position: "absolute",
            left: s.cx - r,
            top: s.cy - r,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            background: "var(--interactive-accent)",
            border: "2px solid var(--background-primary)",
            cursor: "crosshair",
            zIndex: 2,
            pointerEvents: "auto",
          }}
          title={`Drag to connect (${s.side})`}
        />
      ))}
    </>
  );
}

function NodeResizeHandle({
  node,
  onMouseDown,
}: {
  node: CanvasNode;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const size = 12;
  return (
    <div
      data-canvas-resize={node.id}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: node.x + node.width - size,
        top: node.y + node.height - size,
        width: size,
        height: size,
        cursor: "nwse-resize",
        background: "var(--interactive-accent)",
        borderRadius: 2,
        opacity: 0.7,
        pointerEvents: "auto",
        zIndex: 2,
      }}
      title="Drag to resize"
    />
  );
}

function CanvasGroupNode({
  node,
  style,
  onMouseDown,
}: {
  node: GroupNode;
  style: CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      data-canvas-node={node.id}
      style={{
        ...style,
        background: "transparent",
        border: `2px dashed ${colorBorder(node.color)}`,
        cursor: "move",
      }}
      onMouseDown={onMouseDown}
    >
      {node.label && (
        <div
          style={{
            position: "absolute",
            top: -10,
            left: 12,
            background: "var(--background-primary)",
            color: "var(--text-muted)",
            padding: "0 6px",
            fontSize: "var(--font-ui-smaller)",
            fontWeight: "var(--font-medium)",
          }}
        >
          {node.label}
        </div>
      )}
    </div>
  );
}

function CanvasFileNode({
  node,
  style,
  onMouseDown,
  onDoubleClick,
}: {
  node: FileNode;
  style: CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}) {
  const display = node.file ? stem(node.file) : "(no file)";
  return (
    <div
      data-canvas-node={node.id}
      style={style}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div
        style={{
          padding: "var(--size-4-2) var(--size-4-3)",
          fontSize: "var(--font-ui-smaller)",
          color: "var(--text-muted)",
          background: "var(--background-secondary)",
          borderBottom: "1px solid var(--background-modifier-border)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <FileText size={12} />
        {display}
        {node.subpath ? (
          <span style={{ color: "var(--text-faint)" }}> · {node.subpath}</span>
        ) : null}
      </div>
      <div
        style={{
          padding: 10,
          fontSize: "var(--font-ui-small)",
          color: "var(--text-muted)",
        }}
      >
        Double-click to open the file in a new tab.
      </div>
    </div>
  );
}

function CanvasLinkNode({
  node,
  style,
  onMouseDown,
  onDoubleClick,
}: {
  node: LinkNode;
  style: CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      data-canvas-node={node.id}
      style={style}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div
        style={{
          padding: "var(--size-4-2) var(--size-4-3)",
          fontSize: "var(--font-ui-smaller)",
          color: "var(--text-muted)",
          background: "var(--background-secondary)",
          borderBottom: "1px solid var(--background-modifier-border)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <LinkIcon size={12} /> Link
      </div>
      <div
        style={{
          padding: 10,
          fontSize: "var(--font-ui-small)",
          color: "var(--text-accent)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={node.url}
      >
        {node.url}
      </div>
    </div>
  );
}

function CanvasTextEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const cancelledRef = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.currentTarget.value)}
      onBlur={() => {
        if (cancelledRef.current) return;
        onCommit(value);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancelledRef.current = true;
          onCancel();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onCommit(value);
        }
      }}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: 10,
        border: 0,
        outline: "none",
        background: "var(--background-primary)",
        color: "var(--text-normal)",
        fontFamily: "var(--font-text)",
        fontSize: "var(--font-text-size)",
        resize: "none",
        cursor: "text",
      }}
    />
  );
}