/**
 * Procedural map generation for ARPG / top-down games.
 * Engine-owned so any title can request random dungeons or overworlds.
 */

import { MapBuilder, type BuiltMap } from "./MapBuilder.js";
import { TileMap } from "./TileMap.js";

export type ProcgenRng = () => number;

/** A world point procgen must keep open (and connected for dungeons). */
export type ProcgenRequiredPoint = {
  x: number;
  y: number;
  /** Clear square width around the point in world units. */
  clearance?: number;
};

export type DungeonGenOpts = {
  id?: string;
  width?: number;
  height?: number;
  seed?: number;
  roomCount?: [number, number];
  roomSize?: [number, number];
  border?: number;
  /** Actor id for player spawn */
  playerActor?: string;
  /** Optional enemy actor ids to scatter (empty = none) */
  enemyActors?: string[];
  enemyCount?: [number, number];
  /** Minimum corridor width in world units. Defaults to 96. */
  corridorWidth?: number;
  /** Portals, entrances, objectives, and authored landmarks to keep connected. */
  requiredPoints?: ProcgenRequiredPoint[];
  rng?: ProcgenRng;
};

export type OverworldGenOpts = {
  id?: string;
  width?: number;
  height?: number;
  seed?: number;
  border?: number;
  rockCount?: [number, number];
  rockSize?: [number, number];
  playerActor?: string;
  enemyActors?: string[];
  enemyCount?: [number, number];
  /** West hub exit gap */
  westExit?: boolean;
  eastExit?: boolean;
  /** Portals, entrances, and landmarks rocks must not overlap. */
  requiredPoints?: ProcgenRequiredPoint[];
  rng?: ProcgenRng;
};

export type ProcMapResult = BuiltMap & {
  /** Optional tile grid for render / pathfinding */
  tileMap?: TileMap;
  kind: "dungeon" | "overworld";
};

function mulberry32(seed: number): ProcgenRng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ri(rng: ProcgenRng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * BSP-ish room dungeon: dig rooms, connect with corridors, open border optional.
 */
export function generateDungeon(opts: DungeonGenOpts = {}): ProcMapResult {
  const rng = opts.rng ?? mulberry32(opts.seed ?? 1);
  const W = opts.width ?? 1200;
  const H = opts.height ?? 900;
  const border = opts.border ?? 36;
  const [rcLo, rcHi] = opts.roomCount ?? [6, 11];
  const [rsLo, rsHi] = opts.roomSize ?? [140, 240];
  const nRooms = ri(rng, rcLo, rcHi);

  type Room = { x: number; y: number; w: number; h: number; cx: number; cy: number };
  const rooms: Room[] = [];
  for (let i = 0; i < nRooms * 8 && rooms.length < nRooms; i++) {
    const w = ri(rng, rsLo, rsHi);
    const h = ri(rng, rsLo, rsHi);
    const x = ri(rng, border + 20, Math.max(border + 21, W - border - w - 20));
    const y = ri(rng, border + 20, Math.max(border + 21, H - border - h - 20));
    const cand = { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
    const overlaps = rooms.some(
      (r) =>
        cand.x < r.x + r.w + 24 &&
        cand.x + cand.w + 24 > r.x &&
        cand.y < r.y + r.h + 24 &&
        cand.y + cand.h + 24 > r.y,
    );
    if (!overlaps) rooms.push(cand);
  }
  if (rooms.length === 0) {
    rooms.push({
      x: W * 0.3,
      y: H * 0.3,
      w: W * 0.4,
      h: H * 0.4,
      cx: W / 2,
      cy: H / 2,
    });
  }

  // Tile raster: 1 solid, dig 0
  const ts = 32;
  const tw = Math.ceil(W / ts);
  const th = Math.ceil(H / ts);
  const tm = TileMap.empty(opts.id ?? "dungeon_proc", tw, th, ts, 1);
  // fill all solid then dig rooms/corridors as floor(0)
  for (let i = 0; i < tm.tiles.length; i++) tm.tiles[i] = 1;

  const digRect = (x: number, y: number, w: number, h: number) => {
    const x0 = Math.max(0, Math.floor(x / ts));
    const y0 = Math.max(0, Math.floor(y / ts));
    const x1 = Math.min(tw - 1, Math.floor((x + w) / ts));
    const y1 = Math.min(th - 1, Math.floor((y + h) / ts));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) tm.set(tx, ty, 0);
    }
  };

  const hall = Math.max(ts * 2, opts.corridorWidth ?? 96);
  const digCorridor = (x1: number, y1: number, x2: number, y2: number) => {
    if (rng() < 0.5) {
      digRect(Math.min(x1, x2), y1 - hall / 2, Math.abs(x2 - x1) + hall, hall);
      digRect(x2 - hall / 2, Math.min(y1, y2), hall, Math.abs(y2 - y1) + hall);
    } else {
      digRect(x1 - hall / 2, Math.min(y1, y2), hall, Math.abs(y2 - y1) + hall);
      digRect(Math.min(x1, x2), y2 - hall / 2, Math.abs(x2 - x1) + hall, hall);
    }
  };

  for (const r of rooms) digRect(r.x, r.y, r.w, r.h);

  // corridors between consecutive rooms
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1]!;
    const b = rooms[i]!;
    const x1 = a.cx;
    const y1 = a.cy;
    const x2 = b.cx;
    const y2 = b.cy;
    digCorridor(x1, y1, x2, y2);
  }

  // West landing is an actual member of the graph, not an isolated pocket.
  const start = rooms[0]!;
  const westEntry = { x: border + hall * 0.5, y: H * 0.5 };
  digRect(0, H * 0.4, border + 80, H * 0.2);
  digCorridor(westEntry.x, westEntry.y, start.cx, start.cy);

  // Required gameplay landmarks get a clearing connected to the nearest room.
  for (const point of opts.requiredPoints ?? []) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.y < 0 ||
      point.x > W ||
      point.y > H
    ) {
      continue;
    }
    const clearance = Math.max(hall, point.clearance ?? hall);
    digRect(
      point.x - clearance / 2,
      point.y - clearance / 2,
      clearance,
      clearance,
    );
    const nearest = rooms.reduce((best, room) =>
      Math.hypot(room.cx - point.x, room.cy - point.y) <
      Math.hypot(best.cx - point.x, best.cy - point.y)
        ? room
        : best,
    );
    digCorridor(point.x, point.y, nearest.cx, nearest.cy);
  }

  const walls = tm.toWallRects();
  const mb = new MapBuilder(opts.id ?? "dungeon_proc", W, H, { border: 0 });
  for (const w of walls) mb.wall(w.x, w.y, w.w, w.h);

  const playerActor = opts.playerActor ?? "player";
  mb.spawn(playerActor, start.cx, start.cy, "player");

  const enemies = opts.enemyActors ?? [];
  if (enemies.length) {
    const [eLo, eHi] = opts.enemyCount ?? [4, 10];
    const n = ri(rng, eLo, eHi);
    for (let i = 0; i < n; i++) {
      const r = rooms[1 + (i % Math.max(1, rooms.length - 1))] ?? rooms[0]!;
      const ex = r.x + 30 + rng() * (r.w - 60);
      const ey = r.y + 30 + rng() * (r.h - 60);
      const actor = enemies[Math.floor(rng() * enemies.length)]!;
      mb.spawn(actor, ex, ey, "enemy");
    }
  }

  const built = mb.build();
  return { ...built, tileMap: tm, kind: "dungeon" };
}

/**
 * Open overworld with scattered rock/ruins obstacles and border.
 */
export function generateOverworld(opts: OverworldGenOpts = {}): ProcMapResult {
  const rng = opts.rng ?? mulberry32(opts.seed ?? 1);
  const W = opts.width ?? 2400;
  const H = opts.height ?? 1800;
  const border = opts.border ?? 40;
  const mb = new MapBuilder(opts.id ?? "overworld_proc", W, H, { border });

  const westGap = { y: H * 0.35, h: H * 0.3 };
  const eastGap = { y: H * 0.35, h: H * 0.3 };
  mb.addBorder({
    west: opts.westExit !== false ? westGap : undefined,
    east: opts.eastExit ? eastGap : undefined,
  });

  const [rcLo, rcHi] = opts.rockCount ?? [25, 45];
  const [rsLo, rsHi] = opts.rockSize ?? [40, 140];
  const n = ri(rng, rcLo, rcHi);
  const protectedPoints: ProcgenRequiredPoint[] = [
    { x: 220, y: H / 2, clearance: 260 },
    ...(opts.requiredPoints ?? []),
  ];
  for (let i = 0; i < n; i++) {
    const w = ri(rng, rsLo, rsHi);
    const h = ri(rng, rsLo, Math.min(rsHi, w + 20));
    const x = ri(rng, border + 40, W - border - w - 40);
    const y = ri(rng, border + 40, H - border - h - 40);
    const overlapsProtected = protectedPoints.some((point) => {
      const half = Math.max(80, (point.clearance ?? 160) / 2);
      return (
        x < point.x + half &&
        x + w > point.x - half &&
        y < point.y + half &&
        y + h > point.y - half
      );
    });
    if (overlapsProtected) continue;
    mb.wall(x, y, w, h);
  }

  const playerActor = opts.playerActor ?? "player";
  mb.spawn(playerActor, 220, H / 2, "player");

  const enemies = opts.enemyActors ?? [];
  if (enemies.length) {
    const [eLo, eHi] = opts.enemyCount ?? [10, 18];
    const en = ri(rng, eLo, eHi);
    for (let i = 0; i < en; i++) {
      const ex = 500 + rng() * (W - 700);
      const ey = border + 80 + rng() * (H - border * 2 - 160);
      const actor = enemies[Math.floor(rng() * enemies.length)]!;
      mb.spawn(actor, ex, ey, "enemy");
    }
  }

  const built = mb.build();
  return { ...built, kind: "overworld" };
}

/** Seeded rng helper for games. */
export function procgenRng(seed: number): ProcgenRng {
  return mulberry32(seed);
}
