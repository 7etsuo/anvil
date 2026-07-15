import { describe, expect, it } from "vitest";
import { InputMap, World } from "@anvil/core";
import { resolveCircleWall } from "./collision.js";
import { TopdownSim } from "./TopdownSim.js";
import type { ActorDef, MapDef } from "./types.js";

const actors: Record<string, ActorDef> = {
  player: {
    id: "player",
    hp: 30,
    speed: 120,
    ai: "none",
    team: "player",
    radius: 12,
  },
  slime: {
    id: "slime",
    hp: 10,
    speed: 60,
    ai: "chase_melee",
    team: "enemy",
    radius: 12,
    contactDamage: 5,
    meleeRange: 24,
  },
  archer: {
    id: "archer",
    hp: 8,
    speed: 40,
    ai: "keep_distance_ranged",
    team: "enemy",
    radius: 12,
    contactDamage: 0,
    preferredRange: 100,
    preferredRangeBand: 20,
    projectileDamage: 3,
    projectileSpeed: 200,
    projectileCooldownMs: 100,
    projectileLifetimeMs: 3000,
  },
};

function makeMap(overrides: Partial<MapDef> = {}): MapDef {
  return {
    id: "room1",
    width: 320,
    height: 240,
    walls: [
      { x: 0, y: 0, w: 320, h: 16 },
      { x: 0, y: 224, w: 320, h: 16 },
      { x: 0, y: 0, w: 16, h: 240 },
      { x: 304, y: 0, w: 16, h: 240 },
      // interior wall at x=100-120, y=80-160
      { x: 100, y: 80, w: 20, h: 80 },
    ],
    spawns: [
      { actor: "player", x: 50, y: 120, team: "player" },
      { actor: "slime", x: 200, y: 120, team: "enemy" },
    ],
    ...overrides,
  };
}

function inputWith(moves: string[]): InputMap {
  const input = new InputMap();
  input.installDefaults();
  for (const m of moves) input.setDown(m, true);
  return input;
}

describe("collision", () => {
  it("pushes circle out of wall", () => {
    const r = resolveCircleWall(110, 100, 12, {
      x: 100,
      y: 80,
      w: 20,
      h: 80,
    });
    expect(r.hit).toBe(true);
    // center was inside AABB — shortest axis push clears the expanded solid
    expect(r.x <= 100 - 12 || r.x >= 120 + 12).toBe(true);
  });
});

describe("TopdownSim", () => {
  it("player cannot walk through wall", () => {
    const world = new World();
    const sim = new TopdownSim(world, makeMap(), actors, () => 0.5);
    const input = inputWith(["move_right"]);
    // walk into interior wall from left
    const player = world.get("player")!;
    player.transform!.x = 80;
    player.transform!.y = 120;
    for (let i = 0; i < 60; i++) sim.update(1 / 60, input);
    // wall is at x=100, r=12 → center cannot go past ~88
    expect(player.transform!.x).toBeLessThan(100);
  });

  it("chase enemy reduces distance", () => {
    const world = new World();
    const sim = new TopdownSim(world, makeMap(), actors, () => 0.5);
    const idle = inputWith([]);
    const player = world.get("player")!;
    const slime = [...world.all()].find((e) => e.tags.includes("slime"))!;
    const d0 = Math.hypot(
      slime.transform!.x - player.transform!.x,
      slime.transform!.y - player.transform!.y,
    );
    for (let i = 0; i < 90; i++) sim.update(1 / 60, idle);
    const d1 = Math.hypot(
      slime.transform!.x - player.transform!.x,
      slime.transform!.y - player.transform!.y,
    );
    expect(d1).toBeLessThan(d0);
  });

  it("contact damages player", () => {
    const world = new World();
    const sim = new TopdownSim(
      world,
      makeMap({
        walls: [
          { x: 0, y: 0, w: 320, h: 16 },
          { x: 0, y: 224, w: 320, h: 16 },
          { x: 0, y: 0, w: 16, h: 240 },
          { x: 304, y: 0, w: 16, h: 240 },
        ],
        spawns: [
          { actor: "player", x: 100, y: 120, team: "player" },
          { actor: "slime", x: 120, y: 120, team: "enemy" },
        ],
      }),
      actors,
      () => 0.5,
    );
    const idle = inputWith([]);
    const player = world.get("player")!;
    const hp0 = player.health!.hp;
    // already overlapping-ish (100 vs 120); a few frames for combat + AI
    for (let i = 0; i < 10; i++) sim.update(1 / 60, idle);
    expect(player.health!.hp).toBeLessThan(hp0);
  });

  it("seed-stable spawn positions", () => {
    const map = makeMap();
    const w1 = new World();
    const w2 = new World();
    new TopdownSim(w1, map, actors, () => 0.42);
    new TopdownSim(w2, map, actors, () => 0.42);
    const p1 = w1.get("player")!.transform!;
    const p2 = w2.get("player")!.transform!;
    expect(p1.x).toBe(p2.x);
    expect(p1.y).toBe(p2.y);
    const s1 = [...w1.all()].find((e) => e.tags.includes("slime"))!.transform!;
    const s2 = [...w2.all()].find((e) => e.tags.includes("slime"))!.transform!;
    expect(s1.x).toBe(s2.x);
    expect(s1.y).toBe(s2.y);
  });

  it("ranged AI fires projectile", () => {
    const world = new World();
    const sim = new TopdownSim(
      world,
      makeMap({
        walls: [],
        spawns: [
          { actor: "player", x: 50, y: 120, team: "player" },
          { actor: "archer", x: 150, y: 120, team: "enemy" },
        ],
      }),
      actors,
      () => 0.5,
    );
    const idle = inputWith([]);
    for (let i = 0; i < 20; i++) sim.update(1 / 60, idle);
    const projs = world.all().filter((e) => e.tags.includes("projectile"));
    expect(projs.length).toBeGreaterThan(0);
  });

  it("observeBlob exposes entities", () => {
    const world = new World();
    const sim = new TopdownSim(world, makeMap(), actors, () => 0.5);
    const blob = sim.observeBlob();
    expect(blob.mapId).toBe("room1");
    expect(Array.isArray(blob.entities)).toBe(true);
    expect((blob.entities as unknown[]).length).toBe(2);
  });
});
