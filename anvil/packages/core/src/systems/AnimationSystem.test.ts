import { describe, expect, it } from "vitest";
import { World } from "../world/World.js";
import { createAnimationSystem } from "./AnimationSystem.js";

describe("AnimationSystem", () => {
  it("advances frames over time", () => {
    const world = new World();
    const id = world.spawn({
      sprite: {
        frames: ["a.png", "b.png", "c.png"],
        fps: 10,
        loop: true,
        frame: 0,
      },
    });
    const sys = createAnimationSystem(world);
    // 0.15s at 10fps ≈ 1.5 frames
    sys(0.15);
    const e = world.get(id)!;
    expect(e.sprite!.frame).toBeGreaterThanOrEqual(1);
  });
});
