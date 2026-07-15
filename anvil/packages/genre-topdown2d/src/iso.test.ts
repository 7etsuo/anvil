import { describe, expect, it } from "vitest";
import { DEFAULT_ISO, isoToWorld, worldToIso, worldToScreen, screenToWorld } from "./iso.js";

describe("iso math", () => {
  it("round-trips world ↔ iso", () => {
    const p = { x: 120, y: 340 };
    const i = worldToIso(p.x, p.y, DEFAULT_ISO);
    const back = isoToWorld(i.x, i.y, DEFAULT_ISO);
    expect(back.x).toBeCloseTo(p.x, 5);
    expect(back.y).toBeCloseTo(p.y, 5);
  });

  it("round-trips through camera screen helpers", () => {
    const cam = { x: 200, y: 300 };
    const w = { x: 250, y: 360 };
    const s = worldToScreen(w.x, w.y, cam.x, cam.y, 1280, 720, DEFAULT_ISO);
    const back = screenToWorld(s.x, s.y, cam.x, cam.y, 1280, 720, DEFAULT_ISO);
    expect(back.x).toBeCloseTo(w.x, 4);
    expect(back.y).toBeCloseTo(w.y, 4);
  });
});
