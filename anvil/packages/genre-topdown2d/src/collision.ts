import type { WallRect } from "./types.js";

/** Circle vs AABB: push circle center out of rect, return whether hit. */
export function resolveCircleWall(
  cx: number,
  cy: number,
  r: number,
  wall: WallRect,
): { x: number; y: number; hit: boolean } {
  const nearestX = clamp(cx, wall.x, wall.x + wall.w);
  const nearestY = clamp(cy, wall.y, wall.y + wall.h);
  let dx = cx - nearestX;
  let dy = cy - nearestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= r * r) return { x: cx, y: cy, hit: false };

  // Center inside rect — push out along shortest axis
  if (distSq < 1e-12) {
    const left = cx - wall.x;
    const right = wall.x + wall.w - cx;
    const top = cy - wall.y;
    const bottom = wall.y + wall.h - cy;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: wall.x - r, y: cy, hit: true };
    if (min === right) return { x: wall.x + wall.w + r, y: cy, hit: true };
    if (min === top) return { x: cx, y: wall.y - r, hit: true };
    return { x: cx, y: wall.y + wall.h + r, hit: true };
  }

  const dist = Math.sqrt(distSq);
  const push = r - dist;
  dx /= dist;
  dy /= dist;
  return { x: cx + dx * push, y: cy + dy * push, hit: true };
}

export function resolveCircleCircle(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
  immovableB: boolean,
): {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  hit: boolean;
} {
  let dx = ax - bx;
  let dy = ay - by;
  let dist = Math.hypot(dx, dy);
  const minDist = ar + br;
  if (dist >= minDist || dist <= 0) {
    // Overlapping centers: invent a small separation
    if (dist <= 0 && dist < minDist) {
      dx = 1;
      dy = 0;
      dist = 1e-6;
    } else {
      return { ax, ay, bx, by, hit: false };
    }
  }
  const nX = dx / dist;
  const nY = dy / dist;
  const push = (minDist - dist) / 2;
  if (immovableB) {
    return {
      ax: ax + nX * (minDist - dist),
      ay: ay + nY * (minDist - dist),
      bx,
      by,
      hit: true,
    };
  }
  return {
    ax: ax + nX * push,
    ay: ay + nY * push,
    bx: bx - nX * push,
    by: by - nY * push,
    hit: true,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
