/**
 * Grid A* over axis-aligned wall maps (top-down / ARPG).
 * Cell size trades quality vs cost — 24–32 is a good default for Gravewake-scale maps.
 */
import type { WallRect } from "./types.js";

export type PathPoint = { x: number; y: number };

export class NavGrid {
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  readonly width: number;
  readonly height: number;
  private blocked: Uint8Array;
  /** Simple path cache: key startCell-goalCell → path world points */
  private pathCache = new Map<string, PathPoint[]>();
  private pathCacheMax = 256;

  constructor(
    width: number,
    height: number,
    walls: WallRect[],
    cell = 28,
    /** Inflate walls by this (actor radius) so paths stay clear. */
    padding = 12,
  ) {
    this.cell = cell;
    this.width = width;
    this.height = height;
    this.cols = Math.max(1, Math.ceil(width / cell));
    this.rows = Math.max(1, Math.ceil(height / cell));
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (const w of walls) {
      const x0 = Math.max(0, Math.floor((w.x - padding) / cell));
      const y0 = Math.max(0, Math.floor((w.y - padding) / cell));
      const x1 = Math.min(
        this.cols - 1,
        Math.floor((w.x + w.w + padding) / cell),
      );
      const y1 = Math.min(
        this.rows - 1,
        Math.floor((w.y + w.h + padding) / cell),
      );
      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) {
          this.blocked[gy * this.cols + gx] = 1;
        }
      }
    }
  }

  worldToCell(x: number, y: number): { gx: number; gy: number } {
    return {
      gx: clampInt(Math.floor(x / this.cell), 0, this.cols - 1),
      gy: clampInt(Math.floor(y / this.cell), 0, this.rows - 1),
    };
  }

  cellCenter(gx: number, gy: number): PathPoint {
    return {
      x: gx * this.cell + this.cell * 0.5,
      y: gy * this.cell + this.cell * 0.5,
    };
  }

  isBlocked(gx: number, gy: number): boolean {
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return true;
    return this.blocked[gy * this.cols + gx] === 1;
  }

  /**
   * A* path in world space (cell centers). Empty if no path.
   * 8-connected.
   */
  clearPathCache(): void {
    this.pathCache.clear();
  }

  findPath(sx: number, sy: number, tx: number, ty: number): PathPoint[] {
    const start = this.worldToCell(sx, sy);
    const goal = this.worldToCell(tx, ty);
    const cacheKey = `${start.gx},${start.gy}>${goal.gx},${goal.gy}`;
    const cached = this.pathCache.get(cacheKey);
    if (cached) return cached.map((p) => ({ ...p }));
    // If goal blocked, walk to nearest free cell around it
    let ggx = goal.gx;
    let ggy = goal.gy;
    if (this.isBlocked(ggx, ggy)) {
      const free = this.nearestFree(ggx, ggy, 6);
      if (!free) return [];
      ggx = free.gx;
      ggy = free.gy;
    }
    let sgx = start.gx;
    let sgy = start.gy;
    if (this.isBlocked(sgx, sgy)) {
      const free = this.nearestFree(sgx, sgy, 4);
      if (!free) return [];
      sgx = free.gx;
      sgy = free.gy;
    }
    if (sgx === ggx && sgy === ggy) {
      return [{ x: tx, y: ty }];
    }

    const key = (x: number, y: number) => y * this.cols + x;
    const open: number[] = [key(sgx, sgy)];
    const came = new Map<number, number>();
    const gScore = new Map<number, number>();
    gScore.set(key(sgx, sgy), 0);
    const fScore = new Map<number, number>();
    fScore.set(key(sgx, sgy), heuristic(sgx, sgy, ggx, ggy));

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];

    let guard = this.cols * this.rows * 4;
    while (open.length && guard-- > 0) {
      // pop lowest f
      let bi = 0;
      let bf = Infinity;
      for (let i = 0; i < open.length; i++) {
        const f = fScore.get(open[i]!) ?? Infinity;
        if (f < bf) {
          bf = f;
          bi = i;
        }
      }
      const cur = open.splice(bi, 1)[0]!;
      const cx = cur % this.cols;
      const cy = (cur / this.cols) | 0;
      if (cx === ggx && cy === ggy) {
        const cells: PathPoint[] = [];
        let k: number | undefined = cur;
        while (k !== undefined) {
          const x = k % this.cols;
          const y = (k / this.cols) | 0;
          cells.push(this.cellCenter(x, y));
          k = came.get(k);
        }
        cells.reverse();
        // snap last to exact target
        if (cells.length) cells[cells.length - 1] = { x: tx, y: ty };
        const path = simplify(cells);
        if (this.pathCache.size >= this.pathCacheMax) {
          const first = this.pathCache.keys().next().value;
          if (first !== undefined) this.pathCache.delete(first);
        }
        this.pathCache.set(cacheKey, path);
        return path.map((p) => ({ ...p }));
      }
      for (const [dx, dy] of dirs) {
        const nx = cx + dx!;
        const ny = cy + dy!;
        if (this.isBlocked(nx, ny)) continue;
        // no corner cut through blocked diagonal
        if (dx !== 0 && dy !== 0) {
          if (this.isBlocked(cx + dx!, cy) || this.isBlocked(cx, cy + dy!))
            continue;
        }
        const nk = key(nx, ny);
        const step = dx !== 0 && dy !== 0 ? 1.414 : 1;
        const tent = (gScore.get(cur) ?? Infinity) + step;
        if (tent < (gScore.get(nk) ?? Infinity)) {
          came.set(nk, cur);
          gScore.set(nk, tent);
          fScore.set(nk, tent + heuristic(nx, ny, ggx, ggy));
          if (!open.includes(nk)) open.push(nk);
        }
      }
    }
    return [];
  }

  private nearestFree(
    gx: number,
    gy: number,
    maxR: number,
  ): { gx: number; gy: number } | null {
    for (let r = 0; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = gx + dx;
          const y = gy + dy;
          if (!this.isBlocked(x, y)) return { gx: x, gy: y };
        }
      }
    }
    return null;
  }
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

function simplify(path: PathPoint[]): PathPoint[] {
  if (path.length <= 2) return path;
  const out: PathPoint[] = [path[0]!];
  for (let i = 1; i < path.length - 1; i++) {
    const a = out[out.length - 1]!;
    const b = path[i]!;
    const c = path[i + 1]!;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const bcx = c.x - b.x;
    const bcy = c.y - b.y;
    // drop colinear-ish
    const cross = abx * bcy - aby * bcx;
    if (Math.abs(cross) > 40) out.push(b);
  }
  out.push(path[path.length - 1]!);
  return out;
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v | 0));
}
