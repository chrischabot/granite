export interface GraphViewport {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface GraphViewportSize {
  readonly w: number;
  readonly h: number;
}

export interface GraphPanDrag {
  readonly startX: number;
  readonly startY: number;
  readonly viewX: number;
  readonly viewY: number;
}

export function viewportForPanDrag(
  current: GraphViewport,
  drag: GraphPanDrag,
  clientX: number,
  clientY: number,
): GraphViewport {
  return {
    x: drag.viewX + (clientX - drag.startX),
    y: drag.viewY + (clientY - drag.startY),
    scale: current.scale,
  };
}

export function transformForGraphViewport(view: GraphViewport, size: GraphViewportSize): string {
  const cx = size.w / 2 + view.x;
  const cy = size.h / 2 + view.y;
  return `translate(${cx},${cy}) scale(${view.scale})`;
}
