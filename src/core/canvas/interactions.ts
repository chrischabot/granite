import type { Canvas, CanvasNode } from "./schema";

export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

export interface CanvasRect extends CanvasPoint {
  readonly width: number;
  readonly height: number;
}

export function snapCanvasValue(value: number, snapToGrid: boolean, grid: number): number {
  if (!Number.isFinite(value)) return 0;
  if (!snapToGrid) return Math.round(value);
  return Math.round(value / grid) * grid;
}

export function canvasKeyboardStep(
  snapToGrid: boolean,
  grid: number,
  accelerated: boolean,
): number {
  if (!snapToGrid) return accelerated ? 10 : 1;
  return accelerated ? grid * 5 : grid;
}

export function normalizeCanvasRect(start: CanvasPoint, end: CanvasPoint): CanvasRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function canvasRectsIntersect(a: CanvasRect, b: CanvasRect): boolean {
  return (
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
  );
}

export function constrainCanvasDeltaToAxis(dx: number, dy: number): CanvasPoint {
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx, y: 0 };
  return { x: 0, y: dy };
}

export function selectCanvasNodesInRect(
  nodes: ReadonlyArray<CanvasNode>,
  rect: CanvasRect,
): string[] {
  return nodes
    .filter((node) =>
      canvasRectsIntersect(rect, {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      }),
    )
    .map((node) => node.id);
}

export function duplicateCanvasSelection(
  canvas: Canvas,
  selectedIds: ReadonlyArray<string>,
  idFactory: () => string,
): { canvas: Canvas; selectedIds: string[] } {
  const selected = new Set(selectedIds);
  const idMap = new Map<string, string>();
  const clonedNodes: CanvasNode[] = [];

  for (const node of canvas.nodes) {
    if (!selected.has(node.id)) continue;
    const id = idFactory();
    idMap.set(node.id, id);
    clonedNodes.push({ ...node, id, x: node.x + 20, y: node.y + 20 } as CanvasNode);
  }

  const clonedEdges = canvas.edges
    .filter((edge) => selected.has(edge.fromNode) && selected.has(edge.toNode))
    .map((edge) => ({
      ...edge,
      id: idFactory(),
      fromNode: idMap.get(edge.fromNode) ?? edge.fromNode,
      toNode: idMap.get(edge.toNode) ?? edge.toNode,
    }));

  return {
    canvas: {
      nodes: [...canvas.nodes, ...clonedNodes],
      edges: [...canvas.edges, ...clonedEdges],
    },
    selectedIds: clonedNodes.map((node) => node.id),
  };
}
