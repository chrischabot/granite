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
