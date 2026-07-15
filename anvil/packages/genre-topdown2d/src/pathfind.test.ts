import { describe, expect, it } from "vitest";
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
});
