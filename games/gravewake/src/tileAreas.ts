/**
 * Convert authored AreaMapDef (walls) into engine TileMap for collision/render helpers.
 */
import { TileMap } from "@anvil/core";
import type { AreaMapDef } from "./types.js";

const FLOOR = 0;
const WALL = 1;

/**
 * Rasterize wall rects onto a tile grid. Used so areas gain TileMap benefits
 * (solid queries, A* grid, wall-rect re-export) without reauthoring JSON yet.
 */
export function areaToTileMap(area: AreaMapDef, tileSize = 32): TileMap {
  const tw = Math.max(4, Math.ceil(area.width / tileSize));
  const th = Math.max(4, Math.ceil(area.height / tileSize));
  const tm = TileMap.empty(area.id, tw, th, tileSize, FLOOR);
  // paint walls from authored rects only (do NOT force border — exits need gaps)
  for (const w of area.walls) {
    const x0 = Math.max(0, Math.floor(w.x / tileSize));
    const y0 = Math.max(0, Math.floor(w.y / tileSize));
    const x1 = Math.min(tw - 1, Math.floor((w.x + w.w - 1) / tileSize));
    const y1 = Math.min(th - 1, Math.floor((w.y + w.h - 1) / tileSize));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        tm.set(tx, ty, WALL);
      }
    }
  }
  tm.spawns = area.spawns.map((s) => ({
    actor: s.actor,
    x: s.x,
    y: s.y,
    team: s.team,
  }));
  return tm;
}

/**
 * Prefer tile-derived walls for solid queries/A*, but keep original rects for
 * sim collision when exit gaps must match authoring exactly.
 * TileMap is still available via areaToTileMap() for pathfinding grids.
 */
export function wallsForSim(area: AreaMapDef, _tileSize = 32): AreaMapDef["walls"] {
  // Use authored walls for sim so map edge exits stay open.
  // TileMap rasterization is used for AI grids / future tile render.
  void _tileSize;
  return area.walls;
}

/** A* grid for the area (optional consumers). */
export function areaPathGrid(area: AreaMapDef, tileSize = 32): number[][] {
  return areaToTileMap(area, tileSize).toGrid();
}
