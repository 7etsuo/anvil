/**
 * Grid tilemap: collision + layer data for authorable ARPG worlds.
 * Converts to wall rects for existing circle-vs-AABB sim when needed.
 */

export type TileId = number;

export interface TileDef {
  id: TileId;
  name?: string;
  /** Blocks movement when solid */
  solid?: boolean;
  /** Atlas / asset key for render */
  sprite?: string;
  /** Optional render layer hint */
  layer?: "floor" | "wall" | "prop" | "decal";
}

export interface TileMapData {
  id: string;
  /** Tile size in world units */
  tileSize: number;
  width: number;
  height: number;
  /** Row-major tile ids, length width*height */
  tiles: TileId[];
  defs: Record<string, TileDef>;
  spawns?: Array<{ actor: string; x: number; y: number; team?: string }>;
}

export class TileMap {
  readonly id: string;
  readonly tileSize: number;
  readonly width: number;
  readonly height: number;
  readonly tiles: TileId[];
  readonly defs: Map<TileId, TileDef>;
  spawns: Array<{ actor: string; x: number; y: number; team?: string }>;

  constructor(data: TileMapData) {
    this.id = data.id;
    this.tileSize = data.tileSize;
    this.width = data.width;
    this.height = data.height;
    this.tiles = data.tiles.slice();
    this.defs = new Map();
    for (const d of Object.values(data.defs)) this.defs.set(d.id, d);
    this.spawns = data.spawns ? data.spawns.map((s) => ({ ...s })) : [];
    if (this.tiles.length !== this.width * this.height) {
      throw new Error(
        `TileMap ${this.id}: tiles length ${this.tiles.length} != ${this.width * this.height}`,
      );
    }
  }

  worldW(): number {
    return this.width * this.tileSize;
  }

  worldH(): number {
    return this.height * this.tileSize;
  }

  index(tx: number, ty: number): number {
    return ty * this.width + tx;
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  get(tx: number, ty: number): TileId {
    if (!this.inBounds(tx, ty)) return -1;
    return this.tiles[this.index(tx, ty)] ?? -1;
  }

  set(tx: number, ty: number, id: TileId): void {
    if (!this.inBounds(tx, ty)) return;
    this.tiles[this.index(tx, ty)] = id;
  }

  isSolid(tx: number, ty: number): boolean {
    const id = this.get(tx, ty);
    if (id < 0) return true;
    return this.defs.get(id)?.solid === true;
  }

  /** World point blocked (circle approx via center cell + neighbors). */
  blocksWorld(x: number, y: number, radius = 0): boolean {
    const r = radius;
    const samples = [
      [x, y],
      [x - r, y],
      [x + r, y],
      [x, y - r],
      [x, y + r],
    ];
    for (const [sx, sy] of samples) {
      const tx = Math.floor(sx! / this.tileSize);
      const ty = Math.floor(sy! / this.tileSize);
      if (this.isSolid(tx, ty)) return true;
    }
    return false;
  }

  /**
   * Merge solid tiles into wall rects (greedy horizontal runs per row).
   * Compatible with TopdownSim MapDef.walls.
   */
  toWallRects(): Array<{ x: number; y: number; w: number; h: number }> {
    const walls: Array<{ x: number; y: number; w: number; h: number }> = [];
    const ts = this.tileSize;
    for (let ty = 0; ty < this.height; ty++) {
      let runStart = -1;
      for (let tx = 0; tx <= this.width; tx++) {
        const solid = tx < this.width && this.isSolid(tx, ty);
        if (solid && runStart < 0) runStart = tx;
        if (!solid && runStart >= 0) {
          walls.push({
            x: runStart * ts,
            y: ty * ts,
            w: (tx - runStart) * ts,
            h: ts,
          });
          runStart = -1;
        }
      }
    }
    return walls;
  }

  /** 0 = walkable, 1 = blocked — for A*. */
  toGrid(): number[][] {
    const g: number[][] = [];
    for (let ty = 0; ty < this.height; ty++) {
      const row: number[] = [];
      for (let tx = 0; tx < this.width; tx++) {
        row.push(this.isSolid(tx, ty) ? 1 : 0);
      }
      g.push(row);
    }
    return g;
  }

  static empty(
    id: string,
    w: number,
    h: number,
    tileSize: number,
    floorId = 0,
  ): TileMap {
    return new TileMap({
      id,
      tileSize,
      width: w,
      height: h,
      tiles: new Array(w * h).fill(floorId),
      defs: {
        "0": { id: 0, name: "floor", solid: false, layer: "floor" },
        "1": { id: 1, name: "wall", solid: true, layer: "wall" },
      },
    });
  }

  /** Fill border with solid tile id. */
  strokeBorder(solidId = 1): this {
    for (let x = 0; x < this.width; x++) {
      this.set(x, 0, solidId);
      this.set(x, this.height - 1, solidId);
    }
    for (let y = 0; y < this.height; y++) {
      this.set(0, y, solidId);
      this.set(this.width - 1, y, solidId);
    }
    return this;
  }
}
