/**
 * Uniform grid spatial hash for broadphase queries (AI culling, combat, loot).
 */

export type SpatialItem = {
  id: string;
  x: number;
  y: number;
  r?: number;
};

export class SpatialHash {
  readonly cellSize: number;
  private cells = new Map<string, Set<string>>();
  private items = new Map<string, SpatialItem>();

  constructor(cellSize = 128) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private cellOf(x: number, y: number): { cx: number; cy: number } {
    return {
      cx: Math.floor(x / this.cellSize),
      cy: Math.floor(y / this.cellSize),
    };
  }

  clear(): void {
    this.cells.clear();
    this.items.clear();
  }

  upsert(item: SpatialItem): void {
    this.remove(item.id);
    this.items.set(item.id, item);
    const { cx, cy } = this.cellOf(item.x, item.y);
    const k = this.key(cx, cy);
    let set = this.cells.get(k);
    if (!set) {
      set = new Set();
      this.cells.set(k, set);
    }
    set.add(item.id);
  }

  remove(id: string): void {
    const prev = this.items.get(id);
    if (!prev) return;
    const { cx, cy } = this.cellOf(prev.x, prev.y);
    this.cells.get(this.key(cx, cy))?.delete(id);
    this.items.delete(id);
  }

  get(id: string): SpatialItem | undefined {
    return this.items.get(id);
  }

  /** All items within radius of (x,y). */
  queryRadius(x: number, y: number, radius: number): SpatialItem[] {
    const r = radius;
    const minCx = Math.floor((x - r) / this.cellSize);
    const maxCx = Math.floor((x + r) / this.cellSize);
    const minCy = Math.floor((y - r) / this.cellSize);
    const maxCy = Math.floor((y + r) / this.cellSize);
    const out: SpatialItem[] = [];
    const r2 = r * r;
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const set = this.cells.get(this.key(cx, cy));
        if (!set) continue;
        for (const id of set) {
          const it = this.items.get(id);
          if (!it) continue;
          const dx = it.x - x;
          const dy = it.y - y;
          if (dx * dx + dy * dy <= r2) out.push(it);
        }
      }
    }
    return out;
  }

  /** Ids only. */
  queryRadiusIds(x: number, y: number, radius: number): string[] {
    return this.queryRadius(x, y, radius).map((i) => i.id);
  }

  size(): number {
    return this.items.size;
  }
}
