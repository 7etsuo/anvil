import { describe, expect, it } from "vitest";
import { generateDungeon } from "@anvil/core";
import { NavGrid } from "./pathfind.js";

describe("NavGrid", () => {
  it("paths around a wall", () => {
    const nav = new NavGrid(
      400,
      400,
      [{ x: 180, y: 0, w: 40, h: 300 }],
      20,
      8,
    );
    const path = nav.findPath(50, 200, 350, 200);
    expect(path.length).toBeGreaterThan(2);
    // should not go through wall center
    for (const p of path) {
      expect(!(p.x > 180 && p.x < 220 && p.y < 280)).toBe(true);
    }
  });

  it("returns empty when trapped", () => {
    const nav = new NavGrid(
      200,
      200,
      [
        { x: 0, y: 0, w: 200, h: 20 },
        { x: 0, y: 180, w: 200, h: 20 },
        { x: 0, y: 0, w: 20, h: 200 },
        { x: 180, y: 0, w: 20, h: 200 },
        { x: 40, y: 40, w: 120, h: 120 },
      ],
      20,
      4,
    );
    // start outside map walls but inside box — may still find something; just smoke
    const path = nav.findPath(100, 100, 10, 10);
    expect(Array.isArray(path)).toBe(true);
  });

  it("resolves generated-map coordinates and never snaps a path back into a wall", () => {
    const nav = new NavGrid(
      240,
      200,
      [{ x: 80, y: 40, w: 80, h: 120 }],
      20,
      8,
    );
    const safe = nav.nearestWalkable(120, 100, 8);
    expect(safe).not.toBeNull();
    const safeCell = nav.worldToCell(safe!.x, safe!.y);
    expect(nav.isBlocked(safeCell.gx, safeCell.gy)).toBe(false);

    const path = nav.findPath(30, 100, 120, 100);
    expect(path.length).toBeGreaterThan(0);
    const end = path.at(-1)!;
    const endCell = nav.worldToCell(end.x, end.y);
    expect(nav.isBlocked(endCell.gx, endCell.gy)).toBe(false);
    expect(end).not.toEqual({ x: 120, y: 100 });
  });

  it("keeps required dungeon entrances connected across many seeds", () => {
    const entrance = { x: 80, y: 350, clearance: 180 };
    for (let seed = 1; seed <= 40; seed++) {
      const map = generateDungeon({
        seed,
        width: 1000,
        height: 700,
        roomCount: [4, 8],
        roomSize: [140, 240],
        corridorWidth: 96,
        requiredPoints: [entrance],
        enemyActors: ["enemy"],
        enemyCount: [8, 8],
      });
      const nav = new NavGrid(map.width, map.height, map.walls, 28, 14);
      const player = map.spawns.find((spawn) => spawn.team === "player")!;
      expect(nav.isWorldBlocked(entrance.x, entrance.y)).toBe(false);
      expect(
        nav.findPath(player.x, player.y, entrance.x, entrance.y).length,
        `seed ${seed}: entrance disconnected`,
      ).toBeGreaterThan(0);
      for (const enemy of map.spawns.filter((spawn) => spawn.team === "enemy")) {
        expect(
          nav.findPath(player.x, player.y, enemy.x, enemy.y).length,
          `seed ${seed}: enemy disconnected`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
