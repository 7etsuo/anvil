import type { WallHit } from "./types.js";

/**
 * Classic DDA raycast through a grid (S-FPS2).
 * World coords: cell (ix, iy) covers [ix, ix+1) x [iy, iy+1) when tileSize=1.
 */
export function castRay(
  cells: number[][],
  ox: number,
  oy: number,
  rayAngle: number,
  maxDist = 64,
): WallHit | null {
  const h = cells.length;
  if (h === 0) return null;
  const w = cells[0]!.length;

  const dirX = Math.cos(rayAngle);
  const dirY = Math.sin(rayAngle);

  let mapX = Math.floor(ox);
  let mapY = Math.floor(oy);

  const deltaDistX = dirX === 0 ? 1e30 : Math.abs(1 / dirX);
  const deltaDistY = dirY === 0 ? 1e30 : Math.abs(1 / dirY);

  let stepX: number;
  let stepY: number;
  let sideDistX: number;
  let sideDistY: number;

  if (dirX < 0) {
    stepX = -1;
    sideDistX = (ox - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - ox) * deltaDistX;
  }
  if (dirY < 0) {
    stepY = -1;
    sideDistY = (oy - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - oy) * deltaDistY;
  }

  let side: 0 | 1 = 0;
  let hit = false;
  let texId = 0;
  let steps = 0;
  const maxSteps = Math.ceil(maxDist * 2) + 4;

  while (!hit && steps < maxSteps) {
    steps++;
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (mapX < 0 || mapY < 0 || mapX >= w || mapY >= h) {
      return null;
    }
    const cell = cells[mapY]![mapX]!;
    if (cell > 0) {
      hit = true;
      texId = cell;
    }
  }

  if (!hit) return null;

  // Perpendicular wall distance (fisheye corrected when used with camera plane)
  let dist: number;
  if (side === 0) {
    dist = (mapX - ox + (1 - stepX) / 2) / dirX;
  } else {
    dist = (mapY - oy + (1 - stepY) / 2) / dirY;
  }
  dist = Math.abs(dist);
  if (dist < 1e-6) dist = 1e-6;
  if (dist > maxDist) return null;

  let wallX: number;
  if (side === 0) wallX = oy + dist * dirY;
  else wallX = ox + dist * dirX;
  wallX -= Math.floor(wallX);

  return { dist, mapX, mapY, side, texId, wallX };
}

/** Cast a fan of columns for rendering / observe. */
export function castColumns(
  cells: number[][],
  x: number,
  y: number,
  angle: number,
  fov: number,
  cols: number,
): Array<WallHit | null> {
  const out: Array<WallHit | null> = [];
  for (let i = 0; i < cols; i++) {
    const t = cols === 1 ? 0.5 : i / (cols - 1);
    const rayAng = angle - fov / 2 + t * fov;
    out.push(castRay(cells, x, y, rayAng));
  }
  return out;
}
