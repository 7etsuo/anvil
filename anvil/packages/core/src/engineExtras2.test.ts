import { describe, expect, it } from "vitest";
import { ViewCamera } from "./camera/ViewCamera.js";
import { EventBus } from "./events/EventBus.js";
import {
  emitHit,
  emitKill,
  onCombatHit,
  onCombatKill,
} from "./combat/CombatEvents.js";
import { AbilitySystem, type AbilityDef } from "./ability/AbilitySystem.js";
import { TileMap } from "./map/TileMap.js";
import { SpatialHash } from "./spatial/SpatialHash.js";
import { ActorAnimController } from "./anim/ActorAnim.js";
import { dropFromTable } from "./rpg/LootPolicy.js";
import { World } from "./world/World.js";
import {
  buildRunState,
  parseRunState,
  serializeRunState,
} from "./save/runState.js";

describe("ViewCamera", () => {
  it("round-trips iso project/unproject", () => {
    const cam = new ViewCamera({
      mode: "iso",
      viewW: 1280,
      viewH: 720,
      iso: { tileW: 1.4, tileH: 0.7 },
    });
    cam.snap(200, 300);
    const s = cam.project(250, 360);
    const w = cam.unproject(s.x, s.y);
    expect(w.x).toBeCloseTo(250, 3);
    expect(w.y).toBeCloseTo(360, 3);
  });

  it("ortho scales", () => {
    const cam = new ViewCamera({ mode: "ortho", scale: 2, viewW: 100, viewH: 100 });
    cam.snap(10, 10);
    const s = cam.project(20, 10);
    expect(s.x).toBeCloseTo(50 + 20, 5); // center 50 + (20-10)*2
  });
});

describe("CombatEvents", () => {
  it("emits hit and kill", () => {
    const bus = new EventBus();
    const hits: unknown[] = [];
    const kills: unknown[] = [];
    onCombatHit(bus, (e) => hits.push(e));
    onCombatKill(bus, (e) => kills.push(e));
    emitHit(bus, {
      targetId: "e1",
      damage: 10,
      x: 1,
      y: 2,
      crit: true,
    });
    emitKill(bus, { targetId: "e1", x: 1, y: 2 });
    expect(hits).toHaveLength(1);
    expect(kills).toHaveLength(1);
  });
});

describe("AbilitySystem", () => {
  it("cooldowns after cast", () => {
    const abs = new AbilitySystem();
    const slash: AbilityDef = {
      id: "slash",
      cooldownMs: 500,
      targeting: "direction_melee",
      damageMul: 1,
    };
    abs.register(slash);
    abs.setCastHandler((def, ctx) => ({
      ok: true,
      abilityId: def.id,
      damage: (ctx.baseDamage ?? 1) * (def.damageMul ?? 1),
    }));
    const r1 = abs.tryCast("player", "slash", { x: 0, y: 0, baseDamage: 10 });
    expect(r1.ok).toBe(true);
    expect(r1.damage).toBe(10);
    expect(abs.isReady("player", "slash")).toBe(false);
    abs.update(500);
    expect(abs.isReady("player", "slash")).toBe(true);
  });
});

describe("TileMap", () => {
  it("builds wall rects from solid tiles", () => {
    const tm = TileMap.empty("t", 5, 5, 32).strokeBorder(1);
    tm.set(2, 2, 1);
    const walls = tm.toWallRects();
    expect(walls.length).toBeGreaterThan(0);
    expect(tm.blocksWorld(16, 16)).toBe(true); // border
    expect(tm.blocksWorld(80, 80)).toBe(true); // center solid
    expect(tm.toGrid()[0]![0]).toBe(1);
  });
});

describe("SpatialHash", () => {
  it("queries neighbors by radius", () => {
    const h = new SpatialHash(50);
    h.upsert({ id: "a", x: 0, y: 0 });
    h.upsert({ id: "b", x: 40, y: 0 });
    h.upsert({ id: "c", x: 200, y: 0 });
    const near = h.queryRadiusIds(0, 0, 50);
    expect(near.sort()).toEqual(["a", "b"]);
  });
});

describe("ActorAnimController", () => {
  it("prefers death over walk", () => {
    const a = new ActorAnimController({
      clips: {
        idle: ["i0"],
        walk: ["w0", "w1"],
        death: ["d0"],
      },
      fps: 10,
    });
    a.tick(16, { moving: true });
    expect(a.state).toBe("walk");
    a.tick(16, { dead: true });
    expect(a.state).toBe("death");
    a.tick(16, { moving: true });
    expect(a.state).toBe("death");
  });
});

import { generateDungeon, generateOverworld } from "./map/Procgen.js";

describe("Procgen", () => {
  it("generates dungeon with rooms and walls", () => {
    const entrance = { x: 70, y: 300, clearance: 160 };
    const m = generateDungeon({
      seed: 42,
      width: 800,
      height: 600,
      roomCount: [4, 4],
      enemyActors: ["scuttler"],
      enemyCount: [2, 2],
      requiredPoints: [entrance],
    });
    expect(m.kind).toBe("dungeon");
    expect(m.walls.length).toBeGreaterThan(2);
    expect(m.spawns.some((s) => s.team === "player" || s.actor === "player")).toBe(
      true,
    );
    expect(m.tileMap).toBeTruthy();
    expect(m.tileMap!.blocksWorld(entrance.x, entrance.y, 12)).toBe(false);
  });

  it("generates overworld with rocks", () => {
    const portal = { x: 700, y: 200, clearance: 180 };
    const m = generateOverworld({
      width: 1000,
      height: 800,
      rockCount: [5, 8],
      rng: () => 0.3,
      requiredPoints: [portal],
    });
    expect(m.kind).toBe("overworld");
    expect(m.walls.length).toBeGreaterThan(4);
    expect(
      m.walls.some(
        (wall) =>
          portal.x >= wall.x &&
          portal.x <= wall.x + wall.w &&
          portal.y >= wall.y &&
          portal.y <= wall.y + wall.h,
      ),
    ).toBe(false);
  });
});

describe("LootPolicy + RunState", () => {
  it("drops gold from empty table fallback", () => {
    const w = new World();
    const d = dropFromTable(w, 10, 10, undefined, { rng: () => 0.5 });
    expect(d.kind).toBe("gold");
    expect((d.gold ?? 0) > 0).toBe(true);
  });

  it("serializes run state", () => {
    const st = buildRunState({
      gameId: "gravewake",
      areaId: "town",
      playerX: 1,
      playerY: 2,
      seed: 1,
      character: {
        level: 1,
        xp: 0,
        gold: 10,
        baseStats: {
          maxHp: 100,
          damage: 5,
          armor: 0,
          speed: 100,
          critChance: 0,
          critMult: 1,
        },
        inventory: [],
        equipped: {},
        inventoryCapacity: 40,
      },
      flags: { kills: 3 },
    });
    const raw = serializeRunState(st);
    const back = parseRunState(raw);
    expect(back?.areaId).toBe("town");
    expect(back?.flags.kills).toBe(3);
  });
});
