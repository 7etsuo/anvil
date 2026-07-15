/**
 * Grid A* pathfinding.
 * cells[y][x] === 0 walkable, >0 blocked (same convention as topdown walls).
 */

export type Grid = number[][];
export type Point = { x: number; y: number };

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function heuristic(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function astar(
  grid: Grid,
  start: Point,
  goal: Point,
  opts?: { diagonal?: boolean; maxNodes?: number },
): Point[] | null {
  const h = grid.length;
  if (h === 0) return null;
  const w = grid[0]!.length;
  const diagonal = opts?.diagonal ?? false;
  const maxNodes = opts?.maxNodes ?? w * h * 2;

  const inBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h;
  const walkable = (x: number, y: number) =>
    inBounds(x, y) && (grid[y]![x] ?? 1) === 0;

  if (!walkable(start.x, start.y) || !walkable(goal.x, goal.y)) return null;

  const open: Point[] = [{ ...start }];
  const came = new Map<string, string>();
  const gScore = new Map<string, number>();
  gScore.set(key(start.x, start.y), 0);
  const fScore = new Map<string, number>();
  fScore.set(key(start.x, start.y), heuristic(start, goal));

  const neighbors = diagonal
    ? [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]
    : [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];

  let expanded = 0;
  while (open.length > 0 && expanded < maxNodes) {
    expanded++;
    open.sort(
      (a, b) =>
        (fScore.get(key(a.x, a.y)) ?? 1e9) -
        (fScore.get(key(b.x, b.y)) ?? 1e9),
    );
    const current = open.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      return reconstruct(came, current);
    }
    const ck = key(current.x, current.y);
    for (const [dx, dy] of neighbors) {
      const nx = current.x + dx!;
      const ny = current.y + dy!;
      if (!walkable(nx, ny)) continue;
      const nk = key(nx, ny);
      const step = dx !== 0 && dy !== 0 ? 1.414 : 1;
      const tent = (gScore.get(ck) ?? 1e9) + step;
      if (tent < (gScore.get(nk) ?? 1e9)) {
        came.set(nk, ck);
        gScore.set(nk, tent);
        fScore.set(nk, tent + heuristic({ x: nx, y: ny }, goal));
        if (!open.some((p) => p.x === nx && p.y === ny)) {
          open.push({ x: nx, y: ny });
        }
      }
    }
  }
  return null;
}

function reconstruct(came: Map<string, string>, current: Point): Point[] {
  const path = [current];
  let k = key(current.x, current.y);
  while (came.has(k)) {
    const prev = came.get(k)!;
    const [x, y] = prev.split(",").map(Number) as [number, number];
    path.push({ x, y });
    k = prev;
  }
  path.reverse();
  return path;
}

/** Convert wall rects + map size into a 0/1 grid (cellSize world units). */
export function wallsToGrid(
  width: number,
  height: number,
  walls: Array<{ x: number; y: number; w: number; h: number }>,
  cellSize: number,
): Grid {
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const grid: Grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );
  for (const wall of walls) {
    const x0 = Math.floor(wall.x / cellSize);
    const y0 = Math.floor(wall.y / cellSize);
    const x1 = Math.floor((wall.x + wall.w - 0.01) / cellSize);
    const y1 = Math.floor((wall.y + wall.h - 0.01) / cellSize);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (y >= 0 && y < rows && x >= 0 && x < cols) {
          grid[y]![x] = 1;
        }
      }
    }
  }
  return grid;
}
