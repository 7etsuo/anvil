/**
 * Isometric presentation math for top-down sim worlds.
 * Simulation stays axis-aligned (x right, y down); only the *view* is iso.
 * This is the standard approach for Diablo-style ARPGs on cartesian sim data.
 */

export type IsoMetrics = {
  /** Screen pixels for one world-unit step on the X-axis of the diamond. */
  tileW: number;
  /** Screen pixels for one world-unit step on the Y-axis of the diamond (usually tileW/2). */
  tileH: number;
};

export const DEFAULT_ISO: IsoMetrics = {
  tileW: 1.1,
  tileH: 0.55,
};

/** World (sim) → isometric screen-space (before camera offset). */
export function worldToIso(
  wx: number,
  wy: number,
  m: IsoMetrics = DEFAULT_ISO,
): { x: number; y: number } {
  return {
    x: (wx - wy) * (m.tileW * 0.5),
    y: (wx + wy) * (m.tileH * 0.5),
  };
}

/** Inverse: isometric screen-space (no camera) → world (sim). */
export function isoToWorld(
  sx: number,
  sy: number,
  m: IsoMetrics = DEFAULT_ISO,
): { x: number; y: number } {
  const a = m.tileW * 0.5;
  const b = m.tileH * 0.5;
  // sx = (x - y) * a
  // sy = (x + y) * b
  const x = sx / (2 * a) + sy / (2 * b);
  const y = sy / (2 * b) - sx / (2 * a);
  return { x, y };
}

/**
 * Camera: screen position of a world point given camera focus in world space
 * and viewport size. Focus is centered on screen.
 */
export function worldToScreen(
  wx: number,
  wy: number,
  camWx: number,
  camWy: number,
  viewW: number,
  viewH: number,
  m: IsoMetrics = DEFAULT_ISO,
): { x: number; y: number } {
  const p = worldToIso(wx, wy, m);
  const c = worldToIso(camWx, camWy, m);
  return {
    x: p.x - c.x + viewW * 0.5,
    y: p.y - c.y + viewH * 0.5,
  };
}

/** Screen click → world, given same camera focus. */
export function screenToWorld(
  sx: number,
  sy: number,
  camWx: number,
  camWy: number,
  viewW: number,
  viewH: number,
  m: IsoMetrics = DEFAULT_ISO,
): { x: number; y: number } {
  const c = worldToIso(camWx, camWy, m);
  const ix = sx - viewW * 0.5 + c.x;
  const iy = sy - viewH * 0.5 + c.y;
  return isoToWorld(ix, iy, m);
}

/** Depth key for painter's algorithm (farther first). */
export function isoDepth(wx: number, wy: number): number {
  return wx + wy;
}

/** Draw a flat isometric diamond (floor tile) centered at screen (cx,cy). */
export function pathIsoDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - halfH);
  ctx.lineTo(cx + halfW, cy);
  ctx.lineTo(cx, cy + halfH);
  ctx.lineTo(cx - halfW, cy);
  ctx.closePath();
}
