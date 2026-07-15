/**
 * Diablo-style isometric presentation (view only — sim stays cartesian).
 * Diamond floor grid, extruded iso wall boxes, depth via wx+wy.
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
  // Corner offsets of a cell centered at origin
  const c = worldToScreen(0, 0, 0, 0, 0, 0, ISO);
  const e = worldToScreen(FLOOR_CELL / 2, -FLOOR_CELL / 2, 0, 0, 0, 0, ISO);
  const s = worldToScreen(FLOOR_CELL / 2, FLOOR_CELL / 2, 0, 0, 0, 0, ISO);
  return {
    hw: Math.max(10, Math.abs(e.x - c.x)),
    hh: Math.max(5, Math.abs(s.y - c.y)),
  };
}

export function drawIsoFloor(
  ctx: CanvasRenderingContext2D,
  area: AreaMapDef,
  cam: Cam,
  viewW: number,
  viewH: number,
  floorImg: CanvasImageSource | null,
  mood: "hub" | "overworld" | "dungeon",
): void {
  ctx.fillStyle =
    mood === "dungeon" ? "#0a080c" : mood === "hub" ? "#141210" : "#100e0c";
  ctx.fillRect(0, 0, viewW, viewH);

  const { hw, hh } = cellDiamondSize();
  const cols = Math.ceil(area.width / FLOOR_CELL) + 1;
  const rows = Math.ceil(area.height / FLOOR_CELL) + 1;

  for (let jy = 0; jy < rows; jy++) {
    for (let jx = 0; jx < cols; jx++) {
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

      pathIsoDiamond(ctx, p.x, p.y, hw, hh);
      if (floorImg) {
        ctx.save();
        ctx.clip();
        const tw = hw * 2.4;
        const th = hh * 2.4;
        ctx.drawImage(floorImg as CanvasImageSource, p.x - tw / 2, p.y - th / 2, tw, th);
        // checker darken for depth read
        if ((jx + jy) % 2 === 0) {
          ctx.fillStyle = "rgba(0,0,0,0.08)";
          ctx.fillRect(p.x - tw / 2, p.y - th / 2, tw, th);
        }
        ctx.restore();
      } else {
        const g = ((jx + jy) % 2) * 10;
        ctx.fillStyle = `rgb(${52 + g},${44 + g},${38 + g})`;
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 1;
      pathIsoDiamond(ctx, p.x, p.y, hw, hh);
      ctx.stroke();
    }
  }

  ctx.fillStyle =
    mood === "dungeon"
      ? "rgba(25,12,40,0.28)"
      : mood === "overworld"
        ? "rgba(45,25,12,0.14)"
        : "rgba(0,0,0,0.08)";
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
): void {
  const walls = [...area.walls].sort(
    (a, b) =>
      isoDepth(a.x + a.w / 2, a.y + a.h / 2) -
      isoDepth(b.x + b.w / 2, b.y + b.h / 2),
  );

  for (const w of walls) {
    const step = FLOOR_CELL;
    for (let y = w.y; y < w.y + w.h; y += step) {
      for (let x = w.x; x < w.x + w.w; x += step) {
        const ww = Math.min(step, w.x + w.w - x);
        const hh = Math.min(step, w.y + w.h - y);
        drawIsoBox(ctx, x, y, ww, hh, cam, viewW, viewH, wallImg, wallZ);
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
): void {
  const tl = project(x, y, cam, viewW, viewH);
  const tr = project(x + w, y, cam, viewW, viewH);
  const br = project(x + w, y + h, cam, viewW, viewH);
  const bl = project(x, y + h, cam, viewW, viewH);

  const minX = Math.min(tl.x, tr.x, br.x, bl.x);
  const maxX = Math.max(tl.x, tr.x, br.x, bl.x);
  const minY = Math.min(tl.y, tr.y, br.y, bl.y) - wallZ;
  const maxY = Math.max(tl.y, tr.y, br.y, bl.y);
  if (maxX < -30 || maxY < -30 || minX > viewW + 30 || minY > viewH + 30) return;

  const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - wallZ });
  const tlt = up(tl);
  const trt = up(tr);
  const brt = up(br);
  const blt = up(bl);

  // South-west face
  fillQuad(ctx, bl, br, brt, blt, "#2c241c", wallImg, minX, minY, maxX, maxY, wallZ, 0.5);
  // South-east face
  fillQuad(ctx, tr, br, brt, trt, "#3e342a", wallImg, minX, minY, maxX, maxY, wallZ, 0.4);
  // Top
  ctx.beginPath();
  ctx.moveTo(tlt.x, tlt.y);
  ctx.lineTo(trt.x, trt.y);
  ctx.lineTo(brt.x, brt.y);
  ctx.lineTo(blt.x, blt.y);
  ctx.closePath();
  ctx.fillStyle = "#5c5246";
  ctx.fill();
  if (wallImg) {
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(
      wallImg,
      minX,
      minY,
      Math.max(1, maxX - minX),
      Math.max(1, maxY - minY + wallZ),
    );
    ctx.restore();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,220,160,0.14)";
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
