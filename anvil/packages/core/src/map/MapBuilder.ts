/**
 * Minimal programmatic map builder (editor foundation).
 * Emits wall rects + spawns compatible with topdown / zone content.
 */

export interface MapWall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapSpawn {
  actor: string;
  x: number;
  y: number;
  team?: string;
}

export interface BuiltMap {
  id: string;
  width: number;
  height: number;
  walls: MapWall[];
  spawns: MapSpawn[];
}

export class MapBuilder {
  id: string;
  width: number;
  height: number;
  private walls: MapWall[] = [];
  private spawns: MapSpawn[] = [];
  private borderThickness: number;

  constructor(
    id: string,
    width: number,
    height: number,
    opts?: { border?: number },
  ) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.borderThickness = opts?.border ?? 24;
  }

  /** Outer border walls with optional edge openings (door gaps). */
  addBorder(openings?: {
    east?: { y: number; h: number };
    west?: { y: number; h: number };
    north?: { x: number; w: number };
    south?: { x: number; w: number };
  }): this {
    const t = this.borderThickness;
    const W = this.width;
    const H = this.height;
    // North
    if (openings?.north) {
      const o = openings.north;
      this.walls.push({ x: 0, y: 0, w: o.x, h: t });
      this.walls.push({ x: o.x + o.w, y: 0, w: W - (o.x + o.w), h: t });
    } else {
      this.walls.push({ x: 0, y: 0, w: W, h: t });
    }
    // South
    if (openings?.south) {
      const o = openings.south;
      this.walls.push({ x: 0, y: H - t, w: o.x, h: t });
      this.walls.push({
        x: o.x + o.w,
        y: H - t,
        w: W - (o.x + o.w),
        h: t,
      });
    } else {
      this.walls.push({ x: 0, y: H - t, w: W, h: t });
    }
    // West
    if (openings?.west) {
      const o = openings.west;
      this.walls.push({ x: 0, y: 0, w: t, h: o.y });
      this.walls.push({
        x: 0,
        y: o.y + o.h,
        w: t,
        h: H - (o.y + o.h),
      });
    } else {
      this.walls.push({ x: 0, y: 0, w: t, h: H });
    }
    // East
    if (openings?.east) {
      const o = openings.east;
      this.walls.push({ x: W - t, y: 0, w: t, h: o.y });
      this.walls.push({
        x: W - t,
        y: o.y + o.h,
        w: t,
        h: H - (o.y + o.h),
      });
    } else {
      this.walls.push({ x: W - t, y: 0, w: t, h: H });
    }
    return this;
  }

  wall(x: number, y: number, w: number, h: number): this {
    this.walls.push({ x, y, w, h });
    return this;
  }

  spawn(actor: string, x: number, y: number, team?: string): this {
    this.spawns.push({ actor, x, y, team });
    return this;
  }

  build(): BuiltMap {
    return {
      id: this.id,
      width: this.width,
      height: this.height,
      walls: [...this.walls],
      spawns: [...this.spawns],
    };
  }

  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }
}
