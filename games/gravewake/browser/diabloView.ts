/**
 * Diablo-style isometric presentation (view only — sim stays cartesian).
 * Diamond floor grid with wall AO, extruded iso wall boxes, depth via wx+wy.
 */
import {
  isoDepth,
  pathIsoDiamond,
  screenToWorld,
  worldToScreen,
  type IsoMetrics,
} from "@anvil/genre-topdown2d";
import type { AreaMapDef } from "../src/types.js";

export const ISO: IsoMetrics = {
  tileW: 1.4,
  tileH: 0.7,
};

/** World size of one floor diamond cell. */
export const FLOOR_CELL = 52;

export type Cam = { wx: number; wy: number };

export type FloorMood = "hub" | "overworld" | "dungeon" | "crypt" | "catacombs" | "bonekeep";

export function project(
  wx: number,
  wy: number,
  cam: Cam,
  viewW: number,
  viewH: number,
): { x: number; y: number } {
  return worldToScreen(wx, wy, cam.wx, cam.wy, viewW, viewH, ISO);
}

export function unproject(
  sx: number,
  sy: number,
  cam: Cam,
  viewW: number,
  viewH: number,
): { x: number; y: number } {
  return screenToWorld(sx, sy, cam.wx, cam.wy, viewW, viewH, ISO);
}

export function depthOf(wx: number, wy: number): number {
  return isoDepth(wx, wy);
}

/** Diamond half extents for one FLOOR_CELL in screen space. */
export function cellDiamondSize(): { hw: number; hh: number } {
  const c = worldToScreen(0, 0, 0, 0, 0, 0, ISO);
  const e = worldToScreen(FLOOR_CELL / 2, -FLOOR_CELL / 2, 0, 0, 0, 0, ISO);
  const s = worldToScreen(FLOOR_CELL / 2, FLOOR_CELL / 2, 0, 0, 0, 0, ISO);
  return {
    hw: Math.max(10, Math.abs(e.x - c.x)),
    hh: Math.max(5, Math.abs(s.y - c.y)),
  };
}

function wallMask(area: AreaMapDef): boolean[][] {
  const cols = Math.ceil(area.width / FLOOR_CELL) + 1;
  const rows = Math.ceil(area.height / FLOOR_CELL) + 1;
  const m: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );
  for (const w of area.walls ?? []) {
    const x0 = Math.floor(w.x / FLOOR_CELL);
    const y0 = Math.floor(w.y / FLOOR_CELL);
    const x1 = Math.floor((w.x + w.w - 0.01) / FLOOR_CELL);
    const y1 = Math.floor((w.y + w.h - 0.01) / FLOOR_CELL);
    for (let jy = y0; jy <= y1; jy++) {
      for (let jx = x0; jx <= x1; jx++) {
        if (jy >= 0 && jy < rows && jx >= 0 && jx < cols) m[jy]![jx] = true;
      }
    }
  }
  return m;
}

function neighborWalls(
  mask: boolean[][],
  jx: number,
  jy: number,
): number {
  let n = 0;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    const r = mask[jy + dy];
    if (r?.[jx + dx]) n++;
  }
  return n;
}

const MOOD_BG: Record<FloorMood, string> = {
  hub: "#121018",
  overworld: "#100c0a",
  dungeon: "#08060c",
  crypt: "#0a0810",
  catacombs: "#0c0a0e",
  bonekeep: "#10080a",
};

const MOOD_WASH: Record<FloorMood, string> = {
  hub: "rgba(30,40,60,0.12)",
  overworld: "rgba(70,40,15,0.16)",
  dungeon: "rgba(40,20,70,0.22)",
  crypt: "rgba(35,25,55,0.26)",
  catacombs: "rgba(25,40,35,0.22)",
  bonekeep: "rgba(70,25,20,0.24)",
};

const WALL_FACE: Record<
  FloorMood,
  { sw: string; se: string; top: string }
> = {
  hub: { sw: "#2a2630", se: "#3c3644", top: "#585068" },
  overworld: { sw: "#2c241c", se: "#3e342a", top: "#5c5246" },
  dungeon: { sw: "#1e1a28", se: "#2e2838", top: "#4a4258" },
  crypt: { sw: "#221c2c", se: "#342c3e", top: "#52485e" },
  catacombs: { sw: "#1a221c", se: "#2a322c", top: "#465048" },
  bonekeep: { sw: "#2a1c18", se: "#3e2a22", top: "#5c4034" },
};

export function resolveFloorMood(
  areaKind?: string,
  areaId?: string,
): FloorMood {
  if (areaId === "crypt") return "crypt";
  if (areaId === "catacombs") return "catacombs";
  if (areaId === "bonekeep") return "bonekeep";
  if (areaKind === "dungeon") return "dungeon";
  if (areaKind === "overworld" || areaId === "wastes") return "overworld";
  return "hub";
}

export function drawIsoFloor(
  ctx: CanvasRenderingContext2D,
  area: AreaMapDef,
  cam: Cam,
  viewW: number,
  viewH: number,
  floorImg: CanvasImageSource | null,
  mood: FloorMood = "hub",
): void {
  ctx.fillStyle = MOOD_BG[mood] ?? MOOD_BG.hub;
  ctx.fillRect(0, 0, viewW, viewH);

  const { hw, hh } = cellDiamondSize();
  const cols = Math.ceil(area.width / FLOOR_CELL) + 1;
  const rows = Math.ceil(area.height / FLOOR_CELL) + 1;
  const mask = wallMask(area);

  for (let jy = 0; jy < rows; jy++) {
    for (let jx = 0; jx < cols; jx++) {
      if (mask[jy]?.[jx]) continue; // no floor under solid wall cells
      const wx = jx * FLOOR_CELL + FLOOR_CELL * 0.5;
      const wy = jy * FLOOR_CELL + FLOOR_CELL * 0.5;
      const p = project(wx, wy, cam, viewW, viewH);
      if (
        p.x < -hw * 2 ||
        p.y < -hh * 2 ||
        p.x > viewW + hw * 2 ||
        p.y > viewH + hh * 2
      ) {
        continue;
      }

      const wallsN = neighborWalls(mask, jx, jy);
      pathIsoDiamond(ctx, p.x, p.y, hw, hh);
      if (floorImg) {
        ctx.save();
        ctx.clip();
        const tw = hw * 2.4;
        const th = hh * 2.4;
        // Phase offset per cell for less wallpaper repeat
        const ox = ((jx * 17 + jy * 9) % 7) - 3;
        const oy = ((jx * 5 + jy * 13) % 7) - 3;
        ctx.drawImage(
          floorImg as CanvasImageSource,
          p.x - tw / 2 + ox,
          p.y - th / 2 + oy,
          tw,
          th,
        );
        // Soft checker (not harsh)
        if ((jx + jy) % 2 === 0) {
          ctx.fillStyle = "rgba(0,0,0,0.05)";
          ctx.fillRect(p.x - tw / 2, p.y - th / 2, tw, th);
        }
        // Wall-adjacent ambient occlusion — big Diablo depth cue
        if (wallsN > 0) {
          ctx.fillStyle = `rgba(0,0,0,${Math.min(0.55, 0.08 + wallsN * 0.07)})`;
          ctx.fillRect(p.x - tw / 2, p.y - th / 2, tw, th);
        }
        ctx.restore();
      } else {
        const g = ((jx + jy) % 2) * 8;
        ctx.fillStyle = `rgb(${48 + g},${40 + g},${36 + g})`;
        ctx.fill();
      }
      // Only soft edge when next to walls (room outline), not every cell
      if (wallsN > 0) {
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1.2;
        pathIsoDiamond(ctx, p.x, p.y, hw, hh);
        ctx.stroke();
      } else if ((jx + jy) % 3 === 0) {
        ctx.strokeStyle = "rgba(0,0,0,0.06)";
        ctx.lineWidth = 1;
        pathIsoDiamond(ctx, p.x, p.y, hw, hh);
        ctx.stroke();
      }
    }
  }

  ctx.fillStyle = MOOD_WASH[mood] ?? MOOD_WASH.hub;
  ctx.fillRect(0, 0, viewW, viewH);
}

export function drawIsoWalls(
  ctx: CanvasRenderingContext2D,
  area: AreaMapDef,
  cam: Cam,
  viewW: number,
  viewH: number,
  wallImg: CanvasImageSource | null,
  wallZ = 40,
  mood: FloorMood = "hub",
): void {
  const faces = WALL_FACE[mood] ?? WALL_FACE.overworld;
  const walls = [...(area.walls ?? [])].sort(
    (a, b) =>
      isoDepth(a.x + a.w / 2, a.y + a.h / 2) -
      isoDepth(b.x + b.w / 2, b.y + b.h / 2),
  );

  // Slight height variation by mood
  const z =
    mood === "bonekeep" ? wallZ + 10 : mood === "hub" ? wallZ - 6 : wallZ;

  for (const w of walls) {
    const step = FLOOR_CELL;
    for (let y = w.y; y < w.y + w.h; y += step) {
      for (let x = w.x; x < w.x + w.w; x += step) {
        const ww = Math.min(step, w.x + w.w - x);
        const hh = Math.min(step, w.y + w.h - y);
        drawIsoBox(
          ctx,
          x,
          y,
          ww,
          hh,
          cam,
          viewW,
          viewH,
          wallImg,
          z,
          faces,
        );
      }
    }
  }
}

function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cam: Cam,
  viewW: number,
  viewH: number,
  wallImg: CanvasImageSource | null,
  wallZ: number,
  faces: { sw: string; se: string; top: string },
): void {
  const tl = project(x, y, cam, viewW, viewH);
  const tr = project(x + w, y, cam, viewW, viewH);
  const br = project(x + w, y + h, cam, viewW, viewH);
  const bl = project(x, y + h, cam, viewW, viewH);

  const minX = Math.min(tl.x, tr.x, br.x, bl.x);
  const maxX = Math.max(tl.x, tr.x, br.x, bl.x);
  const minY = Math.min(tl.y, tr.y, br.y, bl.y) - wallZ;
  const maxY = Math.max(tl.y, tr.y, br.y, bl.y);
  if (maxX < -30 || maxY < -30 || minX > viewW + 30 || minY > viewH + 30)
    return;

  const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - wallZ });
  const tlt = up(tl);
  const trt = up(tr);
  const brt = up(br);
  const blt = up(bl);

  fillQuad(ctx, bl, br, brt, blt, faces.sw, wallImg, minX, minY, maxX, maxY, wallZ, 0.45);
  fillQuad(ctx, tr, br, brt, trt, faces.se, wallImg, minX, minY, maxX, maxY, wallZ, 0.35);

  ctx.beginPath();
  ctx.moveTo(tlt.x, tlt.y);
  ctx.lineTo(trt.x, trt.y);
  ctx.lineTo(brt.x, brt.y);
  ctx.lineTo(blt.x, blt.y);
  ctx.closePath();
  ctx.fillStyle = faces.top;
  ctx.fill();
  if (wallImg) {
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.3;
    ctx.drawImage(
      wallImg,
      minX,
      minY,
      Math.max(1, maxX - minX),
      Math.max(1, maxY - minY + wallZ),
    );
    ctx.restore();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,220,160,0.12)";
  ctx.beginPath();
  ctx.moveTo(tlt.x, tlt.y);
  ctx.lineTo(trt.x, trt.y);
  ctx.stroke();
}

function fillQuad(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
  color: string,
  wallImg: CanvasImageSource | null,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  wallZ: number,
  alpha: number,
): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (wallImg) {
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      wallImg,
      minX,
      minY,
      Math.max(1, maxX - minX),
      Math.max(1, maxY - minY + wallZ),
    );
    ctx.restore();
  }
}

/**
 * Soft radial light layer (call after world, before HUD).
 * Uses additive-ish fill via globalAlpha radials.
 */
export function drawPointLights(
  ctx: CanvasRenderingContext2D,
  lights: Array<{ x: number; y: number; r: number; color: string; a?: number }>,
): void {
  ctx.save();
  for (const L of lights) {
    const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
    const a = L.a ?? 0.35;
    g.addColorStop(0, L.color.replace(")", `,${a})`).replace("rgb", "rgba").replace("rgbaa", "rgba"));
    // if color already rgba
    const col = L.color.startsWith("rgba")
      ? L.color
      : L.color.startsWith("#")
        ? hexToRgba(L.color, a)
        : L.color;
    const g2 = ctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, L.r);
    g2.addColorStop(0, col);
    g2.addColorStop(0.45, col.replace(/[\d.]+\)$/, `${a * 0.35})`));
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(L.x, L.y, L.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
