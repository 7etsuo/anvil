/**
 * Minimap reveal + fog of war on a coarse grid.
 */

export type FogCell = 0 | 1 | 2; // 0 hidden, 1 explored, 2 visible

export type MinimapFogOpts = {
  width: number;
  height: number;
  /** World units per cell */
  cellSize?: number;
};

export class MinimapFog {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  /** row-major: y * width + x */
  private cells: Uint8Array;
  private visible = new Set<number>();

  constructor(opts: MinimapFogOpts) {
    this.width = Math.max(1, opts.width);
    this.height = Math.max(1, opts.height);
    this.cellSize = opts.cellSize ?? 32;
    this.cells = new Uint8Array(this.width * this.height);
  }

  worldToCell(x: number, y: number): { cx: number; cy: number } {
    return {
      cx: Math.floor(x / this.cellSize),
      cy: Math.floor(y / this.cellSize),
    };
  }

  private idx(cx: number, cy: number): number | null {
    if (cx < 0 || cy < 0 || cx >= this.width || cy >= this.height) return null;
    return cy * this.width + cx;
  }

  get(cx: number, cy: number): FogCell {
    const i = this.idx(cx, cy);
    if (i == null) return 0;
    return this.cells[i] as FogCell;
  }

  /**
   * Reveal circle around world pos. Marks previous visible as explored.
   */
  reveal(worldX: number, worldY: number, radiusWorld: number): void {
    // demote current visible → explored
    for (const i of this.visible) {
      if (this.cells[i] === 2) this.cells[i] = 1;
    }
    this.visible.clear();

    const { cx, cy } = this.worldToCell(worldX, worldY);
    const r = Math.ceil(radiusWorld / this.cellSize);
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const i = this.idx(cx + dx, cy + dy);
        if (i == null) continue;
        this.cells[i] = 2;
        this.visible.add(i);
      }
    }
  }

  /** Explored or visible */
  isExplored(cx: number, cy: number): boolean {
    return this.get(cx, cy) >= 1;
  }

  isVisible(cx: number, cy: number): boolean {
    return this.get(cx, cy) === 2;
  }

  /** Flat copy for observe / save */
  serialize(): { width: number; height: number; cellSize: number; cells: number[] } {
    return {
      width: this.width,
      height: this.height,
      cellSize: this.cellSize,
      cells: [...this.cells],
    };
  }

  static deserialize(data: {
    width: number;
    height: number;
    cellSize: number;
    cells: number[];
  }): MinimapFog {
    const f = new MinimapFog({
      width: data.width,
      height: data.height,
      cellSize: data.cellSize,
    });
    for (let i = 0; i < data.cells.length && i < f.cells.length; i++) {
      f.cells[i] = data.cells[i]!;
      if (data.cells[i] === 2) f.visible.add(i);
    }
    return f;
  }

  /** Mini grid for agents (sampled). */
  sample(maxSide = 32): number[][] {
    const stepX = Math.max(1, Math.ceil(this.width / maxSide));
    const stepY = Math.max(1, Math.ceil(this.height / maxSide));
    const out: number[][] = [];
    for (let y = 0; y < this.height; y += stepY) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x += stepX) {
        row.push(this.get(x, y));
      }
      out.push(row);
    }
    return out;
  }
}
