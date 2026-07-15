/**
 * Grid line-of-sight (Bresenham) + simple cover helpers.
 */

export type LosGrid = {
  width: number;
  height: number;
  /** true = blocks LOS */
  blocked: (x: number, y: number) => boolean;
};

/**
 * Bresenham line cells from (x0,y0) to (x1,y1) inclusive.
 */
export function losLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  let x = Math.floor(x0);
  let y = Math.floor(y0);
  const xEnd = Math.floor(x1);
  const yEnd = Math.floor(y1);
  const dx = Math.abs(xEnd - x);
  const dy = Math.abs(yEnd - y);
  const sx = x < xEnd ? 1 : -1;
  const sy = y < yEnd ? 1 : -1;
  let err = dx - dy;

  for (;;) {
    cells.push({ x, y });
    if (x === xEnd && y === yEnd) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}

/**
 * True if clear LOS (no blocked cell strictly between endpoints).
 * Endpoints may be blocked (standing in wall cell still sees out if path clear).
 */
export function hasLineOfSight(
  grid: LosGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  const line = losLine(x0, y0, x1, y1);
  // skip first and last
  for (let i = 1; i < line.length - 1; i++) {
    const c = line[i]!;
    if (c.x < 0 || c.y < 0 || c.x >= grid.width || c.y >= grid.height) {
      return false;
    }
    if (grid.blocked(c.x, c.y)) return false;
  }
  return true;
}

/**
 * Cover heuristic: target is "in cover" if LOS blocked from attacker
 * but adjacent open cell can see attacker (partial cover).
 */
export function coverLevel(
  grid: LosGrid,
  ax: number,
  ay: number,
  tx: number,
  ty: number,
): "none" | "partial" | "full" {
  if (hasLineOfSight(grid, ax, ay, tx, ty)) return "none";
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of dirs) {
    const nx = Math.floor(tx) + dx!;
    const ny = Math.floor(ty) + dy!;
    if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
    if (grid.blocked(nx, ny)) continue;
    if (hasLineOfSight(grid, ax, ay, nx, ny)) return "partial";
  }
  return "full";
}

/** Damage multiplier from cover (full=0.5, partial=0.75, none=1). */
export function coverDamageMul(level: "none" | "partial" | "full"): number {
  if (level === "full") return 0.5;
  if (level === "partial") return 0.75;
  return 1;
}
