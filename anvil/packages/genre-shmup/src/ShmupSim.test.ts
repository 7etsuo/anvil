import { describe, expect, it } from "vitest";
import { InputMap, World } from "@anvil/core";
import { patternVelocities } from "./patterns.js";
import { ShmupSim } from "./ShmupSim.js";
import type { EnemyDef, StageDef } from "./types.js";

const enemies: Record<string, EnemyDef> = {
  popcorn: {
    id: "popcorn",
    hp: 1,
    speed: 40,
    radius: 10,
    score: 50,
  },
  tough: {
    id: "tough",
    hp: 3,
    speed: 20,
    radius: 12,
    score: 200,
  },
};

function stage(overrides: Partial<StageDef> = {}): StageDef {
  return {
    id: "test",
    width: 240,
    height: 320,
    playerX: 120,
    playerY: 280,
    lives: 3,
    fireCooldownMs: 50,
    bulletSpeed: 400,
    waves: [
      {
        id: "w1",
        t: 0.1,
        spawns: [{ enemy: "popcorn", x: 120, y: 40, pattern: "down" }],
      },
    ],
    ...overrides,
  };
}

function idle(): InputMap {
  const i = new InputMap();
  i.installDefaults();
  return i;
}

describe("patterns", () => {
  it("down is (0, speed)", () => {
    const v = patternVelocities(
      { kind: "down", speed: 100 },
      0,
      0,
      0,
      0,
    );
    expect(v).toEqual([{ vx: 0, vy: 100 }]);
  });

  it("fan produces count bullets", () => {
    const v = patternVelocities(
      { kind: "fan", speed: 80, count: 3, spreadDeg: 40 },
      0,
      0,
      0,
      100,
    );
    expect(v.length).toBe(3);
  });
});

describe("ShmupSim", () => {
  it("wave spawns at t", () => {
    const world = new World();
    const sim = new ShmupSim(world, stage(), enemies);
    const input = idle();
    sim.update(0.05, input);
    expect(sim.observeBlob().enemyCount).toBe(0);
    sim.update(0.06, input);
    expect(sim.observeBlob().enemyCount).toBe(1);
    expect((sim.observeBlob().wavesFired as string[]).includes("w1")).toBe(
      true,
    );
  });

  it("bullet hits enemy", () => {
    const world = new World();
    const sim = new ShmupSim(
      world,
      stage({
        waves: [
          {
            id: "w1",
            t: 0,
            spawns: [{ enemy: "popcorn", x: 120, y: 200, pattern: "down" }],
          },
        ],
        playerX: 120,
        playerY: 280,
        fireCooldownMs: 10,
        bulletSpeed: 600,
      }),
      enemies,
    );
    const input = idle();
    input.setDown("shoot", true);
    // spawn at t=0
    sim.update(1 / 60, input);
    expect(sim.observeBlob().enemyCount).toBe(1);
    // shoot upward into enemy
    for (let i = 0; i < 40; i++) sim.update(1 / 60, input);
    expect(sim.observeBlob().enemyCount).toBe(0);
    expect(sim.observeBlob().score).toBe(50);
  });

  it("player death on lives", () => {
    const world = new World();
    const sim = new ShmupSim(
      world,
      stage({
        lives: 1,
        playerX: 120,
        playerY: 100,
        waves: [
          {
            id: "w1",
            t: 0,
            spawns: [{ enemy: "popcorn", x: 120, y: 100, pattern: "down" }],
          },
        ],
      }),
      enemies,
    );
    const input = idle();
    for (let i = 0; i < 5; i++) sim.update(1 / 60, input);
    expect(sim.observeBlob().lost).toBe(true);
    expect(sim.observeBlob().lives).toBe(0);
  });

  it("win when waves cleared", () => {
    const world = new World();
    const sim = new ShmupSim(
      world,
      stage({
        waves: [
          {
            id: "w1",
            t: 0,
            spawns: [{ enemy: "popcorn", x: 120, y: 200, pattern: "down" }],
          },
        ],
        fireCooldownMs: 10,
        bulletSpeed: 800,
        playerX: 120,
        playerY: 280,
      }),
      enemies,
    );
    const input = idle();
    input.setDown("shoot", true);
    for (let i = 0; i < 50; i++) sim.update(1 / 60, input);
    expect(sim.observeBlob().won).toBe(true);
  });
});
